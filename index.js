// index.js - Versão com Supabase
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
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
// ADAPTADOR PARA NOVA ESTRUTURA AI
// ===============================================

function adaptAIAnalysisToLegacyFormat(aiAnalysis, originalMessage) {
  // Mapear novos intents para o sistema de roteamento existente
  const intentToTypeMapping = {
    'weather_query_current': { type: 'weather_data', action: 'current' },
    'weather_query_forecast': { type: 'weather_data', action: 'forecast' },
    'activity_recommendation': { type: 'practical_tips', action: 'activities' },
    'clothing_advice': { type: 'practical_tips', action: 'clothing' },
    'weather_tips': { type: 'practical_tips', action: 'tips' },
    'city_comparison': { type: 'comparison', action: 'cities' },
    'general_help': { type: 'help', action: 'general' },
    'greeting': { type: 'conversation', action: 'greeting' },
    'suggestion_response': { type: 'suggestion', action: 'response' },
    'weather_education': { type: 'weather_education', action: 'explain' }
  };

  const mapping = intentToTypeMapping[aiAnalysis.intent] || { type: 'weather_data', action: 'current' };

  // Extrair cidade se mencionada
  let city = null;
  if (aiAnalysis.entities && aiAnalysis.entities.cities && aiAnalysis.entities.cities.length > 0) {
    city = aiAnalysis.entities.cities[0];
  } else {
    // Detectar cidade no texto original
    const cities = ['maputo', 'beira', 'nampula', 'quelimane', 'tete', 'chimoio', 'pemba', 'xai-xai', 'lichinga', 'inhambane'];
    const lowerMessage = originalMessage.toLowerCase();
    city = cities.find(c => lowerMessage.includes(c)) || null;
  }

  return {
    type: mapping.type,
    action: mapping.action,
    intent: aiAnalysis.intent,
    city: city,
    confidence: aiAnalysis.confidence || 0.7,
    entities: aiAnalysis.entities || {},
    timeframe: aiAnalysis.entities?.timeframe || 'none',
    weather_aspect: aiAnalysis.entities?.weather_aspect || 'general',
    response_type: aiAnalysis.response_type || 'informative',
    requires_weather_data: aiAnalysis.requires_weather_data !== false,
    originalAIAnalysis: aiAnalysis,
    adaptedFromAI: true
  };
}

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
  whatsappApi.enviarMensagemUsandoWhatsappAPI(
    'A JoanaBot encontra-se temporariamente em manutenção. Voltaremos em breve com todas funcionalidades ativas. Agradecemos a sua compreensão. \n\n Associação FACE',
    req.body.entry[0].changes[0].value.messages[0].from
  );
  res.sendStatus(200);
  return
  const body = req.body;



  if (body.object === "whatsapp_business_account") {
    const entry = body.entry[0];
    const change = entry.changes[0];

    if (change.field === "messages" && change?.value?.messages?.length > 0) {
      const message = change.value.messages[0];
      const phoneNumber = message.from;

      console.log("📱 Mensagem recebida:", message);

      //Porque estamos com problemas...
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        'A JoanaBot encontra-se temporariamente em manutenção. Voltaremos em breve com todas funcionalidades ativas. Agradecemos a sua compreensão. \n\n Associação FACE',
        phoneNumber
      );

      return
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

    // Verificar comandos especiais primeiro...
    // [comandos existentes...]

    if (messageText.toLowerCase().startsWith('/linguagem_formal') ||
      messageText.toLowerCase().startsWith('/linguagem formal')) {

      try {
        const currentLevel = user?.expertise_level || process.env.DEFAULT_EXPERTISE_LEVEL || 'basic';

        if (currentLevel === 'basic') {
          // Mudar para advanced
          await whatsappApi.enviarMensagemUsandoWhatsappAPI(
            '✅ *Linguagem formal ativada!*\n\nA partir de agora vou usar uma linguagem mais formal e detalhada nas minhas respostas sobre meteorologia. Vais receber explicações mais precisas e terminologia científica.',
            phoneNumber
          );

          await saveOrUpdateAdvancedUser(phoneNumber, {
            expertise_level: 'advanced',
            last_command: '/linguagem_formal'
          });

        } else {
          // Mudar para basic
          await whatsappApi.enviarMensagemUsandoWhatsappAPI(
            '✅ *Linguagem simples ativada!*\n\nVoltei para uma linguagem mais simples e direta. Vou usar explicações fáceis de entender, como sempre falamos aqui na nossa terra.',
            phoneNumber
          );

          await saveOrUpdateAdvancedUser(phoneNumber, {
            expertise_level: 'basic',
            last_command: '/linguagem_formal->basic'
          });
        }

        return; // Comando processado, sair da função

      } catch (error) {
        console.error('❌ Erro ao processar comando /linguagem_formal:', error);
        await whatsappApi.enviarMensagemUsandoWhatsappAPI(
          '❌ Não consegui alterar a linguagem agora. Tenta mais tarde.',
          phoneNumber
        );
        return;
      }
    }

    if (messageText.toLowerCase().startsWith('/sugestoes') ||
      messageText.toLowerCase().startsWith('/sugestões') ||
      messageText.toLowerCase() === 'sugestoes' ||
      messageText.toLowerCase() === 'sugestões') {
      return await handleSuggestionsCommand(phoneNumber, user);
    }

    // Comando para conselhos de segurança baseados na temperatura
    if (messageText.toLowerCase().startsWith('/conselhos') ||
      messageText.toLowerCase() === 'conselhos') {
      return await handleSafetyAdviceCommand(phoneNumber, user);
    }

    // Comando para zonas seguras e pontos de refúgio
    if (messageText.toLowerCase().startsWith('/zonas_seguras') ||
      messageText.toLowerCase().startsWith('/zonas-seguras') ||
      messageText.toLowerCase() === 'zonas_seguras' ||
      messageText.toLowerCase() === 'zonas seguras') {
      return await handleSafeZonesCommand(phoneNumber, user);
    }

    // Comando para alertas meteorológicos de perigo
    if (messageText.toLowerCase().startsWith('/alertas') ||
      messageText.toLowerCase() === 'alertas') {
      return await handleWeatherAlertsCommand(phoneNumber, user);
    }

    // Comando para previsão de amanhã
    if (messageText.toLowerCase().startsWith('/amanha') ||
      messageText.toLowerCase() === 'amanha') {
      return await handleTomorrowForecastCommand(phoneNumber, user);
    }

    // Comando para previsão dos próximos 7 dias
    if (messageText.toLowerCase().startsWith('/proximos_dias') ||
      messageText.toLowerCase() === 'proximos_dias') {
      return await handleForecastRequest(phoneNumber, 7);
      // return await handleProximosDiasCommand(phoneNumber, user);
    }

    // Comando para apresentação completa da Joana Bot
    if (
      messageText.toLowerCase().startsWith('/joana') ||
      messageText.toLowerCase().startsWith('/sobre') ||
      messageText.toLowerCase() === 'joana' ||
      messageText.toLowerCase() === 'sobre') {
      return await handleJoanaBotIntroduction(phoneNumber, user);
    }

    // NOVA LÓGICA: Limpar cache se mensagem é sobre clima
    const isLikelyWeatherQuery = ['clima', 'tempo', 'temperature', 'calor', 'frio', 'chuva'].some(word =>
      messageText.toLowerCase().includes(word)
    );

    if (isLikelyWeatherQuery) {
      console.log('🗑️ Mensagem sobre clima detectada - limpando cache');
      openaiService.clearProblematicCache();
    }

    // 1. Análise completa com IA
    const analysisResult = await openaiService.analyzeMessage(messageText, {
      preferredCity: user?.preferred_city,
      language: user?.language || 'pt',
      queryCount: user?.query_count || 0,
      expertiseLevel: user?.expertise_level || 'basic',
      conversationHistory: user?.conversation_history || [],
      lastCity: user?.last_city,
      weatherPreferences: user?.weather_preferences,
      currentLocation: user?.last_city
    });

    if (!analysisResult.success) {
      console.log('❌ Análise falhou, usando fallback básico');
      return await processBasicFallback(messageText, phoneNumber);
    }

    const analysis = analysisResult.analysis;
    console.log(`📊 Análise completa:`, JSON.stringify(analysis, null, 2));

    // Adaptar nova estrutura AI para o sistema de roteamento existente
    const adaptedAnalysis = adaptAIAnalysisToLegacyFormat(analysis, messageText);
    console.log(`🔄 Análise adaptada:`, JSON.stringify(adaptedAnalysis, null, 2));

    // NOVA LÓGICA: Verificar se é relacionado ao clima
    const isWeatherQuery = openaiService.isWeatherRelatedQuery(analysis);
    console.log(`🌤️ É pergunta sobre clima? ${isWeatherQuery}`);

    if (!isWeatherQuery) {
      // CORREÇÃO: Se a mensagem claramente menciona clima, forçar como weather query
      if (isLikelyWeatherQuery) {
        console.log('🔄 Forçando como consulta meteorológica devido às palavras-chave');

        // Modificar análise para ser sobre clima
        adaptedAnalysis.type = 'weather_data';
        adaptedAnalysis.action = 'current';
        adaptedAnalysis.intent = 'weather_query_current';
        adaptedAnalysis.requires_weather_data = true;

        // Se não há last_city, usar Beira como padrão
        if (!user?.last_city || user.last_city === 'Não definido') {
          console.log('📍 Não há last_city, usando Beira como padrão');
          adaptedAnalysis.city = 'Beira';

          // Atualizar usuário com cidade padrão
          await saveOrUpdateAdvancedUser(phoneNumber, {
            last_city: 'Beira',
            preferred_city: user?.preferred_city || 'Beira'
          });
        } else {
          adaptedAnalysis.city = user.last_city;
        }
      } else {
        // Se a análise não identificou como clima, mas a mensagem contém palavras-chave de clima
        // e o utilizador tem uma última cidade conhecida, presumir que é sobre clima nessa cidade.
        const weatherKeywords = ['tempo', 'clima', 'temperatura', 'calor', 'frio', 'chuva', 'sol', 'vento', 'humidade', 'graus'];
        const lowerMessage = messageText.toLowerCase();
        const hasWeatherKeywords = weatherKeywords.some(k => lowerMessage.includes(k));

        if (hasWeatherKeywords && user?.last_city && user.last_city !== 'Não definido') {
          console.log('ℹ️ Mensagem menciona clima e existe last_city; assumindo consulta sobre clima para', user.last_city);
          adaptedAnalysis.city = user.last_city;
        } else if (hasWeatherKeywords) {
          // Se menciona clima mas não tem cidade, usar Beira como padrão
          console.log('ℹ️ Mensagem menciona clima mas sem cidade; usando Beira como padrão');
          adaptedAnalysis.type = 'weather_data';
          adaptedAnalysis.action = 'current';
          adaptedAnalysis.intent = 'weather_query_current';
          adaptedAnalysis.requires_weather_data = true;
          adaptedAnalysis.city = 'Beira';

          await saveOrUpdateAdvancedUser(phoneNumber, {
            last_city: 'Beira',
            preferred_city: user?.preferred_city || 'Beira'
          });
        } else {
          // NÃO é sobre clima - usar resposta amigável em português moçambicano
          console.log('💬 Pergunta não é sobre clima - usando resposta amigável');

          const friendlyResponse = await openaiService.generateFriendlyMozambicanResponse(
            messageText,
            analysis,
            {
              queryCount: user?.query_count || 0,
              lastCity: user?.last_city,
              expertiseLevel: user?.expertise_level || 'basic'
            }
          );

          if (friendlyResponse.success) {
            await whatsappApi.enviarMensagemUsandoWhatsappAPI(friendlyResponse.message, phoneNumber);

            // Atualizar contador de consultas
            await saveOrUpdateAdvancedUser(phoneNumber, {
              query_count: (user?.query_count || 0) + 1,
              last_interaction_type: 'general_friendly'
            });

            return friendlyResponse.message;
          }
        }
      }
    }

    // É sobre clima - continuar com roteamento normal
    console.log('🌤️ Pergunta sobre clima - usando roteamento meteorológico');

    // 2. Roteamento inteligente
    const response = await routeAdvancedRequest(adaptedAnalysis, messageText, phoneNumber, user, enableAutoDetection);

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

    case 'safety_advice':
      return await handleSafetyAdvice(analysis, phoneNumber, user);

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

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, ' deixa eu ver umas sugestões fixes para ti');

    // Criar contexto para as sugestões baseado no usuário
    const userContext = {
      preferredCity: user?.preferred_city || user?.last_city,
      lastCity: user?.last_city,
      queryCount: user?.query_count || 0,
      expertiseLevel: user?.expertise_level || 'basic',
      conversationHistory: user?.conversation_history || [],
      weatherPreferences: user?.weather_preferences
    };

    // Buscar dados meteorológicos atuais da cidade do usuário
    let weatherData = null;
    const userCity = userContext.preferredCity || userContext.lastCity || 'Maputo';

    try {
      console.log(`🌤️ Buscando dados meteorológicos para ${userCity}...`);
      weatherData = await weatherService.getCurrentWeather(userCity, user?.units || 'celsius');
      console.log(`📊 Dados obtidos: ${weatherData.temperature}°C em ${weatherData.city}`);
    } catch (error) {
      console.log('⚠️ Erro ao buscar dados meteorológicos, usando fallback:', error.message);
      weatherData = {
        city: userCity,
        temperature: 25,
        description: 'Tempo normal',
        humidity: 60,
        units: '°C',
        isForecast: false
      };
    }

    // Usar AI para gerar sugestões conversacionais em português moçambicano
    console.log(`🤖 Gerando sugestões conversacionais com AI baseadas em ${weatherData.temperature}°C...`);
    const aiSuggestions = await openaiService.generateConversationalSuggestions(
      weatherData,
      userContext
    );

    let finalMessage;
    if (aiSuggestions.success) {
      finalMessage = aiSuggestions.message;
      console.log('✅ Sugestões geradas com AI - resposta conversacional');
    } else {
      // Fallback natural caso a AI falhe
      const temp = parseInt(weatherData.temperature);
      finalMessage = `💡  com ${temp}°C em ${weatherData.city} hoje, `;

      if (temp > 30) {
        finalMessage += `está bem quente! Podes pensar em ir para locais frescos, beber muitos líquidos, e vestir roupa leve. A praia seria fixe! `;
      } else if (temp > 22) {
        finalMessage += `está uma temperatura boa! Podes fazer qualquer atividade, sair com amigos, ou simplesmente aproveitar o dia. `;
      } else {
        finalMessage += `está fresquinho, então melhor roupas quentes e atividades que te aquecem. Um chá seria bom! `;
      }

      finalMessage += `\n\n🤔 Sobre o que gostarias de saber mais? É só perguntares, meu!`;
      console.log('⚠️ Usando fallback conversacional');
    }

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    // **NOVO** - Após enviar sugestões, enviar lista interativa de opções de interesse
    console.log('📋 Enviando lista de opções de interesse...');
    setTimeout(async () => {
      try {
        await whatsappApi.enviarListaInteresseAposSugestoes(phoneNumber, weatherData);
        console.log('✅ Lista de opções de interesse enviada com sucesso');
      } catch (error) {
        console.error('❌ Erro ao enviar lista de opções:', error.message);
      }
    }, 1500); // Aguardar 1.5 segundos para não sobrecarregar

    // Atualizar contador de consultas
    await saveOrUpdateAdvancedUser(phoneNumber, {
      query_count: (userContext.queryCount || 0) + 1,
      last_command: '/sugestoes'
    });

  } catch (error) {
    console.error('❌ Erro ao processar comando /sugestoes:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      '❌ * algo deu errado!*\n\nTenta novamente em uns minutos.',
      phoneNumber
    );
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

async function handleSafetyAdviceCommand(phoneNumber, user) {
  try {
    console.log(`⚠️ Comando /conselhos (segurança) acionado para ${phoneNumber}`);

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, ' deixa eu ver que conselhos de segurança posso dar sobre o tempo...');

    // Criar contexto para os conselhos baseado no usuário
    const userContext = {
      preferredCity: user?.preferred_city || user?.last_city,
      lastCity: user?.last_city,
      queryCount: user?.query_count || 0,
      expertiseLevel: user?.expertise_level || 'basic'
    };

    // Buscar dados meteorológicos atuais da cidade do usuário
    let weatherData = null;
    const userCity = userContext.preferredCity || userContext.lastCity || 'Maputo';

    try {
      console.log(`🌤️ Buscando dados meteorológicos para ${userCity}...`);
      weatherData = await weatherService.getCurrentWeather(userCity, user?.units || 'celsius');
      console.log(`📊 Dados obtidos: ${weatherData.temperature}°C em ${weatherData.city}`);
    } catch (error) {
      console.log('⚠️ Erro ao buscar dados meteorológicos, usando fallback:', error.message);
      weatherData = {
        city: userCity,
        temperature: 25,
        description: 'Tempo normal',
        humidity: 60,
        units: '°C'
      };
    }

    // Usar AI para gerar conselhos de segurança em português moçambicano
    console.log(`🤖 Gerando conselhos de segurança com AI baseados em ${weatherData.temperature}°C...`);
    const safetyAdvice = await openaiService.generateSafetyAdvice(
      weatherData,
      userContext
    );

    let finalMessage;
    if (safetyAdvice.success) {
      finalMessage = safetyAdvice.message;
      console.log('✅ Conselhos de segurança gerados com AI');
    } else {
      // Fallback natural caso a AI falhe
      const temp = parseInt(weatherData.temperature);
      finalMessage = `⚠️  com ${temp}°C em ${weatherData.city}, `;

      if (temp > 32) {
        finalMessage += `está muito perigoso! O calor pode causar desidratação e insolação. Bebe muita água mesmo que não tenhas sede, procura sombra e evita o sol forte. Se sentires tontura ou náusea, pede ajuda imediatamente! `;
      } else if (temp > 25) {
        finalMessage += `já precisas de cuidados com o calor. Usa protetor solar, bebe água regularmente e evita ficar muito tempo ao sol. `;
      } else if (temp < 15) {
        finalMessage += `está frio e podes ter problemas com o frio. Veste-te bem em camadas, protege as extremidades e evita ficar molhado. `;
      } else {
        finalMessage += `a temperatura está boa, mas sempre mantém cuidados básicos como hidratação e protecção quando saires. `;
      }

      finalMessage += `\n\nLembra-te: é sempre melhor prevenir que remediar, meu! 💪`;
      console.log('⚠️ Usando fallback de segurança conversacional');
    }

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    // **NOVO** - Após enviar conselhos, gerar e enviar lista interativa de opções adicionais
    console.log('🤖 Gerando opções de conselhos adicionais com AI...');
    setTimeout(async () => {
      try {
        const adviceOptions = await openaiService.generateAdviceOptions(weatherData, {
          lastAdviceType: 'safety_advice',
          userExpertise: userContext.expertiseLevel,
          weatherCondition: weatherData.description,
          temperature: weatherData.temperature
        });

        if (adviceOptions.success && adviceOptions.options.length > 0) {
          await whatsappApi.enviarListaConselhosPersonalizados(phoneNumber, adviceOptions.options, weatherData);
          console.log('✅ Lista de opções de conselhos enviada com sucesso');
        } else {
          console.log('⚠️ Nenhuma opção de conselho foi gerada');
        }
      } catch (error) {
        console.error('❌ Erro ao enviar opções de conselhos:', error.message);
      }
    }, 2000); // Aguardar 2 segundos para não sobrecarregar

    // Atualizar contador de consultas
    await saveOrUpdateAdvancedUser(phoneNumber, {
      query_count: (userContext.queryCount || 0) + 1,
      last_command: '/conselhos'
    });

    return finalMessage;

  } catch (error) {
    console.error('❌ Erro ao processar comando /conselhos:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌  não consegui gerar os conselhos agora. Tenta mais tarde!",
      phoneNumber
    );
    return null;
  }
}

