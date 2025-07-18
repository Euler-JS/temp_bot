require('dotenv').config();
const express = require("express");

const fs = require("fs");
const bodyParser = require("body-parser");
const WhatsAppApi = require("./whatsapp_api/connection");
const WeatherService = require("./weather_api/weather_service");
const OPENAI = require("./open_ai/open_ai");

const app = express();
const port = process.env.PORT || 3000;
const filePath = "./users.json";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// WHATSAPP API Configuration
const token = process.env.WHATSAPP_TOKEN || "";
const phoneNumberID = process.env.PHONE_NUMBER_ID || "";

// Inicializar serviços
const whatsappApi = new WhatsAppApi(token, phoneNumberID);
const weatherService = new WeatherService();

//OPENAI SERVICE
const openaiService = new OPENAI(process.env.OPEN_AI || "");

// Comandos disponíveis
const optionsCases = [
  "/clima",
  "/previsao",
  "/configurar",
  "/ajuda",
  "/historico",
  "Climate",
  "Forecast",
  "Settings",
  "Help"
];

// Carregar usuários
let users = [];
if (fs.existsSync(filePath)) {
  const data = fs.readFileSync(filePath, "utf-8");
  if (data) {
    users = JSON.parse(data);
  }
}

function getUserByContact(contact) {
  return users.find((user) => user.contact === contact);
}

// Webhook routes
app.get("/webhook", async (req, res) => {
  console.log("Estabelecendo conexão com o Webhook! ");
  let mode = req.query["hub.mode"];
  let challenge = req.query["hub.challenge"];
  let token = req.query["hub.verify_token"];
  const mytoken = "TEMPBOT2024";

  if (mode && token) {
    if (mode === "subscribe" && token === mytoken) {
      console.log("Conexão estabelecida com sucesso!")
      res.status(200).send(challenge);
    } else {
      console.log("Erro ao estabelecer conexão!")
      res.status(403).send();
    }
  }
});

app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    const entry = body.entry[0];
    const change = entry.changes[0];

    if (change.field === "messages" && change?.value?.messages?.length > 0) {
      const message = change.value.messages[0];
      const remetenteFile = message.from;
      const phoneNumber = message.from;
      const user = getUserByContact(phoneNumber);

      console.log("Mensagem recebida:", message);

      // Processar diferentes tipos de mensagem
      if (message?.type === "text") {
        const messageText = message.text.body;

        // Verificar se é análise detalhada
        if (await processDetailedAnalysis(messageText, phoneNumber, user)) {
          res.sendStatus(200);
          return;
        }

        // Verificar se é consulta de clima
        if (await isWeatherQuery(messageText)) {
          await processWeatherMessage(messageText, phoneNumber, user);
          res.sendStatus(200);
          return;
        }
        await processTextMessage(message.text.body, remetenteFile);
      } else if (message?.type === "interactive") {
        await processInteractiveMessage(message.interactive, remetenteFile);
      } else if (message?.type === "location") {
        await processLocationMessage(message.location, remetenteFile);
      }
    }
  }

  res.sendStatus(200);
});

// Processamento de mensagens de texto
async function processTextMessage(messageText, phoneNumber) {
  const user = getUserByContact(phoneNumber);
  const language = user?.language || 'pt';

  // Comandos específicos
  if (optionsCases.includes(messageText)) {
    await processCommand(messageText, phoneNumber, user);
    return;
  }

  // Tentar interpretar como consulta de clima
  if (await isWeatherQuery(messageText)) {
    await processWeatherQuery(messageText, phoneNumber, user);
    return;
  }

  // Mensagem padrão de ajuda
  await sendHelpMessage(phoneNumber, language);
}

// Verificar se é uma consulta de clima
async function isWeatherQuery(message) {
  const weatherKeywords = [
    'clima', 'temperatura', 'tempo', 'weather', 'temperature',
    'graus', 'quente', 'frio', 'chuva', 'sol'
  ];

  return weatherKeywords.some(keyword =>
    message.toLowerCase().includes(keyword)
  );
}

