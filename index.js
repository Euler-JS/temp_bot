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

async function processAdvancedTextMessage(messageText, phoneNumber, enableAutoDetection = true) {
  const user = await getUserByContact(phoneNumber);

  try {
    console.log(`🧠 Processamento avançado: "${messageText}"`);

    // Verificar comandos especiais primeiro
    if (messageText.toLowerCase().startsWith('/sugestoes') ||
      messageText.toLowerCase().startsWith('/sugestões') ||
      messageText.toLowerCase() === 'sugestoes' ||
      messageText.toLowerCase() === 'sugestões') {
      return await handleSuggestionsCommand(phoneNumber, user);
    }

    // Novo comando para conselhos por bairro
    if (messageText.toLowerCase().startsWith('/conselhos') ||
      messageText.toLowerCase() === 'conselhos') {
      return await handleNeighborhoodMenuCommand(phoneNumber, user);
    }

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

    // 2. Roteamento inteligente (com controle de detecção automática de bairros)
    const response = await routeAdvancedRequest(analysis, messageText, phoneNumber, user, enableAutoDetection);

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

async function routeAdvancedRequest(analysis, originalMessage, phoneNumber, user, enableAutoNeighborhoodDetection = false) {
  const { type, action, intent } = analysis;

  console.log(`🎯 Roteamento avançado: type=${type}, action=${action}`);

  // SEMPRE detectar bairros quando a mensagem contém "conselhos para" 
  const neighborhood = detectNeighborhood(originalMessage);
  if (neighborhood && (originalMessage.toLowerCase().includes('conselho') ||
    originalMessage.toLowerCase().includes('dica'))) {
    console.log(`🏘️ Detectado bairro: ${neighborhood} - Forçando rota de conselhos por bairro`);
    return await handleNeighborhoodAdvice({ ...analysis, neighborhood }, phoneNumber, user);
  }

  // Detectar se há menção de bairros da Beira para outros casos
  if (enableAutoNeighborhoodDetection && neighborhood) {
    if (originalMessage.toLowerCase().includes('chuva') ||
      originalMessage.toLowerCase().includes('calor') ||
      originalMessage.toLowerCase().includes('frio') ||
      type === 'weather_data') {
      console.log(`🏘️ Detectado bairro automaticamente: ${neighborhood}`);
      return await handleNeighborhoodAdvice({ ...analysis, neighborhood }, phoneNumber, user);
    }
  }

  switch (type) {
    case 'weather_data':
      return await handleAdvancedWeatherData(analysis, phoneNumber, user);

    case 'weather_education':
      return await handleAdvancedEducation(analysis, originalMessage, phoneNumber, user);

    case 'comparison':
      return await handleCityComparison(analysis, phoneNumber, user);

    case 'practical_tips':
      return await handlePracticalTips(analysis, phoneNumber, user);

    case 'neighborhood_advice':
      return await handleNeighborhoodAdvice(analysis, phoneNumber, user);

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

async function handleSuggestionsCommand(phoneNumber, user) {
  try {
    console.log(`💡 Comando /sugestoes acionado para ${phoneNumber}`);

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Eh pá, deixa eu ver umas sugestões fixes para ti');

    // Criar contexto para as sugestões baseado no usuário
    const userContext = {
      preferredCity: user?.preferred_city || user?.last_city,
      lastCity: user?.last_city,
      queryCount: user?.query_count || 0,
      expertiseLevel: user?.expertise_level || 'basic',
      conversationHistory: user?.conversation_history || [],
      weatherPreferences: user?.weather_preferences
    };

    // Simular uma análise básica para gerar sugestões contextuais
    const mockAnalysis = {
      type: 'suggestions_request',
      city: userContext.preferredCity || 'Maputo',
      intent: 'gerar_sugestoes_inteligentes',
      action: 'show_smart_suggestions',
      expertiseLevel: userContext.expertiseLevel,
      context: {
        isCommand: true,
        timeframe: 'hoje',
        complexity: userContext.expertiseLevel,
        weatherAspect: 'geral'
      }
    };

    // Buscar dados meteorológicos da cidade preferida para contexto
    let weatherData = null;
    if (userContext.preferredCity) {
      try {
        weatherData = await weatherService.getCurrentWeather(
          userContext.preferredCity,
          user?.units || 'celsius'
        );
      } catch (error) {
        console.log('⚠️ Erro ao buscar dados meteorológicos para sugestões:', error.message);
      }
    }

    // Se não temos dados meteorológicos, criar dados mock para as sugestões
    if (!weatherData) {
      weatherData = {
        city: userContext.preferredCity || 'Maputo',
        temperature: 25,
        description: 'Tempo fixe',
        humidity: 60,
        units: '°C',
        isForecast: false
      };
    }

    // Gerar sugestões inteligentes usando a IA
    const suggestions = await openaiService.generateIntelligentSuggestions(
      mockAnalysis,
      weatherData,
      userContext
    );

    // Criar mensagem personalizada baseada no perfil do usuário
    let suggestionsMessage = `💡 *Eh pá, aqui tens umas sugestões fixes!*\n\n`;

    suggestionsMessage += `👤 *Como andas por aí:*\n`;
    const nivelMap = {
      'basic': 'Principiante (tás a começar)',
      'intermediate': 'Médio (já percebes bem)',
      'advanced': 'Experiente (és um expert!)'
    };
    suggestionsMessage += `• Nível: ${nivelMap[userContext.expertiseLevel] || userContext.expertiseLevel}\n`;
    suggestionsMessage += `• Já fizeste ${userContext.queryCount} perguntas\n`;

    if (userContext.preferredCity) {
      suggestionsMessage += `• Tua cidade: ${userContext.preferredCity}\n`;
      if (weatherData && !weatherData.error) {
        suggestionsMessage += `• Agora está ${weatherData.temperature}${weatherData.units}\n`;
      }
    }

    suggestionsMessage += `\n🎯 *Sugestões que podem te interessar:*\n`;

    if (suggestions && suggestions.length > 0) {
      suggestions.forEach((suggestion, index) => {
        suggestionsMessage += `${index + 1}. ${suggestion}\n`;
      });
    } else {
      // Sugestões de fallback baseadas no nível do usuário - versão moçambicana
      if (userContext.expertiseLevel === 'basic') {
        suggestionsMessage += `1. Como está o tempo hoje\n`;
        suggestionsMessage += `2. Vai chover amanhã?\n`;
        suggestionsMessage += `3. Que roupa devo vestir\n`;
      } else if (userContext.expertiseLevel === 'intermediate') {
        suggestionsMessage += `1. Previsão da próxima semana\n`;
        suggestionsMessage += `2. Comparar tempo entre cidades\n`;
        suggestionsMessage += `3. Conselhos para atividades\n`;
      } else {
        suggestionsMessage += `1. Análise técnica do clima\n`;
        suggestionsMessage += `2. Alertas meteorológicos\n`;
        suggestionsMessage += `3. Histórico do tempo\n`;
      }
    }

    suggestionsMessage += `\n💬 *Como usar:* É só escrever qualquer uma das sugestões aí em cima, ou pergunta o que quiseres.\n`;
    suggestionsMessage += `\n🔄 *Eh pá:* Quanto mais usares o bot, mais ele aprende contigo e as sugestões ficam melhores!`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(suggestionsMessage, phoneNumber);

    // Enviar botões interativos com as sugestões se disponíveis
    if (suggestions && suggestions.length > 0) {
      await sendInteractiveSuggestionButtons(phoneNumber, suggestions, userContext);
    }

    // Atualizar contador de consultas
    await saveOrUpdateAdvancedUser(phoneNumber, {
      query_count: (userContext.queryCount || 0) + 1,
      last_command: '/sugestoes'
    });

    return suggestionsMessage;

  } catch (error) {
    console.error('❌ Erro ao processar comando /sugestoes:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Eh pá, não consegui gerar sugestões agora. Tenta mais tarde.\n\n💡 Podes sempre perguntar directamente: \"Como está o tempo?\"",
      phoneNumber
    );
    return null;
  }
}

async function sendInteractiveSuggestionButtons(phoneNumber, suggestions, userContext) {
  try {
    console.log('🎯 Tentando enviar sugestões interativas para:', phoneNumber);
    console.log('📝 Sugestões recebidas:', suggestions);

    // Primeiro, enviar como mensagem de texto simples
    const simpleMessage = `🎯 *Aqui tens umas sugestões fixes!*\n\n` +
      suggestions.slice(0, 3).map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n') +
      `\n\n💡 *Como usar:* É só escrever o número ou a pergunta directamente.\n` +
      `📝 Exemplo: Escreve "1" para a primeira sugestão, ou pergunta à vontade!`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(simpleMessage, phoneNumber);
    console.log('✅ Sugestões enviadas como texto simples');

    // Tentar botões muito simples depois de um delay
    setTimeout(async () => {
      try {
        console.log('🔘 Tentando enviar botões simples...');

        const simpleButtons = {
          messaging_product: 'whatsapp',
          recipient_type: "individual",
          to: phoneNumber,
          type: "interactive",
          interactive: {
            type: "button",
            body: {
              text: "Escolha uma opção rápida:"
            },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: {
                    id: "opcao_1",
                    title: "Clima hoje"
                  }
                },
                {
                  type: "reply",
                  reply: {
                    id: "opcao_2",
                    title: "Previsão"
                  }
                },
                {
                  type: "reply",
                  reply: {
                    id: "opcao_3",
                    title: "Ajuda"
                  }
                }
              ]
            }
          }
        };

        const response = await whatsappApi.enviarMensagemInterativaUsandoWhatsappAPI(simpleButtons);
        console.log('✅ Botões simples enviados com sucesso:', response);

      } catch (buttonError) {
        console.error('❌ Erro ao enviar botões simples:');
        console.error('📄 Response data:', buttonError.response?.data);
        console.error('📊 Status:', buttonError.response?.status);
        console.error('🔧 Config:', buttonError.config?.data);

        // Fallback: enviar as opções como texto
        const fallbackMessage = `\n🔘 *Opções rápidas disponíveis:*\n` +
          `• Digite "clima hoje" para o tempo atual\n` +
          `• Digite "previsão" para previsão do tempo\n` +
          `• Digite "ajuda" para mais opções`;

        await whatsappApi.enviarMensagemUsandoWhatsappAPI(fallbackMessage, phoneNumber);
      }
    }, 3000);

  } catch (error) {
    console.error('❌ Erro geral ao enviar sugestões:', error);
  }
}

async function handleNeighborhoodMenuCommand(phoneNumber, user) {
  try {
    console.log(`🏘️ Comando /conselhos acionado para ${phoneNumber}`);

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Eh pá, deixa eu preparar os conselhos para os bairros');

    // Buscar dados meteorológicos da Beira para contexto
    let weatherData = null;
    try {
      weatherData = await weatherService.getCurrentWeather('Beira', user?.units || 'celsius');
    } catch (error) {
      console.log('⚠️ Erro ao buscar dados meteorológicos da Beira:', error.message);
    }

    // Criar mensagem contextual baseada no clima atual
    let conselhosMessage = `🏘️ *Eee mano, conselhos por bairro aqui na Beira!*\n\n`;

    if (weatherData && !weatherData.error) {
      conselhosMessage += `🌤️ *Como está o tempo agora na nossa cidade:*\n`;
      conselhosMessage += `🌡️ Temperatura: ${weatherData.temperature}°C`;

      const temp = parseInt(weatherData.temperature);
      if (temp > 30) {
        conselhosMessage += ` (eish, está quente!)\n`;
      } else if (temp < 18) {
        conselhosMessage += ` (está frio hoje)\n`;
      } else {
        conselhosMessage += ` (está fixe)\n`;
      }

      conselhosMessage += `💧 Umidade: ${weatherData.humidity}%\n`;
      conselhosMessage += `📝 ${weatherData.description}\n\n`;
    }

    conselhosMessage += `💡 *Escolhe um bairro para receber dicas específicas conforme o tempo de hoje:*\n\n`;

    conselhosMessage += `📍 *Bairros que conheço bem:*\n`;
    conselhosMessage += `• Macúti - Zona da praia e hotéis\n`;
    conselhosMessage += `• Manga - Centro da cidade\n`;
    conselhosMessage += `• Goto - Bairro residencial\n`;
    conselhosMessage += `• Munhava - Bairro bem movimentado\n`;
    conselhosMessage += `• Chaimite - Bairro grande\n`;
    conselhosMessage += `• Ndunda - Zona nova em crescimento\n`;
    conselhosMessage += `• Cidade de Cimento - Centro histórico\n`;
    conselhosMessage += `• Palmeiras - Zona mista\n\n`;

    if (weatherData && !weatherData.error) {
      const temp = parseInt(weatherData.temperature);
      const isRaining = weatherData.description.toLowerCase().includes('chuva');

      if (isRaining) {
        conselhosMessage += `⚠️ *Atenção:* Está chovendo! Alguns bairros podem ter riscos específicos.\n`;
      } else if (temp > 30) {
        conselhosMessage += `🔥 *Atenção:* Calor intenso! Cuidados especiais recomendados.\n`;
      } else if (temp < 20) {
        conselhosMessage += `🧊 *Atenção:* Tempo fresco! Vista-se adequadamente.\n`;
      }
    }

    conselhosMessage += `\n💬 *Como usar:*\n`;
    conselhosMessage += `Digite: "conselhos para [bairro]"\n`;
    conselhosMessage += `Exemplo: "conselhos para Macúti"\n\n`;
    conselhosMessage += `� *Bairros disponíveis:*\n`;
    conselhosMessage += `• Macúti, Manga, Goto, Munhava\n`;
    conselhosMessage += `• Chaimite, Ndunda, Palmeiras\n`;
    conselhosMessage += `• Cidade de Cimento, Ponta-Gêa`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(conselhosMessage, phoneNumber);

    // Enviar mensagem interativa com bairros disponíveis
    await sendNeighborhoodSelectionButtons(phoneNumber);

    // Atualizar contador de consultas
    await saveOrUpdateAdvancedUser(phoneNumber, {
      query_count: (user?.query_count || 0) + 1,
      last_command: '/conselhos'
    });

    return conselhosMessage;

  } catch (error) {
    console.error('❌ Erro ao processar comando /conselhos:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Não consegui carregar o menu de conselhos agora. Tenta mais tarde.\n\n💡 Podes sempre perguntar directamente: \"conselhos para [bairro]\"",
      phoneNumber
    );
    return null;
  }
}

async function sendNeighborhoodSelectionButtons(phoneNumber) {
  try {
    // Aguardar um pouco para não sobrepor com a mensagem anterior
    setTimeout(async () => {
      const neighborhoodButtons = {
        messaging_product: 'whatsapp',
        recipient_type: "individual",
        to: phoneNumber,
        type: "interactive",
        interactive: {
          type: "button",
          header: {
            type: "text",
            text: "🏘️ Escolha um Bairro"
          },
          body: {
            text: "Selecione um bairro da Beira para receber conselhos específicos:"
          },
          action: {
            buttons: [
              {
                type: "reply",
                reply: {
                  id: "bairro_macuti",
                  title: "Macúti"
                }
              },
              {
                type: "reply",
                reply: {
                  id: "bairro_manga",
                  title: "Manga"
                }
              },
              {
                type: "reply",
                reply: {
                  id: "bairro_goto",
                  title: "Goto"
                }
              }
            ]
          }
        }
      };

      await whatsappApi.enviarMensagemInterativaUsandoWhatsappAPI(neighborhoodButtons);
      console.log('✅ Botões de bairros enviados');

      // Enviar segundo conjunto de botões após um delay
      setTimeout(async () => {
        const neighborhoodButtons2 = {
          messaging_product: 'whatsapp',
          recipient_type: "individual",
          to: phoneNumber,
          type: "interactive",
          interactive: {
            type: "button",
            body: {
              text: "Ou escolha um destes bairros:"
            },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: {
                    id: "bairro_munhava",
                    title: "Munhava"
                  }
                },
                {
                  type: "reply",
                  reply: {
                    id: "bairro_chaimite",
                    title: "Chaimite"
                  }
                },
                {
                  type: "reply",
                  reply: {
                    id: "bairro_ndunda",
                    title: "Ndunda"
                  }
                }
              ]
            }
          }
        };

        await whatsappApi.enviarMensagemInterativaUsandoWhatsappAPI(neighborhoodButtons2);
        console.log('✅ Segundo conjunto de botões de bairros enviado');
      }, 2000);

    }, 1500);

  } catch (error) {
    console.error('❌ Erro ao enviar botões de bairros:', error);
  }
}

