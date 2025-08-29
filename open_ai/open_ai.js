require('dotenv').config();
const axios = require('axios');
const AIBasedSuggestionsHandler = require('./suggestions_handler_ai');

class OPENAI {
    constructor() {
        this.token = process.env.OPEN_AI;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = 'gpt-3.5-turbo';
        this.maxTokens = 300;

        // Inicializar handler de sugestões 100% AI
        this.suggestionsHandler = new AIBasedSuggestionsHandler(this.token);

        // Cache para análises frequentes
        this.analysisCache = new Map();
        this.cacheExpiry = 1800000; // 30 minutos

        if (!this.token) {
            console.warn('⚠️ Token OpenAI não encontrado - modo limitado');
        } else {
            console.log('🤖 Joana Bot - Assistente Meteorológico IA inicializado');
        }

        // Informações sobre a identidade da Joana Bot
        this.botIdentity = {
            name: 'Joana Bot',
            fullName: 'Joana Bot - Assistente Meteorológico Inteligente',
            description: 'Chatbot avançado via WhatsApp para comunidades moçambicanas',
            specialization: 'Informações meteorológicas personalizadas na cidade da Beira',
            creator: 'Associação FACE',
            creatorDescription: 'Organização sem fins lucrativos na área de Água, Saneamento, Gestão de Resíduos sólidos e Proteção Ambiental'
        };
    }

    // ===============================================
    // IDENTIDADE E APRESENTAÇÃO DA JOANA BOT
    // ===============================================

    getBotIdentityContext() {
        return `Sou a ${this.botIdentity.name}, ${this.botIdentity.description} desenvolvida especialmente para a nossa comunidade moçambicana, com foco na cidade da Beira.

🤖 SOBRE MIM:
- Nome: ${this.botIdentity.name}
- Especialidade: ${this.botIdentity.specialization}
- Desenvolvida pela: ${this.botIdentity.creator}
- Missão: Tornar informações meteorológicas acessíveis para todos os níveis de usuários usando linguagem moçambicana familiar

📍 A ${this.botIdentity.creator} é uma organização sem fins lucrativos vocacionada na implementação de programas e projetos na área de Água, Saneamento, Gestão de Resíduos sólidos e Proteção Ambiental.

💡 COMO AJUDO:
- Informações meteorológicas em português moçambicano natural
- Conselhos de segurança baseados no clima
- Dicas práticas para o dia a dia
- Sugestões personalizadas conforme o teu perfil`;
    }