// Processar consulta de temperatura
async function processWeatherQuery(message, phoneNumber, user) {
  try {
    // Extrair nome da cidade da mensagem
    let cityName = extractCityFromMessage(message, user);

    if (!cityName) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "Por favor, me informe o nome da cidade. Exemplo: 'Clima em Maputo'",
        phoneNumber
      );
      return;
    }

    // Buscar informações do clima
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "🔍 Buscando informações do clima...",
      phoneNumber
    );

    const weatherData = await weatherService.getCurrentWeather(
      cityName,
      user?.units || 'celsius'
    );

    // Salvar no histórico
    saveWeatherHistory(
      phoneNumber,
      weatherData.city,
      weatherData.temperature,
      weatherData.description
    );

    // Enviar resposta formatada
    const weatherMessage = formatWeatherMessage(weatherData);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      weatherMessage,
      phoneNumber
    );

    // Oferecer previsão
    await offerForecast(phoneNumber, cityName);

  } catch (error) {
    console.error("Erro ao buscar clima:", error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Desculpe, não consegui encontrar informações do clima para essa cidade. Verifique o nome e tente novamente.",
      phoneNumber
    );
  }
}

// Extrair cidade da mensagem
function extractCityFromMessage(message, user) {
  // Remover palavras-chave comuns
  const cleanMessage = message
    .toLowerCase()
    .replace(/clima|temperatura|tempo|weather|em|in|de|do|da/g, '')
    .trim();

  // Se não conseguir extrair e o usuário tem cidade preferida
  if (!cleanMessage && user?.preferredCity) {
    return user.preferredCity;
  }

  return cleanMessage || null;
}

// Formatar mensagem do clima
function formatWeatherMessage(data) {
  const emoji = getWeatherEmoji(data.description);

  return `${emoji} *Clima em ${data.city}, ${data.country}*\n\n` +
    `🌡️ *Temperatura:* ${data.temperature}${data.units}\n` +
    `🤲 *Sensação térmica:* ${data.feelsLike}${data.units}\n` +
    `💧 *Umidade:* ${data.humidity}%\n` +
    `📝 *Condições:* ${data.description}\n\n` +
    `_Dados fornecidos por ${data.source}_`;
}

// Emojis baseados na descrição do clima
function getWeatherEmoji(description) {
  const desc = description.toLowerCase();

  if (desc.includes('sol') || desc.includes('clear')) return '☀️';
  if (desc.includes('chuva') || desc.includes('rain')) return '🌧️';
  if (desc.includes('nuvem') || desc.includes('cloud')) return '☁️';
  if (desc.includes('neve') || desc.includes('snow')) return '❄️';
  if (desc.includes('tempest') || desc.includes('storm')) return '⛈️';

  return '🌤️';
}

// Oferecer previsão do tempo
async function offerForecast(phoneNumber, city) {
  const forecastOffer = {
    messaging_product: 'whatsapp',
    recipient_type: "individual",
    to: phoneNumber,
    type: "interactive",
    interactive: {
      type: "button",
      header: {
        type: "text",
        text: "Previsão do Tempo"
      },
      body: {
        text: `Deseja ver a previsão dos próximos dias para ${city}?`
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `forecast_${city}`,
              title: "Ver Previsão"
            }
          },
          {
            type: "reply",
            reply: {
              id: "no_forecast",
              title: "Não, obrigado"
            }
          }
        ]
      }
    }
  };

  await whatsappApi.enviarMensagemInterativaUsandoWhatsappAPI(forecastOffer);
}

// Processar comandos específicos
async function processCommand(command, phoneNumber, user) {
  switch (command) {
    case "/ajuda":
    case "Help":
      await sendHelpMessage(phoneNumber, user?.language || 'pt');
      break;

    case "/configurar":
    case "Settings":
      await sendSettingsMenu(phoneNumber);
      break;

    case "/historico":
      await sendWeatherHistory(phoneNumber, user);
      break;

    default:
      await sendHelpMessage(phoneNumber, user?.language || 'pt');
  }
}