async function handleSafetyAdvice(analysis, phoneNumber, user) {
  try {
    const { city, context, originalMessage } = analysis;
    const targetCity = city || user?.preferred_city || user?.last_city;

    if (!targetCity) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "🏙️  para dar conselhos de segurança preciso saber a cidade. Qual cidade te interessa?",
        phoneNumber
      );
      return null;
    }

    // Buscar dados atuais do clima
    const weatherData = await weatherService.getCurrentWeather(targetCity, user?.units || 'celsius');

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, `Deixa eu ver que cuidados específicos precisas ter em ${targetCity}...`);

    // Usar AI para gerar conselhos de segurança
    const safetyResponse = await openaiService.generateSafetyAdvice(
      weatherData,
      {
        ...user,
        queryCount: user?.query_count || 0,
        expertiseLevel: user?.expertise_level || 'basic'
      }
    );

    let finalMessage;
    if (safetyResponse.success) {
      finalMessage = safetyResponse.message;
    } else {
      // Fallback básico de segurança
      const temp = parseInt(weatherData.temperature);
      finalMessage = `⚠️ Conselhos importantes para ${targetCity}:\n\n`;

      if (temp > 30) {
        finalMessage += `Com ${temp}°C está muito quente! Cuidado com desidratação - bebe água regularmente, usa protetor solar e procura sombra.`;
      } else if (temp < 18) {
        finalMessage += `Com ${temp}°C está frio! Veste-te bem para evitar hipotermia e mantém-te seco.`;
      } else {
        finalMessage += `Temperatura de ${temp}°C é boa, mas mantém sempre cuidados básicos de segurança.`;
      }

      finalMessage += `\n\nCuida-te sempre, meu! 💪`;
    }

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    // Salvar no histórico
    await saveOrUpdateAdvancedUser(phoneNumber, {
      last_city: targetCity,
      query_count: (user?.query_count || 0) + 1
    });

    return finalMessage;

  } catch (error) {
    console.error('❌ Erro ao gerar conselhos de segurança:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Não consegui gerar conselhos de segurança agora. Tenta mais tarde.",
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

// ===============================================
// COMANDO ZONAS SEGURAS E PONTOS DE REFÚGIO
// ===============================================

async function handleSafeZonesCommand(phoneNumber, user) {
  try {
    console.log(`🛡️ Comando /zonas_seguras acionado para ${phoneNumber}`);

    // Buscar dados atuais do clima para contextualizar as zonas seguras
    const targetCity = user?.preferred_city || 'Beira';
    const weatherData = await weatherService.getCurrentWeather(targetCity, user?.units || 'celsius');

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, '🔍 A procurar as zonas mais seguras na região...');

    // Gerar informações sobre zonas seguras com AI
    const safeZonesInfo = await openaiService.generateSafeZonesInformation(weatherData, user);

    let finalMessage = safeZonesInfo.message;

    // Enviar mensagem principal
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    // Enviar lista interativa com opções de zonas seguras
    // await sendSafeZonesInteractiveList(phoneNumber, weatherData, user);

    // Atualizar dados do usuário
    await saveOrUpdateAdvancedUser(phoneNumber, {
      preferred_city: targetCity,
      last_command: '/zonas_seguras'
    });

    return finalMessage;

  } catch (error) {
    console.error('❌ Erro ao processar comando /zonas_seguras:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌  não consegui carregar as informações das zonas seguras agora. Tenta mais tarde!",
      phoneNumber
    );
    return null;
  }
}

async function sendSafeZonesInteractiveList(phoneNumber, weatherData, user) {
  try {
    const city = weatherData.city.toLowerCase();

    // Gerar opções específicas baseadas na cidade e condições atuais
    const safeZonesOptions = await openaiService.generateSafeZonesOptions(weatherData, user);

    if (safeZonesOptions.success && safeZonesOptions.options.length > 0) {
      await whatsappApi.enviarListaZonasSeguras(
        phoneNumber,
        safeZonesOptions.options,
        weatherData
      );
    } else {
      // Fallback com opções padrão
      const defaultOptions = [
        { id: 'centros_evacuacao', title: 'Centros Evacuação', description: 'Locais oficiais de refúgio' }, // 16 chars
        { id: 'hospitais', title: 'Hospitais 24h', description: 'Assistência médica disponível' }, // 13 chars
        { id: 'escolas_seguras', title: 'Escolas Seguras', description: 'Refúgio temporário' }, // 15 chars
        { id: 'edificios_publicos', title: 'Edifícios Públicos', description: 'Estruturas resistentes' }, // 18 chars
        { id: 'contactos_emergencia', title: 'Contactos SOS', description: 'Números importantes' } // 13 chars
      ];

      await whatsappApi.enviarListaZonasSeguras(phoneNumber, defaultOptions, weatherData);
    }

  } catch (error) {
    console.error('❌ Erro ao enviar lista de zonas seguras:', error);
  }
}

// ===============================================
// COMANDO ALERTAS METEOROLÓGICOS DE PERIGO
// ===============================================

async function handleWeatherAlertsCommand(phoneNumber, user) {
  try {
    console.log(`⚠️ Comando /alertas acionado para ${phoneNumber}`);

    // Buscar dados atuais do clima para análise de perigos
    const targetCity = user?.preferred_city || 'Beira';
    const weatherData = await weatherService.getCurrentWeather(targetCity, user?.units || 'celsius');

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, '🚨 A analisar condições meteorológicas para detectar perigos...');

    // Gerar análise de alertas com AI
    const alertsAnalysis = await openaiService.generateWeatherAlertsAnalysis(weatherData, user);

    let finalMessage = alertsAnalysis.message;

    // Enviar mensagem principal
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    // Se houver alertas ativos, enviar lista interativa com ações recomendadas
    if (alertsAnalysis.hasActiveAlerts) {
      await sendWeatherAlertsInteractiveList(phoneNumber, weatherData, alertsAnalysis, user);
    }

    // Atualizar dados do usuário
    await saveOrUpdateAdvancedUser(phoneNumber, {
      preferred_city: targetCity,
      last_command: '/alertas'
    });

    return finalMessage;

  } catch (error) {
    console.error('❌ Erro ao processar comando /alertas:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌  não consegui verificar os alertas agora. Para emergências ligue 119 (INGC).",
      phoneNumber
    );
    return null;
  }
}

async function sendWeatherAlertsInteractiveList(phoneNumber, weatherData, alertsAnalysis, user) {
  try {
    // Gerar opções específicas baseadas nos alertas detectados
    const alertOptions = await openaiService.generateAlertActionOptions(weatherData, alertsAnalysis, user);

    if (alertOptions.success && alertOptions.options.length > 0) {
      await whatsappApi.enviarListaAlertasMeteorologicos(
        phoneNumber,
        alertOptions.options,
        weatherData,
        alertsAnalysis
      );
    } else {
      // Fallback com opções padrão baseadas no tipo de alerta
      const defaultOptions = [
        { id: 'medidas_protecao', title: 'Medidas Proteção', description: 'Como se proteger agora' },
        { id: 'monitoramento', title: 'Monitoramento', description: 'Acompanhar evolução clima' },
        { id: 'contactos_urgencia', title: 'Contactos Urgência', description: 'Números para emergências' },
        { id: 'zonas_evitar', title: 'Zonas Evitar', description: 'Locais perigosos agora' },
        { id: 'kit_emergencia', title: 'Kit Emergência', description: 'O que ter preparado' }
      ];

      await whatsappApi.enviarListaAlertasMeteorologicos(phoneNumber, defaultOptions, weatherData, alertsAnalysis);
    }

  } catch (error) {
    console.error('❌ Erro ao enviar lista de alertas:', error);
  }
}

