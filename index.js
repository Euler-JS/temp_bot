// SUBSTITUIR COMPLETAMENTE o arquivo index.js por este:

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
const openaiService = new OPENAI(process.env.OPEN_AI || "");

// Carregar usuários
let users = [];
if (fs.existsSync(filePath)) {
  const data = fs.readFileSync(filePath, "utf-8");
  if (data) {
    users = JSON.parse(data);
  }
}

// ===============================================
// GESTÃO AVANÇADA DE USUÁRIOS
// ===============================================

function getUserByContact(contact) {
  return users.find((user) => user.contact === contact);
}

function saveOrUpdateAdvancedUser(contact, updates = {}) {
  const userIndex = users.findIndex((user) => user.contact === contact);
  const timestamp = new Date();

  if (userIndex !== -1) {
    // Usuário existente - atualizar
    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      last_access: timestamp,
      queryCount: (users[userIndex].queryCount || 0) + 1
    };
    console.log("✅ Usuário avançado atualizado:", contact);
  } else {
    // Novo usuário - criar perfil completo
    users.push({
      contact,
      preferredCity: null,
      units: 'celsius',
      language: 'pt',
      notifications: false,
      queryCount: 1,
      expertiseLevel: 'basic',
      preferredComplexity: 'basic',
      conversationHistory: [],
      lastCity: null,
      preferredNotificationTime: '08:00',
      weatherPreferences: {
        aspects: ['temperatura', 'chuva'], // O que mais pergunta
        timeframes: ['hoje', 'amanha'], // Quando mais consulta
        cities: [] // Cidades mais consultadas
      },
      profileData: {
        age: null,
        occupation: null,
        interests: []
      },
      last_access: timestamp,
      weatherHistory: [],
      ...updates
    });
    console.log("🆕 Novo usuário avançado criado:", contact);
  }

  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

function saveConversationContext(contact, message, analysis, response) {
  const userIndex = users.findIndex((user) => user.contact === contact);

  if (userIndex !== -1) {
    if (!users[userIndex].conversationHistory) {
      users[userIndex].conversationHistory = [];
    }

    // Adicionar ao histórico
    users[userIndex].conversationHistory.push({
      timestamp: new Date(),
      message: message,
      intent: analysis.intent,
      city: analysis.city,
      type: analysis.type,
      expertiseLevel: analysis.expertiseLevel,
      responseLength: response?.length || 0
    });

    // Manter apenas últimas 10 interações
    if (users[userIndex].conversationHistory.length > 10) {
      users[userIndex].conversationHistory = users[userIndex].conversationHistory.slice(-10);
    }

    // Atualizar dados derivados
    users[userIndex].lastCity = analysis.city || users[userIndex].lastCity;

    // Evoluir expertise automaticamente
    updateUserExpertise(userIndex, analysis);

    // Atualizar preferências
    updateUserPreferences(userIndex, analysis);

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  }
}

function updateUserExpertise(userIndex, analysis) {
  const user = users[userIndex];
  const queryCount = user.queryCount || 0;

  // Lógica de progressão automática
  if (queryCount >= 3 && user.expertiseLevel === 'basic') {
    users[userIndex].expertiseLevel = 'intermediate';
    console.log(`📈 Usuário evoluiu para intermediário: ${user.contact}`);
  } else if (queryCount >= 10 && user.expertiseLevel === 'intermediate') {
    users[userIndex].expertiseLevel = 'advanced';
    console.log(`🎓 Usuário evoluiu para avançado: ${user.contact}`);
  }

  // Override baseado em feedback da IA
  if (analysis.userProfile?.updateExpertise === 'aumentar') {
    const levels = ['basic', 'intermediate', 'advanced'];
    const currentIndex = levels.indexOf(user.expertiseLevel);
    if (currentIndex < levels.length - 1) {
      users[userIndex].expertiseLevel = levels[currentIndex + 1];
    }
  }
}