    getIntroductionMessage(includeCommands = true) {
        let intro = `👋 Olá! Sou a ${this.botIdentity.name}! 

🌤️ Sou a tua assistente meteorológica aqui na nossa terra moçambicana, especialmente para quem está na Beira e arredores.

${includeCommands ? `💡 *Comandos especiais:*
• \`/sugestoes\` - Dicas personalizadas baseadas no tempo atual
• \`/conselhos\` - Conselhos de segurança importantes

🗣️ *Podes perguntar:*
• "Como está o tempo em Maputo?"
• "Vai chover hoje?"
• "Que roupa usar?"
• "Dicas para o calor"

` : ''}🏢 Desenvolvida com carinho pela **${this.botIdentity.creator}** para servir a nossa comunidade!

🤔 Em que posso ajudar-te hoje?`;

        return intro;
    }

    // ===============================================
    // DETECÇÃO DE INTENÇÃO CLIMÁTICA VS GERAL
    // ===============================================

    isWeatherRelatedQuery(analysis) {
        // Lista de intents que são claramente relacionados ao clima
        const weatherIntents = [
            'weather_query_current',
            'weather_query_forecast',
            'activity_recommendation',
            'clothing_advice',
            'weather_tips',
            'city_comparison',
            'weather_education',
            'tempo_atual',
            'futuro',
            'ideias_de_atividades',
            'querem conselhos de roupa',
            'tipo_de_atividade',
            'conselhos_de_roupa'
        ];

        // Lista de intents que são claramente NÃO relacionados ao clima
        const nonWeatherIntents = [
            'greeting',
            'general_help',
            'off_topic',
            'thanks',
            'goodbye',
            'personal_question',
            'education_non_weather',
            'politics',
            'food',
            'shopping',
            'time_question'
        ];

        // Se é explicitamente não-climático, retornar false
        if (nonWeatherIntents.includes(analysis.intent)) {
            console.log(`❌ Intent explicitamente não-climático: ${analysis.intent}`);
            return false;
        }

        // Se é explicitamente climático, retornar true
        if (weatherIntents.includes(analysis.intent)) {
            console.log(`✅ Intent explicitamente climático: ${analysis.intent}`);
            return true;
        }

        // Para intents genéricos, usar análise mais rigorosa
        if (analysis.intent === 'o_que_eles_realmente_querem') {
            // Verificar se o reasoning menciona clima/tempo
            const reasoning = (analysis.reasoning || '').toLowerCase();
            const isWeatherReasoning = reasoning.includes('tempo') ||
                reasoning.includes('clima') ||
                reasoning.includes('temperatura') ||
                reasoning.includes('chuva') ||
                reasoning.includes('atividade') ||
                reasoning.includes('roupa');

            console.log(`🔍 Intent genérico - Reasoning menciona clima: ${isWeatherReasoning}`);
            console.log(`📝 Reasoning: "${reasoning}"`);

            return isWeatherReasoning;
        }

        // Para outros casos, verificar se realmente precisa de dados meteorológicos
        const requiresWeatherData = analysis.requires_weather_data === true;

        console.log(`🔍 Análise final:
- Intent: ${analysis.intent}
- É intent climático: false (não está na lista)
- Requer dados clima: ${requiresWeatherData}`);

        return requiresWeatherData;
    }

    // ===============================================
    // RESPOSTA GERAL AMIGÁVEL EM PORTUGUÊS MOÇAMBICANO
    // ===============================================

    async generateFriendlyMozambicanResponse(message, analysis, userContext = {}) {
        try {
            console.log('💬 Gerando resposta amigável em português moçambicano');

            if (!this.token) {
                return this.generateBasicFriendlyResponse(message, analysis);
            }

            const prompt = this.buildFriendlyResponsePrompt(message, analysis, userContext);
            const response = await this.callOpenAI(prompt, 0.8);

            return {
                success: true,
                message: response.trim(),
                type: 'friendly_general',
                method: 'ai_powered'
            };

        } catch (error) {
            console.error('❌ Erro resposta amigável:', error.message);
            return {
                success: true,
                message: this.generateBasicFriendlyResponse(message, analysis),
                type: 'friendly_general',
                method: 'fallback'
            };
        }
    }

    buildFriendlyResponsePrompt(message, analysis, userContext) {
        return `${this.getBotIdentityContext()}

A pessoa me disse: "${message}"

Contexto da conversa:
- Já conversamos ${userContext.queryCount || 0} vezes
- Última cidade que mencionou: ${userContext.lastCity || 'nenhuma'}
- Nível de experiência: ${userContext.expertiseLevel || 'está começando'}

A análise da pergunta mostra que:
- Intent: ${analysis.intent}
- Confiança: ${analysis.confidence}
- Reasoning: ${analysis.reasoning}

Esta pergunta NÃO é sobre clima/tempo, então quero dar uma resposta amigável e útil como a Joana Bot em português de Moçambique.

INSTRUÇÕES:
- Identifica-te como Joana Bot quando apropriado (especialmente em primeiras interações)
- Usa linguagem moçambicana natural ("Eh pá", "fixes", "eish", etc.)
- Seja útil e amigável
- Se não souber sobre o tópico, admite honestly mas oferece ajuda meteorológica
- Máximo 150 palavras
- Inclui emojis apropriados
- Se a pessoa cumprimentar, apresenta-te brevemente
- Sempre oferece ajuda meteorológica como alternativa

EXEMPLOS:
- Se disser "Olá" → "Eh pá, olá! Sou a Joana Bot, a tua assistente meteorológica! Como posso ajudar-te com o tempo hoje?"
- Se perguntar sobre comida → "Eish, sobre restaurantes não sei muito, mas posso ajudar-te a saber o clima para decidir onde comer!"
- Se for primeira conversa → Inclui breve apresentação da Joana Bot

Minha resposta amigável como Joana Bot:`;
    }

    generateBasicFriendlyResponse(message, analysis) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('olá') || lowerMessage.includes('oi') || lowerMessage.includes('bom dia')) {
            return `👋 Olá! Sou a ${this.botIdentity.name}, a tua assistente meteorológica aqui na nossa terra moçambicana! 

🌤️ Especializo-me em informações do tempo para comunidades da Beira e arredores.

💡 *Posso ajudar-te com:*
• Temperatura actual de qualquer cidade
• Previsões meteorológicas  
• Dicas baseadas no clima
• Sugestões de atividades
• Conselhos de segurança

💬 É só perguntares algo como "Como está o tempo em Maputo?" ou usar "/sugestoes" para dicas personalizadas!

🏢 Desenvolvida pela **${this.botIdentity.creator}** para servir a nossa comunidade.`;
        }

        if (lowerMessage.includes('ajuda') || lowerMessage.includes('help') || lowerMessage.includes('quem és')) {
            return `� Sou a ${this.botIdentity.name}! ${this.botIdentity.description} desenvolvida especialmente para a nossa comunidade moçambicana.

🎯 *Sou especialista em:*
• 🌡️ Temperatura e clima
• 🌧️ Previsões de chuva  
• 👕 Que roupa usar
• 🏃 Atividades para o tempo
• 🏙️ Comparar cidades
• ⚠️ Conselhos de segurança

💡 *Comandos especiais:*
• \`/sugestoes\` - Dicas personalizadas
• \`/conselhos\` - Conselhos de segurança

🏢 Criada pela **${this.botIdentity.creator}** - organização dedicada ao ambiente e saneamento em Moçambique.

💬 Experimenta perguntar: "Tempo em Beira hoje" ou "/sugestoes"`;
        }

        return `😊 Sou a ${this.botIdentity.name}, percebi que perguntaste: "${message}"

🤔 Sobre esse tópico específico não sou especialista, mas sou muito boa com o tempo e clima!

🌤️ *Posso ajudar-te com:*
• Como está o tempo na tua cidade
• Que roupa usar hoje
• Atividades para fazer baseadas no clima
• Previsões meteorológicas
• Conselhos de segurança climática

💬 Que tal perguntares algo sobre o clima? Tipo "Como está o tempo?" ou usar "/sugestoes" para dicas personalizadas?

Estou aqui para te ajudar! 🇲🇿`;
    }

    // ===============================================
    // ANÁLISE PRINCIPAL DE MENSAGENS COM AI
    // ===============================================

    async analyzeMessage(message, context = {}) {
        try {
            console.log(`🧠 Analisando mensagem com AI: "${message}"`);

            // Verificar cache
            const cacheKey = this.getCacheKey(message, context);
            const cached = this.getCachedAnalysis(cacheKey);
            if (cached) {
                return cached;
            }

            // Análise completa com AI
            const analysis = await this.performAIAnalysis(message, context);

            // Cache do resultado
            this.setCachedAnalysis(cacheKey, analysis);

            return analysis;

        } catch (error) {
            console.error('❌ Erro na análise AI:', error.message);
            return this.createFallbackAnalysis(message, context);
        }
    }

    async performAIAnalysis(message, context) {
        if (!this.token) {
            return this.performRuleBasedAnalysis(message, context);
        }

        const prompt = this.buildAnalysisPrompt(message, context);

        try {
            const response = await this.callOpenAI(prompt, 0.3);
            const analysis = JSON.parse(response);

            return {
                success: true,
                analysis: analysis,
                method: 'ai_powered',
                originalMessage: message
            };

        } catch (error) {
            console.error('❌ Erro AI analysis:', error.message);
            return this.performRuleBasedAnalysis(message, context);
        }
    }

    buildAnalysisPrompt(message, context) {
        return `Eh pá, sou um assistente que entende bem como os moçambicanos falam sobre o tempo.

A pessoa escreveu: "${message}"

Contexto da conversa:
- Já fizeram ${context.queryCount || 0} perguntas antes
- Última cidade que mencionaram: ${context.lastCity || 'nenhuma ainda'}
- Onde estão agora: ${context.currentLocation || 'não sei'}

Preciso perceber o que eles realmente querem. SEJA MUITO PRECISO:

PERGUNTAS SOBRE CLIMA/TEMPO:
- "Maputo", "como está lá", "tempo hoje" → tempo_atual (requires_weather_data: true)
- "amanhã", "previsão", "vai chover" → futuro (requires_weather_data: true)
- "o que fazer", "há atividade", "onde ir" → ideias_de_atividades (requires_weather_data: true)
- "que roupa", "como vestir" → conselhos_de_roupa (requires_weather_data: true)
- "calor", "frio", "dicas clima" → weather_tips (requires_weather_data: true)

PERGUNTAS NÃO SOBRE CLIMA:
- "olá", "bom dia", "como estás" → greeting (requires_weather_data: false)
- "ajuda", "não entendo", "comandos" → general_help (requires_weather_data: false)
- "obrigado", "muito obrigado" → thanks (requires_weather_data: false)
- "política", "governo", "eleições" → politics (requires_weather_data: false)
- "comida", "onde comer", "restaurante" → food (requires_weather_data: false)
- "comprar", "loja", "shopping" → shopping (requires_weather_data: false)
- "que horas", "hora actual" → time_question (requires_weather_data: false)
- "capital", "geografia", "história" → education_non_weather (requires_weather_data: false)

PERGUNTAS SOBRE IDENTIDADE DO BOT - SEMPRE NÃO-CLIMÁTICAS:
- "que você é", "quem é você", "quem és", "o que é" → general_help (requires_weather_data: false)
- "o que você faz", "que é a tua função", "para que serves" → general_help (requires_weather_data: false)
- "qual é o teu nome", "como te chamas", "que bot é este" → general_help (requires_weather_data: false)
- "quem te criou", "qual é a tua função", "o que fazes" → general_help (requires_weather_data: false)
- Qualquer pergunta sobre identidade, função, nome ou criador do bot → general_help (requires_weather_data: false)

REGRA CRÍTICA: Se a pergunta é sobre O QUE O BOT É ou FAZ, é SEMPRE general_help e NUNCA sobre clima!

Responde só o JSON:

{
    "intent": "categoria_específica_da_lista_acima",
    "confidence": 0.85,
    "entities": {
        "cities": ["só_se_mencionaram_cidades_para_clima"],
        "timeframe": "quando_querem_saber",
        "weather_aspect": "só_se_for_sobre_clima",
        "activity_type": "só_se_for_atividade_baseada_no_clima"
    },
    "reasoning": "porque_penso_isso_e_se_é_ou_não_sobre_clima",
    "response_type": "como_responder",
    "priority": "urgência",
    "requires_weather_data": true_ou_false_baseado_na_pergunta,
    "suggested_followup": "o_que_sugerir_depois"
}`;
    }

    // ===============================================
    // MÉTODO DE COMPATIBILIDADE PARA RESPOSTA CONTEXTUAL
    // ===============================================

    async generateContextualResponse(analysis, weatherData, userContext = {}) {
        try {
            console.log('🤖 Gerando resposta contextual baseada em AI');

            // Se não há dados meteorológicos, retornar erro
            if (!weatherData || !weatherData.temperature) {
                return {
                    success: false,
                    message: "Dados meteorológicos não disponíveis"
                };
            }

            // Gerar resposta contextual baseada no intent e dados
            const response = await this.generateWeatherResponse(analysis, weatherData, userContext);

            // Gerar sugestões inteligentes
            const suggestions = await this.generateSmartSuggestions(userContext, weatherData);

            return {
                success: true,
                message: response,
                suggestions: suggestions.suggestions || [],
                weatherData: weatherData,
                analysis: analysis
            };

        } catch (error) {
            console.error('❌ Erro na resposta contextual:', error.message);
            return {
                success: false,
                message: "Erro ao processar resposta",
                error: error.message
            };
        }
    }

    async generateWeatherResponse(analysis, weatherData, userContext) {
        try {
            if (!this.token) {
                return this.generateBasicWeatherResponse(weatherData, analysis);
            }

            const prompt = this.buildWeatherResponsePrompt(analysis, weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.7);

            return response.trim();

        } catch (error) {
            console.error('❌ Erro AI weather response:', error.message);
            return this.generateBasicWeatherResponse(weatherData, analysis);
        }
    }

    buildWeatherResponsePrompt(analysis, weatherData, userContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city;
        const isActivityRequest = analysis.intent === 'ideias_de_atividades' ||
            analysis.intent === 'activity_recommendation' ||
            analysis.intent === 'tipo_de_atividade';

        if (city.toLowerCase() === 'beira' && isActivityRequest) {
            return `A pessoa perguntou onde pode ir hoje em Beira. Com ${temp}°C e ${weatherData.description}, quero dar uma resposta completa e estruturada.

FORMATO IDEAL DA RESPOSTA:

🗺️ *Eh pá, vou te dar umas ideias fixes de locais para ires hoje em Beira!*

🌤️ *Como está o tempo:*
• ${temp}°C - ${weatherData.description}
• Humidade: ${weatherData.humidity}%

[Depois escolher uma das categorias baseada na temperatura]:

${this.getLocationCategoryForTemperature(temp, weatherData.description)}

�️ *Locais específicos da Beira:*
📍 • Macúti - zona da praia
📍 • Manga - centro comercial
📍 • Goto - bairro residencial
📍 • Munhava - zona movimentada

💬 *Quer saber mais sobre algum local específico?*
Exemplo: "Como está o Macúti hoje?" ou "Restaurantes no Manga"

Responde exatamente neste formato, adaptando só a parte da temperatura:`;
        } else {
            return `Eh pá, vou te ajudar com informações fixes sobre ${city}!

PERGUNTA: ${analysis.intent}
TEMPO ATUAL em ${city}:
- ${temp}°C (${temp > 30 ? 'bem quente!' : temp < 18 ? 'fresquinho' : 'temperatura boa'})
- ${weatherData.description}
- Humidade: ${weatherData.humidity}%

Quero dar uma resposta natural e prática como um moçambicano daria. Se perguntaram sobre locais, dar locais específicos. Se perguntaram sobre tempo, dar detalhes do tempo.

Use linguagem moçambicana casual, emojis apropriados, máximo 300 palavras.

Minha resposta:`;
        }
    }

    getLocationCategoryForTemperature(temp, description) {
        if (description.toLowerCase().includes('chuva')) {
            return `☔ *Com chuva, melhor locais cobertos:*
🏬 • Shopping centers (Beira Shopping)
🍽️ • Restaurantes com cobertura
🎬 • Cinema ou lugares fechados
📚 • Bibliotecas ou centros culturais
☕ • Cafés aconchegantes

💡 *Dica:* Leva guarda-chuva se tiveres que sair!`;
        } else if (temp > 30) {
            return `🔥 *Com ${temp}°C, locais fresquinhos são melhores:*
🏖️ • Praia do Macúti (com sombra)
🌳 • Parques com árvores grandes
🏬 • Shopping centers (ar condicionado)
🍨 • Gelatarias para refrescar
🏊 • Piscinas ou clubes

💡 *Dica:* Vai de manhã cedo ou final da tarde!`;
        } else if (temp > 25) {
            return `😊 *Com ${temp}°C, tens muitas opções boas:*
🏖️ • Praia do Macúti
🚶 • Centro da cidade (Manga)
🌳 • Jardins municipais
🛍️ • Mercado central
🍽️ • Restaurantes com esplanada
⛵ • Porto da Beira

💡 *Dica:* Tempo perfeito para qualquer atividade!`;
        } else if (temp > 20) {
            return `🌤️ *Com ${temp}°C fresquinho, ideais:*
🚶 • Caminhadas pelo centro
☕ • Cafés ao ar livre
🏛️ • Museus e centros culturais
🛍️ • Compras no centro
🌳 • Parques para relaxar

💡 *Dica:* Leva um casaco leve!`;
        } else {
            return `🧊 *Com ${temp}°C, melhor locais quentinhos:*
☕ • Cafés fechados e aquecidos
🏬 • Shopping centers
🍽️ • Restaurantes com ambiente fechado
🎬 • Cinema
📚 • Bibliotecas

💡 *Dica:* Vista-te bem quente!`;
        }
    }

    generateBasicWeatherResponse(weatherData, analysis) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city;
        const condition = weatherData.description || 'tempo normal';

        let tempDescription = '';
        if (temp > 30) {
            tempDescription = 'está bem quente';
        } else if (temp > 25) {
            tempDescription = 'está agradável';
        } else if (temp > 20) {
            tempDescription = 'está fresco';
        } else {
            tempDescription = 'está frio';
        }

        return `🌤️ **Clima em ${city}**

Agora ${tempDescription} com ${temp}°C.

🌡️ **Condições atuais:**
• Temperatura: ${temp}°C
• Estado: ${condition}
• Humidade: ${weatherData.humidity || 'N/A'}%

${this.getTemperatureTip(temp)}`;
    }

    getTemperatureTip(temperature) {
        if (temperature > 30) {
            return '💡 **Dica:** Mantenha-se hidratado e procure sombra!';
        } else if (temperature > 25) {
            return '💡 **Dica:** Tempo ideal para atividades ao ar livre!';
        } else if (temperature > 20) {
            return '💡 **Dica:** Leve um casaco leve se sair à noite!';
        } else {
            return '💡 **Dica:** Vista roupas quentes e mantenha-se aquecido!';
        }
    }

    // ===============================================
    // SUGESTÕES BASEADAS NA TEMPERATURA ATUAL
    // ===============================================

    async generateTemperatureBasedSuggestions(weatherData, city, context = {}) {
        try {
            console.log(`🌡️ Gerando sugestões para ${city} com ${weatherData.temperature}°C`);

            if (!this.token) {
                return {
                    success: false,
                    suggestions: this.getTemperatureFallbackSuggestions(weatherData.temperature),
                    method: 'fallback'
                };
            }

            const prompt = this.buildTemperatureSuggestionsPrompt(weatherData, city, context);
            const response = await this.callOpenAI(prompt, 0.8);

            try {
                const suggestions = JSON.parse(response);
                return {
                    success: true,
                    suggestions: suggestions,
                    method: 'ai_powered',
                    temperature: weatherData.temperature,
                    city: city
                };
            } catch (parseError) {
                console.error('❌ Parse error sugestões temperatura:', parseError.message);
                return {
                    success: false,
                    suggestions: this.getTemperatureFallbackSuggestions(weatherData.temperature),
                    method: 'fallback'
                };
            }

        } catch (error) {
            console.error('❌ Erro sugestões baseadas temperatura:', error.message);
            return {
                success: false,
                suggestions: this.getTemperatureFallbackSuggestions(weatherData.temperature),
                method: 'fallback'
            };
        }
    }

    buildTemperatureSuggestionsPrompt(weatherData, city, context) {
        const temp = weatherData.temperature;
        const condition = weatherData.description || 'tempo normal';
        const humidity = weatherData.humidity || 60;

        return `Eh pá, preciso dar 3 sugestões fixes para alguém que está em ${city}.

O tempo agora está assim:
- ${temp}°C (${temp > 30 ? 'eish, quente!' : temp < 18 ? 'está frio' : 'não está mau'})
- ${condition}
- Humidade: ${humidity}% (${humidity > 80 ? 'bem abafado' : humidity < 50 ? 'ar seco' : 'normal'})

Esta pessoa está a usar o WhatsApp: ${context.userPhone || 'não sei o número'}

${this.getTemperatureSpecificInstructions(temp)}

Quero dar sugestões que um moçambicano daria para outro moçambicano. Coisas práticas, não muito complicadas. Máximo 18 caracteres cada sugestão.

Exemplos do que pode funcionar:
- Para qualquer tempo: "Que roupa", "O que fazer", "Onde ir"
- Quando quente: "Dicas calor", "Onde refrescar", "Bebidas frias"  
- Quando frio: "Dicas frio", "Roupas quentes", "Como aquecer"
- Para chuva: "Guarda-chuva", "Onde ficar", "Vai parar?"

Com ${temp}°C, que 3 sugestões daria?

Responde só: ["sugestão1", "sugestão2", "sugestão3"]`;
    }

    getTemperatureSpecificInstructions(temperature) {
        if (temperature > 35) {
            return `Com ${temperature}°C está um calor do diabo! A pessoa precisa de:
- Refrescar urgente
- Não apanhar insolação  
- Beber muita água
- Sair do sol
Sugestões tipo: "SOS calor", "Onde refrescar", "Água gelada"`;
        } else if (temperature > 30) {
            return `${temperature}°C é quente mesmo! Melhor:
- Ficar na sombra
- Proteger do sol
- Bebidas geladas
- Não fazer muito esforço
Sugestões tipo: "Dicas calor", "Sombra fresca", "Geladinho"`;
        } else if (temperature > 25) {
            return `${temperature}°C está bom, mas já é calor. Pode:
- Sair com cuidado
- Roupa leve
- Beber água
Sugestões tipo: "Que roupa", "O que fazer", "Cuidados sol"`;
        } else if (temperature > 20) {
            return `${temperature}°C está perfeito! Tempo bom para:
- Qualquer atividade
- Sair e aproveitar
- Roupa confortável
Sugestões tipo: "O que fazer", "Onde ir", "Aproveitar"`;
        } else if (temperature > 15) {
            return `${temperature}°C já está fresquinho. Melhor:
- Roupa mais quente
- Atividades que aquecem
- Algo quente para beber
Sugestões tipo: "Que vestir", "Aquecer", "Chá quente"`;
        } else {
            return `${temperature}°C está frio! A pessoa vai precisar:
- Aquecer bem
- Roupas grossas
- Ficar em casa ou lugar quente
Sugestões tipo: "Como aquecer", "Roupas frio", "Lugar quente"`;
        }
    }

    getTemperatureFallbackSuggestions(temperature) {
        if (temperature > 30) {
            return ["Dicas calor", "Como refrescar", "Bebidas frias"];
        } else if (temperature > 25) {
            return ["Que roupa", "O que fazer", "Dicas sol"];
        } else if (temperature > 20) {
            return ["Atividades", "Onde ir", "Que roupa"];
        } else if (temperature > 15) {
            return ["Que roupa", "Bebidas quentes", "Atividades"];
        } else {
            return ["Dicas frio", "Roupas quentes", "Como aquecer"];
        }
    }

    // Processamento de sugestões (100% AI)

    async processSuggestionResponse(suggestionText, weatherData, userContext = {}) {
        console.log(`🎯 Processando sugestão com AI: "${suggestionText}"`);

        // Delegar para o handler AI-powered
        return await this.suggestionsHandler.processSuggestionResponse(
            suggestionText,
            weatherData,
            userContext
        );
    }

    // ===============================================
    // GERAÇÃO DE DICAS PRÁTICAS COM AI
    // ===============================================

    async generatePracticalTips(analysis, weatherData, userContext = {}) {
        try {
            console.log('🎯 Gerando dicas práticas com AI');

            if (!this.token) {
                return {
                    success: false,
                    message: "AI não disponível",
                    method: 'no_token'
                };
            }

            const prompt = this.buildPracticalTipsPrompt(analysis, weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.8);

            return {
                success: true,
                message: response.trim(),
                type: 'practical_tips',
                method: 'ai_powered'
            };

        } catch (error) {
            console.error('❌ Erro AI dicas práticas:', error.message);
            return {
                success: false,
                message: "Erro ao gerar dicas",
                error: error.message,
                method: 'error'
            };
        }
    }

    buildPracticalTipsPrompt(analysis, weatherData, userContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city;
        const condition = weatherData.description;
        const originalMessage = analysis.originalMessage || analysis.intent || '';

        return `${this.getBotIdentityContext()}

A pessoa perguntou: "${originalMessage}"
Intent detectado: ${analysis.intent}

SITUAÇÃO ACTUAL em ${city}:
- ${temp}°C (${temp > 30 ? 'eish, quente!' : temp < 18 ? 'está frio' : 'não está mau'})
- ${condition}
- Humidade: ${weatherData.humidity}%

SOBRE A PESSOA:
- Já falou comigo ${userContext.queryCount || 0} vezes
- Nível de experiência: ${userContext.expertiseLevel || 'está começando'}
- Última cidade: ${userContext.lastCity || 'primeira vez'}

INSTRUÇÕES PARA DAR DICAS NATURAIS COMO JOANA BOT:
1. Usa português moçambicano casual ("Eh pá", "fixes", "eish", "meu", etc.)
2. Seja muito natural e conversacional - como se fosses um amigo
3. NÃO uses listas rígidas com bullets (•)
4. NÃO faças formatação muito estruturada
5. Fala como se estivesses numa conversa casual
6. Máximo 200 palavras
7. Inclui emojis naturalmente no texto
8. Seja específico sobre o tempo actual
9. Como Joana Bot, mostra conhecimento especializado em meteorologia moçambicana

EXEMPLOS DE RESPOSTAS NATURAIS:
- Em vez de "• Roupa leve" → "Eh pá, com este calor veste roupa bem leve"
- Em vez de "• Protetor solar" → "e não te esqueças do protetor solar que o sol está bravo"
- Em vez de listas → Frases corridas e naturais

${this.getTipsGuidanceByIntent(analysis.intent, temp, condition)}

FORMATO:
Começa com algo como "💡 Eh pá..." e depois dá as dicas de forma muito natural, como numa conversa entre amigos. Ocasionalmente identifica-te como Joana Bot quando apropriado.

Minha resposta natural como Joana Bot:`;
    } getTipsGuidanceByIntent(intent, temperature, condition) {
        const isRaining = condition.toLowerCase().includes('chuva');

        if (intent === 'clothing_advice' || intent === 'conselhos_de_roupa') {
            return `FOCA EM ROUPA: Diz que roupa usar baseado nos ${temperature}°C. Fala como a pessoa se vai sentir com essa roupa.`;
        } else if (intent === 'activity_recommendation' || intent === 'ideias_de_atividades') {
            return `FOCA EM ATIVIDADES: Sugere o que fazer com este tempo. Seja específico sobre quando e onde.`;
        } else if (intent === 'weather_tips') {
            return `DICAS GERAIS: Mistura roupa, atividades e cuidados. Seja abrangente mas natural.`;
        } else {
            if (isRaining) {
                return `ESTÁ CHUVA: Foca em como lidar com a chuva - roupa, atividades, cuidados.`;
            } else if (temperature > 30) {
                return `ESTÁ CALOR: Foca em como refrescar, proteger do sol, que roupa usar.`;
            } else if (temperature < 18) {
                return `ESTÁ FRIO: Foca em como aquecer, roupa quente, atividades que aquecem.`;
            } else {
                return `TEMPO BOM: Aproveita para dar dicas positivas e encorajadoras.`;
            }
        }
    }

    // ===============================================
    // GERAÇÃO DE SUGESTÕES CONVERSACIONAIS PARA /sugestoes
    // ===============================================

    async generateConversationalSuggestions(weatherData, userContext = {}) {
        try {
            console.log('💡 Gerando sugestões conversacionais em português moçambicano');

            if (!this.token) {
                return this.generateBasicConversationalSuggestions(weatherData, userContext);
            }

            const prompt = this.buildConversationalSuggestionsPrompt(weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.8);

            return {
                success: true,
                message: response.trim(),
                type: 'conversational_suggestions',
                method: 'ai_powered'
            };

        } catch (error) {
            console.error('❌ Erro sugestões conversacionais:', error.message);
            return {
                success: true,
                message: this.generateBasicConversationalSuggestions(weatherData, userContext),
                type: 'conversational_suggestions',
                method: 'fallback'
            };
        }
    }

    buildConversationalSuggestionsPrompt(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city;
        const condition = weatherData.description;
        const humidity = weatherData.humidity;

        return `${this.getBotIdentityContext()}

A pessoa usou o comando /sugestoes e quer sugestões baseadas no tempo actual.

SITUAÇÃO ACTUAL em ${city}:
- ${temp}°C (${temp > 30 ? 'eish, quente!' : temp < 18 ? 'está frio' : 'não está mau'})
- ${condition}
- Humidade: ${humidity}% (${humidity > 80 ? 'bem abafado' : humidity < 50 ? 'ar seco' : 'normal'})

SOBRE A PESSOA:
- Já usou o bot ${userContext.queryCount || 0} vezes
- Nível de experiência: ${userContext.expertiseLevel || 'está começando'}
- Última cidade mencionada: ${userContext.lastCity || 'primeira vez'}
- Cidade preferida: ${userContext.preferredCity || 'não definida'}

INSTRUÇÕES PARA SUGESTÕES CONVERSACIONAIS COMO JOANA BOT:
1. Usa português moçambicano natural ("Eh pá", "fixes", "eish", "meu", etc.)
2. Seja muito conversacional e amigável como Joana Bot
3. NÃO faças listas numeradas (1. 2. 3.)
4. NÃO uses bullets estruturados (•)
5. Integra as sugestões naturalmente no texto como se fosses um amigo especialista
6. Fala sobre o tempo actual e como isso afecta as actividades
7. Máximo 250 palavras
8. Inclui emojis naturalmente
9. Termina perguntando o que a pessoa gostaria de saber mais
10. Mostra conhecimento especializado meteorológico da Joana Bot

EXEMPLOS DE LINGUAGEM NATURAL:
- Em vez de "1. Que roupa usar" → "Eh pá, com este tempo podes pensar na roupa que vais vestir"
- Em vez de "2. Atividades" → "e também que tal pensar no que fazer hoje"
- Em vez de listas → Texto corrido e natural

${this.getSuggestionsGuidanceByTemperature(temp, condition)}

FORMATO:
Começa identificando-te como Joana Bot se apropriado, depois dá as sugestões de forma muito natural, como se estivesses a conversar com um amigo. Termina perguntando algo como "Sobre o que gostarias de saber mais?"

Minha resposta conversacional como Joana Bot:`;
    }

    getSuggestionsGuidanceByTemperature(temperature, condition) {
        const isRaining = condition.toLowerCase().includes('chuva');

        if (isRaining) {
            return `ESTÁ CHUVA: Fala sobre actividades para casa, quando pode parar, que roupa usar para não se molhar, bebidas quentes.`;
        } else if (temperature > 32) {
            return `CALOR INTENSO: Fala sobre como refrescar, onde ir que tenha sombra, bebidas frias, roupas leves, protecção solar.`;
        } else if (temperature > 28) {
            return `CALOR NORMAL: Menciona actividades ao ar livre, roupas confortáveis, hidratação, aproveitar o dia.`;
        } else if (temperature > 22) {
            return `TEMPERATURA BOA: Fala sobre aproveitar o tempo, actividades variadas, roupa confortável, é um bom dia.`;
        } else if (temperature > 18) {
            return `FRESQUINHO: Menciona roupas por camadas, actividades que aquecem, bebidas quentes, cuidados com o frio.`;
        } else {
            return `FRIO: Fala sobre roupas quentes, actividades dentro de casa, bebidas quentes, como se aquecer.`;
        }
    }

    generateBasicConversationalSuggestions(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city;
        const isRaining = weatherData.description.toLowerCase().includes('chuva');

        let message = `💡 Sou a ${this.botIdentity.name}! Com ${temp}°C em ${city} hoje, `;

        if (isRaining) {
            message += `está chuva então melhor pensar em actividades dentro de casa. Que tal um filme, ler um livro ou cozinhar algo gostoso? `;
            message += `E não te esqueças do guarda-chuva se tiveres que sair! `;
        } else if (temp > 30) {
            message += `está bem quente! Podes pensar em ir para locais com sombra, beber muitos líquidos frescos, `;
            message += `e vestir roupa bem leve. A praia ou piscina seria fixe se conseguires! `;
        } else if (temp > 22) {
            message += `está uma temperatura boa para fazer qualquer coisa! Podes sair, visitar amigos, `;
            message += `fazer exercício ou simplesmente aproveitar o dia. Que roupa vais usar? `;
        } else {
            message += `está fresquinho, então melhor pensar em roupas mais quentes e atividades que te aquecem. `;
            message += `Um chá quentinho seria bom, não achas? `;
        }

        message += `\n\n🤔 Sobre o que gostarias de saber mais? O tempo para amanhã? Dicas específicas? Como a tua assistente meteorológica, estou aqui para ajudar!`;

        return message;
    }

    // ===============================================
    // GERAÇÃO DE CONSELHOS DE SEGURANÇA COM AI
    // ===============================================

    async generateSafetyAdvice(weatherData, userContext = {}) {
        try {
            console.log('⚠️ Gerando conselhos de segurança baseados na temperatura');

            if (!this.token) {
                return this.generateBasicSafetyAdvice(weatherData, userContext);
            }

            const prompt = this.buildSafetyAdvicePrompt(weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.7);

            return {
                success: true,
                message: response.trim(),
                type: 'safety_advice',
                method: 'ai_powered'
            };

        } catch (error) {
            console.error('❌ Erro conselhos de segurança:', error.message);
            return {
                success: true,
                message: this.generateBasicSafetyAdvice(weatherData, userContext),
                type: 'safety_advice',
                method: 'fallback'
            };
        }
    }

    buildSafetyAdvicePrompt(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city;
        const condition = weatherData.description;
        const humidity = weatherData.humidity;
        const isRaining = condition.toLowerCase().includes('chuva');

        return `${this.getBotIdentityContext()}

A pessoa usou o comando /conselhos e quer conselhos de segurança importantes baseados no clima.

SITUAÇÃO ACTUAL em ${city}:
- ${temp}°C (${temp > 30 ? 'eish, quente!' : temp < 18 ? 'está frio' : 'não está mau'})
- ${condition}
- Humidade: ${humidity}% (${humidity > 80 ? 'bem abafado' : humidity < 50 ? 'ar seco' : 'normal'})

SOBRE A PESSOA:
- Já usou o bot ${userContext.queryCount || 0} vezes
- Nível de experiência: ${userContext.expertiseLevel || 'está começando'}
- Cidade preferida: ${userContext.preferredCity || city || 'não definida'}

INSTRUÇÕES PARA CONSELHOS DE SEGURANÇA COMO JOANA BOT:
1. Usa português moçambicano natural e educativo
2. Foca em SEGURANÇA e PREVENÇÃO de perigos
3. Explica os "PORQUÊS" - por que algo é perigoso
4. NÃO uses listas rígidas, seja conversacional
5. Inclui dicas de prevenção específicas para Moçambique
6. Máximo 300 palavras
7. Seja firme mas amigável sobre segurança
8. Identifica-te como Joana Bot especialista em meteorologia

ASPECTOS DE SEGURANÇA A ABORDAR BASEADO NO CLIMA:
${this.getSafetyGuidanceByTemperature(temp, isRaining, humidity)}

FORMATO:
Começa identificando-te como Joana Bot e a importância da segurança, depois explica os riscos e prevenções de forma conversacional mas educativa.

Meus conselhos de segurança como Joana Bot:`;
    }

    getSafetyGuidanceByTemperature(temperature, isRaining, humidity) {
        if (isRaining) {
            return `ESTÁ CHUVA: Fala sobre riscos de escorregar, electrocussão, enchentes, visibilidade reduzida, hipotermia. Explica porquê cada um é perigoso.`;
        } else if (temperature > 35) {
            return `CALOR EXTREMO (${temperature}°C): MUITO PERIGOSO! Fala sobre insolação, desidratação severa, queimaduras solares, exaustão pelo calor. Explica sinais de alerta (tontura, náusea, confusão). É uma emergência médica!`;
        } else if (temperature > 30) {
            return `CALOR INTENSO (${temperature}°C): Fala sobre desidratação, insolação, queimaduras solares. Explica porque o corpo perde água rapidamente e sinais de alerta.`;
        } else if (temperature > 25) {
            return `CALOR MODERADO (${temperature}°C): Cuidados básicos com hidratação e protecção solar. Explica porque ainda pode ser perigoso se não tomar cuidados.`;
        } else if (temperature > 18) {
            return `TEMPERATURA FRESCA (${temperature}°C): Cuidados gerais, explica que mudanças bruscas podem ser perigosas.`;
        } else if (temperature > 10) {
            return `FRIO (${temperature}°C): Fala sobre hipotermia, problemas respiratórios, como o corpo perde calor. Explica sinais de alerta.`;
        } else {
            return `FRIO EXTREMO (${temperature}°C): MUITO PERIGOSO! Hipotermia severa, geladura, problemas cardíacos. Explica como é uma emergência médica.`;
        }
    }

    generateBasicSafetyAdvice(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city;
        const isRaining = weatherData.description.toLowerCase().includes('chuva');

        let advice = `⚠️ Eh pá, deixa eu te dar uns conselhos importantes sobre o tempo em ${city}! `;

        if (isRaining) {
            advice += `Com chuva tens que ter muito cuidado porque o chão fica escorregadio e podes cair. Também evita mexer em aparelhos eléctricos com as mãos molhadas. `;
        } else if (temp > 32) {
            advice += `Com ${temp}°C está muito perigoso! O calor pode causar desidratação e insolação. Bebe muita água mesmo que não tenhas sede, porque o corpo perde água rapidamente. `;
            advice += `Se sentires tontura, náusea ou confusão, procura sombra imediatamente e pede ajuda! `;
        } else if (temp > 25) {
            advice += `Com ${temp}°C já precisas de cuidados. Usa sempre protetor solar porque as queimaduras solares são perigosas, e bebe água regularmente. `;
        } else if (temp < 15) {
            advice += `Com ${temp}°C está frio e o corpo pode perder calor rapidamente. Veste-te bem em camadas e cuidado com o vento que piora o frio. `;
        } else {
            advice += `A temperatura está boa, mas sempre mantém cuidados básicos como hidratação e protecção solar. `;
        }

        advice += `\n\nLembra-te: é sempre melhor prevenir que remediar, meu! Cuida-te bem! 💪`;

        return advice;
    }

    // ===============================================
    // GERAÇÃO DE SUGESTÕES INTELIGENTES
    // ===============================================

    async generateSmartSuggestions(context, weatherData) {
        try {
            if (!this.token) {
                return this.getContextualFallbackSuggestions(context, weatherData);
            }

            const prompt = this.buildSuggestionsPrompt(context, weatherData);
            const response = await this.callOpenAI(prompt, 0.8);

            try {
                const suggestions = JSON.parse(response);
                return {
                    success: true,
                    suggestions: suggestions,
                    method: 'ai_generated'
                };
            } catch (parseError) {
                console.error('❌ Parse error sugestões:', parseError.message);
                return {
                    success: false,
                    suggestions: this.getContextualFallbackSuggestions(context, weatherData),
                    method: 'fallback'
                };
            }

        } catch (error) {
            console.error('❌ Erro geração sugestões AI:', error.message);
            return {
                success: false,
                suggestions: this.getContextualFallbackSuggestions(context, weatherData),
                method: 'fallback'
            };
        }
    }

    buildSuggestionsPrompt(context, weatherData) {
        const temp = weatherData?.temperature || 25;
        const city = weatherData?.city || context.lastCity || 'localização atual';

        return `Ei, preciso dar 3 sugestões úteis para alguém em ${city}.

Situação agora:
- Temperatura: ${temp}°C
- Tempo: ${weatherData?.description || 'normal'}
- Já fez ${context.queryCount || 0} perguntas antes
- Última pergunta: ${context.lastQuery || 'primeira vez'}

Quero sugerir coisas que fazem sentido para a situação atual. Máximo 18 caracteres por sugestão.

${this.getContextSpecificGuidance(temp, weatherData?.description, context)}

Posso sugerir coisas como:
- Atividades: "O que fazer", "Onde ir", "Sair hoje"
- Roupa: "Que roupa", "Como vestir"  
- Tempo: "Tempo amanhã", "Vai chover", "Próximos dias"
- Dicas: "Dicas calor", "Dicas frio"
- Outros: "Outras cidades", "Mais info"

Responde só: ["sugestão1", "sugestão2", "sugestão3"]`;
    }

    getContextSpecificGuidance(temperature, conditions, context) {
        if (temperature > 30) {
            return "Está quente! Pessoa vai querer saber como refrescar, onde ir que não seja no sol, que roupa usar para não morrer de calor.";
        } else if (temperature < 18) {
            return "Está frio! Pessoa vai querer saber como se aquecer, que roupas vestir, onde ir que seja quentinho.";
        } else if (conditions?.includes('chuva') || conditions?.includes('rain')) {
            return "Está chuva! Pessoa quer saber se vai parar, o que fazer em casa, quando pode sair.";
        } else {
            return "Tempo bom! Pessoa pode querer saber o que fazer, onde ir aproveitar, ou só estar preparada para mudanças.";
        }
    }

    // ===============================================
    // FALLBACKS INTELIGENTES
    // ===============================================

    performRuleBasedAnalysis(message, context) {
        console.log('🔄 Análise baseada em regras (fallback)');

        const lowerMessage = message.toLowerCase().trim();

        // Análise baseada em palavras-chave
        let intent = 'weather_query_current';
        let confidence = 0.6;
        let entities = {
            cities: [],
            timeframe: 'none',
            weather_aspect: 'general',
            activity_type: 'none'
        };

        // Detectar cidades
        const cities = ['maputo', 'beira', 'nampula', 'quelimane', 'tete', 'chimoio', 'pemba', 'xai-xai', 'lichinga', 'inhambane'];
        entities.cities = cities.filter(city => lowerMessage.includes(city));

        // Detectar intenções
        if (lowerMessage.includes('atividade') || lowerMessage.includes('fazer') || lowerMessage.includes('onde ir')) {
            intent = 'activity_recommendation';
            confidence = 0.8;
            entities.activity_type = 'general';
        } else if (lowerMessage.includes('roupa') || lowerMessage.includes('vestir')) {
            intent = 'clothing_advice';
            confidence = 0.9;
        } else if (lowerMessage.includes('dicas')) {
            intent = 'weather_tips';
            confidence = 0.8;
        } else if (lowerMessage.includes('amanhã') || lowerMessage.includes('previsão')) {
            intent = 'weather_query_forecast';
            confidence = 0.8;
            entities.timeframe = 'tomorrow';
        } else if (lowerMessage.includes('ajuda') || lowerMessage.includes('help')) {
            intent = 'general_help';
            confidence = 0.9;
        } else if (lowerMessage.includes('olá') || lowerMessage.includes('oi') || lowerMessage.includes('bom dia')) {
            intent = 'greeting';
            confidence = 0.9;
        }

        return {
            success: true,
            analysis: {
                intent: intent,
                confidence: confidence,
                entities: entities,
                reasoning: 'Análise baseada em palavras-chave',
                response_type: 'informative',
                priority: 'medium',
                requires_weather_data: intent.includes('weather') || intent.includes('activity') || intent.includes('clothing'),
                suggested_followup: 'contextual'
            },
            method: 'rule_based',
            originalMessage: message
        };
    }

    getContextualFallbackSuggestions(context, weatherData) {
        const temp = parseInt(weatherData?.temperature || 25);

        if (temp > 30) {
            return ["Dicas calor", "Que roupa", "Onde refrescar"];
        } else if (temp < 18) {
            return ["Dicas frio", "Roupas quentes", "Bebidas quentes"];
        } else if (weatherData?.description?.includes('chuva')) {
            return ["Vai parar?", "O que fazer", "Guarda-chuva"];
        } else {
            return ["O que fazer", "Tempo amanhã", "Que roupa"];
        }
    }

    createFallbackAnalysis(message, context) {
        return {
            success: false,
            analysis: {
                intent: 'general_help',
                confidence: 0.3,
                entities: {
                    cities: [],
                    timeframe: 'none',
                    weather_aspect: 'general',
                    activity_type: 'none'
                },
                reasoning: 'Sistema em modo de emergência',
                response_type: 'supportive',
                priority: 'low',
                requires_weather_data: false,
                suggested_followup: 'help'
            },
            method: 'emergency_fallback',
            originalMessage: message,
            error: 'Sistema temporariamente limitado'
        };
    }

    // ===============================================
    // UTILITÁRIOS
    // ===============================================

    async callOpenAI(prompt, temperature = 0.7) {
        if (!this.token) {
            throw new Error('Token OpenAI não disponível');
        }

        const response = await axios.post(`${this.baseURL}/chat/completions`, {
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: this.maxTokens,
            temperature: temperature
        }, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        return response.data.choices[0].message.content;
    }

    // Cache methods
    getCacheKey(message, context) {
        const key = `${message}_${context.lastCity || 'no_city'}_${context.queryCount || 0}`;
        return key.toLowerCase().replace(/\s+/g, '_').substring(0, 50);
    }

    getCachedAnalysis(cacheKey) {
        if (this.analysisCache.has(cacheKey)) {
            const cached = this.analysisCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                console.log('📂 Cache hit análise:', cacheKey.substring(0, 20) + '...');
                return cached.data;
            } else {
                this.analysisCache.delete(cacheKey);
            }
        }
        return null;
    }

    setCachedAnalysis(cacheKey, analysis) {
        this.analysisCache.set(cacheKey, {
            data: analysis,
            timestamp: Date.now()
        });

        // Limpar cache se muito grande
        if (this.analysisCache.size > 50) {
            const firstKey = this.analysisCache.keys().next().value;
            this.analysisCache.delete(firstKey);
        }
    }

    // Teste de conectividade
    async testAIConnection() {
        try {
            const testAnalysis = await this.analyzeMessage('Teste de conexão', {});
            const testSuggestions = await this.generateSmartSuggestions({}, { temperature: 25 });

            return {
                success: true,
                message: 'Sistema AI 100% operacional',
                analysisWorking: testAnalysis.success,
                suggestionsWorking: testSuggestions.success,
                aiPowered: true
            };
        } catch (error) {
            return {
                success: false,
                message: 'Erro no sistema AI - modo fallback ativo',
                error: error.message,
                aiPowered: false
            };
        }
    }

    // Stats
    getSystemStats() {
        return {
            analysisCache: this.analysisCache.size,
            suggestionsHandler: this.suggestionsHandler.getCacheStats(),
            aiEnabled: !!this.token,
            model: this.model,
            maxTokens: this.maxTokens
        };
    }

    clearAllCaches() {
        this.analysisCache.clear();
        this.suggestionsHandler.clearCache();
        console.log('✅ Todos os caches AI limpos');
    }
}

module.exports = OPENAI;