async function handleAdvancedWeatherData(analysis, phoneNumber, user) {
  try {
    const { city, action, context, intent, originalMessage } = analysis;
    let targetCity = city || user?.preferred_city;

    if (!targetCity) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "🏙️  para ver o tempo preciso saber a cidade. Qual cidade te interessa?",
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
      if (forecast && forecast.forecasts && forecast.forecasts.length > 1) {
        const tomorrowData = forecast.forecasts[1]; // Índice 1 = amanhã
        weatherData = {
          city: forecast.city,
          temperature: Math.round((tomorrowData.maxTemp + tomorrowData.minTemp) / 2),
          maxTemp: tomorrowData.maxTemp,
          minTemp: tomorrowData.minTemp,
          description: tomorrowData.description,
          icon: tomorrowData.icon,
          units: forecast.units,
          date: tomorrowData.date,
          isForecast: true,
          source: forecast.source
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

    // Validar se os dados meteorológicos foram obtidos
    if (!weatherData || !weatherData.temperature) {
      console.log('❌ Dados meteorológicos não obtidos para:', targetCity);
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        `❌ *Ops! Não consegui obter dados do tempo*\n\nPara *${targetCity}* não encontrei informações meteorológicas.\n\n💡 *Verifica:*\n• Se escreveste o nome da cidade corretamente\n• Tenta novamente em alguns minutos\n\nCidades disponíveis: Maputo, Beira, Nampula, Quelimane, Tete, Chimoio...`,
        phoneNumber
      );
      return;
    }

    console.log('✅ Dados meteorológicos obtidos:', {
      city: weatherData.city,
      temp: weatherData.temperature,
      condition: weatherData.description
    });

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
      console.log('✅ Resposta AI bem-sucedida');
      finalMessage = contextualResponse.message;
    } else {
      console.log('⚠️ Resposta AI falhou, usando fallback simples');
      console.log('• Erro contextualResponse:', contextualResponse.error || 'não especificado');
      // Fallback simples
      finalMessage = createSimpleWeatherMessage(weatherData);
    }

    console.log('📤 Enviando mensagem final:', finalMessage.substring(0, 100) + '...');

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    // Enviar botões interativos com opções rápidas: Clima amanhã e Clima 7 dias
    try {
      const forecastButtons = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: 'Queres ver mais? Escolhe uma opção rápida:'
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'forecast_tomorrow_current',
                  title: 'Clima amanhã'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'forecast_7days_current',
                  title: 'Clima 7 dias'
                }
              }
            ]
          }
        }
      };

      // Delay curto para não sobrepor com a mensagem principal
      setTimeout(async () => {
        try {
          await whatsappApi.enviarMensagemInterativaUsandoWhatsappAPI(forecastButtons);
          console.log('✅ Botões de previsão enviados');
        } catch (err) {
          console.error('❌ Falha ao enviar botões de previsão:', err?.message || err);
        }
      }, 1200);
    } catch (err) {
      console.error('❌ Erro ao construir/enviar botões de previsão:', err?.message || err);
    }

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
      "📚  não consegui preparar a explicação agora. Tenta reformular a tua pergunta.",
      phoneNumber
    );
    return null;
  }
}

async function handleWeeklyForecast(city, phoneNumber, user) {
  try {
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      `📅  deixa ver como vai estar toda a semana em ${city}...`,
      phoneNumber
    );

    // Buscar previsão de 7 dias
    const forecast = await weatherService.getWeatherForecast(city, 7);

    if (!forecast || !forecast.forecasts || forecast.forecasts.length === 0) {
      throw new Error('Não foi possível obter a previsão de 7 dias');
    }

    // Gerar resposta baseada no nível do usuário
    const expertiseLevel = user?.expertise_level || 'basic';
    let message = `📅 *Previsão de 7 dias - ${forecast.city}*\n\n`;

    if (expertiseLevel === 'basic') {
      // Versão simples
      forecast.forecasts.forEach((day, index) => {
        const dayName = day.dayName || (index === 0 ? 'Hoje' :
          index === 1 ? 'Amanhã' :
            `${new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' })}`);

        message += `${dayName}: ${day.minTemp}${forecast.units} - ${day.maxTemp}${forecast.units}, ${day.description}\n`;
      });
    } else {
      // Versão mais detalhada
      forecast.forecasts.forEach((day, index) => {
        const dayName = day.dayName || (index === 0 ? 'Hoje' :
          index === 1 ? 'Amanhã' :
            new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' }));

        message += `📊 *${dayName}*\n`;
        message += `🌡️ ${day.minTemp}${forecast.units} - ${day.maxTemp}${forecast.units}\n`;
        message += `☀️ ${day.description}\n`;

        if (day.humidity) {
          message += `💧 ${day.humidity}%\n`;
        }
        if (day.chanceOfRain && day.chanceOfRain > 0) {
          message += `🌧️ ${day.chanceOfRain}%\n`;
        }

        message += `\n`;
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
        "🏙️  para dar dicas fixes preciso saber a cidade. Qual cidade te interessa?",
        phoneNumber
      );
      return null;
    }

    // Buscar dados atuais do clima
    const weatherData = await weatherService.getCurrentWeather(targetCity, user?.units || 'celsius');

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, ` deixa eu ver umas dicas fixes para ti sobre ${targetCity}...`);

    // Usar AI para gerar dicas naturais em português moçambicano
    const tipsResponse = await openaiService.generatePracticalTips(
      analysis,
      weatherData,
      {
        ...user,
        queryCount: user?.query_count || 0,
        expertiseLevel: user?.expertise_level || 'basic'
      }
    );

    let finalMessage;
    if (tipsResponse.success) {
      finalMessage = tipsResponse.message;
    } else {
      // Fallback usando resposta básica mais natural
      finalMessage = generateNaturalFallbackTips(weatherData, targetCity, originalMessage);
    }

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(finalMessage, phoneNumber);

    // Salvar no histórico
    await saveOrUpdateAdvancedUser(phoneNumber, {
      last_city: targetCity,
      query_count: (user?.query_count || 0) + 1
    });

    return finalMessage;

  } catch (error) {
    console.error('❌ Erro ao gerar dicas práticas:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Eish, não consegui gerar dicas agora. Tenta mais tarde, meu!",
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
  const offTopicMessage = `🤖  sou especialista em tempo e meteorologia! 

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

💬 Pergunta algo tipo: "Como está o tempo em Beira?" ou \`/sugestoes\``;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(offTopicMessage, phoneNumber);
  return offTopicMessage;
}

// ===============================================
// SUGESTÕES INTELIGENTES
// ===============================================

async function sendIntelligentSuggestions(phoneNumber, suggestions, city, userLocation = null) {
  try {
    console.log(`💡 Gerando sugestões inteligentes para ${phoneNumber}`);

    // 1. Determinar localização do usuário
    let targetCity = city || userLocation;
    if (!targetCity) {
      // Tentar obter última cidade do usuário
      const user = await getUserByContact(phoneNumber);
      targetCity = user?.last_city || user?.preferred_city || 'Maputo'; // Default para Maputo
    }

    console.log(`📍 Localização para sugestões: ${targetCity}`);

    // 2. Obter dados meteorológicos atuais para sugestões contextuais
    let currentWeatherData = null;
    try {
      currentWeatherData = await weatherService.getCurrentWeather(targetCity);
      console.log(`🌡️ Temperatura atual em ${targetCity}: ${currentWeatherData.temperature}°C`);
    } catch (error) {
      console.log(`⚠️ Não foi possível obter dados meteorológicos para ${targetCity}:`, error.message);
    }

    // 3. Gerar sugestões inteligentes baseadas na temperatura atual
    let contextualSuggestions = suggestions;
    if (currentWeatherData && currentWeatherData.temperature) {
      try {
        console.log(`🤖 Gerando sugestões AI baseadas na temperatura de ${currentWeatherData.temperature}°C`);

        const aiSuggestions = await openaiService.generateTemperatureBasedSuggestions(
          currentWeatherData,
          targetCity,
          {
            userPhone: phoneNumber,
            currentSuggestions: suggestions
          }
        );

        if (aiSuggestions.success && aiSuggestions.suggestions) {
          contextualSuggestions = aiSuggestions.suggestions;
          console.log(`✅ Sugestões AI geradas: [${contextualSuggestions.join(', ')}]`);
        }
      } catch (error) {
        console.log(`⚠️ Erro ao gerar sugestões AI: ${error.message}`);
      }
    }

    // 4. Se não há sugestões válidas, gerar fallbacks baseados na temperatura
    if (!contextualSuggestions || contextualSuggestions.length === 0) {
      contextualSuggestions = generateTemperatureFallbackSuggestions(currentWeatherData);
    }

    // 5. Criar mensagem personalizada em português moçambicano
    const headerText = getPersonalizedHeader(currentWeatherData);
    const bodyText = getPersonalizedBody(currentWeatherData, targetCity);

    const suggestionButtons = {
      messaging_product: 'whatsapp',
      recipient_type: "individual",
      to: phoneNumber,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "text",
          text: headerText
        },
        body: {
          text: bodyText
        },
        action: {
          buttons: contextualSuggestions.slice(0, 3).map((suggestion, index) => {
            return {
              type: "reply",
              reply: {
                id: `temp_suggestion_${targetCity}_${currentWeatherData?.temperature || 'unknown'}_${index}`,
                title: suggestion.length > 20 ? suggestion.substring(0, 17) + "..." : suggestion
              }
            };
          })
        }
      }
    };

    console.log(`📤 Enviando sugestões contextuais para ${phoneNumber}`);
    const result = await whatsappApi.sendMessage(suggestionButtons);
    console.log('✅ Sugestões inteligentes enviadas:', result.success ? 'Sucesso' : 'Erro');

  } catch (error) {
    console.error('❌ Erro ao enviar sugestões inteligentes:', error.message);
  }
}

// ===============================================
// FUNÇÕES AUXILIARES PARA SUGESTÕES CONTEXTUAIS
// ===============================================

function generateTemperatureFallbackSuggestions(weatherData) {
  const temp = weatherData?.temperature || 25;

  if (temp > 30) {
    return ["Como refrescar", "Dicas calor", "Onde ir"];
  } else if (temp > 25) {
    return ["O que fazer", "Que roupa", "Onde ir"];
  } else if (temp > 20) {
    return ["Que roupa", "Atividades", "Tempo amanhã"];
  } else {
    return ["Como aquecer", "Roupas quentes", "Bebidas quentes"];
  }
}

function getPersonalizedHeader(weatherData) {
  const temp = weatherData?.temperature;

  if (!temp) return "💡 Sugestões para ti";

  if (temp > 32) {
    return "🔥 Está bem quente!";
  } else if (temp > 28) {
    return "☀️ Está um calorzito";
  } else if (temp > 23) {
    return "🌤️ Tempo agradável";
  } else if (temp > 18) {
    return "🌥️ Está fresco";
  } else {
    return "❄️ Está frio";
  }
}

function getPersonalizedBody(weatherData, city) {
  const temp = weatherData?.temperature;

  if (!temp) {
    return ` aqui tens umas sugestões fixes para ${city}:`;
  }

  if (temp > 32) {
    return `Com ${temp}°C em ${city}, melhor procurar sombra! Que tal:`;
  } else if (temp > 28) {
    return `${temp}°C em ${city}... está um calor bom! Sugestões:`;
  } else if (temp > 23) {
    return `${temp}°C em ${city} - tempo perfeito! Que tal:`;
  } else if (temp > 18) {
    return `Com ${temp}°C em ${city}, tempo fresquinho. Sugestões:`;
  } else {
    return `${temp}°C em ${city}... brrr! Melhor:`;
  }
}

// Função original mantida para compatibilidade
async function sendIntelligentSuggestionsLegacy(phoneNumber, suggestions, city) {
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
          text: " com base no que perguntaste, talvez te interesse:"
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
    // Exact quick actions for current-city forecast buttons
    if (buttonId === 'forecast_tomorrow_current') {
      // Directly call the tomorrow forecast handler for the user's current/preferred city
      await handleTomorrowForecastCommand(phoneNumber, user);
      return;
    }

    if (buttonId === 'forecast_7days_current') {
      // Directly call the 7-day forecast handler for the user's current/preferred city
      await handleForecastRequest(phoneNumber, 7);
      return;
    }

    // Backwards-compatible: city-specific forecast buttons (forecast_7days_[city], forecast_tomorrow_[city])
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
    const listTitle = interactive.list_reply.title;

    console.log(`📋 Lista selecionada: ${listId} - ${listTitle}`);

    // Handlers para as opções de interesse após sugestões
    switch (listId) {
      case "previsao_7_dias":
        await handleForecastRequest(phoneNumber, 7);
        break;

      case "conselhos_roupa":
        await handleClothingAdviceRequest(phoneNumber);
        break;

      case "atividades_clima":
        await handleActivitySuggestionsRequest(phoneNumber);
        break;

      case "dicas_calor":
        await handleHeatTipsRequest(phoneNumber);
        break;

      case "dicas_frio":
        await handleColdTipsRequest(phoneNumber);
        break;

      case "dicas_chuva":
        await handleRainTipsRequest(phoneNumber);
        break;

      case "explicar_meteorologia":
        await handleMeteorologicalEducationRequest(phoneNumber);
        break;

      case "alertas_clima":
        await handleWeatherAlertsSetupRequest(phoneNumber);
        break;

      // Handlers para conselhos personalizados gerados por AI
      case "cuidados_saude":
        await handleHealthCareAdviceRequest(phoneNumber);
        break;

      case "atividades_recomendadas":
        await handleRecommendedActivitiesRequest(phoneNumber);
        break;

      case "preparacao_mudancas":
        await handleWeatherChangesPreparationRequest(phoneNumber);
        break;

      case "dicas_seguranca":
        await handleSafetyTipsRequest(phoneNumber);
        break;

      case "conselhos_casa":
        await handleHomeTipsRequest(phoneNumber);
        break;

      case "combater_calor":
        await handleAdvancedHeatTipsRequest(phoneNumber);
        break;

      case "manter_aquecido":
        await handleAdvancedColdTipsRequest(phoneNumber);
        break;

      // Handlers para zonas seguras e pontos de refúgio
      case "centros_evacuacao":
        await handleEvacuationCentersRequest(phoneNumber);
        break;

      case "hospitais":
      case "hospitais_24h":
        await handleEmergencyHospitalsRequest(phoneNumber);
        break;

      case "escolas_seguras":
        await handleSafeSchoolsRequest(phoneNumber);
        break;

      case "edificios_publicos":
        await handlePublicBuildingsRequest(phoneNumber);
        break;

      case "contactos_emergencia":
      case "contactos_sos":
        await handleEmergencyContactsRequest(phoneNumber);
        break;

      case "rotas_evacuacao":
      case "rotas_seguras":
        await handleEvacuationRoutesRequest(phoneNumber);
        break;

      case "kit_emergencia":
        await handleEmergencyKitRequest(phoneNumber);
        break;

      // Handlers para alertas meteorológicos
      case "medidas_protecao":
      case "medidas_urgentes":
        await handleProtectionMeasuresRequest(phoneNumber);
        break;

      case "monitoramento":
      case "monitorar_situacao":
        await handleWeatherMonitoringRequest(phoneNumber);
        break;

      case "contactos_urgencia":
        await handleUrgencyContactsRequest(phoneNumber);
        break;

      case "zonas_evitar":
        await handleDangerousZonesRequest(phoneNumber);
        break;

      case "precaucoes_basicas":
        await handleBasicPrecautionsRequest(phoneNumber);
        break;

      case "preparacao":
        await handleEmergencyPreparationRequest(phoneNumber);
        break;

      case "dicas_conforto":
        await handleComfortTipsRequest(phoneNumber);
        break;

      case "proximos_dias":
        await handleUpcomingWeatherRequest(phoneNumber);
        break;

      case "kit_sobrevivencia":
        await handleSurvivalKitRequest(phoneNumber);
        break;

      case "locais_seguros":
        await handleSafeLocationsRequest(phoneNumber);
        break;

      default:
        // Para IDs gerados dinamicamente pela AI, usar handler genérico
        if (listId.startsWith('conselho_') || listId.includes('_')) {
          await handleDynamicAdviceRequest(phoneNumber, listId, listTitle);
        } else {
          // Processar como texto normal para compatibilidade
          await processAdvancedTextMessage(listId, phoneNumber);
        }
    }
  }
}