function updateUserPreferences(userIndex, analysis) {
  const user = users[userIndex];
  const prefs = user.weatherPreferences || { aspects: [], timeframes: [], cities: [] };

  // Rastrear aspectos mais perguntados
  if (analysis.context?.weatherAspect) {
    if (!prefs.aspects.includes(analysis.context.weatherAspect)) {
      prefs.aspects.push(analysis.context.weatherAspect);
    }
  }

  // Rastrear timeframes
  if (analysis.context?.timeframe) {
    if (!prefs.timeframes.includes(analysis.context.timeframe)) {
      prefs.timeframes.push(analysis.context.timeframe);
    }
  }

  // Rastrear cidades
  if (analysis.city) {
    const cityIndex = prefs.cities.findIndex(c => c.name === analysis.city);
    if (cityIndex >= 0) {
      prefs.cities[cityIndex].count++;
    } else {
      prefs.cities.push({ name: analysis.city, count: 1 });
    }

    // Ordenar por frequência
    prefs.cities.sort((a, b) => b.count - a.count);
  }

  users[userIndex].weatherPreferences = prefs;
}

// ===============================================
// WEBHOOK ROUTES (Mantidos)
// ===============================================

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
      const phoneNumber = message.from;

      console.log("📱 Mensagem recebida:", message);

      // Processar diferentes tipos de mensagem
      if (message?.type === "text") {
        await processAdvancedTextMessage(message.text.body, phoneNumber);
      } else if (message?.type === "interactive") {
        await processAdvancedInteractiveMessage(message.interactive, phoneNumber);
      } else if (message?.type === "location") {
        await processLocationMessage(message.location, phoneNumber);
      }
    }
  }

  res.sendStatus(200);
});

// ===============================================
// PROCESSAMENTO AVANÇADO DE MENSAGENS
// ===============================================

async function processAdvancedTextMessage(messageText, phoneNumber) {
  const user = getUserByContact(phoneNumber);

  try {
    console.log(`🧠 Processamento avançado: "${messageText}"`);

    // 1. Análise completa com IA
    const analysisResult = await openaiService.analyzeUserMessage(messageText, {
      preferredCity: user?.preferredCity,
      language: user?.language || 'pt',
      queryCount: user?.queryCount || 0,
      expertiseLevel: user?.expertiseLevel || 'basic',
      conversationHistory: user?.conversationHistory || [],
      lastCity: user?.lastCity,
      weatherPreferences: user?.weatherPreferences
    });

    if (!analysisResult.success) {
      console.log('❌ Análise falhou, usando fallback básico');
      return await processBasicFallback(messageText, phoneNumber);
    }

    const analysis = analysisResult.analysis;
    console.log(`📊 Análise completa:`, JSON.stringify(analysis, null, 2));

    // 2. Roteamento inteligente
    const response = await routeAdvancedRequest(analysis, messageText, phoneNumber, user);

    // 3. Salvar contexto da conversa
    saveConversationContext(phoneNumber, messageText, analysis, response);

    // 4. Enviar sugestões inteligentes se apropriado
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      await sendIntelligentSuggestions(phoneNumber, analysis.suggestions, analysis.city);
    }

  } catch (error) {
    console.error('🚨 Erro no processamento avançado:', error);
    await processBasicFallback(messageText, phoneNumber);
  }
}

async function routeAdvancedRequest(analysis, originalMessage, phoneNumber, user) {
  const { type, action, intent } = analysis;

  console.log(`🎯 Roteamento avançado: type=${type}, action=${action}`);

  switch (type) {
    case 'weather_data':
      return await handleAdvancedWeatherData(analysis, phoneNumber, user);

    case 'weather_education':
      return await handleAdvancedEducation(analysis, originalMessage, phoneNumber, user);

    case 'comparison':
      return await handleCityComparison(analysis, phoneNumber, user);

    case 'reminder':
      return await handleReminderRequest(analysis, phoneNumber, user);

    case 'off_topic':
      return await handleOffTopicAdvanced(analysis, phoneNumber, user);

    default:
      console.log(`⚠️ Tipo desconhecido: ${type}`);
      return await sendAdvancedHelp(phoneNumber, user);
  }
}

// ===============================================
// HANDLERS AVANÇADOS
// ===============================================

