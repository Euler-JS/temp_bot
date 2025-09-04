require('dotenv').config();
const axios = require('axios');

class AIBasedSuggestionsHandler {
    constructor(openaiToken) {
        this.token = openaiToken;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = 'gpt-4o-mini';
        this.maxTokens = 300;

        // Cache para sugestões frequentes
        this.suggestionsCache = new Map();
        this.cacheExpiry = 3600000; // 1 hora em milliseconds

        // Sugestões contextuais dinâmicas baseadas apenas em AI
        this.fallbackSuggestions = {
            general: ["O que fazer", "Que roupa", "Tempo amanhã"],
            hot: ["Como refrescar", "Proteção solar", "Atividades sombra"],
            cold: ["Como aquecer", "Roupas quentes", "Atividades indoor"],
            rain: ["Vai parar?", "Que fazer casa", "Preciso guarda-chuva"]
        };

        if (!openaiToken) {
            console.warn('⚠️ Token OpenAI não fornecido - funcionalidade limitada');
        }

        console.log('🤖 AIBasedSuggestionsHandler inicializado - 100% AI powered');
    }

    // ===============================================
    // PROCESSAMENTO PRINCIPAL COM AI
    // ===============================================

    async processSuggestionResponse(suggestionText, weatherData, userContext = {}) {
        try {
            console.log(`🧠 Processando com AI: "${suggestionText}"`);

            // Sanitizar dados
            weatherData = this.sanitizeWeatherData(weatherData);
            userContext = this.sanitizeUserContext(userContext);

            // 1. Análise AI da intenção
            const aiAnalysis = await this.analyzeSuggestionWithAI(suggestionText, weatherData, userContext);

            if (aiAnalysis.success) {
                console.log(`✅ AI Analysis:`, aiAnalysis.analysis);

                // 2. Resposta gerada pela AI
                const response = await this.generateAIResponse(
                    aiAnalysis.analysis,
                    suggestionText,
                    weatherData,
                    userContext
                );

                // 3. Sugestões follow-up com AI
                const newSuggestions = await this.generateAIFollowUpSuggestions(
                    aiAnalysis.analysis,
                    weatherData,
                    userContext
                );

                return {
                    success: true,
                    response: response,
                    suggestions: newSuggestions,
                    suggestionType: aiAnalysis.analysis.suggestionType,
                    originalSuggestion: suggestionText,
                    aiPowered: true,
                    confidence: aiAnalysis.analysis.confidence
                };
            } else {
                console.log(`🔄 Fallback para processamento baseado em regras`);
                return await this.intelligentFallback(suggestionText, weatherData, userContext);
            }

        } catch (error) {
            console.error('❌ Erro no processamento:', error.message);
            return this.createEmergencyFallback(suggestionText, weatherData);
        }
    }

    // ===============================================
    // ANÁLISE AI DA INTENÇÃO
    // ===============================================

    async analyzeSuggestionWithAI(suggestionText, weatherData, userContext) {
        try {
            if (!this.token) {
                return { success: false, reason: 'no_token' };
            }

            const prompt = this.buildAnalysisPrompt(suggestionText, weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.3);

            try {
                const analysis = JSON.parse(response);
                return {
                    success: true,
                    analysis: analysis,
                    rawResponse: response
                };
            } catch (parseError) {
                console.error('❌ Parse error:', parseError.message);
                return { success: false, reason: 'parse_error', rawResponse: response };
            }

        } catch (error) {
            console.error('❌ AI analysis error:', error.message);
            return { success: false, reason: 'ai_error', error: error.message };
        }
    }