// Enviar mensagem de ajuda
async function sendHelpMessage(phoneNumber, language = 'pt') {
  const helpMessage = language === 'pt' ?
    `🤖 *Bot de Temperatura - Ajuda*\n\n` +
    `📋 *Comandos disponíveis:*\n` +
    `• Digite o nome de uma cidade para ver o clima\n` +
    `• /clima - Clima da sua cidade preferida\n` +
    `• /previsao - Previsão de 7 dias\n` +
    `• /configurar - Configurações pessoais\n` +
    `• /historico - Suas consultas recentes\n\n` +
    `💡 *Exemplos:*\n` +
    `• "Clima em Maputo"\n` +
    `• "Temperatura Beira"\n` +
    `• "Tempo em Lisboa"`
    :
    `🤖 *Temperature Bot - Help*\n\n` +
    `📋 *Available commands:*\n` +
    `• Type a city name to see weather\n` +
    `• /climate - Weather for your preferred city\n` +
    `• /forecast - 7-day forecast\n` +
    `• /settings - Personal settings\n\n` +
    `💡 *Examples:*\n` +
    `• "Weather in Maputo"\n` +
    `• "Temperature Beira"`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(helpMessage, phoneNumber);
}

// Adicionar estas funções ao arquivo index.js

// Menu de configurações interativo
async function sendSettingsMenu(phoneNumber) {
  const user = getUserByContact(phoneNumber);

  const settingsMenu = {
    messaging_product: 'whatsapp',
    recipient_type: "individual",
    to: phoneNumber,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "⚙️ Configurações"
      },
      body: {
        text: "Configure suas preferências do bot de temperatura:"
      },
      footer: {
        text: "Selecione uma opção"
      },
      action: {
        button: "Configurar",
        sections: [
          {
            title: "Preferências Gerais",
            rows: [
              {
                id: "set_city",
                title: "Cidade Padrão",
                description: `Atual: ${user?.preferredCity || 'Não definida'}`
              },
              {
                id: "set_units",
                title: "Unidade de Temperatura",
                description: `Atual: ${user?.units === 'fahrenheit' ? 'Fahrenheit' : 'Celsius'}`
              },
              {
                id: "set_language",
                title: "Idioma",
                description: `Atual: ${user?.language === 'en' ? 'English' : 'Português'}`
              }
            ]
          },
          {
            title: "Notificações",
            rows: [
              {
                id: "toggle_notifications",
                title: "Alertas de Clima",
                description: `${user?.notifications ? 'Ativado' : 'Desativado'}`
              }
            ]
          }
        ]
      }
    }
  };

  await whatsappApi.enviarMensagemInterativaUsandoWhatsappAPI(settingsMenu);
}

// Processar respostas interativas
async function processInteractiveMessage(interactive, phoneNumber) {
  const user = getUserByContact(phoneNumber);

  if (interactive.type === "list_reply") {
    const optionId = interactive.list_reply.id;

    switch (optionId) {
      case "set_city":
        await requestCitySelection(phoneNumber);
        break;

      case "set_units":
        await sendUnitsMenu(phoneNumber);
        break;

      case "set_language":
        await sendLanguageMenu(phoneNumber);
        break;

      case "toggle_notifications":
        await toggleNotifications(phoneNumber, user);
        break;

      default:
        if (optionId.startsWith("forecast_")) {
          const city = optionId.replace("forecast_", "");
          await sendWeatherForecast(phoneNumber, city, user);
        }
        break;
    }
  }

  if (interactive.type === "button_reply") {
    const buttonId = interactive.button_reply.id;

    if (buttonId.startsWith("forecast_")) {
      const city = buttonId.replace("forecast_", "");
      await sendWeatherForecast(phoneNumber, city, user);
    } else if (buttonId === "no_forecast") {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "👍 Perfeito! Se precisar de mais informações, é só perguntar.",
        phoneNumber
      );
    }
  }
}

