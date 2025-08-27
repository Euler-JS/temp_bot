// index.js - Versão com Supabase
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const WhatsAppApi = require("./whatsapp_api/connection");
const WeatherService = require("./weather_api/weather_service");
const OPENAI = require("./open_ai/open_ai");
const SupabaseService = require("./database/supabase");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// WHATSAPP API Configuration
const token = process.env.WHATSAPP_TOKEN || "";
const phoneNumberID = process.env.PHONE_NUMBER_ID || "";

// Inicializar serviços
const whatsappApi = new WhatsAppApi(token, phoneNumberID);
const weatherService = new WeatherService();
const openaiService = new OPENAI(process.env.OPEN_AI || "");
const dbService = new SupabaseService();

// ===============================================
// GESTÃO AVANÇADA DE USUÁRIOS COM SUPABASE
// ===============================================

async function getUserByContact(contact) {
  return await dbService.getUserByContact(contact);
}

async function saveOrUpdateAdvancedUser(contact, updates = {}) {
  return await dbService.saveOrUpdateAdvancedUser(contact, updates);
}

async function saveConversationContext(contact, message, analysis, response) {
  return await dbService.saveConversationContext(contact, message, analysis, response);
}

async function saveAdvancedWeatherHistory(contact, weatherData, analysis) {
  return await dbService.saveAdvancedWeatherHistory(contact, weatherData, analysis);
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
  const user = await getUserByContact(phoneNumber);

  try {
    console.log(`🧠 Processamento avançado: "${messageText}"`);

    // 1. Análise completa com IA
    const analysisResult = await openaiService.analyzeUserMessage(messageText, {
      preferredCity: user?.preferred_city,
      language: user?.language || 'pt',
      queryCount: user?.query_count || 0,
      expertiseLevel: user?.expertise_level || 'basic',
      conversationHistory: user?.conversation_history || [],
      lastCity: user?.last_city,
      weatherPreferences: user?.weather_preferences
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
    await saveConversationContext(phoneNumber, messageText, analysis, response);

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

    case 'practical_tips':
      return await handlePracticalTips(analysis, phoneNumber, user);

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
    const { city, action, context, intent } = analysis;
    let targetCity = city || user?.preferred_city;

    if (!targetCity) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "🏙️ Para consultar o clima, preciso saber a cidade. Qual cidade te interessa?",
        phoneNumber
      );
      return null;
    }

    // Verificar se é uma previsão de 7 dias
    if (context?.timeframe === 'semana' || intent === 'previsao_7_dias' ||
      analysis.originalMessage?.toLowerCase().includes('7 dias') ||
      analysis.originalMessage?.toLowerCase().includes('semanal')) {
      return await handleWeeklyForecast(targetCity, phoneNumber, user);
    }

    // Mensagem de loading contextual
    const loadingMsg = getContextualLoadingMessage(context, targetCity);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(loadingMsg, phoneNumber);

    // Buscar dados meteorológicos baseado no timeframe
    let weatherData;
    const timeframe = context?.timeframe;

    if (timeframe === 'amanha') {
      // Buscar previsão para amanhã
      const forecast = await weatherService.getWeatherForecast(targetCity, 2);
      if (forecast && forecast.length > 1) {
        const tomorrowData = forecast[1]; // Índice 1 = amanhã
        weatherData = {
          city: targetCity,
          temperature: Math.round((tomorrowData.maxTemp + tomorrowData.minTemp) / 2),
          maxTemp: tomorrowData.maxTemp,
          minTemp: tomorrowData.minTemp,
          description: tomorrowData.description,
          icon: tomorrowData.icon,
          units: user?.units === 'fahrenheit' ? '°F' : '°C',
          date: tomorrowData.date,
          isForecast: true,
          source: 'Forecast'
        };
      } else {
        throw new Error('Não foi possível obter a previsão para amanhã');
      }
    } else {
      // Buscar dados atuais
      weatherData = await weatherService.getCurrentWeather(
        targetCity,
        user?.units || 'celsius'
      );
    }

    // Gerar resposta contextual com IA
    const contextualResponse = await openaiService.generateContextualResponse(
      analysis,
      weatherData,
      {
        ...user,
        conversationHistory: user?.conversation_history || []
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
    await saveAdvancedWeatherHistory(phoneNumber, weatherData, analysis);

    // Atualizar usuário
    await saveOrUpdateAdvancedUser(phoneNumber, {
      last_city: targetCity,
      preferred_city: user?.preferred_city || targetCity
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
Histórico: ${user?.conversation_history?.length || 0} consultas anteriores

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

async function handleWeeklyForecast(city, phoneNumber, user) {
  try {
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      `📅 Buscando previsão completa de 7 dias para ${city}...`,
      phoneNumber
    );

    // Buscar previsão de 7 dias
    const forecast = await weatherService.getWeatherForecast(city, 7);

    if (!forecast || forecast.length === 0) {
      throw new Error('Não foi possível obter a previsão de 7 dias');
    }

    // Gerar resposta baseada no nível do usuário
    const expertiseLevel = user?.expertise_level || 'basic';
    let message = `📅 *Previsão de 7 dias - ${city}*\n\n`;

    if (expertiseLevel === 'basic') {
      // Versão simples
      forecast.forEach((day, index) => {
        const dayName = index === 0 ? 'Hoje' :
          index === 1 ? 'Amanhã' :
            `${new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' })}`;

        message += `${dayName}: ${day.minTemp}°C - ${day.maxTemp}°C, ${day.description}\n`;
      });
    } else {
      // Versão mais detalhada
      forecast.forEach((day, index) => {
        const dayName = index === 0 ? 'Hoje' :
          index === 1 ? 'Amanhã' :
            new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' });

        message += `📊 *${dayName}*\n`;
        message += `🌡️ ${day.minTemp}°C - ${day.maxTemp}°C\n`;
        message += `☀️ ${day.description}\n\n`;
      });
    }

    message += `\n💡 *Dica:* Para informações mais detalhadas de um dia específico, pergunte "Como estará amanhã?" ou "Tempo em [data]"`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(message, phoneNumber);

    // Salvar no histórico
    await saveOrUpdateAdvancedUser(phoneNumber, {
      last_city: city,
      query_count: (user?.query_count || 0) + 1
    });

    return message;

  } catch (error) {
    console.error('❌ Erro na previsão de 7 dias:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      `❌ Não consegui obter a previsão de 7 dias para ${city}. Tente novamente em alguns minutos.`,
      phoneNumber
    );
    return null;
  }
}

async function handlePracticalTips(analysis, phoneNumber, user) {
  try {
    const { city, context, originalMessage } = analysis;
    const targetCity = city || user?.preferred_city || user?.last_city;

    if (!targetCity) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "🏙️ Para dar dicas específicas, preciso saber a cidade. Qual cidade te interessa?",
        phoneNumber
      );
      return null;
    }

    // Buscar dados atuais do clima
    const weatherData = await weatherService.getCurrentWeather(targetCity, user?.units || 'celsius');

    let tipMessage = `💡 *Dicas para ${targetCity}*\n\n`;

    // Identificar que tipo de dica foi solicitada
    const message = originalMessage?.toLowerCase() || '';

    if (message.includes('roupa') || message.includes('vestir')) {
      tipMessage += generateClothingTips(weatherData);
    } else if (message.includes('calor') || message.includes('frio')) {
      tipMessage += generateTemperatureTips(weatherData);
    } else if (message.includes('chuva') || message.includes('guarda-chuva')) {
      tipMessage += generateRainTips(weatherData);
    } else if (message.includes('atividade') || message.includes('exerc')) {
      tipMessage += generateActivityTips(weatherData);
    } else {
      // Dicas gerais baseadas no clima atual
      tipMessage += generateGeneralTips(weatherData);
    }

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(tipMessage, phoneNumber);

    // Salvar no histórico
    await saveOrUpdateAdvancedUser(phoneNumber, {
      last_city: targetCity,
      query_count: (user?.query_count || 0) + 1
    });

    return tipMessage;

  } catch (error) {
    console.error('❌ Erro ao gerar dicas práticas:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Não consegui gerar dicas no momento. Tente novamente em alguns minutos.",
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
      const suggestedCity = user?.last_city || 'Beira';
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
    const targetCity = city || user?.preferred_city || 'sua cidade';

    const reminderMessage = `🔔 *Lembrete Configurado!*

Vou te avisar sobre mudanças climáticas em ${targetCity}.

⚙️ *Alertas Ativados:*
• 🌧️ Chuva iminente
• 🌡️ Mudanças bruscas de temperatura
• ⚠️ Condições climáticas extremas

⏰ *Horário preferido:* ${user?.preferred_notification_time || '08:00'}

Para ajustar configurações, digite "configurar alertas".

*Nota:* Este é um recurso premium. Em breve você receberá notificações inteligentes!`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(reminderMessage, phoneNumber);

    // Salvar preferência de notificação
    await saveOrUpdateAdvancedUser(phoneNumber, { notifications: true });

    return reminderMessage;

  } catch (error) {
    console.error('❌ Erro no lembrete:', error);
    return null;
  }
}

async function handleOffTopicAdvanced(analysis, phoneNumber, user) {
  const offTopicMessage = `🤖 Sou especializado em clima e meteorologia! 

🌤️ *Posso ajudar com:*
• Temperatura atual de qualquer cidade
• Previsões meteorológicas
• Explicações sobre fenômenos climáticos
• Comparações entre cidades
• Alertas climáticos personalizados

💬 Tente perguntar: "Como está o clima em Maputo?"`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(offTopicMessage, phoneNumber);
  return offTopicMessage;
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
          buttons: suggestions.slice(0, 3).map((suggestion, index) => {
            // Criar um mapeamento mais inteligente para botões
            let buttonText = suggestion;
            let buttonId = `suggestion_${index}`;

            // Mapear sugestões específicas para comandos mais claros
            if (suggestion.toLowerCase().includes('previsão') || suggestion.toLowerCase().includes('7 dias')) {
              buttonText = "Previsão 7 dias";
              buttonId = `forecast_7days_${city || 'current'}`;
            } else if (suggestion.toLowerCase().includes('amanhã')) {
              buttonText = "Tempo amanhã";
              buttonId = `forecast_tomorrow_${city || 'current'}`;
            } else if (suggestion.toLowerCase().includes('roupa')) {
              buttonText = "Que roupa usar";
              buttonId = `clothing_tips_${city || 'current'}`;
            } else if (suggestion.toLowerCase().includes('comparar')) {
              buttonText = "Comparar cidades";
              buttonId = `compare_cities`;
            } else {
              // Limitar caracteres para outras sugestões
              buttonText = suggestion.substring(0, 20);
              buttonId = `suggestion_${index}`;
            }

            return {
              type: "reply",
              reply: {
                id: buttonId,
                title: buttonText
              }
            };
          })
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
  const user = await getUserByContact(phoneNumber);

  if (interactive.type === "button_reply") {
    const buttonId = interactive.button_reply.id;
    const buttonTitle = interactive.button_reply.title;

    console.log(`🔘 Botão pressionado: ${buttonId} - "${buttonTitle}"`);

    // Processar botões específicos primeiro
    if (buttonId.startsWith("forecast_7days_")) {
      const city = buttonId.replace("forecast_7days_", "") === "current" ?
        (user?.preferred_city || user?.last_city || "Maputo") :
        buttonId.replace("forecast_7days_", "");
      await processAdvancedTextMessage(`previsão de 7 dias ${city}`, phoneNumber);
      return;
    }

    if (buttonId.startsWith("forecast_tomorrow_")) {
      const city = buttonId.replace("forecast_tomorrow_", "") === "current" ?
        (user?.preferred_city || user?.last_city || "Maputo") :
        buttonId.replace("forecast_tomorrow_", "");
      await processAdvancedTextMessage(`tempo amanhã em ${city}`, phoneNumber);
      return;
    }

    if (buttonId.startsWith("clothing_tips_")) {
      const city = buttonId.replace("clothing_tips_", "") === "current" ?
        (user?.preferred_city || user?.last_city || "Maputo") :
        buttonId.replace("clothing_tips_", "");
      await processAdvancedTextMessage(`que roupa usar em ${city}`, phoneNumber);
      return;
    }

    if (buttonId === "compare_cities") {
      await processAdvancedTextMessage("comparar clima entre cidades", phoneNumber);
      return;
    }

    if (buttonId.startsWith("suggestion_")) {
      // Usuário clicou numa sugestão genérica - usar o título do botão
      await processAdvancedTextMessage(buttonTitle, phoneNumber);
      return;
    }

    // Outros botões interativos (mantidos do código original)
    switch (buttonId) {
      case "quick_weather":
        const city = user?.preferred_city || "Maputo";
        await processAdvancedTextMessage(`clima em ${city}`, phoneNumber);
        break;

      case "forecast_7days":
        const forecastCity = user?.preferred_city || "Maputo";
        await processAdvancedTextMessage(`previsão 7 dias ${forecastCity}`, phoneNumber);
        break;

      case "settings_menu":
        await whatsappApi.enviarMenuConfiguracoes(phoneNumber, user);
        break;

      default:
        await processAdvancedTextMessage(buttonId, phoneNumber);
    }
  }

  if (interactive.type === "list_reply") {
    const listId = interactive.list_reply.id;

    // Processar como texto normal
    await processAdvancedTextMessage(listId, phoneNumber);
  }
}

async function processLocationMessage(location, phoneNumber) {
  try {
    const { latitude, longitude } = location;

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Identificando localização');

    // Aqui você poderia usar uma API de geocoding reverso
    // Por exemplo, OpenWeatherMap, Google Maps, etc.

    const locationMessage = `📍 *Localização Recebida*

Latitude: ${latitude}
Longitude: ${longitude}

💡 Para obter o clima da sua localização, me diga o nome da cidade mais próxima.

Exemplo: "clima aqui" ou "temperatura atual"`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(locationMessage, phoneNumber);

  } catch (error) {
    console.error('❌ Erro ao processar localização:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao processar localização");
  }
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

  if (weatherData.isForecast) {
    return `${emoji} *Previsão para amanhã em ${weatherData.city}*\n\n🌡️ ${weatherData.minTemp}${weatherData.units} - ${weatherData.maxTemp}${weatherData.units}\n📅 ${weatherData.date}\n📝 ${weatherData.description}`;
  }

  return `${emoji} *${weatherData.city}*\n\n🌡️ ${weatherData.temperature}${weatherData.units} (sensação de ${weatherData.feelsLike}${weatherData.units})\n💧 Umidade: ${weatherData.humidity}%\n📝 ${weatherData.description}`;
}

function extractCitiesForComparison(analysis, user) {
  const cities = [];

  // Tentar extrair da análise
  if (analysis.city) cities.push(analysis.city);

  // Adicionar cidade do usuário se disponível
  if (user?.last_city && !cities.includes(user.last_city)) {
    cities.push(user.last_city);
  }

  if (user?.preferred_city && !cities.includes(user.preferred_city)) {
    cities.push(user.preferred_city);
  }

  return cities.slice(0, 2);
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
  const user = await getUserByContact(phoneNumber);
  console.log('🔄 Usando fallback básico para:', messageText);

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(
    "🤖 Desculpe, não consegui entender completamente sua mensagem.\n\n💬 Você pode tentar:\n• 'Clima em [cidade]'\n• 'Previsão para amanhã'\n• 'O que é [termo meteorológico]?'\n\nComo posso ajudar?",
    phoneNumber
  );
}

async function sendAdvancedHelp(phoneNumber, user) {
  const language = user?.language || 'pt';
  const expertiseLevel = user?.expertise_level || 'basic';

  let helpMessage = `🤖 *Assistente Meteorológico Avançado*\n\n`;

  if (expertiseLevel === 'basic') {
    helpMessage += `💬 *Comandos Simples:*\n• "Clima em [cidade]"\n• "Vai chover amanhã?"\n• "O que é umidade?"\n\n`;
  } else if (expertiseLevel === 'intermediate') {
    helpMessage += `💬 *Comandos Disponíveis:*\n• Consultas: "Temperatura Maputo"\n• Comparações: "Compare Maputo e Beira"\n• Educação: "Como se forma a chuva?"\n• Previsões: "Resumo da semana"\n\n`;
  } else {
    helpMessage += `💬 *Comandos Avançados:*\n• Análises técnicas meteorológicas\n• Comparações multi-cidade\n• Alertas personalizados\n• Dados históricos e tendências\n\n`;
  }

  helpMessage += `🎯 *Seu Nível:* ${expertiseLevel.toUpperCase()}\n📊 *Consultas:* ${user?.query_count || 0}\n\nComo posso ajudar hoje?`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(helpMessage, phoneNumber);
}

// ===============================================
// ROTAS DE ESTATÍSTICAS E ADMIN
// ===============================================

app.get("/stats", async (req, res) => {
  try {
    const stats = await dbService.getStats();

    if (!stats) {
      return res.status(500).json({ error: "Erro ao obter estatísticas" });
    }

    const activeUsers = await dbService.getActiveUsers(7);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: stats,
      recentUsers: activeUsers.slice(0, 10).map(user => ({
        contact: user.contact.substring(0, 6) + "****", // Ofuscar contato
        lastAccess: user.last_access,
        queryCount: user.query_count,
        expertiseLevel: user.expertise_level,
        preferredCity: user.preferred_city
      }))
    });

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/health", async (req, res) => {
  try {
    // Testar conexões
    const dbOk = await dbService.testConnection();
    const openaiOk = await openaiService.testConnection();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? "ok" : "error",
        openai: openaiOk.success ? "ok" : "error",
        whatsapp: token && phoneNumberID ? "configured" : "not configured"
      }
    });

  } catch (error) {
    console.error('❌ Erro no health check:', error);
    res.status(500).json({ status: "error", error: error.message });
  }
});

// ===============================================
// INICIALIZAÇÃO DO SERVIDOR
// ===============================================

app.listen(port, async () => {
  console.log(`🌡️ Temperature Bot com SUPABASE running on port ${port}`);
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);

  // Testar conexões na inicialização
  try {
    const dbTest = await dbService.testConnection();
    console.log(`🗄️  Database (Supabase): ${dbTest ? '✅ OK' : '❌ ERRO'}`);

    const aiTest = await openaiService.testConnection();
    console.log(`🧠 OpenAI: ${aiTest.success ? '✅ OK' : '❌ ERRO'}`);

    console.log(`💡 Funcionalidades ativas:`);
    console.log(`   • Memória Contextual: ✅`);
    console.log(`   • Progressão de Expertise: ✅`);
    console.log(`   • Sugestões Inteligentes: ✅`);
    console.log(`   • Armazenamento Persistente: ✅ Supabase`);

  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
  }
});