    buildAnalysisPrompt(suggestionText, weatherData, userContext) {
        const temp = weatherData.temperature || weatherData.maxTemp || 25;
        const city = weatherData.city || userContext.preferredCity || 'localização atual';

        return `
SISTEMA: Assistente meteorológico AI para Moçambique

TAREFA: Analisar esta resposta/clique do usuário: "${suggestionText}"

CONTEXTO METEOROLÓGICO:
- Localização: ${city}
- Temperatura: ${temp}°C
- Condições: ${weatherData.description || 'não especificado'}
- Humidade: ${weatherData.humidity || 'N/A'}%
- É previsão: ${weatherData.isForecast ? 'Sim' : 'Não'}

CONTEXTO USUÁRIO:
- Experiência: ${userContext.queryCount || 0} consultas anteriores
- Preferências: ${userContext.expertiseLevel || 'iniciante'}
- Última cidade: ${userContext.lastCity || 'primeira consulta'}

CATEGORIAS DISPONÍVEIS:
1. **activities** - Quer saber sobre atividades/o que fazer
2. **clothing** - Conselhos sobre vestuário
3. **weather_tips_hot** - Dicas para clima quente (>28°C)
4. **weather_tips_cold** - Dicas para clima frio (<18°C)
5. **weather_tips_rain** - Dicas para chuva
6. **forecast_tomorrow** - Previsão para amanhã
7. **forecast_extended** - Previsão longo prazo
8. **rain_forecast** - Específico sobre chuva
9. **city_comparison** - Comparar localidades
10. **help** - Precisa de ajuda/comandos
11. **general_weather** - Consulta geral

EXEMPLOS MOÇAMBICANOS:
- "Há alguma atividade" → activities
- "Atividades hoje" → activities  
- "O que fazer" → activities
- "Que roupa usar" → clothing
- "Como me vestir" → clothing
- "Dicas calor" → weather_tips_hot
- "Como refrescar" → weather_tips_hot
- "Dicas frio" → weather_tips_cold
- "Tempo amanhã" → forecast_tomorrow
- "Vai chover" → rain_forecast
- "Ajuda" → help

ANÁLISE:
Considere o contexto atual, linguagem moçambicana, e seja preciso.

RESPONDA APENAS JSON:
{
    "suggestionType": "categoria_escolhida",
    "confidence": 0.95,
    "reasoning": "explicação_clara",
    "userIntent": "intenção_específica",
    "urgency": "low|medium|high",
    "complexity": "basic|intermediate|advanced",
    "contextFactors": ["fator1", "fator2"],
    "recommendedResponseStyle": "informativo|prático|detalhado"
}`;
    }

    // ===============================================
    // GERAÇÃO DE RESPOSTA COM AI
    // ===============================================

    async generateAIResponse(analysis, originalText, weatherData, userContext) {
        try {
            if (!this.token) {
                return this.generateSimpleResponse(analysis.suggestionType, weatherData, userContext);
            }

            const prompt = this.buildResponsePrompt(analysis, originalText, weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.7);

            return response.trim();

        } catch (error) {
            console.error('❌ Erro geração resposta AI:', error.message);
            return this.generateSimpleResponse(analysis.suggestionType, weatherData, userContext);
        }
    }

    buildResponsePrompt(analysis, originalText, weatherData, userContext) {
        const temp = parseInt(weatherData.temperature || weatherData.maxTemp || 25);
        const city = weatherData.city || userContext.preferredCity || 'sua localidade';

        return `
CONTEXTO: Assistente meteorológico para moçambicanos

PEDIDO ORIGINAL: "${originalText}"
INTENÇÃO: ${analysis.suggestionType}
CONFIANÇA: ${analysis.confidence}
RACIOCÍNIO: ${analysis.reasoning}

DADOS METEOROLÓGICOS:
- Local: ${city}
- Temperatura: ${temp}°C
- Condições: ${weatherData.description || 'tempo normal'}
- Humidade: ${weatherData.humidity || 60}%
- Dados: ${weatherData.isForecast ? 'Previsão' : 'Atuais'}

PERFIL USUÁRIO:
- Nível: ${userContext.expertiseLevel || 'iniciante'}
- Consultas: ${userContext.queryCount || 0}
- Estilo preferido: ${analysis.recommendedResponseStyle}

INSTRUÇÕES ESPECÍFICAS:

${this.getResponseInstructions(analysis.suggestionType, temp, weatherData)}

REGRAS GERAIS:
- Use linguagem moçambicana natural
- Seja específico e útil
- Considere condições meteorológicas atuais
- Máximo 250 palavras
- Use emojis apropriados
- Foque em utilidade prática

FORMATO:
- Título com emoji
- Informação principal
- Lista de recomendações práticas
- Dica final útil

Resposta:`;
    }