async function handleAdvancedWeatherData(analysis, phoneNumber, user) {
  try {
    const { city, action, context, intent, originalMessage } = analysis;
    let targetCity = city || user?.preferred_city;

    if (!targetCity) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "🏙️ Eh pá, para ver o tempo preciso saber a cidade. Qual cidade te interessa?",
        phoneNumber
      );
      return null;
    }

    // Verificar se é uma pergunta específica sobre chuva
    const isRainQuery = originalMessage && (
      originalMessage.toLowerCase().includes('vai chover') ||
      originalMessage.toLowerCase().includes('chover') ||
      originalMessage.toLowerCase().includes('chuva hoje') ||
      originalMessage.toLowerCase().includes('chuva amanhã') ||
      (originalMessage.toLowerCase().includes('chuva') &&
        (originalMessage.toLowerCase().includes('hoje') || originalMessage.toLowerCase().includes('amanhã')))
    );

    if (isRainQuery) {
      return await handleRainSpecificQuery(analysis, phoneNumber, user);
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
      "Não consegui ver os dados do tempo",
      "Tenta mais tarde ou verifica o nome da cidade"
    );
    return null;
  }
}

async function handleAdvancedEducation(analysis, originalMessage, phoneNumber, user) {
  try {
    const { expertiseLevel, context } = analysis;

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Deixa eu preparar uma explicação fixe para ti');

    // Prompt educativo adaptado ao nível do usuário
    const educationPrompt = `
Pergunta: "${originalMessage}"
Nível do usuário: ${expertiseLevel}
Contexto: ${JSON.stringify(context)}
Histórico: ${user?.conversation_history?.length || 0} consultas anteriores

Crie uma explicação meteorológica adequada para este nível:

${expertiseLevel === 'basic' ?
        'PARA BEIRENSES SIMPLES: Use palavras muito fáceis que qualquer pessoa da Beira entende. Explica como um vizinho explicaria para outro. Usa exemplos do dia a dia (como roupa a secar, cozinhar, etc). NÃO uses palavras difíceis como "sensação térmica", "umidade relativa", "precipitação". Diz "sentes como se fosse", "ar pesado", "vai chover".' :
        expertiseLevel === 'intermediate' ?
          'INTERMEDIÁRIO: Equilibre simplicidade com algum conteúdo técnico educativo.' :
          'AVANÇADO: Use terminologia meteorológica, seja preciso e detalhado.'
      }

EXEMPLOS DE LINGUAGEM SIMPLES PARA BEIRENSES:
- Em vez de "umidade alta" → "o ar está pesado"
- Em vez de "precipitação" → "chuva"
- Em vez de "sensação térmica" → "mas sentes como se fosse"
- Em vez de "evaporação" → "a água sobe para o céu"
- Em vez de "hidratação" → "beber muita água"

Incluir:
1. Resposta direta à pergunta (em palavras simples)
2. Exemplo prático que acontece na Beira
3. ${expertiseLevel === 'basic' ? 'Conselho simples para o dia a dia' : expertiseLevel === 'intermediate' ? 'Dica adicional' : 'Informação técnica relevante'}

Máximo ${expertiseLevel === 'basic' ? '150' : expertiseLevel === 'intermediate' ? '300' : '400'} palavras:
    `;

    const educationResponse = await openaiService.callOpenAI(educationPrompt, 0.7);

    const finalMessage = `🎓 *Explicação ${expertiseLevel === 'basic' ? 'Simples' : expertiseLevel === 'intermediate' ? 'Detalhada' : 'Técnica'}*\n\n${educationResponse}\n\n💡 Quer saber mais sobre meteorologia? É só perguntar!`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    return finalMessage;

  } catch (error) {
    console.error('❌ Erro em educação avançada:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "📚 Eh pá, não consegui preparar a explicação agora. Tenta reformular a tua pergunta.",
      phoneNumber
    );
    return null;
  }
}