// Solicitar seleção de cidade
async function requestCitySelection(phoneNumber) {
  await whatsappApi.enviarMensagemUsandoWhatsappAPI(
    "🏙️ *Definir Cidade Padrão*\n\n" +
    "Digite o nome da cidade que você gostaria de definir como padrão.\n" +
    "Exemplo: Maputo, Beira, Lisboa, etc.\n\n" +
    "_Digite 'cancelar' para voltar ao menu._",
    phoneNumber
  );

  // Marcar usuário como aguardando cidade
  const userIndex = users.findIndex(u => u.contact === phoneNumber);
  if (userIndex !== -1) {
    users[userIndex].awaitingCity = true;
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  }
}

// Menu de unidades de temperatura
async function sendUnitsMenu(phoneNumber) {
  const unitsMenu = {
    messaging_product: 'whatsapp',
    recipient_type: "individual",
    to: phoneNumber,
    type: "interactive",
    interactive: {
      type: "button",
      header: {
        type: "text",
        text: "🌡️ Unidade de Temperatura"
      },
      body: {
        text: "Escolha sua unidade de temperatura preferida:"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "units_celsius",
              title: "Celsius (°C)"
            }
          },
          {
            type: "reply",
            reply: {
              id: "units_fahrenheit",
              title: "Fahrenheit (°F)"
            }
          }
        ]
      }
    }
  };

  await whatsappApi.enviarMensagemInterativaUsandoWhatsappAPI(unitsMenu);
}

// Enviar previsão do tempo
async function sendWeatherForecast(phoneNumber, city, user) {
  try {
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "🔍 Buscando previsão do tempo...",
      phoneNumber
    );

    const forecast = await weatherService.getWeatherForecast(city, 7);

    let forecastMessage = `📅 *Previsão de 7 dias - ${city}*\n\n`;

    forecast.forEach((day, index) => {
      const date = new Date(day.date);
      const dayName = index === 0 ? 'Hoje' :
        index === 1 ? 'Amanhã' :
          date.toLocaleDateString('pt-BR', { weekday: 'short' });

      const emoji = getWeatherEmoji(day.description);

      forecastMessage += `${emoji} *${dayName}* (${date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })})\n`;
      forecastMessage += `   ${day.minTemp}° - ${day.maxTemp}° | ${day.description}\n\n`;
    });

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      forecastMessage,
      phoneNumber
    );

  } catch (error) {
    console.error("Erro ao buscar previsão:", error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Não foi possível obter a previsão do tempo. Tente novamente mais tarde.",
      phoneNumber
    );
  }
}

// Enviar histórico do usuário
async function sendWeatherHistory(phoneNumber, user) {
  if (!user || !user.weatherHistory || user.weatherHistory.length === 0) {
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "📝 Você ainda não fez consultas de clima. Digite o nome de uma cidade para começar!",
      phoneNumber
    );
    return;
  }

  let historyMessage = "📚 *Histórico de Consultas*\n\n";

  user.weatherHistory.slice(-5).reverse().forEach((entry, index) => {
    const date = new Date(entry.timestamp);
    const emoji = getWeatherEmoji(entry.conditions);

    historyMessage += `${emoji} *${entry.city}*\n`;
    historyMessage += `   ${entry.temperature}°C | ${entry.conditions}\n`;
    historyMessage += `   ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`;
  });

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(historyMessage, phoneNumber);
}

// Alternar notificações
async function toggleNotifications(phoneNumber, user) {
  const currentStatus = user?.notifications || false;
  const newStatus = !currentStatus;

  // Atualizar usuário
  saveOrUpdateUser(
    phoneNumber,
    user?.preferredCity,
    user?.units,
    user?.language,
    newStatus
  );

  const statusText = newStatus ? 'ativadas' : 'desativadas';
  const emoji = newStatus ? '🔔' : '🔕';

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(
    `${emoji} Notificações de clima foram ${statusText}!`,
    phoneNumber
  );
}