    getResponseInstructions(suggestionType, temperature, weatherData) {
        const instructions = {
            activities: `
ATIVIDADES: Recomende atividades baseadas em ${temperature}°C:
- >30°C: Atividades refrescantes, locais climatizados, piscinas
- 20-30°C: Atividades ao ar livre, parques, desportos
- <20°C: Atividades internas, museus, cafés
- Chuva: Alternativas cobertas
Inclua locais específicos da região.`,

            clothing: `
VESTUÁRIO: Roupa específica para ${temperature}°C:
- Lista peças exatas
- Cores recomendadas (claras para calor, escuras para frio)
- Acessórios necessários
- Considerações especiais para clima local`,

            weather_tips_hot: `
CALOR: Conselhos práticos para altas temperaturas:
- Hidratação específica e frequente
- Horários a evitar (10h-15h)
- Locais frescos na região
- Proteção solar completa
- Sinais de alerta por calor`,

            weather_tips_cold: `
FRIO: Dicas para se aquecer:
- Sistema de camadas de roupa
- Bebidas e alimentos quentes
- Exercícios para circulação
- Proteção extremidades`,

            weather_tips_rain: `
CHUVA: Preparação e proteção:
- Equipamento impermeável
- Atividades alternativas
- Segurança no trânsito
- Como aproveitar a chuva`,

            forecast_tomorrow: `
PREVISÃO: Informação sobre amanhã:
- Explique que consultará fontes confiáveis
- Dê dicas de preparação
- Sugira verificação matinal`,

            rain_forecast: `
CHUVA: Análise probabilidade:
- Baseie em condições atuais
- Dê percentagens realistas
- Recomende preparação`
        };

        return instructions[suggestionType] || `
RESPOSTA GERAL: Informação meteorológica contextual:
- Use dados atuais
- Seja específico e prático
- Adapte ao contexto local`;
    }

    // ===============================================
    // SUGESTÕES FOLLOW-UP COM AI
    // ===============================================

    async generateAIFollowUpSuggestions(analysis, weatherData, userContext) {
        try {
            if (!this.token) {
                return this.getContextualSuggestions(analysis.suggestionType, weatherData);
            }

            const prompt = this.buildSuggestionsPrompt(analysis, weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.8);

            try {
                return JSON.parse(response);
            } catch (parseError) {
                console.error('❌ Parse error sugestões:', parseError.message);
                return this.getContextualSuggestions(analysis.suggestionType, weatherData);
            }

        } catch (error) {
            console.error('❌ Erro sugestões follow-up:', error.message);
            return this.getContextualSuggestions(analysis.suggestionType, weatherData);
        }
    }

    buildSuggestionsPrompt(analysis, weatherData, userContext) {
        return `
Gere 3 sugestões de follow-up inteligentes:

CONSULTA PROCESSADA: ${analysis.suggestionType}
CONTEXTO: ${weatherData.city}, ${weatherData.temperature}°C, ${weatherData.description}
USUÁRIO: ${userContext.expertiseLevel} (${userContext.queryCount} consultas)

REGRAS:
- Máximo 18 caracteres por sugestão
- Linguagem moçambicana casual
- Relacionadas mas diferentes
- Úteis para contexto atual
- Não repetir consulta anterior

TIPOS DISPONÍVEIS:
- Previsões: "Tempo amanhã", "Próxima semana"
- Dicas: "Dicas calor", "Dicas chuva", "Que roupa"
- Atividades: "O que fazer", "Onde ir"
- Comparações: "Outras cidades", "Ontem vs hoje"
- Ajuda: "Mais info", "Comandos", "Ajuda"

Retorne APENAS array JSON:
["sugestão1", "sugestão2", "sugestão3"]`;
    }