async function handleWeeklyForecast(city, phoneNumber, user) {
  try {
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      `📅 Eh pá, deixa ver como vai estar toda a semana em ${city}...`,
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
      `❌ Não consegui ver a previsão de 7 dias para ${city}. Tenta mais tarde.`,
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
      "❌ Não consegui gerar dicas agora. Tenta mais tarde.",
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
        `🔄 Para comparar, preciso de duas cidades.\n\nTu mencionaste: ${city || 'nenhuma'}\n\nQueres comparar com ${suggestedCity}? Ou me diz outra cidade.`,
        phoneNumber
      );
      return null;
    }

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Vou comparar o tempo nessas cidades');

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

// ===============================================
// SISTEMA DE CONSELHOS POR BAIRROS DA BEIRA
// ===============================================

async function handleNeighborhoodAdvice(analysis, phoneNumber, user) {
  try {
    const { city, context, originalMessage, neighborhood: presetNeighborhood } = analysis;

    // Usar bairro pré-definido (vindo de botão) ou detectar automaticamente
    let neighborhood = presetNeighborhood || detectNeighborhood(originalMessage || '');

    if (!neighborhood) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "🏘️ Eish meu caro, preciso de saber qual bairro da nossa Beira estás!\n\n📍 *Bairros que conheço bem:*\n• Macúti, Manga, Goto, Munhava\n• Chaimite, Ndunda, Palmeiras\n• Cidade de Cimento, Ponta-Gêa\n\n💬 Podes dizer assim: \"conselhos para Macúti se chover\"\n\n🔧 Ou usa `/conselhos` para ver as opções todas!",
        phoneNumber
      );
      return null;
    }

    // Buscar dados meteorológicos da Beira
    const weatherData = await weatherService.getCurrentWeather('Beira', user?.units || 'celsius');

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, `Deixa ver as condições aí no ${neighborhood}...`);

    // Gerar conselhos específicos
    const advice = await generateNeighborhoodAdvice(neighborhood, weatherData, context, originalMessage || '');

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(advice, phoneNumber);

    // Salvar no histórico
    await saveOrUpdateAdvancedUser(phoneNumber, {
      last_city: 'Beira',
      last_neighborhood: neighborhood,
      query_count: (user?.query_count || 0) + 1
    });

    return advice;

  } catch (error) {
    console.error('❌ Erro ao gerar conselhos de bairro:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Não consegui gerar conselhos para o bairro agora. Tenta de novo.",
      phoneNumber
    );
    return null;
  }
}