// ===============================================
// FUNÇÕES AUXILIARES PARA DICAS PRÁTICAS
// ===============================================

function generateClothingTips(weatherData) {
  const temp = parseInt(weatherData.temperature);
  const isRaining = weatherData.description.toLowerCase().includes('chuva');

  let tips = `👕 *Que roupa usar hoje:*\n\n`;

  if (temp > 30) {
    tips += `🌡️ Faz ${temp}°C - está quente!\n`;
    tips += `• Roupas leves e claras\n`;
    tips += `• Tecidos que respiram (algodão, linho)\n`;
    tips += `• Chapéu ou boné\n`;
    tips += `• Protetor solar\n`;
  } else if (temp > 25) {
    tips += `🌡️ ${temp}°C - temperatura agradável\n`;
    tips += `• Roupas leves\n`;
    tips += `• Camiseta e bermuda/saia\n`;
    tips += `• Tênis confortável\n`;
  } else if (temp > 18) {
    tips += `🌡️ ${temp}°C - fresquinho\n`;
    tips += `• Calça leve e blusa\n`;
    tips += `• Casaco leve para a noite\n`;
    tips += `• Sapato fechado\n`;
  } else {
    tips += `🌡️ ${temp}°C - está frio!\n`;
    tips += `• Roupas em camadas\n`;
    tips += `• Casaco quente\n`;
    tips += `• Calça comprida\n`;
    tips += `• Sapato fechado e meia\n`;
  }

  if (isRaining) {
    tips += `\n☔ *Está chovendo:*\n`;
    tips += `• Guarda-chuva ou capa de chuva\n`;
    tips += `• Sapato à prova d'água\n`;
    tips += `• Evite roupas claras\n`;
  }

  return tips;
}