// Substituir a função saveOrUpdateUser atual por esta versão para temperatura
function saveOrUpdateUser(contact, preferredCity, units, language, notifications) {
  const userIndex = users.findIndex((user) => user.contact === contact);

  if (userIndex !== -1) {
    // Usuário já existe, apenas atualiza os dados
    users[userIndex].preferredCity = preferredCity;
    users[userIndex].units = units; // 'celsius' ou 'fahrenheit'
    users[userIndex].language = language;
    users[userIndex].notifications = notifications; // true/false para alertas
    users[userIndex].last_access = new Date();
    console.log("Usuário atualizado com sucesso!");
  } else {
    // Usuário não existe, adiciona um novo
    users.push({
      contact,
      preferredCity,
      units: units || 'celsius',
      language: language || 'pt',
      notifications: notifications || false,
      last_access: new Date(),
      weatherHistory: [] // Histórico de consultas
    });
    console.log("Novo usuário salvo com sucesso!");
  }

  // Salva as alterações no arquivo
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

// Função para salvar histórico de consultas de temperatura
function saveWeatherHistory(contact, city, temperature, conditions, timestamp) {
  const userIndex = users.findIndex((user) => user.contact === contact);

  if (userIndex !== -1) {
    if (!users[userIndex].weatherHistory) {
      users[userIndex].weatherHistory = [];
    }

    users[userIndex].weatherHistory.push({
      city,
      temperature,
      conditions,
      timestamp: timestamp || new Date()
    });

    // Manter apenas os últimos 10 registros
    if (users[userIndex].weatherHistory.length > 10) {
      users[userIndex].weatherHistory = users[userIndex].weatherHistory.slice(-10);
    }

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  }
}

// Processar localização compartilhada
async function processLocationMessage(location, phoneNumber) {
  try {
    const { latitude, longitude } = location;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "📍 Localização recebida! Buscando clima da sua região...",
      phoneNumber
    );

    // Usar coordenadas para buscar clima
    const weatherData = await weatherService.getCurrentWeather(
      `${latitude},${longitude}`,
      getUserByContact(phoneNumber)?.units || 'celsius'
    );

    const weatherMessage = formatWeatherMessage(weatherData);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      weatherMessage,
      phoneNumber
    );

  } catch (error) {
    console.error("Erro ao processar localização:", error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Não foi possível obter o clima da sua localização. Tente enviar o nome da cidade.",
      phoneNumber
    );
  }
}

// Verificar se usuário está aguardando entrada de cidade
function checkAwaitingCityInput(message, phoneNumber) {
  const user = getUserByContact(phoneNumber);

  if (user?.awaitingCity) {
    if (message.toLowerCase() === 'cancelar') {
      // Cancelar operação
      const userIndex = users.findIndex(u => u.contact === phoneNumber);
      if (userIndex !== -1) {
        delete users[userIndex].awaitingCity;
        fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
      }

      whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "❌ Operação cancelada.",
        phoneNumber
      );
      return true;
    }

    // Salvar cidade e confirmar
    saveOrUpdateUser(
      phoneNumber,
      message,
      user.units,
      user.language,
      user.notifications
    );

    // Remover flag de aguardando
    const userIndex = users.findIndex(u => u.contact === phoneNumber);
    if (userIndex !== -1) {
      delete users[userIndex].awaitingCity;
      fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    }

    whatsappApi.enviarMensagemUsandoWhatsappAPI(
      `✅ Cidade padrão definida como: *${message}*\n\nAgora você pode usar /clima para ver o tempo da sua cidade.`,
      phoneNumber
    );
    return true;
  }

  return false;
}