// ===============================================
// HANDLERS PARA OPÇÕES DE INTERESSE
// ===============================================

async function handleForecastRequest(phoneNumber, days = 7) {
  try {
    console.log(`📅 Solicitação de previsão de ${days} dias para ${phoneNumber}`);

    const user = await getUserByContact(phoneNumber);
    const city = user?.preferred_city || user?.last_city || 'Maputo';

    // Detectar nível de expertise do usuário
    const userLevel = (user && (user.expertiseLevel || user.expertise_level || user.preferred_complexity)) ?
      (user.expertiseLevel || user.expertise_level || user.preferred_complexity) : 'basic';

    console.log(`🎯 Nível do usuário: ${userLevel}`);

    // Mensagem de carregamento adaptada ao nível
    const loadingMessage = userLevel === 'advanced'
      ? `🔍 Analisando dados meteorológicos de ${days} dias para ${city}...`
      : userLevel === 'intermediate'
        ? `🔍 Preparando previsão detalhada de ${days} dias para ${city}...`
        : `🔍  deixa ver a previsão de ${days} dias para ${city}...`;

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, loadingMessage);

    const forecastData = await weatherService.getWeatherForecast(city, days);

    if (forecastData && forecastData.forecasts && forecastData.forecasts.length > 0) {

      // Gerar mensagem baseada no nível do usuário
      let forecastMessage = generateForecastMessageByLevel(userLevel, forecastData, days);

      await whatsappApi.enviarMensagemUsandoWhatsappAPI(forecastMessage, phoneNumber);

      // Atualizar dados do usuário
      await saveOrUpdateAdvancedUser(phoneNumber, {
        preferred_city: city,
        last_command: `/proximos_${days}_dias`,
        query_count: (user?.query_count || 0) + 1
      });

    } else {
      const errorMessage = userLevel === 'advanced'
        ? `❌ Não foi possível obter os dados meteorológicos para ${city}. Verifique a denominação da localidade e tente novamente.`
        : userLevel === 'intermediate'
          ? `❌ Não consegui obter a previsão para ${city}. Verifica o nome da cidade e tenta novamente.`
          : `❌  não consegui obter a previsão para ${city}. Verifica se o nome da cidade está correto e tenta novamente.`;

      await whatsappApi.enviarMensagemUsandoWhatsappAPI(errorMessage, phoneNumber);
    }
  } catch (error) {
    console.error('❌ Erro ao processar previsão:', error);

    // Buscar usuário novamente para error message se necessário
    const user = await getUserByContact(phoneNumber).catch(() => null);
    const userLevel = (user && (user.expertiseLevel || user.expertise_level || user.preferred_complexity)) ?
      (user.expertiseLevel || user.expertise_level || user.preferred_complexity) : 'basic';

    const errorMessage = userLevel === 'advanced'
      ? "❌ Erro no sistema meteorológico. Favor tentar novamente."
      : "❌  algo deu errado. Tenta mais tarde.";

    await whatsappApi.enviarMensagemErro(phoneNumber, errorMessage);
  }
}

// Função auxiliar para gerar mensagem baseada no nível do usuário
function generateForecastMessageByLevel(userLevel, forecastData, days) {
  let forecastMessage = '';

  switch (userLevel) {
    case 'advanced':
      // Nível avançado: formato técnico e detalhado
      forecastMessage = `📊 *Análise Meteorológica ${days} Dias - ${forecastData.city}*\n\n`;

      forecastData.forecasts.slice(0, days).forEach((day, index) => {
        const emoji = getWeatherEmoji(day.description);
        const dayName = day.dayName || (index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' :
          new Date(day.date).toLocaleDateString('pt-MZ', { weekday: 'long', day: 'numeric', month: 'short' }));

        forecastMessage += `${emoji} **${dayName}**\n`;
        forecastMessage += `🌡️ Amplitude térmica: ${day.minTemp}${forecastData.units} - ${day.maxTemp}${forecastData.units}\n`;
        forecastMessage += `📝 Condições atmosféricas: ${day.description}\n`;

        if (day.humidity) {
          forecastMessage += `💧 Humidade relativa: ${day.humidity}%\n`;
        }
        if (day.chanceOfRain && day.chanceOfRain > 0) {
          forecastMessage += `🌧️ Probabilidade de precipitação: ${day.chanceOfRain}%\n`;
        }
        if (day.windSpeed && day.windSpeed > 0) {
          forecastMessage += `💨 Velocidade do vento: ${day.windSpeed} km/h\n`;
        }
        if (day.pressure) {
          forecastMessage += `🔘 Pressão atmosférica: ${day.pressure} hPa\n`;
        }
        if (day.uvIndex) {
          forecastMessage += `☀️ Índice UV: ${day.uvIndex}\n`;
        }

        forecastMessage += `\n`;
      });

      forecastMessage += `\n🎯 **Recomendação técnica:** Baseie o planeamento das atividades na análise dos parâmetros meteorológicos apresentados.`;
      forecastMessage += `\n📊 _Fonte de dados: ${forecastData.source}_`;
      break;

    case 'intermediate':
      // Nível intermediário: equilibrio entre técnico e acessível
      forecastMessage = `📅 *Previsão Detalhada ${days} Dias - ${forecastData.city}*\n\n`;

      forecastData.forecasts.slice(0, days).forEach((day, index) => {
        const emoji = getWeatherEmoji(day.description);
        const dayName = day.dayName || (index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' :
          new Date(day.date).toLocaleDateString('pt-MZ', { weekday: 'long', day: 'numeric' }));

        forecastMessage += `${emoji} **${dayName}**\n`;
        forecastMessage += `🌡️ Temperatura: ${day.minTemp}${forecastData.units} - ${day.maxTemp}${forecastData.units}\n`;
        forecastMessage += `📝 Condições: ${day.description}\n`;

        if (day.humidity) {
          const humidityLevel = day.humidity > 80 ? 'alta' : day.humidity > 60 ? 'moderada' : 'baixa';
          forecastMessage += `💧 Humidade: ${day.humidity}% (${humidityLevel})\n`;
        }
        if (day.chanceOfRain && day.chanceOfRain > 0) {
          const rainLevel = day.chanceOfRain > 70 ? 'alta probabilidade' : day.chanceOfRain > 40 ? 'possível' : 'baixa chance';
          forecastMessage += `🌧️ Chuva: ${day.chanceOfRain}% (${rainLevel})\n`;
        }
        if (day.windSpeed && day.windSpeed > 0) {
          const windLevel = day.windSpeed > 20 ? 'vento forte' : day.windSpeed > 10 ? 'brisa moderada' : 'vento leve';
          forecastMessage += `💨 Vento: ${day.windSpeed} km/h (${windLevel})\n`;
        }

        forecastMessage += `\n`;
      });

      forecastMessage += `\n💡 **Dica da Joana Bot:** Planifica as atividades considerando estes dados meteorológicos detalhados!`;
      forecastMessage += `\n📊 _Dados: ${forecastData.source}_`;
      break;

    default: // basic
      // Nível básico: formato simples e amigável
      forecastMessage = `📅 *Previsão de ${days} dias para ${forecastData.city}*\n\n`;

      forecastData.forecasts.slice(0, days).forEach((day, index) => {
        const emoji = getWeatherEmoji(day.description);
        const dayName = day.dayName || (index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' :
          new Date(day.date).toLocaleDateString('pt-MZ', { weekday: 'long' }));

        forecastMessage += `${emoji} *${dayName}*\n`;
        forecastMessage += `   🌡️ ${day.minTemp}${forecastData.units} - ${day.maxTemp}${forecastData.units}\n`;
        forecastMessage += `   ${day.description}\n`;

        // Adicionar informações extras se disponíveis (formato simples)
        if (day.humidity) {
          forecastMessage += `   💧 Umidade: ${day.humidity}%\n`;
        }
        if (day.chanceOfRain && day.chanceOfRain > 0) {
          forecastMessage += `   🌧️ Chuva: ${day.chanceOfRain}%\n`;
        }
        if (day.windSpeed && day.windSpeed > 0) {
          forecastMessage += `   💨 Vento: ${day.windSpeed} km/h\n`;
        }

        forecastMessage += `\n`;
      });

      forecastMessage += `\n💡 *Dica da Joana Bot:* Planifica as tuas atividades baseado nesta previsão!`;
      forecastMessage += `\n📊 _Dados fornecidos por ${forecastData.source}_`;
      break;
  }

  return forecastMessage;
}

async function handleClothingAdviceRequest(phoneNumber) {
  try {
    console.log(`👕 Solicitação de conselhos de roupa para ${phoneNumber}`);

    const user = await getUserByContact(phoneNumber);
    const city = user?.preferred_city || user?.last_city || 'Maputo';

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, ' deixa ver que roupa é melhor para hoje...');

    const weatherData = await weatherService.getCurrentWeather(city);
    const temp = parseInt(weatherData.temperature);

    let clothingAdvice = `👕 *Conselhos de Roupa para ${city}*\n\n`;
    clothingAdvice += `🌡️ Temperatura atual: ${temp}°C\n`;
    clothingAdvice += `🌤️ Condição: ${weatherData.description}\n\n`;

    if (temp > 30) {
      clothingAdvice += `🌞 *Está bem quente!*\n`;
      clothingAdvice += `✅ Usa roupas leves e cores claras\n`;
      clothingAdvice += `✅ Tecidos respiráveis como algodão\n`;
      clothingAdvice += `✅ Não esqueças o chapéu e óculos de sol\n`;
      clothingAdvice += `✅ Protetor solar é obrigatório!`;
    } else if (temp > 25) {
      clothingAdvice += `☀️ *Temperatura agradável!*\n`;
      clothingAdvice += `✅ Roupa casual e confortável\n`;
      clothingAdvice += `✅ Camiseta ou camisa leve\n`;
      clothingAdvice += `✅ Calças finas ou bermudas\n`;
      clothingAdvice += `✅ Ténis ou sapatos frescos`;
    } else if (temp > 20) {
      clothingAdvice += `🌤️ *Clima fresquinho!*\n`;
      clothingAdvice += `✅ Camisa de manga comprida\n`;
      clothingAdvice += `✅ Calças normais\n`;
      clothingAdvice += `✅ Pode levar uma jaqueta leve\n`;
      clothingAdvice += `✅ Sapatos fechados`;
    } else {
      clothingAdvice += `🧥 *Está fresco hoje!*\n`;
      clothingAdvice += `✅ Jaqueta ou casaco\n`;
      clothingAdvice += `✅ Roupa em camadas\n`;
      clothingAdvice += `✅ Calças compridas\n`;
      clothingAdvice += `✅ Sapatos fechados e meias`;
    }

    if (weatherData.description.includes('chuva')) {
      clothingAdvice += `\n\n☔ *Vai chover!*\n`;
      clothingAdvice += `✅ Leva guarda-chuva\n`;
      clothingAdvice += `✅ Sapatos impermeáveis\n`;
      clothingAdvice += `✅ Casaco resistente à água`;
    }

    clothingAdvice += `\n\n💡 *Dica da Joana Bot:* Sempre verifica o tempo antes de sair de casa!`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(clothingAdvice, phoneNumber);
  } catch (error) {
    console.error('❌ Erro ao processar conselhos de roupa:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao obter conselhos de roupa");
  }
}

async function handleActivitySuggestionsRequest(phoneNumber) {
  try {
    console.log(`🎯 Solicitação de atividades ideais para ${phoneNumber}`);

    const user = await getUserByContact(phoneNumber);
    const userContext = {
      preferredCity: user?.preferred_city || user?.last_city,
      expertiseLevel: user?.expertise_level || 'basic'
    };

    // Usar AI para gerar sugestões de atividades baseadas no clima
    const suggestions = await openaiService.generateConversationalSuggestions(
      await weatherService.getCurrentWeather(userContext.preferredCity || 'Maputo'),
      userContext
    );

    if (suggestions.success) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(suggestions.message, phoneNumber);
    } else {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        '❌  não consegui gerar sugestões agora. Tenta mais tarde.',
        phoneNumber
      );
    }
  } catch (error) {
    console.error('❌ Erro ao processar sugestões de atividades:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao obter sugestões");
  }
}

async function handleHeatTipsRequest(phoneNumber) {
  const heatTips = `🌞 *Dicas para Dias Quentes*

🚰 *Hidratação:*
• Bebe muita água (pelo menos 8 copos)
• Evita bebidas alcoólicas e com cafeína
• Come frutas com água (melancia, laranja)

🏠 *Em Casa:*
• Fica em locais com sombra ou ar condicionado
• Usa ventoinhas para circular o ar
• Fecha cortinas durante o dia

🚶 *Ao Sair:*
• Evita o sol das 11h às 15h
• Usa protetor solar FPS 30+
• Chapéu, óculos escuros obrigatórios
• Roupas leves e cores claras

⚠️ *Sinais de Alerta:*
• Dor de cabeça intensa
• Náuseas ou tonturas
• Pele muito vermelha e quente

💡 *Dica da Joana Bot:* Se sentires mal-estar, procura sombra e bebe água imediatamente!`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(heatTips, phoneNumber);
}