function detectNeighborhood(message) {
  const msg = message.toLowerCase();

  // Bairros da Beira com suas variações
  const neighborhoods = {
    'macúti': ['macuti', 'macúti', 'makuti'],
    'manga': ['manga'],
    'goto': ['goto'],
    'munhava': ['munhava'],
    'chaimite': ['chaimite'],
    'ndunda': ['ndunda'],
    'palmeiras': ['palmeiras'],
    'cidade de cimento': ['cidade de cimento', 'cimento'],
    'ponta-gêa': ['ponta-gêa', 'ponta gea', 'pontagea'],
    'chipangara': ['chipangara'],
    'matacuane': ['matacuane'],
    'estoril': ['estoril'],
    'praia': ['praia']
  };

  for (const [neighborhood, variations] of Object.entries(neighborhoods)) {
    if (variations.some(variation => msg.includes(variation))) {
      return neighborhood;
    }
  }

  return null;
}

async function generateNeighborhoodAdvice(neighborhood, weatherData, context, originalMessage) {
  const temp = parseInt(weatherData.temperature);
  const isRaining = weatherData.description.toLowerCase().includes('chuva');
  const humidity = weatherData.humidity;
  const feelsLike = weatherData.feelsLike ? parseInt(weatherData.feelsLike) : temp;

  let advice = `🏘️ *Eee mano, conselhos para ${neighborhood.toUpperCase()}!*\n`;
  advice += `📍 Aqui na nossa Beira querida 🇲🇿\n\n`;

  // Informações climáticas atuais com linguagem local
  advice += `🌤️ *COMO ESTÁ O TEMPO AGORA:*\n`;
  advice += `🌡️ Temperatura: ${temp}°C`;

  if (temp > 30) {
    advice += ` (eish, está quente mesmo!)\n`;
  } else if (temp < 18) {
    advice += ` (está um frio, né!)\n`;
  } else {
    advice += ` (está fixe assim)\n`;
  }

  advice += `💧 Umidade: ${humidity}% `;
  if (humidity > 80) {
    advice += `(está bem abafado hoje)\n`;
  } else if (humidity < 50) {
    advice += `(ar está seco)\n`;
  } else {
    advice += `(normal)\n`;
  }

  advice += `📝 Tempo: ${weatherData.description}\n\n`;

  // Características específicas do bairro
  advice += getNeighborhoodCharacteristics(neighborhood);

  // Riscos específicos por bairro
  const risks = getNeighborhoodRisks(neighborhood, weatherData);
  if (risks.length > 0) {
    advice += `⚠️ *ATENÇÃO ESPECIAL:*\n`;
    risks.forEach(risk => advice += `• ${risk}\n`);
    advice += `\n`;
  }

  // Recomendações de vestuário específicas para o bairro
  advice += generateNeighborhoodClothingAdvice(neighborhood, weatherData);

  // Conselhos específicos por condição climática
  if (isRaining) {
    advice += generateRainAdvice(neighborhood, weatherData);
  } else if (temp > 30) {
    advice += generateHeatAdvice(neighborhood, weatherData);
  } else if (temp < 20) {
    advice += generateColdAdvice(neighborhood, weatherData);
  } else {
    advice += generateGeneralNeighborhoodAdvice(neighborhood, weatherData);
  }

  // Conselhos de transporte e locomoção
  advice += generateTransportAdvice(neighborhood, weatherData);

  // Conselhos de segurança específicos
  advice += `\n🛡️ *SEGURANÇA E PREVENÇÃO:*\n`;
  advice += getNeighborhoodSafetyTips(neighborhood, weatherData);

  return advice;
}

function getNeighborhoodCharacteristics(neighborhood) {
  let characteristics = `📍 *COMO É AÍ NO BAIRRO:*\n`;

  switch (neighborhood.toLowerCase()) {
    case 'munhava':
      characteristics += `• Bairro bem movimentado, com muita gente\n`;
      characteristics += `• Tem bastante escola e mercado por aqui\n`;
      characteristics += `• Às vezes quando chove muito pode alagar\n`;
      characteristics += `• Pessoal é bem receptivo e conhece toda gente\n\n`;
      break;

    case 'macúti':
      characteristics += `• Aqui é zona de praia, muito fixe!\n`;
      characteristics += `• Tem restaurantes bons e hotéis\n`;
      characteristics += `• Vento do mar sempre a refrescar\n`;
      characteristics += `• Turistas adoram vir aqui no fim de semana\n\n`;
      break;

    case 'manga':
      characteristics += `• Centro da cidade, sempre cheio de movimento\n`;
      characteristics += `• Aqui tens tudo: lojas, bancos, serviços\n`;
      characteristics += `• Trânsito às vezes complica durante o dia\n`;
      characteristics += `• Lugar ideal para resolver assuntos\n\n`;
      break;

    case 'goto':
      characteristics += `• Bairro residencial bem tranquilo\n`;
      characteristics += `• Mistura de casas antigas e novas\n`;
      characteristics += `• Algumas zonas quando chove ficam complicadas\n`;
      characteristics += `• Comunidade unida, toda gente se conhece\n\n`;
      break;

    case 'chaimite':
      characteristics += `• Um dos bairros maiores da Beira\n`;
      characteristics += `• Maioria das pessoas mora aqui\n`;
      characteristics += `• Algumas estradas ainda são de terra batida\n`;
      characteristics += `• Tem muito movimento comunitário\n\n`;
      break;

    case 'ndunda':
      characteristics += `• Bairro que está crescer muito rápido\n`;
      characteristics += `• Sempre construções novas por todo lado\n`;
      characteristics += `• Infraestrutura ainda está a melhorar\n`;
      characteristics += `• Muitos jovens moram aqui\n\n`;
      break;

    default:
      characteristics += `• Bairro residencial típico da nossa Beira\n`;
      characteristics += `• Comunidade bem activa\n`;
      characteristics += `• Pessoal sempre pronto para ajudar\n\n`;
  }

  return characteristics;
}

function generateNeighborhoodClothingAdvice(neighborhood, weatherData) {
  const temp = parseInt(weatherData.temperature);
  const isRaining = weatherData.description.toLowerCase().includes('chuva');

  let advice = `👕 *QUE ROUPA VESTIR HOJE:*\n`;

  // Conselhos baseados na temperatura
  if (temp > 30) {
    advice += `🌡️ Está quente (${temp}°C):\n`;
    advice += `• Vista roupa leve e clara\n`;
    advice += `• Algodão é melhor (respira bem)\n`;
    advice += `• Não esqueças chapéu ou boné\n`;
    advice += `• Põe protetor solar\n`;
  } else if (temp < 20) {
    advice += `🧊 Está fresquinho (${temp}°C):\n`;
    advice += `• Vista roupa por camadas\n`;
    advice += `• Leva casaco leve ou sweatshirt\n`;
    advice += `• Calça comprida é melhor\n`;
    advice += `• Sapato fechado para os pés\n`;
  } else {
    advice += `😊 Temperatura boa (${temp}°C):\n`;
    advice += `• Roupa confortável está bem\n`;
    advice += `• Camiseta e calça leve\n`;
    advice += `• Leva casaco para a noite\n`;
  }

  // Conselhos específicos por bairro
  switch (neighborhood.toLowerCase()) {
    case 'macúti':
      if (!isRaining) {
        advice += `🏖️ Para Macúti (zona da praia):\n`;
        advice += `• Se fores à praia, leva fato de banho\n`;
        advice += `• Chinelos para andar na areia\n`;
        advice += `• Óculos de sol (sol reflete no mar)\n`;
      }
      break;

    case 'manga':
      advice += `🏪 Para Manga (centro):\n`;
      advice += `• Roupa boa para fazer compras\n`;
      advice += `• Sapato confortável para andar muito\n`;
      advice += `• Bolsa bem fechada para coisas importantes\n`;
      break;

    case 'munhava':
    case 'goto':
    case 'chaimite':
    case 'ndunda':
      advice += `🏘️ Para bairro residencial:\n`;
      advice += `• Sapato bom para ruas do bairro\n`;
      advice += `• Roupa prática para o dia a dia\n`;
      if (isRaining) {
        advice += `• Sapato fechado (não chinelos na chuva)\n`;
      }
      break;
  }

  if (isRaining) {
    advice += `☔ Se está chuva:\n`;
    advice += `• Leva guarda-chuva ou capulana\n`;
    advice += `• Sapato que não escorrega\n`;
    advice += `• Evita roupa clara (suja fácil)\n`;
  }

  advice += `\n`;
  return advice;
}