function generateTemperatureTips(weatherData) {
  const temp = parseInt(weatherData.temperature);
  const humidity = weatherData.humidity;

  let tips = '';

  if (temp > 30) {
    tips += `🔥 *Dicas para o calor (${temp}°C):*\n\n`;
    tips += `💧 Hidrate-se constantemente\n`;
    tips += `🏠 Fique em locais frescos nas horas mais quentes\n`;
    tips += `⏰ Evite o sol das 10h às 16h\n`;
    tips += `🚿 Tome banhos frescos\n`;
    tips += `🥗 Prefira alimentos leves\n`;

    if (humidity > 70) {
      tips += `\n🌫️ Umidade alta (${humidity}%) - sensação de abafado\n`;
      tips += `💨 Use ventilador ou ar condicionado\n`;
    }
  } else if (temp < 15) {
    tips += `🧊 *Dicas para o frio (${temp}°C):*\n\n`;
    tips += `🍵 Beba líquidos quentes\n`;
    tips += `🏃‍♀️ Mantenha-se ativo para aquecer\n`;
    tips += `🧦 Proteja extremidades (mãos, pés, orelhas)\n`;
    tips += `🍲 Prefira alimentos quentes\n`;
    tips += `🏠 Mantenha ambientes aquecidos\n`;
  } else {
    tips += `🌡️ *Temperatura agradável (${temp}°C):*\n\n`;
    tips += `😊 Perfeito para atividades ao ar livre\n`;
    tips += `🚶‍♀️ Ótimo para caminhadas\n`;
    tips += `🌳 Aproveite parques e praças\n`;
    tips += `📸 Dia ideal para fotos\n`;
  }

  return tips;
}