    // ===============================================
    // MÉTODOS DE FALLBACK
    // ===============================================

    async intelligentFallback(suggestionText, weatherData, userContext) {
        console.log('🔄 Fallback inteligente baseado em contexto');

        const basicAnalysis = this.analyzeWithKeywords(suggestionText);
        const response = this.generateSimpleResponse(basicAnalysis.type, weatherData, userContext);
        const suggestions = this.getContextualSuggestions(basicAnalysis.type, weatherData);

        return {
            success: true,
            response: response,
            suggestions: suggestions,
            suggestionType: basicAnalysis.type,
            originalSuggestion: suggestionText,
            aiPowered: false,
            fallbackMethod: 'intelligent_keywords'
        };
    }

    analyzeWithKeywords(text) {
        const lowerText = text.toLowerCase();

        if (lowerText.includes('atividade') || lowerText.includes('fazer') || lowerText.includes('onde')) {
            return { type: 'activities', confidence: 0.8 };
        }
        if (lowerText.includes('roupa') || lowerText.includes('vestir')) {
            return { type: 'clothing', confidence: 0.9 };
        }
        if (lowerText.includes('dicas') && lowerText.includes('calor')) {
            return { type: 'weather_tips_hot', confidence: 0.9 };
        }
        if (lowerText.includes('dicas') && lowerText.includes('frio')) {
            return { type: 'weather_tips_cold', confidence: 0.9 };
        }
        if (lowerText.includes('dicas') && lowerText.includes('chuva')) {
            return { type: 'weather_tips_rain', confidence: 0.9 };
        }
        if (lowerText.includes('amanhã') || lowerText.includes('manhã')) {
            return { type: 'forecast_tomorrow', confidence: 0.8 };
        }
        if (lowerText.includes('chover') || lowerText.includes('chuva')) {
            return { type: 'rain_forecast', confidence: 0.8 };
        }
        if (lowerText.includes('ajuda') || lowerText.includes('help')) {
            return { type: 'help', confidence: 0.9 };
        }

        return { type: 'general_weather', confidence: 0.5 };
    }