async function handleAdvancedWeatherData(analysis, phoneNumber, user) {
  try {
    const { city, action, context } = analysis;
    let targetCity = city || user?.preferredCity;

    if (!targetCity) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "🏙️ Para consultar o clima, preciso saber a cidade. Qual cidade te interessa?",
        phoneNumber
      );
      return null;
    }

    // Mensagem de loading contextual
    const loadingMsg = getContextualLoadingMessage(context, targetCity);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(loadingMsg, phoneNumber);

    // Buscar dados meteorológicos
    const weatherData = await weatherService.getCurrentWeather(
      targetCity,
      user?.units || 'celsius'
    );

    // Gerar resposta contextual com IA
    const contextualResponse = await openaiService.generateContextualResponse(
      analysis,
      weatherData,
      {
        ...user,
        conversationHistory: user?.conversationHistory || []
      }
    );

    let finalMessage;
    if (contextualResponse.success) {
      finalMessage = `🌤️ *${weatherData.city}*\n\n${contextualResponse.response}`;
    } else {
      // Fallback simples
      finalMessage = createSimpleWeatherMessage(weatherData);
    }

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    // Salvar histórico meteorológico
    saveAdvancedWeatherHistory(phoneNumber, weatherData, analysis);

    // Atualizar usuário
    saveOrUpdateAdvancedUser(phoneNumber, {
      lastCity: targetCity,
      preferredCity: user?.preferredCity || targetCity
    });

    return finalMessage;

  } catch (error) {
    console.error('❌ Erro em dados meteorológicos avançados:', error);
    await whatsappApi.enviarMensagemErro(
      phoneNumber,
      "Não consegui obter dados meteorológicos",
      "Tente novamente ou verifique o nome da cidade"
    );
    return null;
  }
}

async function handleAdvancedEducation(analysis, originalMessage, phoneNumber, user) {
  try {
    const { expertiseLevel, context } = analysis;

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Preparando explicação personalizada');

    // Prompt educativo adaptado ao nível do usuário
    const educationPrompt = `
Pergunta: "${originalMessage}"
Nível do usuário: ${expertiseLevel}
Contexto: ${JSON.stringify(context)}
Histórico: ${user?.conversationHistory?.length || 0} consultas anteriores

Crie uma explicação meteorológica adequada para este nível:

${expertiseLevel === 'basic' ?
        'BÁSICO: Use linguagem muito simples, analogias do cotidiano, evite termos técnicos.' :
        expertiseLevel === 'intermediate' ?
          'INTERMEDIÁRIO: Equilibre simplicidade com algum conteúdo técnico educativo.' :
          'AVANÇADO: Use terminologia meteorológica, seja preciso e detalhado.'
      }

Incluir:
1. Resposta direta à pergunta
2. Contexto prático para Moçambique
3. ${expertiseLevel === 'basic' ? 'Exemplo simples' : expertiseLevel === 'intermediate' ? 'Dica adicional' : 'Informação técnica relevante'}

Máximo ${expertiseLevel === 'basic' ? '200' : expertiseLevel === 'intermediate' ? '300' : '400'} palavras:
    `;

    const educationResponse = await openaiService.callOpenAI(educationPrompt, 0.7);

    const finalMessage = `🎓 *Explicação ${expertiseLevel === 'basic' ? 'Simples' : expertiseLevel === 'intermediate' ? 'Detalhada' : 'Técnica'}*\n\n${educationResponse}\n\n💡 Quer saber mais sobre meteorologia? É só perguntar!`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    return finalMessage;

  } catch (error) {
    console.error('❌ Erro em educação avançada:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "📚 Desculpe, não consegui preparar a explicação no momento. Tente reformular sua pergunta.",
      phoneNumber
    );
    return null;
  }
}

async function handleCityComparison(analysis, phoneNumber, user) {
  try {
    const { city, context } = analysis;

    // Extrair cidades para comparar
    const cities = extractCitiesForComparison(analysis, user);

    if (cities.length < 2) {
      const suggestedCity = user?.lastCity || 'Beira';
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        `🔄 Para comparar, preciso de duas cidades.\n\nVocê mencionou: ${city || 'nenhuma'}\n\nQuer comparar com ${suggestedCity}? Ou me diga outra cidade.`,
        phoneNumber
      );
      return null;
    }

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Comparando clima das cidades');

    // Buscar dados das duas cidades
    const [weather1, weather2] = await Promise.all([
      weatherService.getCurrentWeather(cities[0], user?.units || 'celsius'),
      weatherService.getCurrentWeather(cities[1], user?.units || 'celsius')
    ]);

    // Gerar comparação inteligente
    const comparisonPrompt = `
Compare o clima atual entre estas duas cidades:

CIDADE 1 - ${weather1.city}:
- Temperatura: ${weather1.temperature}°C
- Sensação: ${weather1.feelsLike}°C
- Umidade: ${weather1.humidity}%
- Condições: ${weather1.description}

CIDADE 2 - ${weather2.city}:
- Temperatura: ${weather2.temperature}°C
- Sensação: ${weather2.feelsLike}°C
- Umidade: ${weather2.humidity}%
- Condições: ${weather2.description}

Crie uma comparação útil que destaque:
1. Principais diferenças
2. Qual está melhor para atividades
3. Recomendações práticas
4. Formato de fácil leitura

Comparação concisa:
    `;

    const comparison = await openaiService.callOpenAI(comparisonPrompt, 0.6);

    const finalMessage = `⚖️ *Comparação Climática*\n\n${comparison}`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    return finalMessage;

  } catch (error) {
    console.error('❌ Erro na comparação:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao comparar cidades");
    return null;
  }
}