function generateRainTips(weatherData) {
  const isRaining = weatherData.description.toLowerCase().includes('chuva');

  let tips = '';

  if (isRaining) {
    tips += `☔ *Está chovendo em ${weatherData.city}:*\n\n`;
    tips += `🌂 Leve guarda-chuva sempre\n`;
    tips += `👟 Use sapato antiderrapante\n`;
    tips += `🚗 Dirija com cuidado redobrado\n`;
    tips += `🏠 Prefira atividades internas\n`;
    tips += `📱 Tenha guarda-chuva no carro\n`;
  } else {
    tips += `☀️ *Sem chuva em ${weatherData.city}:*\n\n`;
    tips += `😊 Dia livre para atividades externas\n`;
    tips += `🧺 Bom para estender roupas\n`;
    tips += `🚲 Perfeito para exercícios ao ar livre\n`;
    tips += `🌳 Aproveite para ir ao parque\n`;
  }

  return tips;
}

function generateActivityTips(weatherData) {
  const temp = parseInt(weatherData.temperature);
  const isRaining = weatherData.description.toLowerCase().includes('chuva');

  let tips = `🏃‍♀️ *Atividades recomendadas:*\n\n`;

  if (isRaining) {
    tips += `☔ *Atividades internas:*\n`;
    tips += `🏋️‍♀️ Academia ou exercícios em casa\n`;
    tips += `🛍️ Shopping centers\n`;
    tips += `📚 Biblioteca ou estudo\n`;
    tips += `🎬 Cinema\n`;
    tips += `☕ Café com amigos\n`;
  } else if (temp > 30) {
    tips += `🌡️ *Calor (${temp}°C) - atividades na sombra:*\n`;
    tips += `🏊‍♀️ Piscina ou praia\n`;
    tips += `🌳 Parque com sombra\n`;
    tips += `🕕 Exercícios antes das 9h ou após 17h\n`;
    tips += `🛍️ Shopping (ar condicionado)\n`;
    tips += `🍦 Sorveteria\n`;
  } else if (temp < 15) {
    tips += `🧊 *Frio (${temp}°C) - atividades aquecidas:*\n`;
    tips += `☕ Café ou chá quente\n`;
    tips += `🏋️‍♀️ Academia\n`;
    tips += `🛍️ Shopping centers\n`;
    tips += `📚 Leitura em casa\n`;
    tips += `🎮 Jogos em casa\n`;
  } else {
    tips += `😊 *Clima perfeito (${temp}°C):*\n`;
    tips += `🚶‍♀️ Caminhada ou corrida\n`;
    tips += `🚲 Ciclismo\n`;
    tips += `🌳 Piquenique no parque\n`;
    tips += `⚽ Esportes ao ar livre\n`;
    tips += `📸 Fotografia\n`;
  }

  return tips;
}

function generateGeneralTips(weatherData) {
  const temp = parseInt(weatherData.temperature);
  const isRaining = weatherData.description.toLowerCase().includes('chuva');

  let tips = `💡 *Dicas gerais para hoje:*\n\n`;

  // Dicas de vestuário
  tips += generateClothingTips(weatherData).replace('👕 *Que roupa usar hoje:*\n\n', '👕 *Vestuário:*\n');

  // Dicas de atividades
  tips += `\n🏃‍♀️ *Atividades:*\n`;
  if (isRaining) {
    tips += `• Prefira atividades internas\n`;
  } else if (temp > 25 && temp < 30) {
    tips += `• Ótimo para atividades ao ar livre\n`;
  } else if (temp > 30) {
    tips += `• Evite sol forte (10h-16h)\n`;
  } else {
    tips += `• Vista-se adequadamente para o frio\n`;
  }

  return tips;
}