    generateSimpleResponse(suggestionType, weatherData, userContext) {
        const temp = parseInt(weatherData.temperature || weatherData.maxTemp || 25);
        const city = weatherData.city || userContext.preferredCity || 'sua região';

        const responses = {
            activities: () => {
                if (temp > 30) {
                    return `🏊‍♀️ **Atividades para ${temp}°C em ${city}**\n\n• Natação ou praia 🏖️\n• Cinemas climatizados 🎬\n• Centros comerciais 🛍️\n• Parques com sombra 🌳\n\n*Evite sol 10h-15h!*`;
                } else if (temp > 20) {
                    return `🚶‍♀️ **Atividades Ideais para ${temp}°C**\n\n• Caminhadas ao ar livre 🚶‍♀️\n• Ciclismo 🚴‍♀️\n• Piqueniques 🧺\n• Desportos ⚽\n\n*Tempo perfeito para sair!*`;
                } else {
                    return `☕ **Atividades para ${temp}°C**\n\n• Cafés aconchegantes ☕\n• Bibliotecas 📚\n• Cinemas 🎭\n• Museus 🖼️\n\n*Vista-se bem!*`;
                }
            },

            clothing: () => {
                if (temp > 30) {
                    return `👕 **Vestuário para ${temp}°C**\n\n• Tecidos leves (algodão) 👕\n• Cores claras ⚪\n• Chapéu 👒\n• Protector solar 🧴\n\n*Mantenha-se fresco!*`;
                } else if (temp > 20) {
                    return `👔 **Roupa Ideal para ${temp}°C**\n\n• Camisa leve 👔\n• Calças frescas 👖\n• Casaco leve à noite 🧥\n\n*Temperatura perfeita!*`;
                } else {
                    return `🧥 **Vestuário para ${temp}°C**\n\n• Casaco ou camisola 🧥\n• Calças compridas 👖\n• Sapatos fechados 👞\n\n*Mantenha-se aquecido!*`;
                }
            },

            weather_tips_hot: () => `🌡️ **Dicas para Calor**\n\n• Beba água constantemente 💧\n• Fique na sombra 🌳\n• Use protector solar ☀️\n• Evite sol 10h-15h 🕐\n\n*Cuidado com sinais de desidratação!*`,

            weather_tips_cold: () => `❄️ **Dicas para Frio**\n\n• Vista camadas 🧥\n• Bebidas quentes ☕\n• Proteja extremidades 🧤\n• Mantenha-se ativo 🏃‍♀️\n\n*Aqueça-se gradualmente!*`,

            weather_tips_rain: () => `🌧️ **Dicas para Chuva**\n\n• Guarda-chuva resistente ☂️\n• Sapatos impermeáveis 👢\n• Cuidado no trânsito 🚗\n• Atividades em casa 🏠\n\n*Segurança em primeiro lugar!*`,

            forecast_tomorrow: () => `📅 **Previsão Amanhã**\n\nConsultando fontes meteorológicas para ${city}...\n\n• Verifique de manhã 🌅\n• Prepare alternativas 👕\n• Tenha guarda-chuva ☂️\n\n*Informações atualizadas em breve!*`,

            rain_forecast: () => {
                const humidity = weatherData.humidity || 60;
                const chance = humidity > 80 ? 'alta' : humidity > 60 ? 'moderada' : 'baixa';
                return `🌧️ **Previsão de Chuva**\n\n• Humidade: ${humidity}% 💧\n• Probabilidade: ${chance} 📊\n• Temperatura: ${temp}°C 🌡️\n\n*${chance === 'alta' ? 'Leve guarda-chuva!' : 'Provavelmente seco'}*`;
            },

            help: () => `🆘 **Como Posso Ajudar**\n\n• Nome da cidade → tempo atual 🌍\n• "Tempo amanhã" → previsão 📅\n• "O que fazer" → atividades 🎯\n• "Que roupa" → vestuário 👕\n\n*Digite naturalmente!* 💬`,

            general_weather: () => `🌤️ **Informação Meteorológica**\n\n• Local: ${city} 🌍\n• Temperatura: ${temp}°C 🌡️\n• Estado: ${weatherData.description || 'Normal'} ☁️\n\n*Como posso ajudar mais?* 🤝`
        };

        const responseGenerator = responses[suggestionType] || responses.general_weather;
        return responseGenerator();
    }

    getContextualSuggestions(suggestionType, weatherData) {
        const temp = parseInt(weatherData.temperature || weatherData.maxTemp || 25);

        const contextualSuggestions = {
            activities: temp > 25 ?
                ["Dicas calor", "Que roupa", "Tempo amanhã"] :
                ["Que roupa", "Outras cidades", "Tempo amanhã"],

            clothing: temp > 30 ?
                ["Dicas calor", "O que fazer", "Onde refrescar"] :
                ["O que fazer", "Tempo amanhã", "Dicas úteis"],

            weather_tips_hot: ["Que roupa", "Atividades frescas", "Tempo amanhã"],
            weather_tips_cold: ["Que roupa", "Como aquecer", "Tempo amanhã"],
            weather_tips_rain: ["Que roupa", "O que fazer", "Quando para"],

            forecast_tomorrow: ["Que roupa", "O que fazer", "Outras cidades"],
            rain_forecast: ["Guarda-chuva", "Planos B", "Tempo atual"],
            help: ["Tempo atual", "Previsão", "Dicas úteis"],
            general_weather: ["O que fazer", "Que roupa", "Tempo amanhã"]
        };

        return contextualSuggestions[suggestionType] || this.fallbackSuggestions.general;
    }