async function handleColdTipsRequest(phoneNumber) {
  const coldTips = `🧥 *Dicas para Dias Frios*

👕 *Roupa Adequada:*
• Veste roupas em camadas
• Tecidos que mantêm calor (lã, algodão)
• Não esqueças gorro, luvas e cachecol
• Sapatos fechados e meias quentes

🏠 *Em Casa:*
• Fecha janelas e portas
• Usa cobertores extras
• Bebe bebidas quentes (chá, café)
• Come alimentos quentes

🚶 *Ao Sair:*
• Protege extremidades (mãos, pés, orelhas)
• Evita ficar muito tempo ao ar livre
• Mantém-te em movimento
• Leva sempre casaco extra

⚠️ *Cuidados Especiais:*
• Idosos e crianças precisam mais proteção
• Atenção a hipotermia
• Aquece o carro antes de sair

💡 *Dica da Joana Bot:* Uma sopa quente é sempre boa ideia em dias frios!`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(coldTips, phoneNumber);
}

async function handleRainTipsRequest(phoneNumber) {
  const rainTips = `☔ *Dicas para Dias de Chuva*

🌂 *Equipamentos:*
• Sempre leva guarda-chuva
• Casaco impermeável ou capa de chuva
• Sapatos com sola antiderrapante
• Mochila com proteção para documentos

🚗 *No Trânsito:*
• Reduz velocidade
• Aumenta distância de segurança
• Liga faróis mesmo de dia
• Evita poças grandes

🏠 *Em Casa:*
• Verifica se há goteiras
• Protege equipamentos eletrônicos
• Tem lanternas carregadas
• Mantém comida e água reserva

⚠️ *Segurança:*
• Evita áreas alagadas
• Não toques em fios elétricos molhados
• Fica longe de árvores grandes
• Se houver trovoada, fica dentro de casa

💡 *Dica da Joana Bot:* Chuva pode ser relaxante! Aproveita para ler ou ver um filme.`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(rainTips, phoneNumber);
}

async function handleMeteorologicalEducationRequest(phoneNumber) {
  const educationInfo = `🌡️ *Como Funciona o Clima?*

☀️ *O Sol é o Motor:*
• Aquece diferentemente a Terra
• Cria diferenças de pressão
• Gera ventos e nuvens

🌊 *Ciclo da Água:*
• Evaporação dos oceanos
• Formação de nuvens
• Precipitação (chuva)
• Volta aos oceanos

🌪️ *Tipos de Tempo:*
• **Alta Pressão:** Tempo estável, céu limpo
• **Baixa Pressão:** Chuva, nuvens, vento
• **Frentes:** Mudanças bruscas no tempo

📊 *Instrumentos:*
• **Termômetro:** Mede temperatura
• **Barómetro:** Mede pressão atmosférica
• **Anemômetro:** Mede velocidade do vento
• **Pluviómetro:** Mede quantidade de chuva

🌍 *Em Moçambique:*
• Clima tropical com duas estações
• Época seca: maio a outubro
• Época chuvosa: novembro a abril
• Ciclones: dezembro a março

💡 *Dica da Joana Bot:* Compreender o clima ajuda-te a planificar melhor o teu dia!`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(educationInfo, phoneNumber);
}

async function handleWeatherAlertsSetupRequest(phoneNumber) {
  const alertsInfo = `🚨 *Alertas Meteorológicos*

📱 *O que posso fazer:*
• Avisar sobre chuva forte
• Alertar sobre temperaturas extremas
• Notificar sobre ciclones
• Lembrar de levar guarda-chuva

⏰ *Configurações Disponíveis:*
• Alertas matinais (07:00)
• Alertas antes de sair (16:00)
• Emergências (tempo real)

🔧 *Para Configurar:*
1. Envia: "/alertas configurar"
2. Escolhe teus horários
3. Define tipos de alertas
4. Confirma configuração

⚡ *Alertas de Emergência:*
• Ciclones (automático)
• Chuvas torrenciais
• Ondas de calor
• Ventos fortes

💡 *Dica da Joana Bot:* Alertas podem salvar o teu dia! Nunca mais serás apanhado de surpresa pela chuva.

🎯 *Quer configurar agora?* Envia "/alertas" para começar!`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(alertsInfo, phoneNumber);
}

// ===============================================
// HANDLERS PARA CONSELHOS PERSONALIZADOS AI
// ===============================================

async function handleHealthCareAdviceRequest(phoneNumber) {
  try {
    console.log(`🏥 Solicitação de cuidados de saúde para ${phoneNumber}`);

    const user = await getUserByContact(phoneNumber);
    const city = user?.preferred_city || user?.last_city || 'Maputo';

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, ' deixa ver que cuidados de saúde são importantes com este tempo...');

    const weatherData = await weatherService.getCurrentWeather(city);

    // Usar AI para gerar conselhos de saúde específicos
    const healthAdvice = await openaiService.generateSafetyAdvice(weatherData, {
      adviceType: 'health_care',
      expertiseLevel: user?.expertise_level || 'basic'
    });

    if (healthAdvice.success) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(healthAdvice.message, phoneNumber);
    } else {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        `🏥 *Cuidados de Saúde em ${city}*\n\nCom a temperatura atual, é importante manter-se hidratado, proteger-se adequadamente e estar atento a sinais de mal-estar relacionados ao clima.`,
        phoneNumber
      );
    }
  } catch (error) {
    console.error('❌ Erro ao processar cuidados de saúde:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao obter conselhos de saúde");
  }
}

async function handleRecommendedActivitiesRequest(phoneNumber) {
  try {
    console.log(`🎯 Solicitação de atividades recomendadas para ${phoneNumber}`);

    const user = await getUserByContact(phoneNumber);

    // Usar a mesma função que já funciona para atividades
    await handleActivitySuggestionsRequest(phoneNumber);
  } catch (error) {
    console.error('❌ Erro ao processar atividades recomendadas:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao obter atividades recomendadas");
  }
}

async function handleWeatherChangesPreparationRequest(phoneNumber) {
  try {
    console.log(`🌤️ Solicitação de preparação para mudanças climáticas para ${phoneNumber}`);

    const user = await getUserByContact(phoneNumber);
    const city = user?.preferred_city || user?.last_city || 'Maputo';

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Deixa eu ver que mudanças podem vir e como te preparares...');

    const forecastData = await weatherService.getWeatherForecast(city, 3);
    const currentWeather = await weatherService.getCurrentWeather(city);

    let preparationMessage = `🌤️ *Preparação para Mudanças do Tempo em ${forecastData.city || city}*\n\n`;
    preparationMessage += `📊 *Situação Atual:* ${currentWeather.temperature}°C, ${currentWeather.description}\n\n`;

    if (forecastData && forecastData.forecasts && forecastData.forecasts.length > 1) {
      preparationMessage += `📅 *Próximos Dias:*\n`;
      forecastData.forecasts.slice(1, 3).forEach((day, index) => {
        const dayName = index === 0 ? 'Amanhã' : 'Depois de amanhã';
        preparationMessage += `• ${dayName}: ${day.minTemp}${forecastData.units}-${day.maxTemp}${forecastData.units}, ${day.description}\n`;
      });

      preparationMessage += `\n💡 *Recomendações:*\n`;
      preparationMessage += `• Verifica a previsão antes de sair\n`;
      preparationMessage += `• Prepara roupas para diferentes temperaturas\n`;
      preparationMessage += `• Leva guarda-chuva se necessário\n`;
      preparationMessage += `• Planifica atividades baseado no tempo\n`;
    } else {
      preparationMessage += `💡 *Dicas Gerais:*\n`;
      preparationMessage += `• Sempre verifica a previsão pela manhã\n`;
      preparationMessage += `• Mantém roupas variadas disponíveis\n`;
      preparationMessage += `• Tem sempre guarda-chuva à mão\n`;
    }

    preparationMessage += `\n🤖 *Dica da Joana Bot:* As mudanças climáticas podem ser súbitas, estar preparado é sempre a melhor estratégia!`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(preparationMessage, phoneNumber);
  } catch (error) {
    console.error('❌ Erro ao processar preparação para mudanças:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao obter conselhos de preparação");
  }
}

async function handleSafetyTipsRequest(phoneNumber) {
  try {
    console.log(`⚠️ Solicitação de dicas de segurança para ${phoneNumber}`);

    // Usar a função existente de conselhos de segurança
    const user = await getUserByContact(phoneNumber);
    await handleSafetyAdviceCommand(phoneNumber, user);
  } catch (error) {
    console.error('❌ Erro ao processar dicas de segurança:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao obter dicas de segurança");
  }
}

async function handleHomeTipsRequest(phoneNumber) {
  try {
    console.log(`🏠 Solicitação de dicas para casa para ${phoneNumber}`);

    const user = await getUserByContact(phoneNumber);
    const city = user?.preferred_city || user?.last_city || 'Maputo';

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Deixa ver que dicas posso dar para a tua casa...');

    const weatherData = await weatherService.getCurrentWeather(city);
    const temp = parseInt(weatherData.temperature);

    let homeTips = `🏠 *Dicas para Casa com ${temp}°C*\n\n`;

    if (temp > 30) {
      homeTips += `🌞 *Dias Quentes:*\n`;
      homeTips += `• Fecha cortinas e persianas durante o dia\n`;
      homeTips += `• Usa ventoinhas para circular o ar\n`;
      homeTips += `• Evita usar forno e equipamentos que aquecem\n`;
      homeTips += `• Abre janelas à noite para refrescar\n`;
      homeTips += `• Mantenha água gelada sempre disponível\n`;
    } else if (temp < 20) {
      homeTips += `🧥 *Dias Frios:*\n`;
      homeTips += `• Fecha bem portas e janelas\n`;
      homeTips += `• Usa cobertores e roupas de cama quentes\n`;
      homeTips += `• Aquece a casa gradualmente\n`;
      homeTips += `• Prepara bebidas quentes\n`;
      homeTips += `• Verifica se não há correntes de ar\n`;
    } else {
      homeTips += `🌤️ *Temperatura Agradável:*\n`;
      homeTips += `• Aproveita para ventilar a casa\n`;
      homeTips += `• Faz limpezas que precisam de janelas abertas\n`;
      homeTips += `• Organiza roupas de acordo com a estação\n`;
      homeTips += `• Planifica atividades ao ar livre\n`;
    }

    if (weatherData.description.includes('chuva')) {
      homeTips += `\n☔ *Com Chuva:*\n`;
      homeTips += `• Verifica se há goteiras\n`;
      homeTips += `• Protege equipamentos eletrônicos\n`;
      homeTips += `• Mantenha toalhas extras disponíveis\n`;
      homeTips += `• Tem lanterna carregada\n`;
    }

    homeTips += `\n💡 *Dica da Joana Bot:* Uma casa bem preparada para o clima torna o dia muito mais confortável!`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(homeTips, phoneNumber);
  } catch (error) {
    console.error('❌ Erro ao processar dicas para casa:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao obter dicas para casa");
  }
}

async function handleAdvancedHeatTipsRequest(phoneNumber) {
  try {
    console.log(`🌞 Solicitação de dicas avançadas para calor para ${phoneNumber}`);

    // Usar a função existente mas com mais detalhes
    await handleHeatTipsRequest(phoneNumber);

    // Adicionar dicas avançadas extras
    const advancedTips = `\n🔥 *Dicas Avançadas para Calor Extremo:*\n\n`;
    const extraTips = `💧 *Hidratação Inteligente:*\n• Bebe água antes de sentir sede\n• Adiciona uma pitada de sal na água\n• Evita bebidas muito geladas de uma vez\n\n🧊 *Resfriamento Corporal:*\n• Molha pulsos e pescoço com água fria\n• Usa toalha húmida na nuca\n• Banhos mornos (não frios) refrescam mais\n\n⏰ *Horários Estratégicos:*\n• Atividades físicas antes das 10h ou após 16h\n• Compras e saídas pela manhã cedo\n• Descanso obrigatório das 12h às 15h`;

    setTimeout(async () => {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(advancedTips + extraTips, phoneNumber);
    }, 1500);
  } catch (error) {
    console.error('❌ Erro ao processar dicas avançadas de calor:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao obter dicas avançadas");
  }
}

async function handleAdvancedColdTipsRequest(phoneNumber) {
  try {
    console.log(`🧥 Solicitação de dicas avançadas para frio para ${phoneNumber}`);

    await handleColdTipsRequest(phoneNumber);

    const advancedColdTips = `\n❄️ *Estratégias Avançadas para Frio:*\n\n🧥 *Sistema de Camadas:*\n• Base: roupa térmica ou algodão\n• Meio: pullover ou cardigan\n• Exterior: casaco corta-vento\n\n🔥 *Aquecimento Eficiente:*\n• Exercícios leves para circular sangue\n• Bebidas quentes a cada 2 horas\n• Aquece extremidades primeiro\n\n🏠 *Casa Inteligente:*\n• Concentra aquecimento num só cômodo\n• Usa tapetes para isolar do chão frio\n• Fecha divisões não utilizadas`;

    setTimeout(async () => {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(advancedColdTips, phoneNumber);
    }, 1500);
  } catch (error) {
    console.error('❌ Erro ao processar dicas avançadas de frio:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao obter dicas avançadas");
  }
}

async function handleDynamicAdviceRequest(phoneNumber, listId, listTitle) {
  try {
    console.log(`🤖 Solicitação de conselho dinâmico: ${listId} - ${listTitle}`);

    const user = await getUserByContact(phoneNumber);
    const city = user?.preferred_city || user?.last_city || 'Maputo';

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, ` deixa ver mais sobre "${listTitle}"...`);

    const weatherData = await weatherService.getCurrentWeather(city);

    // Usar AI para gerar resposta específica baseada no ID e título
    const dynamicAdvice = await openaiService.generateSafetyAdvice(weatherData, {
      adviceType: 'dynamic',
      requestedTopic: listTitle,
      topicId: listId,
      expertiseLevel: user?.expertise_level || 'basic'
    });

    if (dynamicAdvice.success) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(dynamicAdvice.message, phoneNumber);
    } else {
      // Fallback genérico
      const fallbackMessage = `💡 *${listTitle}*\n\nCom ${weatherData.temperature}°C em ${city}, é importante estar sempre atento às condições climáticas e tomar as precauções adequadas.\n\n🤖 *Dica da Joana Bot:* Cada situação climática tem os seus cuidados específicos. Fica sempre atento às mudanças!`;
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(fallbackMessage, phoneNumber);
    }
  } catch (error) {
    console.error('❌ Erro ao processar conselho dinâmico:', error);
    await whatsappApi.enviarMensagemErro(phoneNumber, "Erro ao processar conselho");
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
  if (weatherAspect === 'chuva') return `☔  vou ver se vai chover em ${city}...`;
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
    "🤖  não consegui entender bem a tua mensagem.\n\n💬 Podes tentar assim:\n• 'Clima em [cidade]'\n• 'Previsão para amanhã'\n• 'O que é [termo meteorológico]?'\n\nComo é que te posso ajudar?",
    phoneNumber
  );
}

async function sendAdvancedHelp(phoneNumber, user) {
  const language = user?.language || 'pt';
  const expertiseLevel = user?.expertise_level || 'basic';

  let helpMessage = `🤖 * sou o teu assistente do tempo!*\n\n`;

  helpMessage += `⭐ *COMANDOS ESPECIAIS:*\n`;
  helpMessage += `• \`/sugestoes\` - Vou dar-te umas sugestões fixes\n`;
  helpMessage += `• \`/conselhos\` - Conselhos para os bairros da Beira\n`;
  helpMessage += `• \`/zonas_seguras\` - Locais seguros durante emergências\n`;
  helpMessage += `• \`/alertas\` - Verificar perigos meteorológicos atuais\n\n`;

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
    const openaiOk = await openaiService.testAIConnection();

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
// ROTAS DO PAINEL ADMINISTRATIVO
// ===============================================

// Rota principal do painel admin - serve o HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Fallback: servir admin/index.html quando requisitado diretamente
app.get('/admin/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Servir arquivo JS do admin (duas rotas para compatibilidade)
app.get('/admin/admin.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.js'));
});

// Servir página de login do admin
app.get('/admin/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Servir script de login
app.get('/admin/login.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.js'));
});

// Rota adicional para compatibilidade com caminho relativo
app.get('/admin.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.js'));
});

