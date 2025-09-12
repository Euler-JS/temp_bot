require('dotenv').config();
const axios = require('axios');
const AIBasedSuggestionsHandler = require('./suggestions_handler_ai');
// Local Beira locations data
const { beiraLocations, beiraLocationUtils } = require('../locations_beira/beira_locations');

class OPENAI {
    constructor() {
        this.token = process.env.OPEN_AI;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = 'gpt-4o-mini';
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
• "Como está o tempo em Beira?"
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
            'safety_zones',
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
            'time_question',
            'positive_feedback'  // Adicionado feedback positivo como não-climático
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
- Usa linguagem moçambicana natural (" ", "fixes", "eish", etc.)
- Seja útil e amigável
- Se não souber sobre o tópico, admite honestly mas oferece ajuda meteorológica
- Máximo 150 palavras
- Inclui emojis apropriados
- Se a pessoa cumprimentar, apresenta-te brevemente
- Sempre oferece ajuda meteorológica como alternativa

EXEMPLOS:
- Se disser "Olá" → " olá! Sou a Joana Bot, a tua assistente meteorológica! Como posso ajudar-te com o tempo hoje?"
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
        const userLevel = (context && (context.expertiseLevel || context.expertise_level || context.preferred_complexity)) ?
            (context.expertiseLevel || context.expertise_level || context.preferred_complexity) : 'basic';

        return ` sou um assistente que entende bem como os moçambicanos falam sobre o tempo.

A pessoa escreveu: "${message}"

Contexto da conversa:
- Já fizeram ${context.queryCount || 0} perguntas antes
- Última cidade que mencionaram: ${context.lastCity || 'nenhuma ainda'}
- Onde estão agora: ${context.currentLocation || 'não sei'}
- NÍVEL DO USUÁRIO: ${userLevel}

${userLevel === 'advanced' ?
                'RESPOSTA TÉCNICA: Use terminologia meteorológica apropriada, inclua análise detalhada, evite gírias' :
                userLevel === 'intermediate' ?
                    'RESPOSTA EQUILIBRADA: Combine simplicidade com contexto técnico moderado' :
                    'RESPOSTA SIMPLES: Use linguagem muito fácil e acessível, gírias moçambicanas OK'
            }

Preciso perceber o que eles realmente querem. SEJA MUITO PRECISO:

PERGUNTAS SOBRE CLIMA/TEMPO (SEMPRE weather_query_current):
- "clima", "tempo", "clima hoje", "tempo hoje" → weather_query_current (requires_weather_data: true)
- "temperatura", "calor", "frio", "humidade" → weather_query_current (requires_weather_data: true)
- "Maputo", "Beira", "como está lá" → weather_query_current (requires_weather_data: true)
- "amanhã", "previsão", "vai chover" → weather_query_forecast (requires_weather_data: true)
- "o que fazer", "há atividade", "onde ir" → activity_recommendation (requires_weather_data: true)
- "que roupa", "como vestir" → clothing_advice (requires_weather_data: true)
- "dicas clima" → weather_tips (requires_weather_data: true)
- "zonas de risco", "áreas perigosas", "segurança", "inundação", "ciclone" → safety_zones (requires_weather_data: true)

PERGUNTAS NÃO SOBRE CLIMA:
- "olá", "bom dia", "como estás" → greeting (requires_weather_data: false)
- "ajuda", "não entendo", "comandos" → general_help (requires_weather_data: false)
- "obrigado", "muito obrigado" → thanks (requires_weather_data: false)
- "muito bom", "muito boa", "perfeito", "excelente", "óptimo" → positive_feedback (requires_weather_data: false)

REGRA CRÍTICA: 
- Se a mensagem contém palavras como "clima", "tempo", "temperatura", "calor", "frio" → SEMPRE é sobre clima!
- "Clima hoje" é SEMPRE weather_query_current, mesmo sem cidade específica!
- Se é sobre clima mas não tem cidade, ainda é weather_query_current (o sistema vai pedir a cidade depois)

Responde só o JSON:

{
    "intent": "categoria_específica_da_lista_acima",
    "confidence": 0.95,
    "entities": {
        "cities": ["só_se_mencionaram_cidades_explicitamente"],
        "timeframe": "today_se_for_hoje_tomorrow_se_for_amanhã_ou_none",
        "weather_aspect": "temperature_ou_rain_ou_general",
        "activity_type": "só_se_for_atividade"
    },
    "reasoning": "porque_classifiquei_assim",
    "response_type": "informative",
    "priority": "high_se_for_clima_medium_se_for_outro",
    "requires_weather_data": true_se_for_sobre_clima_false_se_não,
    "suggested_followup": "contextual"
}`;
    }

