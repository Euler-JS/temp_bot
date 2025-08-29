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
        return `Eh pá, sou um assistente que entende bem como os moçambicanos falam sobre o tempo.

A pessoa escreveu: "${message}"

Contexto da conversa:
- Já fizeram ${context.queryCount || 0} perguntas antes
- Última cidade que mencionaram: ${context.lastCity || 'nenhuma ainda'}
- Onde estão agora: ${context.currentLocation || 'não sei'}

Preciso perceber o que eles realmente querem. Os moçambicanos falam de várias maneiras:

Se dizem coisas como "Maputo", "como está lá", "tempo hoje" → querem saber o tempo atual
Se perguntam "amanhã", "previsão", "vai chover" → querem saber o futuro
Se dizem "o que fazer", "há atividade", "onde ir" → querem ideias de atividades
Se perguntam "que roupa", "como vestir" → querem conselhos de roupa
Se falam "calor", "frio", "dicas" → querem dicas para o tempo
Se comparam "Maputo vs Beira" → querem comparar cidades
Se dizem "ajuda", "não entendo" → precisam de ajuda
Se cumprimentam "olá", "bom dia" → só estão a ser simpáticos

Responde só o JSON, mas pensa como um moçambicano pensaria:

{
    "intent": "o_que_eles_realmente_querem",
    "confidence": 0.85,
    "entities": {
        "cities": ["cidades_que_mencionaram"],
        "timeframe": "quando_querem_saber",
        "weather_aspect": "que_aspecto_do_tempo",
        "activity_type": "tipo_de_atividade"
    },
    "reasoning": "porque_penso_isso",
    "response_type": "como_responder",
    "priority": "urgência",
    "requires_weather_data": true,
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