// ================================
// EXEMPLO 1: Consulta de clima com IA
// ================================
async function processWeatherQueryWithAI(message, phoneNumber, user) {
  try {
    const cityName = extractCityFromMessage(message) || user?.preferredCity;

    if (!cityName) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "Por favor, me informe o nome da cidade. Exemplo: 'Clima em Maputo'",
        phoneNumber
      );
      return;
    }

    // 1. Mostrar que está processando
    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Analisando clima com IA');

    // 2. Buscar dados do clima
    const weatherData = await weatherService.getCurrentWeather(
      cityName,
      user?.units || 'celsius'
    );

    // 3. 🤖 HUMANIZAR COM OPENAI
    const aiResult = await openaiService.humanizeWeatherData(weatherData, {
      language: user?.language || 'pt',
      location: 'Moçambique'
    });

    // 4. Enviar resposta humanizada
    if (aiResult.success) {
      // Resposta da IA - mais amigável e completa
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        `🤖 *Análise Inteligente do Clima*\n\n${aiResult.humanizedText}`,
        phoneNumber
      );
    } else {
      // Fallback caso IA falhe
      console.log('IA falhou, usando fallback:', aiResult.error);
      const basicMessage = formatBasicWeatherMessage(weatherData);
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(basicMessage, phoneNumber);
    }

    // 5. Salvar no histórico
    saveWeatherHistory(phoneNumber, weatherData.city, weatherData.temperature, weatherData.description);

    // 6. Oferecer ações adicionais
    await whatsappApi.enviarBotoesAcaoRapida(phoneNumber, weatherData.city);

  } catch (error) {
    console.error("Erro na consulta com IA:", error);
    await whatsappApi.enviarMensagemErro(
      phoneNumber,
      "Não consegui analisar o clima",
      "Tente novamente em alguns minutos"
    );
  }
}

// ================================
// EXEMPLO 2: Previsão com análise inteligente
// ================================
async function sendIntelligentForecast(phoneNumber, city, user) {
  try {
    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Gerando análise inteligente da previsão');

    // 1. Buscar previsão
    const forecast = await weatherService.getWeatherForecast(city, 7);

    // 2. 🤖 HUMANIZAR COM OPENAI
    const aiResult = await openaiService.humanizeWeatherForecast(forecast, city, {
      language: user?.language || 'pt'
    });

    if (aiResult.success) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        `🔮 *Previsão Inteligente - ${city}*\n\n${aiResult.humanizedText}`,
        phoneNumber
      );
    } else {
      // Fallback básico
      const basicForecast = createBasicForecast(forecast, city);
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(basicForecast, phoneNumber);
    }

  } catch (error) {
    console.error("Erro na previsão inteligente:", error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro na análise da previsão");
  }
}

// ================================
// EXEMPLO 3: Recomendações personalizadas
// ================================
async function sendPersonalizedRecommendations(phoneNumber, weatherData, user) {
  try {
    // Definir preferências do usuário baseado no perfil
    const userPreferences = {
      activities: user?.preferredActivities || 'atividades gerais',
      workType: user?.workType || 'trabalho geral',
      healthConcerns: user?.healthConcerns || []
    };

    // 🤖 GERAR RECOMENDAÇÕES COM IA
    const recommendations = await openaiService.generateWeatherRecommendations(
      weatherData,
      userPreferences
    );

    if (recommendations.success) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        `💡 *Recomendações Personalizadas*\n\n${recommendations.recommendations}`,
        phoneNumber
      );
    }

  } catch (error) {
    console.error("Erro nas recomendações:", error);
  }
}

// ================================
// EXEMPLO 4: Comando de análise detalhada
// ================================
async function processDetailedAnalysis(message, phoneNumber, user) {
  if (!message.includes('análise') && !message.includes('detalhes')) {
    return false; // Não é um comando de análise
  }

  try {
    const cityName = extractCityFromMessage(message) || user?.preferredCity;

    if (!cityName) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "Para análise detalhada, informe a cidade. Ex: 'Análise detalhada de Maputo'",
        phoneNumber
      );
      return true;
    }

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Gerando análise detalhada com IA');

    // Buscar dados atuais e previsão
    const [currentWeather, forecast] = await Promise.all([
      weatherService.getCurrentWeather(cityName, user?.units || 'celsius'),
      weatherService.getWeatherForecast(cityName, 3)
    ]);

    // Criar prompt especial para análise detalhada
    const detailedPrompt = `
Faça uma análise meteorológica detalhada mas acessível para ${cityName}:

CLIMA ATUAL:
- Temperatura: ${currentWeather.temperature}${currentWeather.units}
- Sensação: ${currentWeather.feelsLike}${currentWeather.units}
- Umidade: ${currentWeather.humidity}%
- Condições: ${currentWeather.description}

PRÓXIMOS 3 DIAS:
${forecast.map((day, i) => `Dia ${i + 1}: ${day.minTemp}°-${day.maxTemp}°, ${day.description}`).join('\n')}

Crie uma análise que inclua:
1. Situação atual explicada de forma simples
2. Comparação com temperaturas típicas da região
3. Tendência dos próximos dias
4. Impactos práticos (conforto, atividades, saúde)
5. Recomendações específicas
6. Melhor horário para atividades ao ar livre

Máximo 400 palavras, tom educativo mas acessível.
        `;

    const analysis = await openaiService.callOpenAI(detailedPrompt, 0.3); // Temperatura baixa para mais precisão

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      `📊 *Análise Meteorológica Detalhada - ${cityName}*\n\n${analysis}`,
      phoneNumber
    );

    return true;

  } catch (error) {
    console.error("Erro na análise detalhada:", error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro na análise detalhada");
    return true;
  }
}