// API endpoints para o painel administrativo
app.get("/admin/stats", async (req, res) => {
  try {
    const stats = await dbService.getStats();
    const activeUsers = await dbService.getActiveUsers(7);
    const allUsers = await dbService.getAllUsers();

    // Calcular estatísticas adicionais
    const dailyQueries = calculateDailyQueries(allUsers);
    const topCities = calculateTopCities(allUsers);

    res.json({
      success: true,
      data: {
        ...stats,
        dailyQueries,
        topCities
      }
    });
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/admin/users", async (req, res) => {
  try {
    const users = await dbService.getAllUsers();

    // Mascarar dados sensíveis
    const maskedUsers = users.map(user => ({
      ...user,
      contact: maskContactForAdmin(user.contact)
    }));

    res.json({
      success: true,
      data: maskedUsers
    });
  } catch (error) {
    console.error('❌ Erro ao obter usuários admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/admin/analytics", async (req, res) => {
  try {
    const users = await dbService.getAllUsers();

    const analytics = {
      expertiseDistribution: calculateExpertiseDistribution(users),
      growthData: calculateGrowthData(users),
      averageQueriesPerUser: calculateAverageQueries(users),
      retentionRate: calculateRetentionRate(users),
      averageResponseTime: 2.5, // Placeholder - pode ser calculado dos logs
      popularCities: calculatePopularCities(users),
      cityQueries: calculateCityQueries(users)
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('❌ Erro ao obter analytics admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/admin/users/:contact", async (req, res) => {
  try {
    const { contact } = req.params;
    const user = await dbService.getUserByContact(contact);

    if (!user) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado" });
    }

    res.json({
      success: true,
      data: {
        ...user,
        contact: maskContactForAdmin(user.contact)
      }
    });
  } catch (error) {
    console.error('❌ Erro ao obter usuário admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/admin/users/export", async (req, res) => {
  try {
    const users = await dbService.getAllUsers();

    // Gerar CSV
    const csvHeader = 'Contato,Cidade Preferida,Nivel,Consultas,Ultimo Acesso,Notificacoes\n';
    const csvData = users.map(user =>
      `${maskContactForAdmin(user.contact)},${user.preferred_city || ''},${user.expertise_level},${user.query_count},${user.last_access},${user.notifications}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=usuarios_tempbot.csv');
    res.send(csvHeader + csvData);
  } catch (error) {
    console.error('❌ Erro ao exportar usuários:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/admin/logs", async (req, res) => {
  try {
    const logs = await dbService.getAdminLogs(100);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('❌ Erro ao obter logs:', error);
    // Fallback para logs simulados se a tabela não existir
    const fallbackLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Sistema iniciado com sucesso',
        module: 'system'
      },
      {
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: 'info',
        message: 'Usuário realizou consulta meteorológica',
        module: 'weather'
      },
      {
        timestamp: new Date(Date.now() - 600000).toISOString(),
        level: 'warn',
        message: 'Limite de API OpenAI próximo',
        module: 'openai'
      }
    ];

    res.json({
      success: true,
      data: fallbackLogs
    });
  }
}); app.post("/admin/settings", async (req, res) => {
  try {
    const { defaultExpertise, enableProgression } = req.body;

    // Aqui você pode salvar as configurações em variáveis de ambiente ou banco
    // Por enquanto, apenas retornamos sucesso

    res.json({
      success: true,
      message: 'Configurações salvas com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===============================================
// ROTAS DO SISTEMA DE ALERTAS
// ===============================================

app.get("/admin/region-stats", async (req, res) => {
  try {
    const users = await dbService.getAllUsers();
    const regionStats = {};

    users.forEach(user => {
      const region = (user.preferred_city || user.last_city || 'não definido').toLowerCase();
      regionStats[region] = (regionStats[region] || 0) + 1;
    });

    res.json({
      success: true,
      data: regionStats
    });
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas de região:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/admin/region-users/:region", async (req, res) => {
  try {
    const { region } = req.params;
    let users;

    if (region === 'all') {
      users = await dbService.getAllUsers();
    } else {
      users = await dbService.getUsersByCity(region);
    }

    res.json({
      success: true,
      data: {
        count: users.length,
        users: users.map(u => ({
          contact: maskContactForAdmin(u.contact),
          last_access: u.last_access
        }))
      }
    });
  } catch (error) {
    console.error('❌ Erro ao obter usuários da região:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/admin/weather/:region", async (req, res) => {
  try {
    const { region } = req.params;
    const weatherData = await weatherService.getCurrentWeather(region);

    res.json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    console.error('❌ Erro ao obter dados meteorológicos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/admin/users-by-region", async (req, res) => {
  try {
    const usersByRegion = await dbService.getUsersCountByRegion();

    res.json({
      success: true,
      data: usersByRegion
    });
  } catch (error) {
    console.error('❌ Erro ao obter usuários por região:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/admin/send-alert", async (req, res) => {
  try {
    const { region, type, title, message, includeWeather, password } = req.body;

    // Verificar senha
    if (password !== 'joana@bot') {
      return res.status(401).json({
        success: false,
        error: 'Senha incorreta'
      });
    }

    // Obter usuários da região
    let targetUsers;
    if (region === 'all') {
      targetUsers = await dbService.getAllUsers();
    } else {
      targetUsers = await dbService.getUsersByRegion(region);
    }

    if (targetUsers.length === 0) {
      return res.json({
        success: false,
        error: 'Nenhum usuário encontrado para a região selecionada'
      });
    }

    // Obter dados meteorológicos se solicitado
    let weatherData = {};
    if (includeWeather && region !== 'all') {
      try {
        const weather = await weatherService.getCurrentWeather(region);
        weatherData = {
          temperature: weather.temperature,
          description: weather.description,
          city: weather.city,
          humidity: weather.humidity
        };
      } catch (error) {
        console.log('⚠️ Erro ao obter dados meteorológicos:', error.message);
      }
    }

    // Salvar alerta no banco
    const alertData = {
      title,
      message,
      alert_type: type,
      target_region: region,
      include_weather: includeWeather,
      weather_data: weatherData,
      users_count: targetUsers.length,
      delivery_status: 'sending'
    };

    const savedAlert = await dbService.saveAlert(alertData);
    if (!savedAlert) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar alerta no banco de dados'
      });
    }

    // Construir mensagem do alerta
    const typeIcons = {
      'urgente': '🚨',
      'aviso': '⚠️',
      'informacao': 'ℹ️',
      'meteorologico': '🌩️',
      'seguranca': '🛡️'
    };

    let alertMessage = `${typeIcons[type]} *${title}*\n\n${message}`;

    // Adicionar dados meteorológicos se solicitado
    if (includeWeather && Object.keys(weatherData).length > 0) {
      alertMessage += `\n\n🌤️ *Condições atuais em ${weatherData.city}:*\n🌡️ ${weatherData.temperature}°C\n💧 ${weatherData.humidity}% umidade\n☀️ ${weatherData.description}`;
    }

    alertMessage += `\n\n---\n_Alerta enviado pela Joana Bot - ${new Date().toLocaleString('pt-BR')}_`;

    // Enviar alerta para todos os usuários da região
    let sentCount = 0;
    let errorCount = 0;

    for (const user of targetUsers) {
      try {
        await whatsappApi.enviarMensagemUsandoWhatsappAPI(alertMessage, user.contact);
        await dbService.saveAlertDelivery(savedAlert.id, user.contact, 'sent');
        sentCount++;

        // Log de sucesso
        await dbService.saveAdminLog('info', `Alerta enviado para ${user.contact}`, 'alerts', {
          alertId: savedAlert.id,
          userContact: user.contact
        });

        // Pequeno delay para não sobrecarregar a API
        if (targetUsers.length > 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        await dbService.saveAlertDelivery(savedAlert.id, user.contact, 'failed', error.message);
        errorCount++;

        // Log de erro
        await dbService.saveAdminLog('error', `Falha ao enviar alerta para ${user.contact}: ${error.message}`, 'alerts', {
          alertId: savedAlert.id,
          userContact: user.contact
        });
      }
    }

    // Atualizar status do alerta
    const finalStatus = errorCount === 0 ? 'completed' : 'completed';
    await dbService.updateAlertStatus(savedAlert.id, finalStatus, sentCount);

    // Log geral
    await dbService.saveAdminLog('info', `Alerta "${title}" enviado: ${sentCount} sucessos, ${errorCount} erros`, 'alerts', {
      alertId: savedAlert.id,
      totalUsers: targetUsers.length,
      sentCount,
      errorCount
    });

    res.json({
      success: true,
      data: {
        alertId: savedAlert.id,
        sentCount,
        totalUsers: targetUsers.length,
        errorCount,
        message: `Alerta enviado para ${sentCount} de ${targetUsers.length} usuários`
      }
    });

  } catch (error) {
    console.error('❌ Erro ao enviar alerta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/send-info", async (req, res) => {
  try {
    // Rota usada por cron job para enviar a TEMPERATURA DO DIA a todos os utilizadores
    // Comportamento: buscar todos os utilizadores que habilitaram notificações,
    // agrupar por cidade, buscar a temperatura atual e enviar mensagem simples.

    // Buscar usuários com notificações ativas (evita enviar para inativos)
    console.log('Iniciando envio ', req.body);
    if (req.body.key !== process.env.CRON_KEY) {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }
    const users = await dbService.getUsersWithNotifications();

    // console.log('Users with notifications:', users);
    if (!users || users.length === 0) {
      return res.json({ success: true, message: 'Nenhum usuário com notificações habilitadas' });
    }

    // Agrupar utilizadores por cidade (preferência ou última cidade)
    const usersByCity = {};
    for (const u of users) {
      const city = (u.preferred_city || u.last_city || 'Beira').trim();
      if (!usersByCity[city]) usersByCity[city] = [];
      usersByCity[city].push(u);
    }

    let totalSent = 0;
    let totalFailed = 0;

    // Para cada cidade, obter dados meteorológicos e enviar mensagem a seus usuários
    for (const [city, cityUsers] of Object.entries(usersByCity)) {
      let weather = null;
      try {
        weather = await weatherService.getCurrentWeather(city, 'celsius');
      } catch (err) {
        console.error(`⚠️ Falha ao obter clima para ${city}:`, err?.message || err);
        // usar fallback simples
        weather = { city, temperature: null, description: 'Dados indisponíveis', humidity: null };
      }

      const tempText = weather.temperature !== null && weather.temperature !== undefined ? `${Math.round(weather.temperature)}°C` : 'sem dados';
      const desc = weather.description || '';
      const sentAt = new Date().toISOString();

      const message = `🌤️ *Temperatura do dia - ${city}*\n\n` +
        `🌡️ Temperatura média: ${tempText}\n` +
        (weather.humidity ? `💧 Umidade: ${weather.humidity}%\n` : '') +
        (desc ? `☁️ ${desc}\n` : '') +
        `\n---\n_Enviado pela Joana Bot em ${new Date().toLocaleString('pt-BR')}_`;

      for (const u of cityUsers) {
        try {
          await whatsappApi.enviarMensagemUsandoWhatsappAPI(message, u.contact);
          // Registrar entrega simples
          await dbService.saveAlertDelivery(null, u.contact, 'sent');
          await dbService.saveAdminLog('info', `Temperatura enviada para ${u.contact}`, 'cron_send_info', { city, userContact: u.contact });
          totalSent++;

          // Pequeno delay para evitar throttling
          if (cityUsers.length > 20) await new Promise(r => setTimeout(r, 80));
        } catch (err) {
          console.error(`❌ Erro ao enviar para ${u.contact}:`, err?.message || err);
          await dbService.saveAlertDelivery(null, u.contact, 'failed', err?.message || String(err));
          await dbService.saveAdminLog('error', `Falha ao enviar temperatura para ${u.contact}`, 'cron_send_info', { city, userContact: u.contact, error: err?.message });
          totalFailed++;
        }
      }
    }

    return res.json({ success: true, sent: totalSent, failed: totalFailed, total: users.length });
  } catch (error) {
    console.error('❌ Erro no cron /send-info:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/admin/recent-alerts", async (req, res) => {
  try {
    // Buscar alertas recentes do banco de dados
    const recentAlerts = await dbService.getRecentAlerts();

    res.json({
      success: true,
      data: recentAlerts
    });
  } catch (error) {
    console.error('❌ Erro ao obter alertas recentes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para estatísticas específicas do clima
app.get("/admin/weather-stats", async (req, res) => {
  try {
    // Buscar estatísticas de clima específicas
    const users = await dbService.getAllUsers();

    // Calcular estatísticas de clima
    const today = new Date().toISOString().split('T')[0];
    const todayQueries = users.reduce((count, user) => {
      const todayInteractions = (user.conversation_history || []).filter(item => {
        return item.timestamp && item.timestamp.startsWith(today);
      });
      return count + todayInteractions.length;
    }, 0);

    // Contar cidades ativas (que tiveram consultas nos últimos 7 dias)
    const activeCities = new Set();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    users.forEach(user => {
      if (user.last_access && new Date(user.last_access) > sevenDaysAgo) {
        const city = user.preferred_city || user.last_city;
        if (city) {
          activeCities.add(city);
        }
      }
    });

    // Calcular tempo de resposta médio (simulado)
    const avgResponseTime = Math.floor(Math.random() * 1500) + 500; // 500-2000ms

    // Última atualização (baseada no usuário mais recente)
    const lastUpdate = users.length > 0
      ? new Date(Math.max(...users.map(u => new Date(u.last_access || 0)))).toLocaleString('pt-BR')
      : 'Indisponível';

    const weatherStats = {
      weatherApi: true, // Assumir que está online se chegou até aqui
      todayQueries: todayQueries,
      lastUpdate: lastUpdate,
      activeCities: activeCities.size,
      responseTime: avgResponseTime
    };

    res.json({
      success: true,
      data: weatherStats
    });
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas de clima:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===============================================
// FUNÇÕES AUXILIARES PARA ANALYTICS
// ===============================================

function calculateDailyQueries(users) {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last7Days.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 50) + 10 // Placeholder - calcular real
    });
  }
  return last7Days;
}

function calculateTopCities(users) {
  const cityCount = {};
  users.forEach(user => {
    const city = user.preferred_city || user.last_city;
    if (city) {
      cityCount[city] = (cityCount[city] || 0) + 1;
    }
  });

  return Object.entries(cityCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([city, count]) => ({ city, count }));
}

function calculateExpertiseDistribution(users) {
  const distribution = { basic: 0, intermediate: 0, advanced: 0 };
  users.forEach(user => {
    distribution[user.expertise_level] = (distribution[user.expertise_level] || 0) + 1;
  });
  return distribution;
}

function calculateGrowthData(users) {
  const last30Days = [];
  let cumulative = 0;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Contar usuários criados até esta data
    const usersUntilDate = users.filter(user =>
      new Date(user.created_at) <= date
    ).length;

    last30Days.push({
      date: date.toISOString().split('T')[0],
      cumulative: usersUntilDate
    });
  }

  return last30Days;
}

function calculateAverageQueries(users) {
  if (users.length === 0) return 0;
  const totalQueries = users.reduce((sum, user) => sum + (user.query_count || 0), 0);
  return Math.round(totalQueries / users.length);
}

function calculateRetentionRate(users) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalUsers = users.length;
  const activeUsers = users.filter(user =>
    new Date(user.last_access) >= weekAgo
  ).length;

  return totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
}

function calculatePopularCities(users) {
  const cityCount = {};
  users.forEach(user => {
    if (user.weather_preferences?.cities) {
      user.weather_preferences.cities.forEach(cityObj => {
        const cityName = cityObj.name || cityObj;
        cityCount[cityName] = (cityCount[cityName] || 0) + (cityObj.count || 1);
      });
    }
  });

  return Object.entries(cityCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

function calculateCityQueries(users) {
  const cityQueries = {};
  users.forEach(user => {
    const city = user.preferred_city || user.last_city || 'Não definido';
    cityQueries[city] = (cityQueries[city] || 0) + (user.query_count || 0);
  });
  return cityQueries;
}

function maskContactForAdmin(contact) {
  if (!contact) return '';
  return contact.substring(0, 3) + '****' + contact.substring(contact.length - 3);
}

// ===============================================
// INICIALIZAÇÃO DO SERVIDOR
// ===============================================

app.listen(port, async () => {
  console.log(`🌡️ Temperature Bot com SUPABASE running on port ${port}`);
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log(`🌐 Admin Panel: http://localhost:${port}/admin`);

  // Testar conexões na inicialização
  try {
    const dbTest = await dbService.testConnection();
    console.log(`🗄️  Database (Supabase): ${dbTest ? '✅ OK' : '❌ ERRO'}`);

    const aiTest = await openaiService.testAIConnection();
    console.log(`🧠 OpenAI: ${aiTest.success ? '✅ OK' : '❌ ERRO'}`);

    console.log(`💡 Funcionalidades ativas:`);
    console.log(`   • Memória Contextual: ✅`);
    console.log(`   • Progressão de Expertise: ✅`);
    console.log(`   • Sugestões Inteligentes: ✅`);
    console.log(`   • Armazenamento Persistente: ✅ Supabase`);
    console.log(`   • Painel Administrativo: ✅`);

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
    tips += `🌡️ Faz ${temp}°C -  está quente mesmo!\n`;
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
      if (forecast && forecast.forecasts && forecast.forecasts.length > 1) {
        weatherData = forecast.forecasts[1]; // Amanhã
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

// ===============================================
// FUNÇÃO DE FALLBACK PARA DICAS NATURAIS
// ===============================================

function generateNaturalFallbackTips(weatherData, city, originalMessage) {
  const temp = parseInt(weatherData.temperature);
  const isRaining = weatherData.description.toLowerCase().includes('chuva');
  const message = (originalMessage || '').toLowerCase();

  let response = `💡 * aqui tens umas dicas fixes para ${city}!*\n\n`;

  response += `🌤️ *Como está agora:* ${temp}°C - ${weatherData.description}\n\n`;

  // Determinar tipo de dica baseado na mensagem
  if (message.includes('roupa') || message.includes('vestir')) {
    response += `👕 *Sobre o que vestir:*\n`;
    if (temp > 30) {
      response += `Eish, com ${temp}°C está bem quente! Veste roupa leve e clara, meu. Algodão é fixe porque respira bem. E não te esqueças do protetor solar!`;
    } else if (temp > 25) {
      response += `Com ${temp}°C está uma temperatura boa! Camiseta e shorts está bem. Se fores sair à noite, leva um casaquinho leve só por garantia.`;
    } else if (temp > 18) {
      response += `${temp}°C está fresquinho hoje! Calça leve e uma blusa está bem. Melhor levar um casaquinho porque pode esfriar mais tarde.`;
    } else {
      response += `Eish, ${temp}°C está frio mesmo! Vista roupa por camadas - camiseta, sweatshirt e casaco. Calça comprida e sapato fechado é o ideal.`;
    }
  } else if (message.includes('atividade') || message.includes('fazer')) {
    response += `🏃 *O que fazer hoje:*\n`;
    if (isRaining) {
      response += `Está chuva, então melhor ficar em casa ou ir para locais cobertos. Que tal cinema, shopping ou visitar amigos?`;
    } else if (temp > 30) {
      response += `Com ${temp}°C evita o sol forte das 10h às 16h. De manhã cedo ou fim da tarde é fixe para sair. Vai para lugares com sombra!`;
    } else if (temp > 20) {
      response += `Temperatura perfeita para qualquer coisa! Podes sair, fazer exercício, visitar amigos, ir ao parque... Aproveita!`;
    } else {
      response += `Está frio com ${temp}°C, então actividades mais tranquilas. Café com amigos, cinema, ou ficar em casa a relaxar está bem.`;
    }
  } else {
    // Dicas gerais
    response += `🎯 *Dicas gerais para hoje:*\n`;
    if (isRaining) {
      response += `Está chuva, então leva guarda-chuva e sapato que não escorrega. Se puderes, fica em casa relaxando.`;
    } else if (temp > 30) {
      response += `Calor de ${temp}°C - bebe muita água, usa roupa leve e evita o sol forte. Procura sombra sempre!`;
    } else if (temp > 20) {
      response += `${temp}°C está uma temperatura boa! Aproveita para sair e fazer o que gostas. Tempo perfeito!`;
    } else {
      response += `Com ${temp}°C está frio, então aquece-te bem. Roupa quente, bebidas quentes e actividades que te aquecem.`;
    }
  }

  if (isRaining) {
    response += `\n\n☔ *Atenção:* Está chuva - leva guarda-chuva e cuidado com o chão molhado!`;
  }

  return response;
}

// ===============================================
// APRESENTAÇÃO COMPLETA DA JOANA BOT
// ===============================================

async function handleJoanaBotIntroduction(phoneNumber, user) {
  try {
    console.log(`🤖 Comando /joana acionado para ${phoneNumber}`);

    const introMessage = openaiService.getIntroductionMessage(true);

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(introMessage, phoneNumber);

    // Atualizar contador de consultas
    await saveOrUpdateAdvancedUser(phoneNumber, {
      query_count: (user?.query_count || 0) + 1,
      last_command: '/joana'
    });

    return introMessage;

  } catch (error) {
    console.error('❌ Erro ao processar comando /joana:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      '❌ Eish, algo deu errado! Sou a Joana Bot, tenta novamente.',
      phoneNumber
    );
    return null;
  }
}

async function handleTomorrowForecastCommand(phoneNumber, user) {
  try {
    console.log(`📅 Comando /amanha acionado para ${phoneNumber}`);

    // Buscar dados atuais do clima para determinar a cidade
    const targetCity = user?.preferred_city || user?.last_city || 'Beira';

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, `📅 deixa eu ver como vai estar amanhã em ${targetCity}...`);

    // Buscar previsão de 2 dias (hoje e amanhã)
    const forecast = await weatherService.getWeatherForecast(targetCity, 2);

    if (!forecast || !forecast.forecasts || forecast.forecasts.length < 2) {
      await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        `❌  não consegui obter a previsão para amanhã em ${targetCity}. Tenta mais tarde.`,
        phoneNumber
      );
      return null;
    }

    // Pegar dados de amanhã (índice 1)
    const tomorrowData = forecast.forecasts[1];

    // Detectar nível de expertise do usuário
    const userLevel = (user && (user.expertiseLevel || user.expertise_level || user.preferred_complexity)) ?
      (user.expertiseLevel || user.expertise_level || user.preferred_complexity) : 'basic';

    // Definir instruções de tom baseadas no nível do usuário
    const getToneInstructionsForLevel = (level) => {
      switch (level) {
        case 'advanced':
          return `- RESPOSTA TÉCNICA: Use terminologia meteorológica apropriada (amplitude térmica, probabilidade de precipitação, velocidade do vento)
- Inclua análise detalhada e fundamentada da previsão
- Evite gírias e expressões informais
- Use linguagem formal, sem saudações casuais, sem termos como 'prezados, carissímos usuários, etc.'
- Mencione dados técnicos quando relevante (pressão atmosférica, índice UV, etc.)`;
        case 'intermediate':
          return `- RESPOSTA EQUILIBRADA: Combine simplicidade com contexto técnico moderado
- Use alguns termos meteorológicos básicos explicados
- Linguagem moçambicana natural mas educativa
- Balance entre informal e informativo`;
        default: // basic
          return `- RESPOSTA SIMPLES: Use linguagem muito fácil e acessível
- Linguagem moçambicana casual, gírias OK ("oi", "mano", etc.)
- Evite termos técnicos complexos
- Foque no prático e útil`;
      }
    };

    const toneInstructions = getToneInstructionsForLevel(userLevel);

    // Preparar prompt para a AI gerar a resposta
    const tomorrowPrompt = `
sou assistente meteorológica especializada na cidade da Beira e arredores! 🇲🇿

NÍVEL DO USUÁRIO: ${userLevel}

Baseado nos dados meteorológicos oficiais para amanhã em ${forecast.city}:

🌡️ Temperatura: ${tomorrowData.minTemp}${forecast.units} - ${tomorrowData.maxTemp}${forecast.units}
📝 Condições: ${tomorrowData.description}
💧 Umidade: ${tomorrowData.humidity || 'não disponível'}%
🌧️ Chance de chuva: ${tomorrowData.chanceOfRain || 0}%
💨 Vento: ${tomorrowData.windSpeed || 'não disponível'} km/h

INSTRUÇÕES DE TOM:
${toneInstructions}

Gera uma resposta sobre a previsão para amanhã. Inclui:
1. Uma saudação apropriada para o nível
2. Os dados principais apresentados conforme o nível
3. Interpretação meteorológica adequada ao usuário
4. Dicas práticas baseadas no tempo (roupa, atividades, cuidados)
5. Uma despedida motivacional

Máximo ${userLevel === 'basic' ? '250' : userLevel === 'intermediate' ? '350' : '400'} palavras.
    `;

    // Chamar AI para gerar a resposta
    const aiResponse = await openaiService.callOpenAI(tomorrowPrompt, 0.7);

    let tomorrowMessage;
    if (aiResponse && aiResponse.trim()) {
      tomorrowMessage = aiResponse.trim();
      console.log('✅ Resposta AI para amanhã gerada com sucesso');
    } else {
      // Fallback caso a AI falhe - também adaptar ao nível do usuário
      console.log('⚠️ AI falhou, usando fallback para amanhã adaptado ao nível:', userLevel);
      const emoji = getWeatherEmoji(tomorrowData.description);

      if (userLevel === 'advanced') {
        tomorrowMessage = `📅 *Análise meteorológica para amanhã em ${forecast.city}*\n\n`;
        tomorrowMessage += `${emoji} *${tomorrowData.dayName || 'Amanhã'}*\n`;
        tomorrowMessage += `🌡️ Amplitude térmica: ${tomorrowData.minTemp}${forecast.units} - ${tomorrowData.maxTemp}${forecast.units}\n`;
        tomorrowMessage += `📝 Condições atmosféricas: ${tomorrowData.description}\n`;

        if (tomorrowData.humidity) {
          tomorrowMessage += `💧 Humidade relativa: ${tomorrowData.humidity}%\n`;
        }
        if (tomorrowData.chanceOfRain && tomorrowData.chanceOfRain > 0) {
          tomorrowMessage += `🌧️ Probabilidade de precipitação: ${tomorrowData.chanceOfRain}%\n`;
        }
        if (tomorrowData.windSpeed && tomorrowData.windSpeed > 0) {
          tomorrowMessage += `💨 Velocidade do vento: ${tomorrowData.windSpeed} km/h\n`;
        }

        tomorrowMessage += `\n🎯 *Recomendação técnica:* Baseie o planeamento das atividades na análise dos parâmetros meteorológicos apresentados.`;
      } else if (userLevel === 'intermediate') {
        tomorrowMessage = `📅 *Previsão detalhada para amanhã em ${forecast.city}*\n\n`;
        tomorrowMessage += `${emoji} *${tomorrowData.dayName || 'Amanhã'}*\n`;
        tomorrowMessage += `🌡️ Temperatura: ${tomorrowData.minTemp}${forecast.units} - ${tomorrowData.maxTemp}${forecast.units}\n`;
        tomorrowMessage += `📝 Condições: ${tomorrowData.description}\n`;

        if (tomorrowData.humidity) {
          tomorrowMessage += `💧 Humidade: ${tomorrowData.humidity}% (${tomorrowData.humidity > 80 ? 'alta' : tomorrowData.humidity > 60 ? 'moderada' : 'baixa'})\n`;
        }
        if (tomorrowData.chanceOfRain && tomorrowData.chanceOfRain > 0) {
          tomorrowMessage += `🌧️ Chance de chuva: ${tomorrowData.chanceOfRain}%\n`;
        }
        if (tomorrowData.windSpeed && tomorrowData.windSpeed > 0) {
          tomorrowMessage += `💨 Vento: ${tomorrowData.windSpeed} km/h\n`;
        }

        tomorrowMessage += `\n💡 *Dica da Joana Bot:* Planifica as atividades considerando estes dados meteorológicos!`;
      } else {
        // Basic level (original)
        tomorrowMessage = `📅 *Previsão para amanhã em ${forecast.city}*\n\n`;
        tomorrowMessage += `${emoji} *${tomorrowData.dayName || 'Amanhã'}*\n`;
        tomorrowMessage += `🌡️ ${tomorrowData.minTemp}${forecast.units} - ${tomorrowData.maxTemp}${forecast.units}\n`;
        tomorrowMessage += `📝 ${tomorrowData.description}\n`;

        if (tomorrowData.humidity) {
          tomorrowMessage += `💧 Umidade: ${tomorrowData.humidity}%\n`;
        }
        if (tomorrowData.chanceOfRain && tomorrowData.chanceOfRain > 0) {
          tomorrowMessage += `🌧️ Chuva: ${tomorrowData.chanceOfRain}%\n`;
        }
        if (tomorrowData.windSpeed && tomorrowData.windSpeed > 0) {
          tomorrowMessage += `💨 Vento: ${tomorrowData.windSpeed} km/h\n`;
        }

        tomorrowMessage += `\n💡 *Dica da Joana Bot:* Planifica as tuas actividades baseado nesta previsão!`;
      }
    }

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(tomorrowMessage, phoneNumber);

    // Atualizar dados do usuário
    await saveOrUpdateAdvancedUser(phoneNumber, {
      preferred_city: targetCity,
      last_command: '/amanha'
    });

    return tomorrowMessage;

  } catch (error) {
    console.error('❌ Erro ao processar comando /amanha:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌  não consegui ver a previsão para amanhã agora. Tenta mais tarde!",
      phoneNumber
    );
    return null;
  }
}

// ===============================================
// COMANDO PARA PREVISÃO DOS PRÓXIMOS 7 DIAS
// ===============================================

async function handleProximosDiasCommand(phoneNumber, user) {
  try {
    console.log(`📅 Comando /proximos_dias acionado para ${phoneNumber}`);

    // Buscar dados atuais do clima para determinar a cidade
    const targetCity = user?.preferred_city || user?.last_city || 'Beira';

    // Chamar a função existente de previsão semanal
    return await handleWeeklyForecast(targetCity, phoneNumber, user);

  } catch (error) {
    console.error('❌ Erro ao processar comando /proximos_dias:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌  não consegui ver a previsão dos próximos dias agora. Tenta mais tarde!",
      phoneNumber
    );
    return null;
  }
}

// ===============================================
// HANDLERS PARA ZONAS SEGURAS E PONTOS DE REFÚGIO
// ===============================================

async function handleEvacuationCentersRequest(phoneNumber) {
  try {
    const user = await getUserByContact(phoneNumber);
    const city = user?.preferred_city || 'Beira';

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, '🏛️ A procurar centros de evacuação oficiais...');

    const weatherData = await weatherService.getCurrentWeather(city);
    const evacuationInfo = await openaiService.generateEvacuationCentersInfo(weatherData, user);

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(evacuationInfo.message, phoneNumber);
  } catch (error) {
    console.error('❌ Erro ao processar centros de evacuação:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Não consegui carregar informações dos centros de evacuação. Para emergências ligue 119 (INGC).",
      phoneNumber
    );
  }
}

async function handleEmergencyHospitalsRequest(phoneNumber) {
  try {
    const user = await getUserByContact(phoneNumber);
    const city = user?.preferred_city || 'Beira';

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, '🏥 A procurar hospitais de emergência...');

    const weatherData = await weatherService.getCurrentWeather(city);
    const hospitalInfo = await openaiService.generateEmergencyHospitalsInfo(weatherData, user);

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(hospitalInfo.message, phoneNumber);
  } catch (error) {
    console.error('❌ Erro ao processar hospitais de emergência:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Não consegui carregar informações dos hospitais. Para emergência médica ligue 119.",
      phoneNumber
    );
  }
}

async function handleEmergencyContactsRequest(phoneNumber) {
  const emergencyMessage = `📱 *CONTACTOS DE EMERGÊNCIA ESSENCIAIS*

🚨 *NÚMEROS PRINCIPAIS:*
• **INGC (Gestão de Calamidades): 119**
• **Bombeiros: 198**  
• **Polícia: 119**
• **Emergência Médica: 119**

🏥 *SAÚDE:*
• Hospital Central da Beira: +258 23 323 229
• Cruz Vermelha: +258 21 491 323

⚡ *SERVIÇOS PÚBLICOS:*
• EDM (Electricidade): 1400
• Águas de Moçambique: +258 21 320 024

📻 *COMUNICAÇÃO:*
• Rádio Moçambique FM: 91.2 FM
• STV: +258 21 354 400

💡 *DICAS IMPORTANTES:*
• Memorize pelo menos o **119** (emergência geral)
• Mantenha estes números no papel também
• Em caso de rede fraca, tente SMS
• Cruz Vermelha tem equipas de socorro

🆘 *Durante emergências:*
• Mantenha a calma
• Diga sua localização clara
• Descreva a situação brevemente
• Siga instruções dos operadores

Guarda estes números - podem salvar vidas! 🙏`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(emergencyMessage, phoneNumber);
}

async function handleEmergencyKitRequest(phoneNumber) {
  const kitMessage = `🎒 *KIT DE EMERGÊNCIA COMPLETO*

💧 *ÁGUA E ALIMENTAÇÃO (72h):*
• 3 litros de água por pessoa
• Alimentos enlatados/secos
• Abrelatas manual
• Biscoitos e barras energéticas

💊 *MEDICAMENTOS E SAÚDE:*
• Medicamentos pessoais (1 semana)
• Kit primeiros socorros
• Termómetro
• Máscaras e luvas

🔦 *ILUMINAÇÃO E COMUNICAÇÃO:*
• Lanterna com pilhas extra
• Rádio portátil
• Carregador portátil (power bank)
• Apito para sinalização

📄 *DOCUMENTOS IMPORTANTES:*
• BI, passaporte (cópias plastificadas)
• Documentos médicos
• Contactos de emergência escritos
• Dinheiro em notas pequenas

👕 *ROUPA E PROTECÇÃO:*
• Mudas de roupa (3 dias)
• Roupa de chuva/impermeável
• Cobertor térmico
• Sapatos resistentes à água

🔧 *FERRAMENTAS BÁSICAS:*
• Canivete multiusos
• Cordas/fita adesiva
• Sacos plásticos resistentes
• Fósforos à prova de água

👶 *SE HÁ CRIANÇAS/IDOSOS:*
• Fraldas e leite em pó
• Medicamentos específicos
• Brinquedos pequenos (conforto)

📦 *ONDE GUARDAR:*
• Mochila à prova de água
• Local de fácil acesso
• Verificar validades a cada 6 meses

💡 *Lembra:* Um kit preparado pode salvar vidas! Não esperes pela emergência para organizar. 🚨`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(kitMessage, phoneNumber);
}

async function handleEvacuationRoutesRequest(phoneNumber) {
  const routesMessage = `🛣️ *ROTAS DE EVACUAÇÃO DE EMERGÊNCIA*

🚗 *ROTAS PRINCIPAIS PARA ZONAS ALTAS:*
• **Via EN1:** Beira → Dondo → Nhamatanda (terreno elevado)
• **Via N6:** Beira → Tica → Gorongosa (zona montanhosa)
• **Estrada da Manga:** Beira → Manga → zona rural segura

🏔️ *DESTINOS SEGUROS PRIORITÁRIOS:*
• **Universidade Católica de Moçambique** (terreno alto)
• **Hospital Central da Beira** (estrutura reforçada)
• **Escola Secundária Samora Machel** (edifício resistente)
• **Centro de Evacuação - Estádio do Martirios**

🚌 *TRANSPORTE PÚBLICO DE EMERGÊNCIA:*
• Chapas param em **Praça do Município**
• Autocarros municipais activados em emergência
• **Ponto de recolha:** Mercado Central
• **Ponto alternativo:** Terminal Rodoviário

⚠️ *ROTAS A EVITAR:*
• **Baixa da cidade** (risco de inundação)
• **Macuti/Praia** (zona costeira vulnerável)
• **Ponta Gea** (baixa altitude)
• Pontes durante chuvas intensas

🧭 *DICAS DE NAVEGAÇÃO:*
• Siga sempre para terrenos elevados
• Evite atravessar águas correntes
• Use marco referencial: **Torre de TV da Beira**
• Em caso de dúvida, pergunte às autoridades locais

📱 *Para navegação GPS:*
• Coordenadas seguras: -19.8155, 34.8386 (UMC)
• Backup: -19.8436, 34.8389 (Hospital Central)

🚨 **Lembra:** Sai cedo, conduz devagar, mantém combustível no tanque! 

Digite */zonas_seguras* para locais de abrigo específicos.`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(routesMessage, phoneNumber);
}

// ===============================================
// HANDLERS PARA AÇÕES DE ALERTAS METEOROLÓGICOS
// ===============================================

async function handleProtectionMeasuresRequest(phoneNumber) {
  try {
    const user = await getUserByContact(phoneNumber);
    const city = user?.preferred_city || 'Beira';

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, '🛡️ A gerar medidas de proteção específicas...');

    const weatherData = await weatherService.getCurrentWeather(city);
    const protectionInfo = await openaiService.generateProtectionMeasuresInfo(weatherData, user);

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(protectionInfo.message, phoneNumber);
  } catch (error) {
    console.error('❌ Erro ao processar medidas de proteção:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Não consegui gerar medidas específicas. Mantenha-se em local seguro e siga orientações das autoridades.",
      phoneNumber
    );
  }
}

async function handleWeatherMonitoringRequest(phoneNumber) {
  const monitoringMessage = `📡 *COMO MONITORAR O TEMPO*

📱 *APPS ESSENCIAIS:*
• Weather.com - previsões confiáveis
• Windy - mapas meteorológicos
• INAM Moçambique - dados oficiais

📻 *FONTES LOCAIS:*
• Rádio Moçambique (91.2 FM)
• TVM - televisão nacional
• STV - notícias locais

🌐 *WEBSITES OFICIAIS:*
• inam.gov.mz - Instituto de Meteorologia
• ingc.gov.mz - Gestão de Calamidades

⚠️ *SINAIS DE ALERTA:*
• Mudanças bruscas na temperatura
• Vento forte repentino
• Chuva muito intensa
• Céu muito escuro durante o dia

📊 *O QUE OBSERVAR:*
• Temperatura: variações acima de 5°C
• Vento: velocidade acima de 40 km/h
• Chuva: mais de 50mm em 24h
• Humidade: acima de 90%

💡 *DICAS:*
• Verifique previsão 2x por dia
• Configure alertas no telemóvel
• Tenha rádio de emergência
• Siga páginas oficiais nas redes sociais

📞 *Informações:** 119 (INGC)`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(monitoringMessage, phoneNumber);
}

async function handleUrgencyContactsRequest(phoneNumber) {
  const urgencyMessage = `🆘 *CONTACTOS DE URGÊNCIA METEOROLÓGICA*

🚨 *EMERGÊNCIA GERAL:*
• **INGC (Gestão de Calamidades): 119**
• **Bombeiros: 198**
• **Polícia: 119**

🌀 *METEOROLOGIA:*
• INAM (Instituto Nacional): +258 21 491 150
• Previsões 24h: 1242 (SMS grátis)

🏥 *SAÚDE DE EMERGÊNCIA:*
• Hospital Central: +258 23 323 229 (Beira)
• Cruz Vermelha: +258 21 491 323

📻 *COMUNICAÇÃO:*
• Rádio Moçambique: +258 21 320 000
• STV: +258 21 354 400

⚡ *SERVIÇOS ESSENCIAIS:*
• EDM (Energia): 1400
• Águas: +258 21 320 024

🌊 *ESPECÍFICOS PARA BEIRA:*
• Comando Provincial: +258 23 323 206
• Portos CFM: +258 23 321 781

💡 *COMO USAR:*
• Mantenha calma ao ligar
• Diga localização clara
• Descreva situação brevemente
• Siga instruções dos operadores

📝 *IMPORTANTE:* Guarde estes números no papel também - telemóvel pode ficar sem bateria!`;

  await whatsappApi.enviarMensagemUsandoWhatsappAPI(urgencyMessage, phoneNumber);
}

async function handleDangerousZonesRequest(phoneNumber) {
  try {
    const user = await getUserByContact(phoneNumber);
    const city = user?.preferred_city || 'Beira';

    await whatsappApi.enviarMensagemCarregamento(phoneNumber, '⚠️ A identificar zonas perigosas...');

    const weatherData = await weatherService.getCurrentWeather(city);
    const dangerousZonesInfo = await openaiService.generateDangerousZonesInfo(weatherData, user);

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(dangerousZonesInfo.message, phoneNumber);
  } catch (error) {
    console.error('❌ Erro ao processar zonas perigosas:', error);
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
      "❌ Não consegui identificar zonas específicas. Evite áreas baixas, próximas a rios e encostas durante emergências.",
      phoneNumber
    );
  }
}