function generateTransportAdvice(neighborhood, weatherData) {
  const isRaining = weatherData.description.toLowerCase().includes('chuva');
  const temp = parseInt(weatherData.temperature);

  let advice = `🚗 *COMO ANDAR E TRANSPORTES:*\n`;

  switch (neighborhood.toLowerCase()) {
    case 'macúti':
      advice += `🏖️ Aí no Macúti:\n`;
      if (isRaining) {
        advice += `• Não andes perto da praia (ondas bravias)\n`;
        advice += `• Usa chapa ou taxi coberto\n`;
        advice += `• Cuidado com chão molhado nos restaurantes\n`;
      } else if (temp > 32) {
        advice += `• Anda sempre na sombra\n`;
        advice += `• Asfalto está muito quente\n`;
        advice += `• Procura transporte com ar condicionado\n`;
      } else {
        advice += `• Fixe para andar na beira-mar\n`;
        advice += `• Aproveita a brisa do mar\n`;
        advice += `• Bicicleta é boa opção\n`;
      }
      break;

    case 'manga':
      advice += `🏪 No centro (Manga):\n`;
      if (isRaining) {
        advice += `• Trânsito fica devagar - sai mais cedo\n`;
        advice += `• Usa cobertura dos prédios para andar\n`;
        advice += `• Cuidado com poças nas ruas principais\n`;
      } else {
        advice += `• Trânsito normal durante o dia\n`;
        advice += `• Lugar para estacionar é pouco - chega cedo\n`;
        advice += `• Chapas passam bem aqui\n`;
      }
      break;

    case 'munhava':
      advice += `🏘️ Aí no Munhava:\n`;
      if (isRaining) {
        advice += `• Algumas ruas podem encher de água\n`;
        advice += `• Evita zonas baixas do bairro\n`;
        advice += `• Chapas podem atrasar\n`;
        advice += `• Caminha devagar nas ruas de terra\n`;
      } else {
        advice += `• Chapas passam normal\n`;
        advice += `• Bom para andar a pé no bairro\n`;
        advice += `• Transporte local sempre tem\n`;
      }
      break;

    case 'goto':
    case 'chaimite':
    case 'ndunda':
      advice += `🏘️ No bairro residencial:\n`;
      if (isRaining) {
        advice += `• Estradas de terra ficam escorregadias\n`;
        advice += `• Evita zonas onde água acumula\n`;
        advice += `• Melhor usar chapa ou taxi\n`;
      } else {
        advice += `• Fácil de andar por aqui\n`;
        advice += `• Chapas locais sempre tem\n`;
        advice += `• Bom para andar de bicicleta\n`;
      }
      break;
  }

  advice += `\n`;
  return advice;
}

function getNeighborhoodRisks(neighborhood, weatherData) {
  const risks = [];
  const isRaining = weatherData.description.toLowerCase().includes('chuva');
  const temp = parseInt(weatherData.temperature);

  switch (neighborhood.toLowerCase()) {
    case 'macúti':
      if (isRaining) {
        risks.push('Erosão costeira - evite a beira-mar');
        risks.push('Alagamentos em vias baixas perto da praia');
      }
      if (temp > 32) {
        risks.push('Insolação intensa na zona da praia');
      }
      break;

    case 'manga':
      if (isRaining) {
        risks.push('Alagamentos no centro comercial');
        risks.push('Trânsito complicado nas vias principais');
      }
      break;

    case 'goto':
      if (isRaining) {
        risks.push('Drenagem deficiente - evite zonas baixas');
        risks.push('Estradas de terra podem ficar intransitáveis');
      }
      break;

    case 'munhava':
      if (isRaining) {
        risks.push('Alagamentos nas zonas baixas');
        risks.push('Dificuldades no transporte público');
      }
      break;

    case 'chaimite':
      if (isRaining) {
        risks.push('Estradas de terra em mau estado');
        risks.push('Possível acumulação de água em baixadas');
      }
      break;

    case 'ndunda':
      if (isRaining) {
        risks.push('Vias não pavimentadas podem alagar');
        risks.push('Dificulta acesso aos transportes');
      }
      break;

    case 'cidade de cimento':
      if (isRaining) {
        risks.push('Possível congestionamento no centro');
      }
      if (temp > 33) {
        risks.push('Efeito ilha de calor urbano intenso');
      }
      break;

    case 'palmeiras':
      if (isRaining) {
        risks.push('Drenagem limitada em algumas áreas');
      }
      break;
  }

  return risks;
}

function generateRainAdvice(neighborhood, weatherData) {
  let advice = `☔ *CONSELHOS PARA CHUVA:*\n`;

  switch (neighborhood.toLowerCase()) {
    case 'macúti':
      advice += `• Evite caminhadas na praia - ondas podem estar agitadas\n`;
      advice += `• Use rotas alternativas longe da costa\n`;
      advice += `• Cuidado com o piso molhado nas zonas de restaurantes\n`;
      break;

    case 'manga':
      advice += `• Evite o centro comercial se possível\n`;
      advice += `• Use transporte coberto\n`;
      advice += `• Tenha paciência com o trânsito intenso\n`;
      break;

    case 'goto':
    case 'munhava':
    case 'chaimite':
    case 'ndunda':
      advice += `• Evite estradas de terra\n`;
      advice += `• Use sapatos impermeáveis\n`;
      advice += `• Planifique rotas alternativas\n`;
      advice += `• Guarde água potável (possíveis interrupções)\n`;
      break;

    case 'cidade de cimento':
      advice += `• Evite o centro nas horas de pico\n`;
      advice += `• Use edifícios cobertos para locomoção\n`;
      advice += `• Cuidado com bueiros entupidos\n`;
      break;

    default:
      advice += `• Mantenha-se em locais seguros e cobertos\n`;
      advice += `• Evite áreas propensas a alagamentos\n`;
      advice += `• Tenha sempre guarda-chuva\n`;
  }

  return advice;
}

function generateHeatAdvice(neighborhood, weatherData) {
  let advice = `🔥 *CONSELHOS PARA CALOR INTENSO:*\n`;

  switch (neighborhood.toLowerCase()) {
    case 'macúti':
      advice += `• Aproveite a brisa marítima\n`;
      advice += `• Evite a praia entre 10h-16h\n`;
      advice += `• Use protetor solar sempre\n`;
      advice += `• Hidrate-se constantemente\n`;
      break;

    case 'cidade de cimento':
      advice += `• Procure edifícios com ar condicionado\n`;
      advice += `• Evite o asfalto quente\n`;
      advice += `• Use roupas claras e leves\n`;
      advice += `• Mantenha-se na sombra\n`;
      break;

    default:
      advice += `• Procure sombra e locais ventilados\n`;
      advice += `• Beba água regularmente\n`;
      advice += `• Evite atividades físicas intensas\n`;
      advice += `• Use chapéu e roupas leves\n`;
  }

  return advice;
}