// ================================
// FUNÇÃO PRINCIPAL: Escolher entre IA ou básico
// ================================
async function processWeatherMessage(message, phoneNumber, user) {
  // Verificar se usuário tem IA ativada (premium feature)
  // const hasAIPlan = user?.plan === 'premium' || user?.aiEnabled === true;

  // if (hasAIPlan) {
  // 🤖 Usar IA para resposta mais rica
  await processWeatherQueryWithAI(message, phoneNumber, user);
  // } else {
  //   // 📝 Usar resposta básica
  //   await processBasicWeatherQuery(message, phoneNumber, user);

  //   // Oferecer upgrade para IA
  //   await offerAIUpgrade(phoneNumber);
  // }
}

// Oferecer upgrade para funcionalidades IA
async function offerAIUpgrade(phoneNumber) {
  const upgradeMessage = `
🤖 *Quer respostas mais inteligentes?*

Com o plano Premium você recebe:
• Análise meteorológica com IA
• Explicações personalizadas e simples
• Recomendações baseadas no seu perfil
• Dicas específicas para sua região

💎 Digite */premium* para saber mais!
    `.trim();

  setTimeout(async () => {
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(upgradeMessage, phoneNumber);
  }, 5000); // Enviar após 5 segundos
}

// ================================
// FUNÇÕES AUXILIARES
// ================================

function formatBasicWeatherMessage(data) {
  const emoji = getWeatherEmoji(data.description);

  return `${emoji} *Clima em ${data.city}, ${data.country}*\n\n` +
    `🌡️ *Temperatura:* ${data.temperature}${data.units}\n` +
    `🤲 *Sensação térmica:* ${data.feelsLike}${data.units}\n` +
    `💧 *Umidade:* ${data.humidity}%\n` +
    `📝 *Condições:* ${data.description}`;
}

function createBasicForecast(forecast, city) {
  let message = `📅 *Previsão para ${city}*\n\n`;

  forecast.slice(0, 3).forEach((day, index) => {
    const dayName = index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' : 'Depois';
    const emoji = getWeatherEmoji(day.description);
    message += `${emoji} ${dayName}: ${day.minTemp}° a ${day.maxTemp}°\n   ${day.description}\n\n`;
  });

  return message;
}

function getWeatherEmoji(description) {
  const desc = description.toLowerCase();
  if (desc.includes('sol') || desc.includes('clear')) return '☀️';
  if (desc.includes('chuva') || desc.includes('rain')) return '🌧️';
  if (desc.includes('nuvem') || desc.includes('cloud')) return '☁️';
  if (desc.includes('tempest') || desc.includes('storm')) return '⛈️';
  return '🌤️';
}


app.listen(port, async () => {
  console.log(`🌡️ Temperature Bot running on port ${port}`);
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  // Testar conexão com OpenAI
  // if (process.env.OPENAI_API_KEY) {
  //   console.log('🤖 Testando conexão com OpenAI...');
  //   const testResult = await openaiService.testConnection();

  //   if (testResult.success) {
  //     console.log('✅ OpenAI conectado com sucesso!');
  //   } else {
  //     console.log('❌ Erro na conexão OpenAI:', testResult.error);
  //   }
  // } else {
  //   console.log('⚠️ OPENAI_API_KEY não configurada - funcionalidades IA desabilitadas');
  // }
});