require('dotenv').config();
const axios = require('axios');
const AIBasedSuggestionsHandler = require('./suggestions_handler_ai');

class OPENAI {
    constructor() {
        this.token = process.env.OPENAI_API_KEY;
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
            console.log('🤖 OpenAI Service 100% AI-powered inicializado');
        }
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
        return `
SISTEMA: Assistente meteorológico AI para Moçambique

MENSAGEM USUÁRIO: "${message}"

CONTEXTO:
- Consultas anteriores: ${context.queryCount || 0}
- Última cidade: ${context.lastCity || 'primeira consulta'}
- Dados meteorológicos: ${context.hasWeatherData ? 'disponíveis' : 'não disponíveis'}
- Localização: ${context.currentLocation || 'não especificada'}

TAREFA: Determinar a intenção e categoria da mensagem

CATEGORIAS DISPONÍVEIS:
1. **weather_query_current** - Consulta tempo atual em uma cidade
2. **weather_query_forecast** - Previsão meteorológica
3. **activity_recommendation** - Recomendações de atividades
4. **clothing_advice** - Conselhos sobre vestuário
5. **weather_tips** - Dicas meteorológicas (calor/frio/chuva)
6. **city_comparison** - Comparar tempo entre cidades
7. **general_help** - Pedidos de ajuda ou comandos
8. **greeting** - Cumprimentos e conversação
9. **suggestion_response** - Resposta a uma sugestão anterior
10. **weather_education** - Perguntas educativas sobre meteorologia

EXEMPLOS MOÇAMBICANOS:
- "Maputo" → weather_query_current
- "Como está o tempo em Beira" → weather_query_current
- "Tempo amanhã" → weather_query_forecast
- "Há alguma atividade" → activity_recommendation
- "O que fazer hoje" → activity_recommendation
- "Que roupa usar" → clothing_advice
- "Dicas para calor" → weather_tips
- "Ajuda" → general_help
- "Olá" → greeting

ANÁLISE:
Considere linguagem moçambicana, gírias locais, e seja preciso na categorização.

RESPONDA APENAS JSON:
{
    "intent": "categoria_principal",
    "confidence": 0.95,
    "entities": {
        "cities": ["cidade1", "cidade2"],
        "timeframe": "today|tomorrow|week|none",
        "weather_aspect": "temperature|rain|humidity|general",
        "activity_type": "outdoor|indoor|general|none"
    },
    "reasoning": "explicação_clara",
    "response_type": "informative|interactive|suggestive",
    "priority": "high|medium|low",
    "requires_weather_data": true,
    "suggested_followup": "tipo_de_seguimento"
}`;
    }

    // ===============================================
    // PROCESSAMENTO DE SUGESTÕES (100% AI)
    // ===============================================

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

        return `
Gere sugestões inteligentes para usuário moçambicano:

CONTEXTO ATUAL:
- Localização: ${city}
- Temperatura: ${temp}°C
- Condições: ${weatherData?.description || 'normais'}
- Humidade: ${weatherData?.humidity || 60}%
- Consultas usuário: ${context.queryCount || 0}
- Última consulta: ${context.lastQuery || 'primeira interação'}

REGRAS:
- 3 sugestões relevantes
- Máximo 18 caracteres cada
- Linguagem moçambicana casual
- Baseadas no contexto atual
- Úteis e práticas

TIPOS DISPONÍVEIS:
- Atividades: "O que fazer", "Onde ir", "Atividades hoje"
- Vestuário: "Que roupa", "Como vestir", "Roupas frescas"
- Previsões: "Tempo amanhã", "Vai chover", "Próxima semana"
- Dicas: "Dicas calor", "Dicas frio", "Dicas chuva"
- Comparações: "Outras cidades", "Ontem vs hoje"
- Ajuda: "Mais info", "Comandos", "Ajuda"

CONTEXTO ESPECÍFICO:
${this.getContextSpecificGuidance(temp, weatherData?.description, context)}

Retorne APENAS array JSON:
["sugestão1", "sugestão2", "sugestão3"]`;
    }

    getContextSpecificGuidance(temperature, conditions, context) {
        if (temperature > 30) {
            return "Foco em calor: refrescamento, proteção solar, atividades sombra";
        } else if (temperature < 18) {
            return "Foco em frio: aquecimento, roupas quentes, atividades internas";
        } else if (conditions?.includes('chuva') || conditions?.includes('rain')) {
            return "Foco em chuva: proteção, atividades cobertas, quando para";
        } else {
            return "Tempo agradável: atividades versáteis, exploração, conforto";
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

    clearAllCaches() {
        this.analysisCache.clear();
        this.suggestionsHandler.clearCache();
        console.log('✅ Todos os caches AI limpos');
    }
}

module.exports = OPENAI;