function generateColdAdvice(neighborhood, weatherData) {
  let advice = `🧊 *CONSELHOS PARA TEMPO FRESCO:*\n`;

  switch (neighborhood.toLowerCase()) {
    case 'macúti':
      advice += `• Vento marítimo pode intensificar a sensação de frio\n`;
      advice += `• Use casaco corta-vento\n`;
      advice += `• Evite exposição prolongada à brisa\n`;
      break;

    default:
      advice += `• Vista roupas em camadas\n`;
      advice += `• Mantenha-se aquecido em ambientes fechados\n`;
      advice += `• Beba líquidos quentes\n`;
      advice += `• Proteja extremidades (mãos, pés)\n`;
  }

  return advice;
}

function generateGeneralNeighborhoodAdvice(neighborhood, weatherData) {
  let advice = `😊 *CONDIÇÕES FAVORÁVEIS:*\n`;

  switch (neighborhood.toLowerCase()) {
    case 'macúti':
      advice += `• Perfeito para atividades na praia\n`;
      advice += `• Ótimo para restaurantes com vista mar\n`;
      advice += `• Ideal para caminhadas costeiras\n`;
      break;

    case 'manga':
      advice += `• Bom para compras no centro comercial\n`;
      advice += `• Trânsito fluindo normalmente\n`;
      advice += `• Atividades comerciais em pleno funcionamento\n`;
      break;

    default:
      advice += `• Clima agradável para atividades ao ar livre\n`;
      advice += `• Bom para deslocações a pé\n`;
      advice += `• Condições normais de transporte\n`;
  }

  return advice;
}