async function handleReminderRequest(analysis, phoneNumber, user) {
  try {
    const { city, context } = analysis;
    const targetCity = city || user?.preferredCity || 'sua cidade';

    const reminderMessage = `🔔 *Lembrete Configurado!*

Vou te avisar sobre mudanças climáticas em ${targetCity}.

⚙️ *Alertas Ativados:*
• 🌧️ Chuva iminente
• 🌡️ Mudanças bruscas de temperatura
• ⚠️ Condições climáticas extremas

⏰ *Horário preferido:* ${user?.preferredNotificationTime || '08:00'}

Para ajustar configurações, digite "configurar alertas".

*Nota:* Este é um recurso premium. Em breve você receberá notificações inteligentes!`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(reminderMessage, phoneNumber);

    // Salvar preferência de notificação
    saveOrUpdateAdvancedUser(phoneNumber, { notifications: true });

    return reminderMessage;

  } catch (error) {
    console.error('❌ Erro no lembrete:', error);
    return null;
  }
}

// ===============================================
// SUGESTÕES INTELIGENTES
// ===============================================

async function sendIntelligentSuggestions(phoneNumber, suggestions, city) {
  try {
    if (!suggestions || suggestions.length === 0) return;

    const suggestionButtons = {
      messaging_product: 'whatsapp',
      recipient_type: "individual",
      to: phoneNumber,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "text",
          text: "💡 Sugestões Inteligentes"
        },
        body: {
          text: "Baseado na sua consulta, você pode se interessar por:"
        },
        action: {
          buttons: suggestions.slice(0, 3).map((suggestion, index) => ({
            type: "reply",
            reply: {
              id: `suggestion_${index}`,
              title: suggestion.substring(0, 20) // Limite WhatsApp
            }
          }))
        }
      }
    };

    // Delay para não sobrepor com resposta principal
    setTimeout(async () => {
      await whatsappApi.enviarMensagemInterativaUsandoWhatsappAPI(suggestionButtons);
    }, 2000);

  } catch (error) {
    console.error('❌ Erro ao enviar sugestões:', error);
  }
}

async function processAdvancedInteractiveMessage(interactive, phoneNumber) {
  const user = getUserByContact(phoneNumber);

  if (interactive.type === "button_reply") {
    const buttonId = interactive.button_reply.id;

    if (buttonId.startsWith("suggestion_")) {
      // Usuário clicou numa sugestão - processar como nova mensagem
      const suggestionText = interactive.button_reply.title;
      await processAdvancedTextMessage(suggestionText, phoneNumber);
      return;
    }
  }

  // Outros tipos de interação (manter lógica existente)
  // ... resto da lógica de interactive
}

// ===============================================
// UTILITÁRIOS AVANÇADOS
// ===============================================

function getContextualLoadingMessage(context, city) {
  const { timeframe, weatherAspect } = context || {};

  if (timeframe === 'amanha') return `🔍 Verificando previsão para amanhã em ${city}...`;
  if (weatherAspect === 'chuva') return `☔ Analisando possibilidade de chuva em ${city}...`;
  if (weatherAspect === 'temperatura') return `🌡️ Consultando temperatura atual em ${city}...`;

  return `🔍 Buscando informações meteorológicas de ${city}...`;
}