    createEmergencyFallback(suggestionText, weatherData) {
        return {
            success: true,
            response: `🤖 **Resposta Automática**\n\nRecebido: "${suggestionText}"\n\n• Temperatura: ${weatherData.temperature || 'N/A'}°C 🌡️\n• Local: ${weatherData.city || 'localização atual'} 📍\n\n*Sistema em modo básico. Como posso ajudar?* 💭`,
            suggestions: this.fallbackSuggestions.general,
            suggestionType: 'emergency_fallback',
            originalSuggestion: suggestionText,
            aiPowered: false,
            fallbackMethod: 'emergency'
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
            timeout: 10000
        });

        return response.data.choices[0].message.content;
    }

    sanitizeWeatherData(weatherData) {
        return {
            temperature: weatherData?.temperature || weatherData?.maxTemp || 25,
            maxTemp: weatherData?.maxTemp || weatherData?.temperature || 25,
            minTemp: weatherData?.minTemp || weatherData?.temperature || 20,
            humidity: weatherData?.humidity || 60,
            description: weatherData?.description || weatherData?.condition || 'tempo normal',
            city: weatherData?.city || weatherData?.location || 'localização atual',
            isForecast: weatherData?.isForecast || false
        };
    }

    sanitizeUserContext(userContext) {
        return {
            expertiseLevel: userContext?.expertiseLevel || 'basic',
            queryCount: userContext?.queryCount || 0,
            preferredCity: userContext?.preferredCity || null,
            lastCity: userContext?.lastCity || null,
            lastQuery: userContext?.lastQuery || null
        };
    }

    // Cache methods
    getCacheKey(suggestionText, weatherData, userContext) {
        const key = `${suggestionText}_${weatherData.temperature}_${weatherData.city}_${userContext.expertiseLevel}`;
        return key.toLowerCase().replace(/\s+/g, '_');
    }

    getCachedResult(cacheKey) {
        if (this.suggestionsCache.has(cacheKey)) {
            const cached = this.suggestionsCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                console.log('📂 Cache hit:', cacheKey.substring(0, 30) + '...');
                return cached.data;
            } else {
                this.suggestionsCache.delete(cacheKey);
            }
        }
        return null;
    }

    setCachedResult(cacheKey, result) {
        this.suggestionsCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        // Limpar cache antigo se muito grande
        if (this.suggestionsCache.size > 100) {
            const firstKey = this.suggestionsCache.keys().next().value;
            this.suggestionsCache.delete(firstKey);
        }
    }

    // Teste de conectividade
    async testConnection() {
        if (!this.token) {
            return {
                success: false,
                message: "Token OpenAI não configurado - modo fallback disponível",
                fallbackMode: true
            };
        }

        try {
            const testPrompt = 'Responda apenas: {"teste": "ok"}';
            const response = await this.callOpenAI(testPrompt, 0.1);
            const parsed = JSON.parse(response);

            return {
                success: true,
                message: "Conexão OpenAI OK - AI completa disponível",
                test: parsed
            };
        } catch (error) {
            return {
                success: false,
                message: "Erro conexão OpenAI - usando fallback inteligente",
                error: error.message,
                fallbackMode: true
            };
        }
    }

    // Stats
    getCacheStats() {
        return {
            size: this.suggestionsCache.size,
            maxSize: 100,
            expiry: this.cacheExpiry / 60000 + ' minutos'
        };
    }

    clearCache() {
        this.suggestionsCache.clear();
        console.log('✅ Cache AI limpo');
    }
}

module.exports = AIBasedSuggestionsHandler;