function getNeighborhoodSafetyTips(neighborhood, weatherData) {
  const isRaining = weatherData.description.toLowerCase().includes('chuva');
  let tips = '';

  if (isRaining) {
    switch (neighborhood.toLowerCase()) {
      case 'macúti':
        tips += `• Mantenha distância segura do mar\n`;
        tips += `• Evite zonas rochosas escorregadias\n`;
        break;

      case 'manga':
        tips += `• Cuidado com poças nos mercados\n`;
        tips += `• Atenção ao trânsito intenso\n`;
        break;

      default:
        tips += `• Evite caminhar em áreas alagadas\n`;
        tips += `• Cuidado com fios elétricos caídos\n`;
    }
  } else {
    tips += `• Mantenha comunicação com familiares\n`;
    tips += `• Tenha sempre água e contactos de emergência\n`;
  }

  return tips;
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

*Nota:* Este é um recurso premium. Em breve vais receber notificações inteligentes!`;

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
  const offTopicMessage = `🤖 Eh pá, sou especialista em tempo e meteorologia! 

🌤️ *Posso ajudar-te com:*
• Temperatura actual de qualquer cidade
• Previsões meteorológicas
• Explicações sobre fenómenos climáticos
• Comparações entre cidades
• Alertas climáticos personalizados
• Conselhos específicos para bairros da Beira

⭐ *COMANDOS ESPECIAIS:*
• \`/sugestoes\` - Dicas fixes baseadas no teu perfil
• \`/conselhos\` - Menu interativo de conselhos por bairro da Beira

🏘️ *Conselhos para bairros da Beira disponíveis!*
📍 Exemplo: "Conselhos para Macúti se chover" ou usa \`/conselhos\`

💬 Pergunta algo tipo: "Como está o tempo em Maputo?" ou \`/sugestoes\``;

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
          text: "💡 Umas sugestões fixes"
        },
        body: {
          text: "Eh pá, com base no que perguntaste, talvez te interesse:"
        },
        action: {
          buttons: suggestions.slice(0, 3).map((suggestion, index) => {
            // Criar um mapeamento mais inteligente para botões
            let buttonText = suggestion;
            let buttonId = `suggestion_${index}`;

            // Mapear sugestões específicas para comandos mais claros
            if (suggestion.toLowerCase().includes('previsão') || suggestion.toLowerCase().includes('7 dias')) {
              buttonText = "Previsão 7 dias";
              buttonId = `forecast_7days_${city || 'current'}_${index}`;
            } else if (suggestion.toLowerCase().includes('amanhã')) {
              buttonText = "Tempo amanhã";
              buttonId = `forecast_tomorrow_${city || 'current'}_${index}`;
            } else if (suggestion.toLowerCase().includes('roupa')) {
              buttonText = "Que roupa usar";
              buttonId = `clothing_tips_${city || 'current'}_${index}`;
            } else if (suggestion.toLowerCase().includes('comparar')) {
              buttonText = "Comparar cidades";
              buttonId = `compare_cities_${index}`;
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
      const cityPart = buttonId.replace("forecast_7days_", "").split('_')[0];
      const city = cityPart === "current" ?
        (user?.preferred_city || user?.last_city || "Maputo") :
        cityPart;
      await processAdvancedTextMessage(`previsão de 7 dias ${city}`, phoneNumber);
      return;
    }

    if (buttonId.startsWith("forecast_tomorrow_")) {
      const cityPart = buttonId.replace("forecast_tomorrow_", "").split('_')[0];
      const city = cityPart === "current" ?
        (user?.preferred_city || user?.last_city || "Maputo") :
        cityPart;
      await processAdvancedTextMessage(`tempo amanhã em ${city}`, phoneNumber);
      return;
    }

    if (buttonId.startsWith("clothing_tips_")) {
      const cityPart = buttonId.replace("clothing_tips_", "").split('_')[0];
      const city = cityPart === "current" ?
        (user?.preferred_city || user?.last_city || "Maputo") :
        cityPart;
      await processAdvancedTextMessage(`que roupa usar em ${city}`, phoneNumber);
      return;
    }

    if (buttonId.startsWith("compare_cities")) {
      await processAdvancedTextMessage("comparar clima entre cidades", phoneNumber);
      return;
    }

    // Tratamento específico para botões de bairros da Beira
    if (buttonId.startsWith("bairro_")) {
      const bairroMap = {
        "bairro_macuti": "Macúti",
        "bairro_manga": "Manga",
        "bairro_goto": "Goto",
        "bairro_munhava": "Munhava",
        "bairro_chaimite": "Chaimite",
        "bairro_ndunda": "Ndunda",
        "bairro_palmeiras": "Palmeiras",
        "bairro_cidade_cimento": "Cidade de Cimento"
      };

      const bairro = bairroMap[buttonId] || buttonTitle;
      await processAdvancedTextMessage(`conselhos para ${bairro}`, phoneNumber, false); // false = não detectar automaticamente
      return;
    }

    if (buttonId.startsWith("neighborhood_")) {
      const neighborhood = buttonId.replace("neighborhood_", "").replace(/_/g, " ");
      await processAdvancedTextMessage(`conselhos para ${neighborhood} tempo atual`, phoneNumber);
      return;
    }

    if (buttonId.startsWith("suggestion_")) {
      // Usuário clicou numa sugestão genérica - usar o título do botão
      await processAdvancedTextMessage(buttonTitle, phoneNumber);
      return;
    }

    if (buttonId.startsWith("cmd_suggestion_")) {
      // Sugestão gerada pelo comando /sugestoes - usar o título do botão
      await processAdvancedTextMessage(buttonTitle, phoneNumber);
      return;
    }

    if (buttonId.startsWith("activity_tips_")) {
      const city = buttonId.replace("activity_tips_", "") === "current" ?
        (user?.preferred_city || user?.last_city || "Maputo") :
        buttonId.replace("activity_tips_", "");
      await processAdvancedTextMessage(`atividades para hoje em ${city}`, phoneNumber);
      return;
    }

    if (buttonId.startsWith("conselho_")) {
      // Extrair bairro do ID do botão: conselho_macuti_clima
      const parts = buttonId.split('_');
      if (parts.length >= 2) {
        const neighborhood = parts[1].replace(/_/g, ' ');
        const weatherContext = parts[2] || 'atual';

        // Construir mensagem específica para conselhos por bairro
        const conselhosMessage = `conselhos para ${neighborhood} com ${weatherContext}`;
        console.log(`🏘️ Processando conselho de bairro via botão: ${conselhosMessage}`);

        // Chamar diretamente a função de conselhos de bairro (sem detecção automática)
        const mockAnalysis = {
          type: 'neighborhood_advice',
          city: 'Beira',
          neighborhood: neighborhood,
          intent: 'conselhos_bairro_direto',
          action: 'show_neighborhood_advice',
          context: { weatherContext, isFromButton: true }
        };

        await handleNeighborhoodAdvice(mockAnalysis, phoneNumber, user);
        return;
      }
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

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Deixa ver onde tu estás');

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

  if (timeframe === 'amanha') return `🔍 Deixa ver como vai estar amanhã em ${city}...`;
  if (weatherAspect === 'chuva') return `☔ Eh pá, vou ver se vai chover em ${city}...`;
  if (weatherAspect === 'temperatura') return `🌡️ Vou verificar a temperatura actual em ${city}...`;

  return `🔍 Deixa eu ver como está o tempo em ${city}...`;
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
    "🤖 Eh pá, não consegui entender bem a tua mensagem.\n\n💬 Podes tentar assim:\n• 'Clima em [cidade]'\n• 'Previsão para amanhã'\n• 'O que é [termo meteorológico]?'\n\nComo é que te posso ajudar?",
    phoneNumber
  );
}

async function sendAdvancedHelp(phoneNumber, user) {
  const language = user?.language || 'pt';
  const expertiseLevel = user?.expertise_level || 'basic';

  let helpMessage = `🤖 *Eh pá, sou o teu assistente do tempo!*\n\n`;

  helpMessage += `⭐ *COMANDOS ESPECIAIS:*\n`;
  helpMessage += `• \`/sugestoes\` - Vou dar-te umas sugestões fixes\n`;
  helpMessage += `• \`/conselhos\` - Conselhos para os bairros da Beira\n\n`;

  const nivelMap = {
    'basic': 'Principiante (tás a começar)',
    'intermediate': 'Médio (já percebes bem)',
    'advanced': 'Experiente (és um expert!)'
  };

  if (expertiseLevel === 'basic') {
    helpMessage += `💬 *Para começares:*\n• "Como está o tempo em [cidade]"\n• "Vai chover amanhã?"\n• "O que é umidade?"\n• "Conselhos para Macúti se chover"\n\n`;
  } else if (expertiseLevel === 'intermediate') {
    helpMessage += `💬 *Podes perguntar:*\n• Consultas: "Temperatura em Maputo"\n• Comparações: "Compara Maputo com Beira"\n• Educação: "Como se forma a chuva?"\n• Previsões: "Como vai estar a semana"\n• Bairros: "Dicas para Manga com calor"\n\n`;
  } else {
    helpMessage += `💬 *Para experts como tu:*\n• Análises técnicas meteorológicas\n• Comparações entre várias cidades\n• Alertas personalizados\n• Dados históricos e tendências\n• Conselhos específicos por bairro da Beira\n\n`;
  }

  helpMessage += `🏘️ *Conselhos para Bairros da Beira:*\n`;
  helpMessage += `📍 *Conheço estes bairros:* Macúti, Manga, Goto, Munhava, Chaimite, Ndunda, Cidade de Cimento, Palmeiras\n`;
  helpMessage += `💡 *Como usar:* Escreve \`/conselhos\` ou pergunta directamente "conselhos para [bairro]"\n\n`;
  helpMessage += `🎯 *Teu nível:* ${nivelMap[expertiseLevel] || expertiseLevel}\n📊 *Perguntas feitas:* ${user?.query_count || 0}\n\nEntão, em que posso ajudar-te hoje?`;

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

  let tips = `👕 *Como te vestir hoje:*\n\n`;

  if (temp > 30) {
    tips += `🌡️ Faz ${temp}°C - eh pá, está quente mesmo!\n`;
    tips += `• Roupa leve e clara\n`;
    tips += `• Tecidos frescos (algodão é fixe)\n`;
    tips += `• Chapéu ou boné para proteger\n`;
    tips += `• Não te esqueças do protetor solar\n`;
  } else if (temp > 25) {
    tips += `🌡️ ${temp}°C - temperatura bacana\n`;
    tips += `• Roupa leve está bem\n`;
    tips += `• Camiseta e shorts/saia\n`;
    tips += `• Sapato confortável\n`;
  } else if (temp > 18) {
    tips += `🌡️ ${temp}°C - está fresquinho\n`;
    tips += `• Calça leve e blusa\n`;
    tips += `• Leva casaquinho para mais tarde\n`;
    tips += `• Sapato fechado\n`;
  } else {
    tips += `🌡️ ${temp}°C - eish, está frio!\n`;
    tips += `• Vista roupa por camadas\n`;
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
    tips += `💧 Bebe muita água mesmo\n`;
    tips += `🏠 Fica em locais frescos nas horas quentes\n`;
    tips += `⏰ Evita o sol das 10h às 16h\n`;
    tips += `🚿 Toma banhos frescos\n`;
    tips += `🥗 Come coisas leves\n`;

    if (humidity > 70) {
      tips += `\n🌫️ Umidade alta (${humidity}%) - está bem abafado\n`;
      tips += `💨 Usa ventilador ou ar condicionado\n`;
    }
  } else if (temp < 15) {
    tips += `🧊 *Dicas para o frio (${temp}°C):*\n\n`;
    tips += `🍵 Bebe coisas quentes\n`;
    tips += `🏃‍♀️ Mexe-te para aquecer o corpo\n`;
    tips += `🧦 Protege as mãos, pés e orelhas\n`;
    tips += `🍲 Come comida quente\n`;
    tips += `🏠 Mantém a casa aquecida\n`;
  } else {
    tips += `🌡️ *Temperatura bacana (${temp}°C):*\n\n`;
    tips += `😊 Perfeito para atividades lá fora\n`;
    tips += `🚶‍♀️ Fixe para caminhadas\n`;
    tips += `🌳 Aproveita os jardins e praças\n`;
    tips += `📸 Dia ideal para tirar fotos\n`;
  }

  return tips;
}

function generateRainTips(weatherData) {
  const isRaining = weatherData.description.toLowerCase().includes('chuva');

  let tips = '';

  if (isRaining) {
    tips += `☔ *Está chuva em ${weatherData.city}:*\n\n`;
    tips += `🌂 Leva guarda-chuva sempre\n`;
    tips += `👟 Usa sapato que não escorrega\n`;
    tips += `🚗 Conduz com muito cuidado\n`;
    tips += `🏠 Melhor ficar dentro de casa\n`;
    tips += `📱 Tem guarda-chuva no carro\n`;
  } else {
    tips += `☀️ *Sem chuva em ${weatherData.city}:*\n\n`;
    tips += `😊 Dia livre para atividades lá fora\n`;
    tips += `🧺 Bom para estender roupa\n`;
    tips += `🚲 Fixe para exercícios ao ar livre\n`;
    tips += `🌳 Aproveita para ir ao jardim\n`;
  }

  return tips;
}

function generateActivityTips(weatherData) {
  const temp = parseInt(weatherData.temperature);
  const isRaining = weatherData.description.toLowerCase().includes('chuva');

  let tips = `🏃‍♀️ *Atividades recomendadas:*\n\n`;

  if (isRaining) {
    tips += `☔ *Atividades dentro de casa:*\n`;
    tips += `🏋️‍♀️ Ginásio ou exercícios em casa\n`;
    tips += `🛍️ Shoppings\n`;
    tips += `📚 Biblioteca ou estudar\n`;
    tips += `🎬 Cinema\n`;
    tips += `☕ Café com os amigos\n`;
  } else if (temp > 30) {
    tips += `🌡️ *Calor (${temp}°C) - atividades na sombra:*\n`;
    tips += `🏊‍♀️ Piscina ou praia\n`;
    tips += `🌳 Jardim com sombra\n`;
    tips += `🕕 Exercícios antes das 9h ou depois das 17h\n`;
    tips += `🛍️ Shopping (com ar condicionado)\n`;
    tips += `🍦 Gelados para refrescar\n`;
  } else if (temp < 15) {
    tips += `🧊 *Frio (${temp}°C) - atividades quentinhas:*\n`;
    tips += `☕ Café ou chá quente\n`;
    tips += `🏋️‍♀️ Ginásio\n`;
    tips += `🛍️ Shoppings\n`;
    tips += `📚 Leitura em casa\n`;
    tips += `🎮 Jogos em casa\n`;
  } else {
    tips += `😊 *Clima fixe (${temp}°C):*\n`;
    tips += `🚶‍♀️ Caminhada ou corrida\n`;
    tips += `🚲 Andar de bicicleta\n`;
    tips += `🌳 Piquenique no parque\n`;
    tips += `⚽ Esportes ao ar livre\n`;
    tips += `📸 Fotografia\n`;
  }

  return tips;
}

function generateGeneralTips(weatherData) {
  const temp = parseInt(weatherData.temperature);
  const isRaining = weatherData.description.toLowerCase().includes('chuva');

  let tips = `💡 *Dicas para hoje:*\n\n`;

  // Dicas de vestuário
  tips += generateClothingTips(weatherData).replace('👕 *Como te vestir hoje:*\n\n', '👕 *Como te vestir:*\n');

  // Dicas de atividades
  tips += `\n🏃‍♀️ *Atividades:*\n`;
  if (isRaining) {
    tips += `• Melhor ficar dentro de casa\n`;
  } else if (temp > 25 && temp < 30) {
    tips += `• Bacana para atividades lá fora\n`;
  } else if (temp > 30) {
    tips += `• Evita o sol forte (10h-16h)\n`;
  } else {
    tips += `• Vista-te bem para o frio\n`;
  }

  return tips;
}

// ===============================================
// FUNÇÃO ESPECÍFICA PARA PERGUNTAS SOBRE CHUVA
// ===============================================
async function handleRainSpecificQuery(analysis, phoneNumber, user) {
  try {
    const { city, originalMessage, context } = analysis;
    const targetCity = city || user?.preferred_city || 'Beira';
    const timeframe = context?.timeframe;

    // Mensagem de loading específica para chuva
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      `☔ Deixa eu ver se vai chover em ${targetCity}...`,
      phoneNumber
    );

    let weatherData;
    let isForTomorrow = false;

    // Determinar se é para hoje ou amanhã
    if (timeframe === 'amanha' || originalMessage.toLowerCase().includes('amanhã')) {
      isForTomorrow = true;
      const forecast = await weatherService.getWeatherForecast(targetCity, 2);
      if (forecast && forecast.length > 1) {
        weatherData = forecast[1]; // Amanhã
      } else {
        throw new Error('Não foi possível obter a previsão para amanhã');
      }
    } else {
      // Dados atuais e previsão para hoje
      weatherData = await weatherService.getCurrentWeather(targetCity, user?.units || 'celsius');
    }

    // Analisar probabilidade de chuva
    const rainAnalysis = analyzeRainProbability(weatherData, isForTomorrow);

    // Criar resposta específica sobre chuva
    let rainMessage = `☔ *Chuva em ${targetCity}*\n\n`;

    if (isForTomorrow) {
      rainMessage += `📅 *Para amanhã:*\n`;
    } else {
      rainMessage += `📅 *Para hoje:*\n`;
    }

    rainMessage += rainAnalysis.message;
    rainMessage += `\n\n${rainAnalysis.advice}`;

    // Adicionar dicas específicas para chuva se necessário
    if (rainAnalysis.willRain) {
      rainMessage += `\n\n💧 *Dicas para a chuva:*\n`;
      rainMessage += `• Leva guarda-chuva\n`;
      rainMessage += `• Sapato que não escorrega\n`;
      rainMessage += `• Evita roupa clara\n`;
      rainMessage += `• Conduz com cuidado\n`;
    }

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(rainMessage, phoneNumber);

    // Salvar no histórico
    await saveOrUpdateAdvancedUser(phoneNumber, {
      last_city: targetCity,
      query_count: (user?.query_count || 0) + 1
    });

    return rainMessage;

  } catch (error) {
    console.error('❌ Erro na consulta específica de chuva:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      `❌ Não consegui verificar a chuva agora. Tenta mais tarde.`,
      phoneNumber
    );
    return null;
  }
}

function analyzeRainProbability(weatherData, isForTomorrow) {
  const description = weatherData.description?.toLowerCase() || '';
  const humidity = weatherData.humidity || 0;

  let willRain = false;
  let probability = 'baixa';
  let message = '';
  let advice = '';

  // Analisar descrição do tempo
  if (description.includes('chuva') || description.includes('chuvisco') ||
    description.includes('temporal') || description.includes('aguaceiro')) {
    willRain = true;
    probability = 'alta';
    message = `🌧️ **Sim, vai chover!**\n`;
    message += `• Condições: ${weatherData.description}\n`;
    if (humidity > 80) {
      message += `• Umidade alta: ${humidity}% (confirma chuva)\n`;
    }
    advice = `🌂 **Prepara-te para a chuva!** Não sais sem guarda-chuva.`;

  } else if (description.includes('nuvens') || description.includes('nublado') ||
    description.includes('parcialmente nublado')) {

    if (humidity > 75) {
      willRain = true;
      probability = 'moderada';
      message = `🌥️ **Pode chover!**\n`;
      message += `• Céu: ${weatherData.description}\n`;
      message += `• Umidade: ${humidity}% (alta)\n`;
      advice = `☔ **Leva guarda-chuva por precaução.** As nuvens e a umidade alta indicam possibilidade de chuva.`;
    } else {
      probability = 'baixa';
      message = `⛅ **Pouco provável que chova**\n`;
      message += `• Céu: ${weatherData.description}\n`;
      message += `• Umidade: ${humidity}% (normal)\n`;
      advice = `😊 **Não precisa de guarda-chuva** por agora, mas fica atento às nuvens.`;
    }

  } else if (description.includes('limpo') || description.includes('claro') ||
    description.includes('sol')) {
    probability = 'muito baixa';
    message = `☀️ **Não vai chover!**\n`;
    message += `• Céu: ${weatherData.description}\n`;
    message += `• Umidade: ${humidity}%\n`;
    advice = `🌞 **Céu limpo!** Podes sair tranquilo, sem chuva à vista.`;

  } else {
    // Fallback baseado apenas na umidade
    if (humidity > 80) {
      willRain = true;
      probability = 'moderada';
      message = `🌫️ **Pode chover**\n`;
      message += `• Umidade muito alta: ${humidity}%\n`;
      advice = `☔ **Melhor levar guarda-chuva.** A umidade alta sugere possibilidade de chuva.`;
    } else {
      probability = 'baixa';
      message = `🌤️ **Provavelmente não vai chover**\n`;
      message += `• Umidade: ${humidity}%\n`;
      advice = `😊 **Parece que não vai chover,** mas fica atento ao céu.`;
    }
  }

  return {
    willRain,
    probability,
    message,
    advice
  };
}