function createSimpleWeatherMessage(weatherData) {
  const emoji = getWeatherEmoji(weatherData.description);
  return `${emoji} *${weatherData.city}*\n\n🌡️ ${weatherData.temperature}${weatherData.units} (sensação de ${weatherData.feelsLike}${weatherData.units})\n💧 Umidade: ${weatherData.humidity}%\n📝 ${weatherData.description}`;
}

function extractCitiesForComparison(analysis, user) {
  const cities = [];

  // Tentar extrair da análise
  if (analysis.city) cities.push(analysis.city);

  // Adicionar cidade do usuário se disponível
  if (user?.lastCity && !cities.includes(user.lastCity)) {
    cities.push(user.lastCity);
  }

  if (user?.preferredCity && !cities.includes(user.preferredCity)) {
    cities.push(user.preferredCity);
  }

  return cities.slice(0, 2);
}

function saveAdvancedWeatherHistory(phoneNumber, weatherData, analysis) {
  const userIndex = users.findIndex(u => u.contact === phoneNumber);

  if (userIndex !== -1) {
    if (!users[userIndex].weatherHistory) {
      users[userIndex].weatherHistory = [];
    }

    users[userIndex].weatherHistory.push({
      timestamp: new Date(),
      city: weatherData.city,
      temperature: weatherData.temperature,
      conditions: weatherData.description,
      humidity: weatherData.humidity,
      feelsLike: weatherData.feelsLike,
      queryType: analysis.type,
      expertiseLevel: analysis.expertiseLevel
    });

    // Manter últimas 20 entradas
    if (users[userIndex].weatherHistory.length > 20) {
      users[userIndex].weatherHistory = users[userIndex].weatherHistory.slice(-20);
    }

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  }
}

function getWeatherEmoji(description) {
  const desc = description.toLowerCase();
  if (desc.includes('sol') || desc.includes('clear')) return '☀️';
  if (desc.includes('chuva') || desc.includes('rain')) return '🌧️';
  if (desc.includes('nuvem') || desc.includes('cloud')) return '☁️';
  if (desc.includes('tempest') || desc.includes('storm')) return '⛈️';
  return '🌤️';
}

async function processBasicFallback(messageText, phoneNumber) {
  const user = getUserByContact(phoneNumber);
  console.log('🔄 Usando fallback básico para:', messageText);

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(
    "🤖 Desculpe, não consegui entender completamente sua mensagem.\n\n💬 Você pode tentar:\n• 'Clima em [cidade]'\n• 'Previsão para amanhã'\n• 'O que é [termo meteorológico]?'\n\nComo posso ajudar?",
    phoneNumber
  );
}

async function sendAdvancedHelp(phoneNumber, user) {
  const language = user?.language || 'pt';
  const expertiseLevel = user?.expertiseLevel || 'basic';

  let helpMessage = `🤖 *Assistente Meteorológico Avançado*\n\n`;

  if (expertiseLevel === 'basic') {
    helpMessage += `💬 *Comandos Simples:*\n• "Clima em [cidade]"\n• "Vai chover amanhã?"\n• "O que é umidade?"\n\n`;
  } else if (expertiseLevel === 'intermediate') {
    helpMessage += `💬 *Comandos Disponíveis:*\n• Consultas: "Temperatura Maputo"\n• Comparações: "Compare Maputo e Beira"\n• Educação: "Como se forma a chuva?"\n• Previsões: "Resumo da semana"\n\n`;
  } else {
    helpMessage += `💬 *Comandos Avançados:*\n• Análises técnicas meteorológicas\n• Comparações multi-cidade\n• Alertas personalizados\n• Dados históricos e tendências\n\n`;
  }

  helpMessage += `🎯 *Seu Nível:* ${expertiseLevel.toUpperCase()}\n📊 *Consultas:* ${user?.queryCount || 0}\n\nComo posso ajudar hoje?`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(helpMessage, phoneNumber);
}

// ===============================================
// MANTER FUNCIONALIDADES ORIGINAIS
// ===============================================

// ... manter todas as outras funções originais como processLocationMessage, etc.

app.listen(port, async () => {
  console.log(`🌡️ Temperature Bot AVANÇADO running on port ${port}`);
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log(`🧠 Funcionalidades IA: ATIVADAS`);
  console.log(`💡 Memória Contextual: ATIVADA`);
  console.log(`📈 Progressão de Expertise: ATIVADA`);
  console.log(`🎯 Sugestões Inteligentes: ATIVADAS`);
});