    clearProblematicCache() {
        // Limpar entradas de cache que possam estar causando problemas
        const keysToDelete = [];

        for (let key of this.analysisCache.keys()) {
            if (key.includes('clima') || key.includes('tempo') || key.includes('weather')) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => {
            console.log(`🗑️ Removendo cache problemático: ${key}`);
            this.analysisCache.delete(key);
        });

        console.log(`✅ Cache limpo: ${keysToDelete.length} entradas removidas`);
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
            // Se é uma pergunta sobre zonas de risco, usar função específica
            if (analysis.intent === 'safety_zones') {
                return await this.generateSafetyZonesResponse(analysis, weatherData, userContext);
            }

            if (!this.token) {
                return this.generateBasicWeatherResponse(weatherData, analysis);
            }

            const prompt = this.buildWeatherResponsePrompt(analysis, weatherData, userContext);
            let response = await this.callOpenAI(prompt, 0.7);

            // ========================================
            // NOVA VALIDAÇÃO: Verificar se resposta usa apenas locais reais
            // ========================================
            if (weatherData.city.toLowerCase() === 'beira') {
                const validation = this.validateAIResponseForBeira(response);

                if (!validation.isValid) {
                    console.warn('🔄 Regenerando resposta - locais inexistentes detectados');

                    // Prompt mais restritivo para regenerar
                    const strictPrompt = `${prompt}

ATENÇÃO ESPECIAL: A resposta anterior mencionou locais inexistentes: ${validation.invalidLocations.join(', ')}.
REGENERAR resposta mencionando APENAS locais da lista fornecida. SEM inventar nomes de locais!`;

                    response = await this.callOpenAI(strictPrompt, 0.5); // Temperatura menor para mais consistência
                }
            }

            return response.trim();

        } catch (error) {
            console.error('❌ Erro AI weather response:', error.message);
            return this.generateBasicWeatherResponse(weatherData, analysis);
        }
    }

    buildWeatherResponsePrompt(analysis, weatherData, userContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city;
        const userLevel = (userContext && (userContext.expertiseLevel || userContext.expertise_level || userContext.preferred_complexity)) ?
            (userContext.expertiseLevel || userContext.expertise_level || userContext.preferred_complexity) : 'basic';
        const isActivityRequest = analysis.intent === 'ideias_de_atividades' ||
            analysis.intent === 'activity_recommendation' ||
            analysis.intent === 'tipo_de_atividade';

        // Definir instruções de tom baseadas no nível do usuário
        const toneInstructions = this.getToneInstructionsForLevel(userLevel);

        // ====== MUDANÇA CRÍTICA: Sempre incluir locais se for Beira ======
        if (city.toLowerCase() === 'beira') {
            // Sempre incluir locais reais para qualquer pergunta sobre Beira
            const locaisReaisPrompt = this.buildBeiraLocationsForPrompt();

            if (isActivityRequest) {
                // Prompt específico para atividades (versão original melhorada)
                const context = {
                    temperatura: temp,
                    condicao: weatherData.description?.toLowerCase(),
                    hora: (new Date()).getHours(),
                    intent: analysis.intent
                };

                const suggestions = beiraLocationUtils.getSuggestionsByContext(context);
                const formattedSuggestions = suggestions.map(s => `📍 • ${s.nome} - ${s.descricao || ''}`).join('\n');

                return `${this.getBotIdentityContext()}

A pessoa perguntou sobre atividades/locais para ir hoje em Beira, com ${temp}°C e ${weatherData.description}.
NÍVEL DO USUÁRIO: ${userLevel}

DADOS METEOROLÓGICOS ATUAIS:
- Temperatura: ${temp}°C
- Condições: ${weatherData.description}
- Humidade: ${weatherData.humidity}%

IMPORTANTE - LOCAIS REAIS DA BEIRA DISPONÍVEIS:
${locaisReaisPrompt}

INSTRUÇÕES CRÍTICAS:
🚨 USA APENAS os locais listados acima - NUNCA inventes locais!
🚨 Se mencionares um local, tem que ser da lista fornecida!
🚨 NUNCA menciones: "Praia Nova", "Mercado do Peixe", "Jardim do Inhamízua", "Beira Shopping", "Jardins municipais" ou outros locais não listados!

FORMATO DA RESPOSTA:
${toneInstructions}
- Menciona 2-3 locais REAIS adequados para ${temp}°C
- Explica porque são boas opções para esta temperatura
- Máximo 250 palavras
- Usa emojis apropriados

Baseado na temperatura de ${temp}°C, sugere locais REAIS da lista acima e explica porque são adequados hoje.

Minha resposta natural e fluida usando APENAS locais reais:`;
            } else {
                // ====== NOVO: Para consultas de clima simples, também incluir locais ======
                return `${this.getBotIdentityContext()}

A pessoa perguntou: "${analysis.intent}" sobre o clima em Beira.
NÍVEL DO USUÁRIO: ${userLevel}

TEMPO ATUAL em ${city}:
- ${temp}°C (${temp > 30 ? 'bem quente!' : temp < 18 ? 'fresquinho' : 'temperatura boa'})
- ${weatherData.description}
- Humidade: ${weatherData.humidity}%

LOCAIS REAIS DA BEIRA DISPONÍVEIS (se quiseres mencionar algum):
${locaisReaisPrompt}

INSTRUÇÕES:
${toneInstructions}
- Se mencionares locais, usa APENAS os da lista acima
- NUNCA inventes locais como "Praia Nova", "Mercado do Peixe", "Jardim do Inhamízua"
- Podes sugerir 1-2 locais reais se for relevante para o clima
- Máximo 200 palavras

Minha resposta natural sobre o clima (mencionando locais reais se relevante):`;
            }

        } else {
            // Para outras cidades (comportamento original)
            return ` vou te ajudar com informações fixes sobre ${city}!
NÍVEL DO USUÁRIO: ${userLevel}

PERGUNTA: ${analysis.intent}
TEMPO ATUAL em ${city}:
- ${temp}°C (${temp > 30 ? 'bem quente!' : temp < 18 ? 'fresquinho' : 'temperatura boa'})
- ${weatherData.description}
- Humidade: ${weatherData.humidity}%

${toneInstructions}

Quero dar uma resposta natural e prática. Se perguntaram sobre locais, dar locais específicos. Se perguntaram sobre tempo, dar detalhes do tempo.

Máximo 300 palavras.

Minha resposta:`;
        }
    }

    // ===============================================
    // HELPER: INSTRUÇÕES DE TOM BASEADAS NO NÍVEL
    // ===============================================

    getToneInstructionsForLevel(userLevel) {
        switch (userLevel) {
            case 'advanced':
                return `- RESPOSTA TÉCNICA: Use terminologia meteorológica apropriada (sensação térmica, humidade relativa, pressão atmosférica)
- Inclua análise detalhada e fundamentada
- Evite gírias e expressões informais
- Use linguagem formal e profissional
- Mencione dados técnicos quando relevante`;

            case 'intermediate':
                return `- RESPOSTA EQUILIBRADA: Combine simplicidade com contexto técnico moderado
- Use alguns termos meteorológicos básicos
- Linguagem moçambicana natural mas educativa
- Balance entre informal e informativo`;

            default: // basic
                return `- RESPOSTA SIMPLES: Use linguagem muito fácil e acessível
- Linguagem moçambicana casual, gírias OK (" ", "mano", etc.)
- Evite termos técnicos complexos
- Foque no prático e útil`;
        }
    }

    buildBeiraLocationsForPrompt() {
        let locaisPrompt = '';

        // Praias
        locaisPrompt += '\n🏖️ PRAIAS REAIS:\n';
        beiraLocations.praias.forEach(praia => {
            locaisPrompt += `• ${praia.nome} - ${praia.descricao}\n`;
        });

        // Restaurantes mais conhecidos (top 5)
        locaisPrompt += '\n🍽️ RESTAURANTES REAIS (principais):\n';
        beiraLocations.restaurantes.slice(0, 5).forEach(rest => {
            locaisPrompt += `• ${rest.nome} - ${rest.descricao}${rest.especialidade ? ` (${rest.especialidade})` : ''}\n`;
        });

        // Fast Food
        locaisPrompt += '\n🍔 FAST FOOD REAIS:\n';
        beiraLocations.fastFood.slice(0, 4).forEach(fast => {
            locaisPrompt += `• ${fast.nome} - ${fast.descricao}\n`;
        });

        // Locais Históricos principais
        locaisPrompt += '\n🏛️ LOCAIS HISTÓRICOS REAIS:\n';
        beiraLocations.historicos.slice(0, 4).forEach(hist => {
            locaisPrompt += `• ${hist.nome} - ${hist.descricao}\n`;
        });

        // Lazer/Entretenimento
        locaisPrompt += '\n🎯 LAZER/ENTRETENIMENTO REAIS:\n';
        beiraLocations.lazer.slice(0, 5).forEach(lazer => {
            locaisPrompt += `• ${lazer.nome} - ${lazer.descricao}\n`;
        });

        locaisPrompt += '\n⚠️ CRÍTICO: Estes são TODOS os locais disponíveis. NÃO exists mais nenhum além destes! NUNCA inventes nomes de locais!';

        return locaisPrompt;
    }


    // ========================================
    // FUNÇÃO AUXILIAR: Validar resposta da IA
    // ========================================
    validateAIResponseForBeira(aiResponse) {
        // Lista de locais que a IA não deve mencionar (locais ficcionais comuns)
        const locaisProibidos = [
            'praia nova',
            'mercado do peixe',
            'jardim do inhamízua',
            'beira shopping',
            'jardins municipais',
            'mercado central',
            'porto da beira',
            'terminal rodoviário central'
        ];

        const responseTexto = aiResponse.toLowerCase();
        let temLocaisInventados = false;
        let locaisEncontrados = [];

        locaisProibidos.forEach(local => {
            if (responseTexto.includes(local)) {
                temLocaisInventados = true;
                locaisEncontrados.push(local);
            }
        });

        if (temLocaisInventados) {
            console.warn('🚨 IA mencionou locais inexistentes:', locaisEncontrados);
            // Poderías implementar fallback ou regenerar a resposta
            return {
                isValid: false,
                invalidLocations: locaisEncontrados,
                suggestion: 'Regenerar resposta sem locais inexistentes'
            };
        }

        return {
            isValid: true,
            message: 'Resposta válida - apenas locais reais mencionados'
        };
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
    // INFORMAÇÕES SOBRE ZONAS DE RISCO CLIMÁTICO
    // ===============================================

    async generateSafetyZonesResponse(analysis, weatherData, userContext) {
        try {
            if (!this.token) {
                return this.generateBasicSafetyZonesResponse(weatherData);
            }

            const prompt = this.buildSafetyZonesPrompt(analysis, weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.7);

            return response.trim();

        } catch (error) {
            console.error('❌ Erro AI safety zones response:', error.message);
            return this.generateBasicSafetyZonesResponse(weatherData);
        }
    }

    buildSafetyZonesPrompt(analysis, weatherData, userContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city.toLowerCase();
        const condition = weatherData.description;

        return `A pessoa perguntou sobre zonas de risco na ${city} relacionadas ao clima. Com ${temp}°C e ${condition}, preciso dar informações importantes de segurança.

INFORMAÇÕES SOBRE ZONAS DE RISCO EM ${city.toUpperCase()}:

${city === 'beira' ? `
🏙️ *BEIRA - Zonas de Risco Climático:*

⚠️ *ZONAS DE ALTO RISCO:*
• Macúti/Costa - vulnerável a ciclones e marés altas
• Munhava baixa - áreas de inundação frequente  
• Manga baixa - zona baixa sujeita a alagamentos
• Marromeu - áreas rurais próximas ao Zambeze
• Estaquinha - zona costeira exposta

🔴 *RISCOS PRINCIPAIS:*
• Ciclones tropicais (Nov-Abril)
• Inundações do Rio Zambeze
• Erosão costeira e marés altas
• Ventos fortes durante tempestades

` : `
🏙️ *${city.toUpperCase()} - Zonas de Risco Climático:*

⚠️ *RISCOS COMUNS EM MOÇAMBIQUE:*
• Zonas baixas - risco de inundação
• Áreas próximas a rios - cheias sazonais
• Costa - ciclones e marés altas
• Zonas rurais - isolamento durante tempestades
`}

🌦️ *BASEADO NO TEMPO ATUAL (${temp}°C, ${condition}):*
${this.getCurrentWeatherRiskAssessment(temp, condition)}

🛡️ *MEDIDAS DE PREVENÇÃO:*
• Mantenha-se informado sobre previsões meteorológicas
• Tenha sempre um kit de emergência preparado
• Conheça as rotas de evacuação da tua área
• Evite construções em zonas baixas ou próximas a rios

📱 *CONTACTOS DE EMERGÊNCIA:*
• INGC (Instituto Nacional de Gestão de Calamidades): 119
• Bombeiros: 198
• Polícia: 119

💡 *Dica:* Durante a época ciclónica (Nov-Abril), mantenha-se especialmente atento aos alertas meteorológicos!

Responde de forma natural como um moçambicano experiente daria este conselho, máximo 400 palavras:`;
    }

    getCurrentWeatherRiskAssessment(temp, condition) {
        if (condition.toLowerCase().includes('chuva') || condition.toLowerCase().includes('tempestade')) {
            return `🌧️ Com chuva atual, EVITE:
• Zonas baixas que podem alagar
• Atravessar rios ou ribeiras
• Circular em estradas não pavimentadas
• Áreas próximas ao mar durante marés altas`;
        } else if (temp > 35) {
            return `🔥 Com calor extremo (${temp}°C), CUIDADO com:
• Desidratação em áreas expostas
• Incêndios em vegetação seca
• Problemas de saúde em zonas sem sombra`;
        } else if (condition.toLowerCase().includes('vento')) {
            return `💨 Com vento forte, EVITE:
• Áreas com árvores grandes
• Estruturas temporárias ou frágeis
• Atividades no mar ou rios`;
        } else {
            return `✅ Condições meteorológicas estáveis atualmente.
• Mantenha-se atento a mudanças no tempo
• Época das chuvas: Nov-Abril (maior risco)
• Época seca: Mai-Out (mais estável)`;
        }
    }

    generateBasicSafetyZonesResponse(weatherData) {
        const city = weatherData.city;
        const temp = parseInt(weatherData.temperature);
        const condition = weatherData.description;

        return `⚠️ **Zonas de Risco em ${city}**

🌦️ **Condições atuais:** ${temp}°C, ${condition}

🔴 **Áreas de maior risco:**
• Zonas baixas próximas a rios
• Áreas costeiras durante tempestades
• Construções em encostas íngremes
• Bairros sem drenagem adequada

💡 **Recomendações gerais:**
• Mantenha-se informado sobre o tempo
• Tenha um plano de evacuação
• Evite áreas de risco durante chuvas fortes
• Contacte autoridades locais para informações específicas

📞 **Emergências:** 119 (INGC)`;
    }

    // ===============================================
    // INFORMAÇÕES SOBRE ZONAS SEGURAS E REFÚGIO
    // ===============================================

    async generateSafeZonesInformation(weatherData, userContext = {}) {
        try {
            if (!this.token) {
                return this.generateBasicSafeZonesInformation(weatherData);
            }

            const prompt = this.buildSafeZonesInformationPrompt(weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.7);

            return {
                success: true,
                message: response.trim(),
                method: 'ai_powered'
            };

        } catch (error) {
            console.error('❌ Erro AI safe zones info:', error.message);
            return this.generateBasicSafeZonesInformation(weatherData);
        }
    }

    buildSafeZonesInformationPrompt(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city.toLowerCase();
        const condition = weatherData.description;

        return `O utilizador pediu informações sobre zonas seguras e pontos de refúgio em ${city}. Com ${temp}°C e ${condition}, preciso dar informações práticas de segurança.

INFORMAÇÕES SOBRE ZONAS SEGURAS EM ${city.toUpperCase()}:

${city === 'beira' ? `
🛡️ *BEIRA - Zonas Seguras e Pontos de Refúgio:*

✅ *CENTROS DE EVACUAÇÃO OFICIAIS:*
• Centro Comunitário da Manga - zona alta e segura
• Escola Secundária Samora Machel - estrutura resistente
• Hospital Central da Beira - sempre operacional
• Centro de Saúde do Macúti - ponto de apoio
• Estádio do Ferroviário - área ampla para concentração

🏥 *HOSPITAIS E CENTROS DE SAÚDE:*
• Hospital Central da Beira (24h)
• Hospital Privado Beira Medical Centre
• Centro de Saúde da Manga
• Centro de Saúde do Goto
• Clínica São Lucas

🏫 *ESCOLAS EM ZONAS SEGURAS:*
• Escola Secundária Samora Machel
• Escola Primária da Manga
• Instituto Industrial da Beira
• Universidade Católica de Moçambique

` : `
🛡️ *${city.toUpperCase()} - Zonas Seguras e Pontos de Refúgio:*

✅ *TIPOS DE LOCAIS SEGUROS:*
• Edifícios públicos em zonas altas
• Hospitais e centros de saúde
• Escolas com estruturas sólidas
• Centros comunitários
• Igrejas em locais elevados
`}

🌦️ *BASEADO NO TEMPO ATUAL (${temp}°C, ${condition}):*
${this.getCurrentSafetyRecommendations(temp, condition)}

🎒 *KIT DE EMERGÊNCIA ESSENCIAL:*
• Água potável (3 litros por pessoa)
• Alimentos não perecíveis (3 dias)
• Medicamentos pessoais
• Lanterna e pilhas extras
• Rádio portátil
• Documentos em saco plástico
• Roupa extra e cobertor

📱 *CONTACTOS DE EMERGÊNCIA SEMPRE À MÃO:*
• INGC (Gestão de Calamidades): 119
• Bombeiros: 198
• Polícia: 119
• Cruz Vermelha: +258 21 491 323

🗺️ *COMO CHEGAR AOS PONTOS SEGUROS:*
• Evite zonas baixas durante evacuação
• Use rotas principais pavimentadas
• Mantenha-se em grupo quando possível
• Siga instruções das autoridades locais

💡 *Dica Principal:* Tenha sempre um plano de evacuação preparado e conheça pelo menos 2 rotas diferentes para chegar aos pontos seguros!

Responde de forma natural e tranquilizadora como um moçambicano experiente daria este conselho, máximo 500 palavras:`;
    }

    getCurrentSafetyRecommendations(temp, condition) {
        if (condition.toLowerCase().includes('chuva') || condition.toLowerCase().includes('tempestade')) {
            return `🌧️ Com chuva atual, PROCURE IMEDIATAMENTE:
• Edifícios sólidos em zonas altas
• Evite sótãos - fique no andar térreo de edifícios altos
• Mantenha-se longe de linhas eléctricas
• Se estiver na estrada, procure abrigo seguro`;
        } else if (temp > 35) {
            return `🔥 Com calor extremo (${temp}°C), ZONAS FRESCAS:
• Edifícios com ar condicionado
• Hospitais sempre refrigerados
• Centros comerciais
• Locais com sombra e ventilação`;
        } else if (condition.toLowerCase().includes('vento')) {
            return `💨 Com vento forte, ESTRUTURAS SÓLIDAS:
• Edifícios de betão em zonas baixas
• Evite estruturas temporárias
• Mantenha-se longe de árvores grandes`;
        } else {
            return `✅ Condições estáveis - bom momento para:
• Revisar o teu plano de evacuação
• Verificar o kit de emergência
• Conhecer melhor os pontos seguros da tua área
• Memorizar contactos de emergência`;
        }
    }

    async generateSafeZonesOptions(weatherData, userContext = {}) {
        try {
            if (!this.token) {
                return this.getBasicSafeZonesOptions(weatherData);
            }

            const prompt = this.buildSafeZonesOptionsPrompt(weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.8);

            try {
                const options = JSON.parse(response);
                return {
                    success: true,
                    options: options,
                    method: 'ai_powered'
                };
            } catch (parseError) {
                console.error('❌ Parse error safe zones options:', parseError.message);
                return this.getBasicSafeZonesOptions(weatherData);
            }

        } catch (error) {
            console.error('❌ Erro AI safe zones options:', error.message);
            return this.getBasicSafeZonesOptions(weatherData);
        }
    }

    buildSafeZonesOptionsPrompt(weatherData, userContext) {
        const city = weatherData.city.toLowerCase();
        const condition = weatherData.description;

        return `Gerar opções de lista interativa sobre zonas seguras em ${city} com condições ${condition}.

Criar exactamente 5 opções específicas e úteis para a situação actual.

IMPORTANTE - LIMITES OBRIGATÓRIOS:
- title: máximo 24 caracteres (incluindo emojis)
- description: máximo 72 caracteres
- id: sem espaços, usar underscore

Responde só JSON no formato:
[
  {
    "id": "identificador_unico",
    "title": "Título Curto (max 24)",
    "description": "Descrição útil (max 72 chars)"
  }
]

Exemplo baseado na cidade e condições:
- "Centros Evacuação" (16 chars) - "Locais oficiais mais próximos" (30 chars)
- "Hospitais 24h" (13 chars) - "Sempre abertos para emergências" (32 chars)
- "Rotas Seguras" (13 chars) - "Como chegar aos pontos seguros" (30 chars)
- "Kit Emergência" (14 chars) - "O que levar numa evacuação" (26 chars)
- "Contactos SOS" (13 chars) - "Números essenciais sempre à mão" (32 chars)`;
    }

    getBasicSafeZonesOptions(weatherData) {
        return {
            success: true,
            options: [
                { id: 'centros_evacuacao', title: 'Centros Evacuação', description: 'Locais oficiais de refúgio na área' }, // 16 chars, 35 chars
                { id: 'hospitais_24h', title: 'Hospitais 24h', description: 'Assistência médica sempre disponível' }, // 13 chars, 37 chars
                { id: 'rotas_evacuacao', title: 'Rotas Evacuação', description: 'Caminhos seguros para sair da área' }, // 15 chars, 34 chars
                { id: 'kit_emergencia', title: 'Kit Emergência', description: 'Lista essencial para situações críticas' }, // 14 chars, 39 chars
                { id: 'contactos_sos', title: 'Contactos SOS', description: 'Números de emergência importantes' } // 13 chars, 33 chars
            ],
            method: 'fallback'
        };
    }

    generateBasicSafeZonesInformation(weatherData) {
        const city = weatherData.city;
        const temp = parseInt(weatherData.temperature);
        const condition = weatherData.description;

        return {
            success: true,
            message: `🛡️ **Zonas Seguras em ${city}**

🌦️ **Condições atuais:** ${temp}°C, ${condition}

✅ **Locais seguros para refúgio:**
• Hospitais e centros de saúde
• Escolas em zonas altas e seguras
• Edifícios públicos sólidos
• Centros comunitários
• Igrejas em locais elevados

📱 **Contactos de emergência:**
• INGC (Gestão de Calamidades): 119
• Bombeiros: 198
• Polícia: 119

💡 **Dica:** Mantenha sempre um kit de emergência preparado e conheça as rotas de evacuação da sua área!`,
            method: 'fallback'
        };
    }

    // ===============================================
    // FUNÇÕES ESPECÍFICAS PARA TIPOS DE ZONAS SEGURAS
    // ===============================================

    async generateEvacuationCentersInfo(weatherData, userContext = {}) {
        try {
            if (!this.token) {
                return this.generateBasicEvacuationCentersInfo(weatherData);
            }

            const prompt = this.buildEvacuationCentersPrompt(weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.7);

            return {
                success: true,
                message: response.trim(),
                method: 'ai_powered'
            };

        } catch (error) {
            console.error('❌ Erro AI evacuation centers:', error.message);
            return this.generateBasicEvacuationCentersInfo(weatherData);
        }
    }

    buildEvacuationCentersPrompt(weatherData, userContext) {
        const city = weatherData.city.toLowerCase();
        const condition = weatherData.description;

        return `O utilizador quer informações específicas sobre centros de evacuação oficiais em ${city}. Com condições ${condition}, dar informação prática e tranquilizadora.

FOCAR EM:
- Locais oficiais designados pelo INGC
- Endereços específicos quando possível
- Capacidade e facilidades disponíveis
- Como chegar aos centros
- O que levar/esperar

${city === 'beira' ? `Para BEIRA, incluir centros conhecidos como:
- Centro Comunitário da Manga
- Escola Secundária Samora Machel
- Estádio do Ferroviário
- Centro de Saúde do Macúti` : 'Para outras cidades, focar em tipos de locais padrão'}

Responder de forma natural e reconfortante, máximo 400 palavras:`;
    }

    async generateEmergencyHospitalsInfo(weatherData, userContext = {}) {
        try {
            if (!this.token) {
                return this.generateBasicEmergencyHospitalsInfo(weatherData);
            }

            const prompt = this.buildEmergencyHospitalsPrompt(weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.7);

            return {
                success: true,
                message: response.trim(),
                method: 'ai_powered'
            };

        } catch (error) {
            console.error('❌ Erro AI emergency hospitals:', error.message);
            return this.generateBasicEmergencyHospitalsInfo(weatherData);
        }
    }

    buildEmergencyHospitalsPrompt(weatherData, userContext) {
        const city = weatherData.city.toLowerCase();
        const condition = weatherData.description;

        return `O utilizador quer informações sobre hospitais de emergência 24h em ${city}. Com condições ${condition}, dar informação útil sobre cuidados médicos.

INCLUIR:
- Hospitais principais que funcionam 24h
- Contactos telefónicos
- Especialidades em emergências climáticas
- Centros de saúde alternativos
- Como chegar durante emergências

${city === 'beira' ? `Para BEIRA, incluir:
- Hospital Central da Beira
- Hospital Privado Beira Medical Centre
- Centros de Saúde do Macúti, Manga, Goto` : 'Para outras cidades, incluir hospitais centrais e centros principais'}

Responder de forma tranquilizadora e informativa, máximo 400 palavras:`;
    }

    async generateEvacuationRoutesInfo(weatherData, userContext = {}) {
        try {
            if (!this.token) {
                return this.generateBasicEvacuationRoutesInfo(weatherData);
            }

            const prompt = this.buildEvacuationRoutesPrompt(weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.7);

            return {
                success: true,
                message: response.trim(),
                method: 'ai_powered'
            };

        } catch (error) {
            console.error('❌ Erro AI evacuation routes:', error.message);
            return this.generateBasicEvacuationRoutesInfo(weatherData);
        }
    }

    buildEvacuationRoutesPrompt(weatherData, userContext) {
        const city = weatherData.city.toLowerCase();
        const condition = weatherData.description;

        return `O utilizador quer informações sobre rotas de evacuação seguras em ${city}. Com condições ${condition}, dar orientações práticas de deslocação.

INCLUIR:
- Estradas principais pavimentadas
- Rotas que evitam zonas baixas
- Pontos de encontro familiares
- Alternativas se estradas bloqueadas
- Transportes durante emergências

${city === 'beira' ? `Para BEIRA, mencionar:
- EN6 (estrada principal)
- Ponte sobre rio Púngoè
- Rotas para zonas altas como Manga, Goto
- Evitar Macúti durante marés altas` : 'Para outras cidades, focar em estradas principais e zonas elevadas'}

Dar conselhos práticos como moçambicano experiente, máximo 400 palavras:`;
    }

    generateBasicEvacuationCentersInfo(weatherData) {
        const city = weatherData.city;
        return {
            success: true,
            message: `🏛️ **Centros de Evacuação em ${city}**

✅ **Locais oficiais de refúgio:**
• Escolas secundárias em zonas altas
• Centros comunitários principais
• Edifícios públicos sólidos
• Igrejas em locais elevados
• Estádios municipais

📍 **Como proceder:**
• Siga instruções das autoridades
• Leve kit de emergência básico
• Mantenha-se em grupo
• Registe presença no local

📞 **Contacto INGC: 119**

💡 **Dica:** Conheça previamente os centros mais próximos da sua área!`,
            method: 'fallback'
        };
    }

    generateBasicEmergencyHospitalsInfo(weatherData) {
        const city = weatherData.city;
        return {
            success: true,
            message: `🏥 **Hospitais de Emergência em ${city}**

🚨 **Sempre disponíveis 24h:**
• Hospital Central/Provincial
• Centros de Saúde principais
• Clínicas privadas com urgência

📞 **Emergência Médica: 119**

⚡ **Durante emergências climáticas:**
• Hospitais mantêm geradores
• Equipas de resgate médico ativas
• Primeiros socorros básicos

💡 **Leve sempre:** BI, cartão de saúde, medicamentos pessoais`,
            method: 'fallback'
        };
    }

    generateBasicEvacuationRoutesInfo(weatherData) {
        const city = weatherData.city;
        return {
            success: true,
            message: `🛣️ **Rotas de Evacuação em ${city}**

✅ **Regras básicas:**
• Use estradas principais pavimentadas
• Evite zonas baixas e próximas a rios
• Dirija-se para terrenos elevados
• Mantenha-se em grupo

⚠️ **Durante emergências:**
• Siga instruções das autoridades
• Tenha rotas alternativas
• Combustível sempre acima de meio tanque
• Mapas físicos como backup

📞 **Emergência: 119**`,
            method: 'fallback'
        };
    }

    // ===============================================
    // ANÁLISE DE ALERTAS METEOROLÓGICOS DE PERIGO
    // ===============================================

    async generateWeatherAlertsAnalysis(weatherData, userContext = {}) {
        try {
            if (!this.token) {
                return this.generateBasicWeatherAlertsAnalysis(weatherData);
            }

            const prompt = this.buildWeatherAlertsPrompt(weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.7);

            // Tentar fazer parse como JSON estruturado
            try {
                const alertsData = JSON.parse(response);
                return {
                    success: true,
                    message: alertsData.message || response.trim(),
                    hasActiveAlerts: alertsData.hasActiveAlerts || false,
                    alertLevel: alertsData.alertLevel || 'none',
                    alertTypes: alertsData.alertTypes || [],
                    method: 'ai_powered'
                };
            } catch (parseError) {
                // Se não for JSON, usar como mensagem simples
                return {
                    success: true,
                    message: response.trim(),
                    hasActiveAlerts: this.detectAlertsInText(response, weatherData),
                    alertLevel: this.calculateAlertLevel(weatherData),
                    method: 'ai_powered_text'
                };
            }

        } catch (error) {
            console.error('❌ Erro AI weather alerts:', error.message);
            return this.generateBasicWeatherAlertsAnalysis(weatherData);
        }
    }

    buildWeatherAlertsPrompt(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city.toLowerCase();
        const condition = weatherData.description;
        const humidity = weatherData.humidity || 'N/A';
        const windSpeed = weatherData.windSpeed || 'N/A';

        return `Analisar condições meteorológicas atuais em ${city} para detectar alertas de perigo.

DADOS METEOROLÓGICOS ATUAIS:
• Temperatura: ${temp}°C
• Condição: ${condition}
• Humidade: ${humidity}%
• Vento: ${windSpeed} km/h

ANÁLISE DE PERIGOS:

🌡️ TEMPERATURA:
- Acima de 35°C: Alerta de calor extremo
- Abaixo de 15°C: Alerta de frio extremo
- Entre 32-35°C: Atenção calor intenso
- Entre 15-18°C: Atenção frio moderado

🌧️ CONDIÇÕES CLIMÁTICAS:
- Chuva intensa/tempestade: Alerta inundação
- Vento forte: Alerta estrutural
- Névoa densa: Alerta visibilidade
- Seca prolongada: Alerta incêndio

💧 HUMIDADE:
- Acima de 85%: Desconforto térmico
- Abaixo de 30%: Alerta ressecamento

RESPONDER EM JSON:
{
  "message": "Análise completa em português moçambicano natural (max 400 palavras)",
  "hasActiveAlerts": true/false,
  "alertLevel": "none/low/medium/high/critical",
  "alertTypes": ["tipo1", "tipo2"],
  "recommendations": ["ação1", "ação2"]
}

Dar avaliação honest e tranquilizadora como especialista moçambicano em meteorologia.`;
    }

    detectAlertsInText(text, weatherData) {
        const alertKeywords = ['alerta', 'perigo', 'cuidado', 'atenção', 'evite', 'risco'];
        const lowerText = text.toLowerCase();
        return alertKeywords.some(keyword => lowerText.includes(keyword));
    }

    calculateAlertLevel(weatherData) {
        const temp = parseInt(weatherData.temperature);
        const condition = weatherData.description.toLowerCase();

        if (temp >= 35 || temp <= 15) return 'high';
        if (condition.includes('tempestade') || condition.includes('ciclone')) return 'critical';
        if (temp >= 32 || temp <= 18) return 'medium';
        if (condition.includes('chuva forte') || condition.includes('vento')) return 'medium';
        if (temp >= 30 || temp <= 20) return 'low';

        return 'none';
    }

    async generateAlertActionOptions(weatherData, alertsAnalysis, userContext = {}) {
        try {
            if (!this.token) {
                return this.getBasicAlertActionOptions(weatherData, alertsAnalysis);
            }

            const prompt = this.buildAlertActionOptionsPrompt(weatherData, alertsAnalysis, userContext);
            const response = await this.callOpenAI(prompt, 0.8);

            try {
                const options = JSON.parse(response);
                return {
                    success: true,
                    options: options,
                    method: 'ai_powered'
                };
            } catch (parseError) {
                console.error('❌ Parse error alert options:', parseError.message);
                return this.getBasicAlertActionOptions(weatherData, alertsAnalysis);
            }

        } catch (error) {
            console.error('❌ Erro AI alert options:', error.message);
            return this.getBasicAlertActionOptions(weatherData, alertsAnalysis);
        }
    }

    buildAlertActionOptionsPrompt(weatherData, alertsAnalysis, userContext) {
        const temp = parseInt(weatherData.temperature);
        const condition = weatherData.description;
        const alertLevel = alertsAnalysis.alertLevel;

        return `Gerar opções de ação para alertas meteorológicos com nível ${alertLevel}.

CONDIÇÕES: ${temp}°C, ${condition}
ALERTAS ATIVOS: ${alertsAnalysis.hasActiveAlerts ? 'SIM' : 'NÃO'}

Criar exactamente 5 opções específicas para a situação.

LIMITES OBRIGATÓRIOS:
- title: máximo 24 caracteres
- description: máximo 72 caracteres
- id: sem espaços, usar underscore

Responde só JSON:
[
  {
    "id": "identificador_unico",
    "title": "Título (max 24)",
    "description": "Descrição (max 72)"
  }
]

Focar em ações práticas baseadas no tipo de alerta detectado.`;
    }

    getBasicAlertActionOptions(weatherData, alertsAnalysis) {
        const temp = parseInt(weatherData.temperature);
        const alertLevel = alertsAnalysis.alertLevel;

        if (alertLevel === 'high' || alertLevel === 'critical') {
            return {
                success: true,
                options: [
                    { id: 'medidas_urgentes', title: 'Medidas Urgentes', description: 'Ações imediatas para se proteger' },
                    { id: 'locais_seguros', title: 'Locais Seguros', description: 'Onde se refugiar agora' },
                    { id: 'contactos_sos', title: 'Contactos SOS', description: 'Números de emergência' },
                    { id: 'kit_sobrevivencia', title: 'Kit Sobrevivência', description: 'Itens essenciais' },
                    { id: 'monitorar_situacao', title: 'Monitorar Situação', description: 'Como acompanhar evolução' }
                ],
                method: 'fallback'
            };
        } else {
            return {
                success: true,
                options: [
                    { id: 'precaucoes_basicas', title: 'Precauções Básicas', description: 'Cuidados preventivos' },
                    { id: 'monitoramento', title: 'Monitoramento', description: 'Acompanhar condições' },
                    { id: 'preparacao', title: 'Preparação', description: 'Como se preparar' },
                    { id: 'dicas_conforto', title: 'Dicas Conforto', description: 'Manter-se confortável' },
                    { id: 'proximos_dias', title: 'Próximos Dias', description: 'Previsão e tendências' }
                ],
                method: 'fallback'
            };
        }
    }

    generateBasicWeatherAlertsAnalysis(weatherData) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city;
        const condition = weatherData.description;
        const humidity = weatherData.humidity || 'N/A';

        let alertLevel = 'none';
        let alertTypes = [];
        let message = `🚨 **ANÁLISE DE ALERTAS - ${city}**\n\n`;

        message += `🌡️ **Condições Atuais:**\n`;
        message += `• Temperatura: ${temp}°C\n`;
        message += `• Estado: ${condition}\n`;
        message += `• Humidade: ${humidity}%\n\n`;

        // Análise de temperatura
        if (temp >= 35) {
            alertLevel = 'high';
            alertTypes.push('calor_extremo');
            message += `🔥 **ALERTA CALOR EXTREMO**\n`;
            message += `• Temperatura perigosa (${temp}°C)\n`;
            message += `• Risco de desidratação e insolação\n`;
            message += `• Evite exposição solar 10h-16h\n`;
            message += `• Beba água constantemente\n\n`;
        } else if (temp >= 32) {
            alertLevel = 'medium';
            alertTypes.push('calor_intenso');
            message += `🌡️ **ATENÇÃO CALOR INTENSO**\n`;
            message += `• Temperatura elevada (${temp}°C)\n`;
            message += `• Mantenha-se hidratado\n`;
            message += `• Procure sombra e locais frescos\n\n`;
        } else if (temp <= 15) {
            alertLevel = 'high';
            alertTypes.push('frio_extremo');
            message += `🧊 **ALERTA FRIO EXTREMO**\n`;
            message += `• Temperatura muito baixa (${temp}°C)\n`;
            message += `• Risco de hipotermia\n`;
            message += `• Vista roupas quentes em camadas\n`;
            message += `• Mantenha-se aquecido e seco\n\n`;
        } else if (temp <= 18) {
            alertLevel = 'medium';
            alertTypes.push('frio_moderado');
            message += `❄️ **ATENÇÃO FRIO MODERADO**\n`;
            message += `• Temperatura baixa (${temp}°C)\n`;
            message += `• Vista roupas adequadas\n`;
            message += `• Cuidado com crianças e idosos\n\n`;
        }

        // Análise de condições climáticas
        if (condition.toLowerCase().includes('tempestade')) {
            alertLevel = 'critical';
            alertTypes.push('tempestade');
            message += `⛈️ **ALERTA CRÍTICO - TEMPESTADE**\n`;
            message += `• Condições meteorológicas perigosas\n`;
            message += `• Evite sair de casa\n`;
            message += `• Mantenha-se longe de janelas\n`;
            message += `• Desligue aparelhos elétricos\n\n`;
        } else if (condition.toLowerCase().includes('chuva')) {
            if (alertLevel === 'none') alertLevel = 'medium';
            alertTypes.push('chuva');
            message += `🌧️ **ATENÇÃO CHUVA**\n`;
            message += `• Cuidado com alagamentos\n`;
            message += `• Evite zonas baixas\n`;
            message += `• Dirija com cuidado\n\n`;
        }

        if (alertLevel === 'none') {
            message += `✅ **CONDIÇÕES ESTÁVEIS**\n`;
            message += `• Não há alertas meteorológicos ativos\n`;
            message += `• Condições normais para atividades\n`;
            message += `• Mantenha-se atento a mudanças\n\n`;
        }

        message += `📱 **Emergências:** 119 (INGC)\n`;
        message += `💡 **Dica:** Acompanhe regularmente as condições meteorológicas!`;

        return {
            success: true,
            message: message,
            hasActiveAlerts: alertLevel !== 'none',
            alertLevel: alertLevel,
            alertTypes: alertTypes,
            method: 'fallback'
        };
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

        return ` preciso dar 3 sugestões fixes para alguém que está em ${city}.

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
1. Usa português moçambicano casual (" ", "fixes", "eish", "meu", etc.)
2. Seja muito natural e conversacional - como se fosses um amigo
3. NÃO uses listas rígidas com bullets (•)
4. NÃO faças formatação muito estruturada
5. Fala como se estivesses numa conversa casual
6. Máximo 200 palavras
7. Inclui emojis naturalmente no texto
8. Seja específico sobre o tempo actual
9. Como Joana Bot, mostra conhecimento especializado em meteorologia moçambicana

EXEMPLOS DE RESPOSTAS NATURAIS:
- Em vez de "• Roupa leve" → " com este calor veste roupa bem leve"
- Em vez de "• Protetor solar" → "e não te esqueças do protetor solar que o sol está bravo"
- Em vez de listas → Frases corridas e naturais

${this.getTipsGuidanceByIntent(analysis.intent, temp, condition)}

FORMATO:
Começa com algo como "💡  ..." e depois dá as dicas de forma muito natural, como numa conversa entre amigos experientes.

Minha resposta natural:`;
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
1. Usa português moçambicano natural (" ", "fixes", "eish", "meu", etc.)
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
- Em vez de "1. Que roupa usar" → " com este tempo podes pensar na roupa que vais vestir"
- Em vez de "2. Atividades" → "e também que tal pensar no que fazer hoje"
- Em vez de listas → Texto corrido e natural

${this.getSuggestionsGuidanceByTemperature(temp, condition)}

FORMATO:
Começa diretamente com as sugestões de forma muito natural e conversacional, como se fosses um amigo experiente dando dicas úteis. Termina perguntando algo como "Sobre o que gostarias de saber mais?"

Minha resposta conversacional:`;
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
8. Responde diretamente sem apresentações desnecessárias
9. Soa como alguém experiente dando conselhos úteis

ASPECTOS DE SEGURANÇA A ABORDAR BASEADO NO CLIMA:
${this.getSafetyGuidanceByTemperature(temp, isRaining, humidity)}

FORMATO:
Começa diretamente com os conselhos de segurança de forma conversacional e educativa. Explica os riscos e prevenções naturalmente, como se fosses um especialista dando dicas importantes.

Meus conselhos de segurança:`;
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

        let advice = `⚠️  deixa eu te dar uns conselhos importantes sobre o tempo em ${city}! `;

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
        let intent = 'general_help'; // Default
        let confidence = 0.4;
        let entities = {
            cities: [],
            timeframe: 'none',
            weather_aspect: 'general',
            activity_type: 'none'
        };

        // Detectar cidades
        const cities = ['maputo', 'beira', 'nampula', 'quelimane', 'tete', 'chimoio', 'pemba', 'xai-xai', 'lichinga', 'inhambane'];
        const hasCities = cities.some(city => lowerMessage.includes(city));

        if (hasCities) {
            entities.cities = cities.filter(city => lowerMessage.includes(city));
        }

        // Palavras que indicam consulta meteorológica
        const weatherKeywords = ['tempo', 'clima', 'temperatura', 'calor', 'frio', 'chuva', 'sol', 'vento', 'humidade', 'graus'];
        const hasWeatherKeywords = weatherKeywords.some(word => lowerMessage.includes(word));

        // CORREÇÃO CRÍTICA: Priorizar detecção de clima
        if (hasWeatherKeywords || lowerMessage === 'clima hoje' || lowerMessage === 'tempo hoje') {
            intent = 'weather_query_current';
            confidence = 0.9; // Alta confiança
            entities.weather_aspect = 'general';

            if (lowerMessage.includes('hoje')) {
                entities.timeframe = 'today';
            }

            console.log('✅ Detectado como consulta meteorológica pela análise de regras');
        }
        // Detectar outras intenções específicas
        else if (lowerMessage.includes('muito bom') || lowerMessage.includes('muito boa') || lowerMessage.includes('perfeito') ||
            lowerMessage.includes('excelente') || lowerMessage.includes('óptimo') || lowerMessage.includes('ótimo')) {
            intent = 'positive_feedback';
            confidence = 0.95;
        } else if (lowerMessage.includes('obrigad') || lowerMessage.includes('valeu') || lowerMessage.includes('thanks')) {
            intent = 'thanks';
            confidence = 0.95;
        } else if (lowerMessage.includes('olá') || lowerMessage.includes('oi') || lowerMessage.includes('bom dia') ||
            lowerMessage.includes('boa tarde') || lowerMessage.includes('boa noite')) {
            intent = 'greeting';
            confidence = 0.9;
        } else if (lowerMessage.includes('ajuda') || lowerMessage.includes('help') || lowerMessage.includes('comandos')) {
            intent = 'general_help';
            confidence = 0.9;
        } else if (lowerMessage.includes('atividade') || lowerMessage.includes('fazer') || lowerMessage.includes('onde ir')) {
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
        } else if (hasCities && lowerMessage.length > 3) {
            // SÓ classificar como weather se tiver palavras-chave de clima OU cidade + contexto
            intent = 'weather_query_current';
            confidence = 0.7;
        }

        return {
            success: true,
            analysis: {
                intent: intent,
                confidence: confidence,
                entities: entities,
                reasoning: `Análise baseada em regras - detectou "${intent}" com confiança ${confidence}`,
                response_type: 'informative',
                priority: hasWeatherKeywords ? 'high' : 'medium',
                requires_weather_data: intent.includes('weather') || intent.includes('activity') || intent.includes('clothing') || intent === 'safety_zones',
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

        let content = response.data.choices[0].message.content;

        // ====== NOVA LIMPEZA PARA FIXING JSON PARSING ======
        // Remove markdown code blocks se existirem
        content = content.replace(/```json\s*/, '').replace(/```\s*$/, '');
        content = content.replace(/```\s*/, ''); // Remove ``` soltos
        content = content.trim();

        return content;
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

    // ===============================================
    // GERAÇÃO DE OPÇÕES DE CONSELHOS COM AI
    // ===============================================

    async generateAdviceOptions(weatherData, adviceContext = {}) {
        try {
            console.log('🤖 Gerando opções de conselhos com AI baseadas no contexto');

            if (!this.token) {
                return this.generateBasicAdviceOptions(weatherData, adviceContext);
            }

            const prompt = this.buildAdviceOptionsPrompt(weatherData, adviceContext);
            const response = await this.callOpenAI(prompt, 0.7);

            // Parse da resposta JSON
            const options = JSON.parse(response);

            return {
                success: true,
                options: options.options || [],
                method: 'ai_powered'
            };

        } catch (error) {
            console.error('❌ Erro ao gerar opções de conselhos:', error.message);
            return {
                success: true,
                options: this.generateBasicAdviceOptions(weatherData, adviceContext),
                method: 'fallback'
            };
        }
    }

    buildAdviceOptionsPrompt(weatherData, adviceContext) {
        const temp = parseInt(weatherData.temperature);
        const city = weatherData.city;
        const condition = weatherData.description;
        const { lastAdviceType, userExpertise } = adviceContext;

        return `${this.getBotIdentityContext()}

SITUAÇÃO ATUAL:
- Cidade: ${city}
- Temperatura: ${temp}°C
- Condição: ${condition}
- Último conselho dado: ${lastAdviceType || 'primeiro conselho'}
- Nível do usuário: ${userExpertise || 'básico'}

INSTRUÇÕES PARA GERAR OPÇÕES DE CONSELHOS:
Cria 5-8 opções de conselhos relacionados ao clima que o usuário poderia querer saber mais. Cada opção deve ter:
- id: identificador único (sem espaços, use _)
- title: título curto (máximo 24 caracteres)
- description: descrição útil (máximo 72 caracteres)

CONTEXTO BASEADO NA TEMPERATURA:
${this.getAdviceOptionsGuidanceByTemperature(temp, condition)}

TIPOS DE CONSELHOS ÚTEIS:
- Saúde e bem-estar relacionados ao clima
- Atividades específicas para o tempo atual  
- Cuidados com roupas e equipamentos
- Preparação para mudanças climáticas
- Dicas de segurança
- Conselhos para diferentes momentos do dia
- Recomendações para casa/trabalho
- Dicas para crianças/idosos

FORMATO DE RESPOSTA (JSON):
{
    "options": [
        {
            "id": "exemplo_conselho",
            "title": "🌡️ Título Curto",
            "description": "Descrição útil e específica para o contexto atual"
        }
    ]
}

REGRAS IMPORTANTES:
- Máximo 8 opções
- Títulos com emojis relevantes
- Específico para ${temp}°C em ${city}
- Português moçambicano natural
- Evitar repetir o tipo de conselho já dado
- Opções práticas e acionáveis

Minha resposta JSON:`;
    }

    getAdviceOptionsGuidanceByTemperature(temperature, condition) {
        const isRaining = condition.toLowerCase().includes('chuva');

        if (isRaining) {
            return `ESTÁ CHUVA: Foca em conselhos sobre proteção contra chuva, atividades internas, prevenção de doenças, cuidados com equipamentos eletrônicos.`;
        } else if (temperature > 32) {
            return `MUITO QUENTE: Foca em hidratação, proteção solar, resfriamento, prevenção de insolação, roupas adequadas, horários seguros.`;
        } else if (temperature > 25) {
            return `TEMPERATURA AGRADÁVEL: Foca em atividades ao ar livre, exercícios, passeios, cuidados gerais, aproveitamento do bom tempo.`;
        } else if (temperature > 18) {
            return `FRESCO: Foca em roupas em camadas, atividades indoor/outdoor, cuidados com mudanças de temperatura, conforto térmico.`;
        } else {
            return `FRIO: Foca em aquecimento, roupas quentes, prevenção de resfriados, cuidados com idosos/crianças, segurança.`;
        }
    }

    generateBasicAdviceOptions(weatherData, adviceContext) {
        const temp = parseInt(weatherData.temperature);
        const options = [
            {
                id: "cuidados_saude",
                title: "🏥 Cuidados de Saúde",
                description: `Como manter a saúde com ${temp}°C`
            },
            {
                id: "atividades_recomendadas",
                title: "🎯 Atividades Ideais",
                description: `O que fazer com este tempo`
            },
            {
                id: "preparacao_mudancas",
                title: "🌤️ Mudanças do Tempo",
                description: "Como se preparar para mudanças"
            },
            {
                id: "dicas_seguranca",
                title: "⚠️ Dicas de Segurança",
                description: "Cuidados importantes para hoje"
            },
            {
                id: "conselhos_casa",
                title: "🏠 Dicas para Casa",
                description: "Conselhos para o ambiente doméstico"
            }
        ];

        // Adicionar opções específicas baseadas na temperatura
        if (temp > 30) {
            options.push({
                id: "combater_calor",
                title: "🌞 Combater o Calor",
                description: "Técnicas avançadas de resfriamento"
            });
        } else if (temp < 20) {
            options.push({
                id: "manter_aquecido",
                title: "🧥 Manter-se Aquecido",
                description: "Estratégias para dias frios"
            });
        }

        return options;
    }

    clearAllCaches() {
        this.analysisCache.clear();
        this.suggestionsHandler.clearCache();
        console.log('✅ Todos os caches AI limpos');
    }
}

module.exports = OPENAI;
