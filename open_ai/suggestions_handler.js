require('dotenv').config();
const axios = require('axios');

class SuggestionsHandler {
    constructor(openaiToken) {
        this.token = openaiToken;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = 'gpt-3.5-turbo';
        this.maxTokens = 200;

        // Cache para sugestões frequentes
        this.suggestionsCache = new Map();
        this.cacheExpiry = 3600000; // 1 hora em milliseconds

        // Sugestões predefinidas por categoria
        this.predefinedSuggestions = {
            weather_basic: [
                "Tempo amanhã?",
                "Previsão 7 dias",
                "Que roupa usar?"
            ],
            weather_rain: [
                "Vai chover?",
                "Dicas chuva",
                "Guarda-chuva?"
            ],
            weather_hot: [
                "Dicas calor",
                "Atividades frescas",
                "Proteger do sol"
            ],
            weather_cold: [
                "Dicas frio",
                "Como aquecer",
                "Atividades quentes"
            ],
            comparison: [
                "Comparar cidades",
                "Ontem vs hoje",
                "Melhor cidade"
            ],
            activities: [
                "Atividades hoje",
                "Onde ir?",
                "O que fazer?"
            ],
            educational: [
                "O que é umidade?",
                "Como funciona?",
                "Mais sobre clima"
            ],
            practical: [
                "Roupa trabalho",
                "Melhor hora sair",
                "Hidratação"
            ],
            alerts: [
                "Alertas clima",
                "Avisos chuva",
                "Configurar avisos"
            ],
            help: [
                "Ajuda",
                "Comandos",
                "Configurações"
            ]
        };

        // Padrões de resposta para diferentes situações
        this.contextPatterns = {
            followUp: {
                after_rain_query: ["Quando para?", "Intensidade?", "Duração?"],
                after_temp_query: ["Sensação real?", "Comparar ontem", "Tendência?"],
                after_forecast: ["Mais detalhes", "Outras cidades", "Semana toda"],
                after_comparison: ["Melhor opção?", "Diferenças?", "Recomendação?"]
            },
            timeOfDay: {
                morning: ["Tempo hoje", "O que vestir", "Atividades dia"],
                afternoon: ["Tempo noite", "Amanhã como?", "Final de semana"],
                evening: ["Tempo amanhã", "Previsão semana", "Planos fim-de-semana"],
                night: ["Amanhã cedo", "Roupa amanhã", "Previsão manhã"]
            },
            weatherConditions: {
                sunny: ["Proteção solar", "Atividades ar livre", "Hidratação"],
                rainy: ["Vai parar?", "Que fazer casa", "Trânsito"],
                cloudy: ["Vai chover?", "Temperatura", "Vento"],
                hot: ["Como refrescar", "Evitar calor", "Bebidas frescas"],
                cold: ["Como aquecer", "Roupas quentes", "Atividades indoor"]
            }
        };

        // Mapeamento de sugestões para processamento
        this.suggestionMappings = {
            // Atividades
            "Atividades hoje": "practical_tips_activities",
            "Onde ir?": "practical_tips_places",
            "O que fazer?": "practical_tips_general",
            "Atividades frescas": "practical_tips_hot_activities",
            "Atividades quentes": "practical_tips_cold_activities",
            "Atividades casa": "practical_tips_indoor",

            // Dicas práticas
            "Que roupa usar?": "practical_tips_clothing",
            "Dicas calor": "practical_tips_hot",
            "Dicas frio": "practical_tips_cold",
            "Dicas chuva": "practical_tips_rain",
            "Proteger do sol": "practical_tips_sun_protection",
            "Hidratar-se": "practical_tips_hydration",

            // Previsões
            "Tempo amanhã?": "weather_forecast_tomorrow",
            "Previsão 7 dias": "weather_forecast_week",
            "Vai chover?": "weather_forecast_rain",
            "Próxima semana": "weather_forecast_next_week",

            // Comparações
            "Comparar cidades": "weather_comparison_cities",
            "Ontem vs hoje": "weather_comparison_yesterday",
            "Como estava ontem": "weather_comparison_yesterday",

            // Educativas
            "O que é umidade?": "weather_education_humidity",
            "Como funciona?": "weather_education_general",
            "Mais sobre clima": "weather_education_climate",

            // Comandos
            "Ajuda": "system_help",
            "Comandos": "system_commands",
            "Configurações": "system_settings",

            // Frases específicas que estão sendo mal interpretadas
            "Há alguma atividade": "practical_tips_activities",
            "Alguma atividade": "practical_tips_activities",
            "Atividades disponíveis": "practical_tips_activities",
            "O que posso fazer": "practical_tips_general",
            "Recomendações atividade": "practical_tips_activities"
        };

        if (!openaiToken) {
            console.warn('Token OpenAI não fornecido - usando apenas sugestões predefinidas');
        }
    }

    // ===============================================
    // PROCESSAMENTO DE RESPOSTAS DE SUGESTÕES
    // ===============================================

    async processSuggestionResponse(suggestionText, weatherData, userContext = {}) {
        try {
            console.log(`🤖 Processando resposta de sugestão com AI: "${suggestionText}"`);

            // Sanitizar dados
            weatherData = this.sanitizeWeatherData(weatherData);
            userContext = this.sanitizeUserContext(userContext);

            // 1. Usar AI para analisar a intenção da sugestão
            const aiAnalysis = await this.analyzeSuggestionWithAI(suggestionText, weatherData, userContext);

            if (aiAnalysis.success) {
                console.log(`🧠 Análise AI bem-sucedida:`, aiAnalysis.analysis);

                // 2. Gerar resposta baseada na análise AI
                const response = await this.generateAIBasedResponse(
                    aiAnalysis.analysis,
                    suggestionText,
                    weatherData,
                    userContext
                );

                // 3. Gerar sugestões de follow-up com AI
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
                    aiPowered: true
                };
            } else {
                console.log(`⚠️ AI analysis failed, usando fallback inteligente`);
                return await this.intelligentFallbackForSuggestion(suggestionText, weatherData, userContext);
            }

        } catch (error) {
            console.error('❌ Erro ao processar resposta de sugestão:', error.message);
            return this.createFallbackSuggestionResponse(suggestionText, weatherData);
        }
    }

    // ===============================================
    // ANÁLISE COM AI DA SUGESTÃO
    // ===============================================

    async analyzeSuggestionWithAI(suggestionText, weatherData, userContext) {
        try {
            if (!this.token) {
                console.log('⚠️ Token OpenAI não disponível, usando análise baseada em regras');
                return { success: false, reason: 'no_token' };
            }

            const prompt = this.buildSuggestionAnalysisPrompt(suggestionText, weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.3);

            try {
                const analysis = JSON.parse(response);
                return {
                    success: true,
                    analysis: analysis,
                    rawResponse: response
                };
            } catch (parseError) {
                console.error('❌ Erro ao parsear resposta AI:', parseError.message);
                return { success: false, reason: 'parse_error', rawResponse: response };
            }

        } catch (error) {
            console.error('❌ Erro na análise AI:', error.message);
            return { success: false, reason: 'ai_error', error: error.message };
        }
    }

    buildSuggestionAnalysisPrompt(suggestionText, weatherData, userContext) {
        const temp = weatherData.temperature || weatherData.maxTemp || 25;
        const city = weatherData.city || userContext.preferredCity || 'cidade';

        return `
Você é um especialista em interpretar intenções de usuários em chatbots meteorológicos moçambicanos.

TAREFA: Analisar a intenção por trás desta resposta/clique de sugestão.

RESPOSTA DO USUÁRIO: "${suggestionText}"

CONTEXTO METEOROLÓGICO:
- Cidade: ${city}
- Temperatura: ${temp}°C
- Condições: ${weatherData.description || 'não informado'}
- Humidade: ${weatherData.humidity || 'não informado'}%
- É previsão: ${weatherData.isForecast ? 'Sim' : 'Não'}

CONTEXTO DO USUÁRIO:
- Nível de experiência: ${userContext.expertiseLevel || 'basic'}
- Consultas anteriores: ${userContext.queryCount || 0}
- Cidade preferida: ${userContext.preferredCity || 'não definida'}
- Última cidade consultada: ${userContext.lastCity || 'não definida'}

ANÁLISE REQUERIDA:
Determine a verdadeira intenção do usuário e classifique em uma destas categorias:

1. **activities_request** - Usuário quer saber sobre atividades/o que fazer
2. **clothing_advice** - Usuário quer conselhos sobre o que vestir
3. **weather_tips_hot** - Usuário quer dicas para clima quente
4. **weather_tips_cold** - Usuário quer dicas para clima frio  
5. **weather_tips_rain** - Usuário quer dicas para chuva
6. **forecast_tomorrow** - Usuário quer previsão para amanhã
7. **forecast_week** - Usuário quer previsão para vários dias
8. **rain_prediction** - Usuário quer saber se vai chover
9. **city_comparison** - Usuário quer comparar clima entre cidades
10. **help_request** - Usuário precisa de ajuda/comandos
11. **general_weather** - Consulta geral sobre tempo

EXEMPLOS DE CLASSIFICAÇÃO:
- "Há alguma atividade" → activities_request
- "Atividades hoje" → activities_request  
- "O que fazer" → activities_request
- "Que roupa usar" → clothing_advice
- "Como me vestir" → clothing_advice
- "Dicas calor" → weather_tips_hot
- "Como refrescar" → weather_tips_hot
- "Dicas frio" → weather_tips_cold
- "Tempo amanhã" → forecast_tomorrow
- "Vai chover" → rain_prediction
- "Ajuda" → help_request

IMPORTANTE: 
- Considere o contexto meteorológico atual
- Leve em conta o nível do usuário (basic/intermediate/advanced)
- Seja preciso na classificação
- Se houver ambiguidade, escolha a opção mais provável

RETORNE APENAS JSON:
{
    "suggestionType": "categoria_escolhida",
    "confidence": 0.95,
    "reasoning": "explicação_da_escolha",
    "contextualFactors": [
        "fator1_considerado",
        "fator2_considerado"
    ],
    "userIntent": "descrição_clara_da_intenção",
    "recommendedResponse": "tipo_de_resposta_recomendada",
    "urgency": "low|medium|high",
    "complexity": "basic|intermediate|advanced"
}

Análise:`;
    }

    // ===============================================
    // GERAÇÃO DE RESPOSTA BASEADA EM AI
    // ===============================================

    async generateAIBasedResponse(analysis, originalText, weatherData, userContext) {
        try {
            if (!this.token) {
                return this.generateRuleBasedResponse(analysis.suggestionType, weatherData, userContext);
            }

            const prompt = this.buildResponseGenerationPrompt(analysis, originalText, weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.7);

            return response.trim();

        } catch (error) {
            console.error('❌ Erro na geração de resposta AI:', error.message);
            return this.generateRuleBasedResponse(analysis.suggestionType, weatherData, userContext);
        }
    }

    buildResponseGenerationPrompt(analysis, originalText, weatherData, userContext) {
        const temp = parseInt(weatherData.temperature || weatherData.maxTemp || 25);
        const city = weatherData.city || userContext.preferredCity || 'sua cidade';
        const level = userContext.expertiseLevel || 'basic';

        return `
Você é um assistente meteorológico especializado para moçambicanos.

TAREFA: Gerar uma resposta útil e contextual para esta consulta.

CONSULTA ORIGINAL: "${originalText}"
INTENÇÃO IDENTIFICADA: ${analysis.suggestionType}
CONFIANÇA: ${analysis.confidence}
RACIOCÍNIO: ${analysis.reasoning}

DADOS METEOROLÓGICOS ATUAIS:
- Localização: ${city}
- Temperatura: ${temp}°C
- Condições: ${weatherData.description}
- Humidade: ${weatherData.humidity}%
- Tipo: ${weatherData.isForecast ? 'Previsão' : 'Dados atuais'}

PERFIL DO USUÁRIO:
- Nível: ${level}
- Experiência: ${userContext.queryCount || 0} consultas
- Complexidade preferida: ${analysis.complexity}

INSTRUÇÕES ESPECÍFICAS POR TIPO:

${this.getSpecificInstructions(analysis.suggestionType, temp, weatherData.description)}

DIRETRIZES GERAIS:
- Use linguagem moçambicana natural e familiar
- Seja prático e útil
- Considere as condições meteorológicas atuais
- Adapte a complexidade ao nível do usuário
- Use emojis relevantes
- Máximo 300 palavras
- Foque na utilidade da informação

FORMATO DA RESPOSTA:
- Título com emoji relevante
- Informação principal clara
- Lista de pontos práticos
- Dica final útil

Resposta:`;
    }

    getSpecificInstructions(suggestionType, temperature, description) {
        const instructions = {
            activities_request: `
ATIVIDADES: Recomende atividades específicas baseadas na temperatura (${temperature}°C) e condições.
- Temperatura > 30°C: Atividades refrescantes, sombra, piscina
- Temperatura 20-30°C: Atividades ao ar livre
- Temperatura < 20°C: Atividades internas ou aquecimento
- Chuva: Atividades internas
Inclua locais específicos da região.`,

            clothing_advice: `
VESTUÁRIO: Recomende roupas específicas para ${temperature}°C.
- Lista de peças específicas
- Cores recomendadas
- Acessórios necessários (chapéu, guarda-chuva, etc.)
- Considerações especiais para o clima local`,

            weather_tips_hot: `
DICAS CALOR: Conselhos práticos para temperaturas altas.
- Hidratação específica
- Horários para evitar
- Locais frescos na região
- Proteção solar
- Sinais de alerta`,

            weather_tips_cold: `
DICAS FRIO: Conselhos para se aquecer.
- Camadas de roupa
- Bebidas e alimentos quentes
- Atividades para aquecer
- Cuidados de saúde`,

            weather_tips_rain: `
DICAS CHUVA: Conselhos práticos para chuva.
- Proteção pessoal
- Atividades alternativas
- Cuidados no trânsito
- Como aproveitar a chuva`,

            forecast_tomorrow: `
PREVISÃO AMANHÃ: Informações sobre o tempo de amanhã.
- Indique que consultará fontes meteorológicas
- Dê dicas de preparação
- Sugira verificação matinal`,

            rain_prediction: `
PREVISÃO CHUVA: Análise sobre probabilidade de chuva.
- Analise condições atuais
- Dê probabilidades baseadas no tempo atual
- Recomende preparação`,
        };

        return instructions[suggestionType] || `
RESPOSTA GERAL: Forneça informação meteorológica útil e contextual.
- Baseie-se nas condições atuais
- Seja específico e prático
- Adapte ao contexto local`;
    }

    // ===============================================
    // SUGESTÕES DE FOLLOW-UP COM AI
    // ===============================================

    async generateAIFollowUpSuggestions(analysis, weatherData, userContext) {
        try {
            if (!this.token) {
                return this.getRuleBasedFollowUp(analysis.suggestionType, weatherData);
            }

            const prompt = this.buildFollowUpSuggestionsPrompt(analysis, weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.8);

            try {
                return JSON.parse(response);
            } catch (parseError) {
                console.error('❌ Erro ao parsear sugestões AI:', parseError.message);
                return this.getRuleBasedFollowUp(analysis.suggestionType, weatherData);
            }

        } catch (error) {
            console.error('❌ Erro ao gerar sugestões follow-up AI:', error.message);
            return this.getRuleBasedFollowUp(analysis.suggestionType, weatherData);
        }
    }

    buildFollowUpSuggestionsPrompt(analysis, weatherData, userContext) {
        return `
Gere 3 sugestões de follow-up inteligentes baseadas nesta interação:

CONSULTA PROCESSADA: ${analysis.suggestionType}
CONTEXTO METEOROLÓGICO: ${weatherData.city}, ${weatherData.temperature}°C, ${weatherData.description}
NÍVEL USUÁRIO: ${userContext.expertiseLevel}

REGRAS:
- Máximo 18 caracteres por sugestão
- Linguagem moçambicana casual
- Relacionadas mas não repetitivas
- Úteis para o contexto atual

TIPOS DE SUGESTÕES DISPONÍVEIS:
- Previsões: "Tempo amanhã", "Próxima semana"
- Dicas: "Dicas calor", "Dicas chuva", "Que roupa"
- Atividades: "O que fazer", "Onde ir"
- Comparações: "Outras cidades", "Ontem vs hoje"
- Ajuda: "Mais dicas", "Comandos", "Ajuda"

Retorne APENAS um array JSON com 3 sugestões:
["sugestão1", "sugestão2", "sugestão3"]

Sugestões:`;
    }

    // ===============================================
    // FALLBACKS INTELIGENTES
    // ===============================================

    async intelligentFallbackForSuggestion(suggestionText, weatherData, userContext) {
        console.log('🔄 Usando fallback inteligente baseado em contexto');

        // Análise básica baseada em palavras-chave
        const basicAnalysis = this.analyzeWithKeywords(suggestionText);

        // Gerar resposta baseada em regras
        const response = this.generateRuleBasedResponse(basicAnalysis.type, weatherData, userContext);

        // Sugestões baseadas em regras
        const suggestions = this.getRuleBasedFollowUp(basicAnalysis.type, weatherData);

        return {
            success: true,
            response: response,
            suggestions: suggestions,
            suggestionType: basicAnalysis.type,
            originalSuggestion: suggestionText,
            aiPowered: false,
            fallbackMethod: 'intelligent_rules'
        };
    }

    analyzeWithKeywords(text) {
        const lowerText = text.toLowerCase();

        if (lowerText.includes('atividade') || lowerText.includes('fazer') || lowerText.includes('onde ir')) {
            return { type: 'activities_request', confidence: 0.8 };
        }
        if (lowerText.includes('roupa') || lowerText.includes('vestir')) {
            return { type: 'clothing_advice', confidence: 0.9 };
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
            return { type: 'rain_prediction', confidence: 0.8 };
        }
        if (lowerText.includes('ajuda') || lowerText.includes('help')) {
            return { type: 'help_request', confidence: 0.9 };
        }

        return { type: 'general_weather', confidence: 0.5 };
    } identifySuggestionType(suggestionText) {
        // Limpar e normalizar o texto
        const cleanText = suggestionText.toLowerCase().trim();

        // Procurar mapeamento direto
        const directMapping = this.suggestionMappings[suggestionText];
        if (directMapping) {
            return directMapping;
        }

        // Procurar por palavras-chave
        if (cleanText.includes('atividade') || cleanText.includes('fazer') || cleanText.includes('onde ir')) {
            return 'practical_tips_activities';
        }

        if (cleanText.includes('roupa') || cleanText.includes('vestir')) {
            return 'practical_tips_clothing';
        }

        if (cleanText.includes('dicas') && cleanText.includes('calor')) {
            return 'practical_tips_hot';
        }

        if (cleanText.includes('dicas') && cleanText.includes('frio')) {
            return 'practical_tips_cold';
        }

        if (cleanText.includes('dicas') && cleanText.includes('chuva')) {
            return 'practical_tips_rain';
        }

        if (cleanText.includes('tempo') && (cleanText.includes('amanhã') || cleanText.includes('manhã'))) {
            return 'weather_forecast_tomorrow';
        }

        if (cleanText.includes('previsão') || cleanText.includes('7 dias') || cleanText.includes('semana')) {
            return 'weather_forecast_week';
        }

        if (cleanText.includes('vai chover') || cleanText.includes('chover')) {
            return 'weather_forecast_rain';
        }

        if (cleanText.includes('comparar') || cleanText.includes('outras cidades')) {
            return 'weather_comparison_cities';
        }

        if (cleanText.includes('ajuda') || cleanText.includes('help')) {
            return 'system_help';
        }

        // Fallback
        return 'weather_general_query';
    }

    async generateSuggestionSpecificResponse(suggestionType, originalText, weatherData, userContext) {
        console.log(`🔄 Gerando resposta específica para tipo: ${suggestionType}`);

        switch (suggestionType) {
            case 'practical_tips_activities':
                return this.generateActivitiesResponse(weatherData, userContext);

            case 'practical_tips_clothing':
                return this.generateClothingResponse(weatherData, userContext);

            case 'practical_tips_hot':
                return this.generateHotWeatherTipsResponse(weatherData, userContext);

            case 'practical_tips_cold':
                return this.generateColdWeatherTipsResponse(weatherData, userContext);

            case 'practical_tips_rain':
                return this.generateRainTipsResponse(weatherData, userContext);

            case 'weather_forecast_tomorrow':
                return this.generateTomorrowForecastResponse(weatherData, userContext);

            case 'weather_forecast_week':
                return this.generateWeekForecastResponse(weatherData, userContext);

            case 'weather_forecast_rain':
                return this.generateRainForecastResponse(weatherData, userContext);

            case 'weather_comparison_cities':
                return this.generateCityComparisonResponse(weatherData, userContext);

            case 'system_help':
                return this.generateHelpResponse(userContext);

            default:
                return this.generateGeneralWeatherResponse(weatherData, userContext);
        }
    }

    // ========================================
    // RESPOSTAS ESPECÍFICAS POR TIPO
    // ========================================

    generateActivitiesResponse(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature || 25);
        const description = weatherData.description.toLowerCase();
        const city = weatherData.city || userContext.preferredCity || 'sua cidade';

        let activities = [];
        let message = `🎯 *Atividades para hoje em ${city}*\n\n`;

        // Baseado na temperatura
        if (temp > 32) {
            activities = [
                "🏊‍♀️ Piscina ou praia (manhã/tarde)",
                "🌴 Sombra num parque",
                "🛍️ Shopping center (ar condicionado)",
                "🏠 Atividades dentro de casa",
                "🥤 Café gelado num local fresco"
            ];
            message += "🌡️ Está muito quente! Recomendo atividades refrescantes:\n\n";
        } else if (temp > 26) {
            activities = [
                "🚶‍♀️ Caminhada no parque",
                "🏖️ Praia ou costa",
                "⚽ Desportos ao ar livre",
                "🎣 Pesca",
                "🌅 Piquenique"
            ];
            message += "☀️ Temperatura boa para atividades ao ar livre:\n\n";
        } else if (temp > 20) {
            activities = [
                "🚴‍♂️ Andar de bicicleta",
                "🥾 Caminhadas",
                "⚽ Futebol",
                "🎨 Atividades ao ar livre",
                "🌳 Visitar jardins"
            ];
            message += "🌤️ Temperatura ideal para sair:\n\n";
        } else {
            activities = [
                "☕ Café quente num local aconchegante",
                "🏠 Atividades dentro de casa",
                "🎬 Cinema",
                "📚 Biblioteca",
                "🛍️ Shopping"
            ];
            message += "🧥 Está fresco, melhor atividades internas:\n\n";
        }

        // Ajustar baseado nas condições
        if (description.includes('chuva')) {
            activities = [
                "🏠 Ficar em casa relaxando",
                "🎬 Ver filmes",
                "📚 Ler um livro",
                "☕ Café quente",
                "🛍️ Shopping center"
            ];
            message = `🌧️ *Com chuva em ${city}, melhor ficar protegido:*\n\n`;
        }

        // Adicionar atividades à mensagem
        activities.forEach((activity, index) => {
            message += `${index + 1}. ${activity}\n`;
        });

        message += `\n💡 *Dica:* Sempre verifique a previsão antes de sair!`;

        return message;
    }

    generateClothingResponse(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature || 25);
        const description = weatherData.description.toLowerCase();
        const city = weatherData.city || userContext.preferredCity || 'sua cidade';

        let message = `👔 *Como se vestir em ${city}*\n\n`;
        message += `🌡️ Temperatura: ${temp}°C\n`;
        message += `🌤️ Condições: ${weatherData.description}\n\n`;

        if (temp > 32) {
            message += `🔥 *Muito quente!*\n`;
            message += `• 👕 Roupas leves e claras\n`;
            message += `• 🩳 Shorts ou saias\n`;
            message += `• 👡 Sandálias abertas\n`;
            message += `• 🧢 Chapéu ou boné\n`;
            message += `• 🕶️ Óculos de sol\n`;
            message += `• 🧴 Protetor solar\n`;
        } else if (temp > 26) {
            message += `☀️ *Quente e agradável:*\n`;
            message += `• 👕 Camisas leves\n`;
            message += `• 👖 Calças leves ou shorts\n`;
            message += `• 👟 Ténis ou sandálias\n`;
            message += `• 🧢 Boné (opcional)\n`;
        } else if (temp > 20) {
            message += `🌤️ *Temperatura ideal:*\n`;
            message += `• 👕 Camisa normal\n`;
            message += `• 👖 Calças normais\n`;
            message += `• 👟 Sapatos fechados\n`;
            message += `• 🧥 Casaco leve (noite)\n`;
        } else {
            message += `❄️ *Fresco:*\n`;
            message += `• 🧥 Casaco ou sweatshirt\n`;
            message += `• 👖 Calças compridas\n`;
            message += `• 👟 Sapatos fechados\n`;
            message += `• 🧣 Cachecol (se muito frio)\n`;
        }

        if (description.includes('chuva')) {
            message += `\n🌧️ *Extra para chuva:*\n`;
            message += `• ☂️ Guarda-chuva\n`;
            message += `• 🧥 Casaco impermeável\n`;
            message += `• 👟 Sapatos que não escorregam\n`;
        }

        if (description.includes('vento')) {
            message += `\n💨 *Para o vento:*\n`;
            message += `• 🧥 Casaco bem fechado\n`;
            message += `• 👖 Evitar roupas soltas\n`;
        }

        return message;
    }

    generateHotWeatherTipsResponse(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature || 25);
        const city = weatherData.city || userContext.preferredCity || 'sua cidade';

        let message = `🔥 *Dicas para o calor em ${city}*\n\n`;
        message += `🌡️ ${temp}°C - `;

        if (temp > 35) {
            message += `Calor extremo!\n\n`;
            message += `⚠️ *CUIDADOS ESPECIAIS:*\n`;
            message += `• 💧 Beba água constantemente\n`;
            message += `• 🏠 Evite sair entre 10h-16h\n`;
            message += `• 🧢 Sempre use chapéu\n`;
            message += `• 🌴 Procure sempre sombra\n`;
            message += `• ❄️ Banhos frios frequentes\n`;
        } else if (temp > 30) {
            message += `Muito quente!\n\n`;
            message += `🌞 *DICAS IMPORTANTES:*\n`;
            message += `• 💧 Hidrate-se bem\n`;
            message += `• 👕 Roupas leves e claras\n`;
            message += `• 🧴 Use protetor solar\n`;
            message += `• 🌴 Prefira locais com sombra\n`;
            message += `• 🥤 Bebidas frescas\n`;
        } else {
            message += `Quente mas suportável\n\n`;
            message += `☀️ *DICAS GERAIS:*\n`;
            message += `• 💧 Beba água regularmente\n`;
            message += `• 👕 Vista-se adequadamente\n`;
            message += `• 🕶️ Óculos de sol\n`;
            message += `• 🧴 Protetor solar\n`;
        }

        message += `\n🍃 *LOCAIS FRESCOS EM ${city.toUpperCase()}:*\n`;
        message += `• 🛍️ Centros comerciais\n`;
        message += `• 🏊‍♀️ Piscinas públicas\n`;
        message += `• 🌊 Praia (manhã/tarde)\n`;
        message += `• 🌳 Parques com sombra\n`;
        message += `• ☕ Cafés com ar condicionado\n`;

        message += `\n⚠️ *EVITAR:*\n`;
        message += `• 🚗 Carros ao sol\n`;
        message += `• ⚽ Exercícios intensos\n`;
        message += `• 🍺 Álcool em excesso\n`;
        message += `• 👖 Roupas escuras/pesadas\n`;

        return message;
    }

    generateColdWeatherTipsResponse(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature || 25);
        const city = weatherData.city || userContext.preferredCity || 'sua cidade';

        let message = `❄️ *Dicas para o frio em ${city}*\n\n`;
        message += `🌡️ ${temp}°C - `;

        if (temp < 10) {
            message += `Muito frio!\n\n`;
            message += `🧥 *AGASALHE-SE BEM:*\n`;
            message += `• 🧣 Cachecol e gorro\n`;
            message += `• 🧤 Luvas se necessário\n`;
            message += `• 👟 Sapatos fechados\n`;
            message += `• 🧥 Várias camadas de roupa\n`;
        } else if (temp < 18) {
            message += `Fresco\n\n`;
            message += `🧥 *VISTA-SE ADEQUADAMENTE:*\n`;
            message += `• 🧥 Casaco ou sweatshirt\n`;
            message += `• 👖 Calças compridas\n`;
            message += `• 👟 Sapatos fechados\n`;
            message += `• 🧦 Meias quentes\n`;
        } else {
            message += `Temperatura amena\n\n`;
            message += `🌤️ *CONFORTO:*\n`;
            message += `• 👕 Camisa manga comprida\n`;
            message += `• 🧥 Casaco leve\n`;
            message += `• 👖 Calças normais\n`;
        }

        message += `\n☕ *COMO SE AQUECER:*\n`;
        message += `• ☕ Bebidas quentes\n`;
        message += `• 🍲 Sopas e comidas quentes\n`;
        message += `• 🚶‍♀️ Movimento/exercício\n`;
        message += `• 🏠 Locais aquecidos\n`;

        message += `\n🏠 *ATIVIDADES PARA O FRIO:*\n`;
        message += `• ☕ Café numa pastelaria\n`;
        message += `• 🎬 Cinema\n`;
        message += `• 📚 Biblioteca\n`;
        message += `• 🛍️ Shopping\n`;
        message += `• 🏠 Atividades em casa\n`;

        return message;
    }

    generateRainTipsResponse(weatherData, userContext) {
        const city = weatherData.city || userContext.preferredCity || 'sua cidade';
        const description = weatherData.description.toLowerCase();

        let message = `🌧️ *Dicas para a chuva em ${city}*\n\n`;

        if (description.includes('forte') || description.includes('intensa')) {
            message += `⛈️ *CHUVA FORTE - CUIDADO EXTRA:*\n`;
            message += `• 🏠 Melhor ficar em casa\n`;
            message += `• 🚗 Evitar conduzir\n`;
            message += `• ⚠️ Risco de inundações\n`;
            message += `• 📱 Acompanhar alertas\n`;
        } else {
            message += `🌧️ *CHUVA MODERADA:*\n`;
            message += `• ☂️ Leve sempre guarda-chuva\n`;
            message += `• 🧥 Casaco impermeável\n`;
            message += `• 👟 Sapatos anti-derrapantes\n`;
            message += `• 📱 Verifique previsão\n`;
        }

        message += `\n🎒 *O QUE LEVAR:*\n`;
        message += `• ☂️ Guarda-chuva\n`;
        message += `• 🧥 Capa de chuva\n`;
        message += `• 👟 Sapatos adequados\n`;
        message += `• 🎒 Saco plástico (proteger coisas)\n`;
        message += `• 📱 Telefone protegido\n`;

        message += `\n🚶‍♀️ *AO ANDAR NA CHUVA:*\n`;
        message += `• 👀 Cuidado com o chão molhado\n`;
        message += `• 🌊 Evite poças grandes\n`;
        message += `• 🚗 Atenção ao trânsito\n`;
        message += `• 🏃‍♀️ Não correr (perigoso)\n`;

        message += `\n🏠 *ATIVIDADES PARA CHUVA:*\n`;
        message += `• ☕ Café aconchegante\n`;
        message += `• 🎬 Cinema\n`;
        message += `• 📚 Ler em casa\n`;
        message += `• 🛍️ Shopping center\n`;
        message += `• 🎮 Jogos em casa\n`;

        message += `\n💡 *DICA:* Aproveite o som relaxante da chuva!`;

        return message;
    }

    generateTomorrowForecastResponse(weatherData, userContext) {
        const city = weatherData.city || userContext.preferredCity || 'sua cidade';

        return `🌅 *Previsão para amanhã em ${city}*\n\n` +
            `📍 Esta é uma consulta sobre a previsão de amanhã.\n\n` +
            `Para obter dados precisos, preciso consultar o serviço meteorológico.\n\n` +
            `💡 *Entretanto, posso dar dicas:*\n` +
            `• 📱 Verifique sempre antes de sair\n` +
            `• 👔 Prepare a roupa na véspera\n` +
            `• ☂️ Tenha guarda-chuva à mão\n` +
            `• 🌡️ Note a variação de temperatura\n\n` +
            `✨ Digite "previsão ${city}" para dados actualizados!`;
    }

    generateWeekForecastResponse(weatherData, userContext) {
        const city = weatherData.city || userContext.preferredCity || 'sua cidade';

        return `📅 *Previsão para 7 dias em ${city}*\n\n` +
            `📊 Para uma previsão semanal detalhada, consulto múltiplas fontes meteorológicas.\n\n` +
            `🔮 *O que posso antecipar:*\n` +
            `• 🌡️ Tendências de temperatura\n` +
            `• 🌧️ Probabilidade de chuva\n` +
            `• 💨 Condições de vento\n` +
            `• ☀️ Dias mais ensolarados\n\n` +
            `📱 Digite "previsão 7 dias ${city}" para relatório completo!`;
    }

    generateRainForecastResponse(weatherData, userContext) {
        const city = weatherData.city || userContext.preferredCity || 'sua cidade';
        const description = weatherData.description.toLowerCase();

        let message = `🌧️ *Previsão de chuva em ${city}*\n\n`;

        if (description.includes('chuva')) {
            message += `🌧️ *AGORA:* Já está chovendo!\n`;
            message += `⏰ *DURAÇÃO:* Consultando padrões...\n`;
            message += `📊 *INTENSIDADE:* ${weatherData.description}\n\n`;
            message += `⚠️ *RECOMENDAÇÕES IMEDIATAS:*\n`;
            message += `• ☂️ Use guarda-chuva\n`;
            message += `• 🏠 Evite sair se não for necessário\n`;
            message += `• 👟 Sapatos antiderrapantes\n`;
        } else {
            message += `☀️ *AGORA:* Sem chuva\n`;
            message += `🔮 *PROBABILIDADE PRÓXIMAS HORAS:* Analisando...\n\n`;
            message += `📱 *DICAS:*\n`;
            message += `• 🌥️ Observe as nuvens\n`;
            message += `• ☂️ Leve guarda-chuva preventivo\n`;
            message += `• 📲 Acompanhe alertas meteorológicos\n`;
        }

        message += `\n💡 Para previsão precisa de chuva, digite "chuva ${city}"`;

        return message;
    }

    generateCityComparisonResponse(weatherData, userContext) {
        const currentCity = weatherData.city || userContext.preferredCity || 'sua cidade';

        return `🏙️ *Comparação entre cidades*\n\n` +
            `📍 Cidade actual: ${currentCity}\n` +
            `🌡️ Temperatura: ${weatherData.temperature}°C\n` +
            `🌤️ Condições: ${weatherData.description}\n\n` +
            `⚖️ *Para comparar com outras cidades:*\n` +
            `• Digite "comparar Maputo Beira"\n` +
            `• Ou "tempo Maputo vs Nampula"\n` +
            `• Ou "melhor cidade hoje"\n\n` +
            `📊 *Principais cidades moçambicanas:*\n` +
            `• 🏛️ Maputo (capital)\n` +
            `• 🌊 Beira (porto)\n` +
            `• 🌴 Nampula (norte)\n` +
            `• 🏖️ Quelimane (costa)\n` +
            `• ⛰️ Tete (interior)\n` +
            `• 🐠 Pemba (cabo delgado)`;
    }

    generateHelpResponse(userContext) {
        const level = userContext.expertiseLevel || 'basic';

        let message = `🤖 *Ajuda - Sistema Meteorológico*\n\n`;

        if (level === 'basic') {
            message += `🌟 *COMANDOS SIMPLES:*\n`;
            message += `• "tempo Maputo" - Clima actual\n`;
            message += `• "amanhã Beira" - Previsão\n`;
            message += `• "vai chover?" - Chuva\n`;
            message += `• "que roupa usar?" - Vestuário\n`;
            message += `• "atividades hoje" - O que fazer\n\n`;
        } else {
            message += `⚡ *COMANDOS AVANÇADOS:*\n`;
            message += `• "previsão 7 dias Maputo"\n`;
            message += `• "comparar Maputo Beira"\n`;
            message += `• "alertas chuva"\n`;
            message += `• "análise térmica"\n`;
            message += `• "configurações"\n\n`;
        }

        message += `💡 *DICAS DE USO:*\n`;
        message += `• 🎯 Clique nas sugestões\n`;
        message += `• 📍 Mencione sempre a cidade\n`;
        message += `• ⏰ Especifique o tempo (hoje/amanhã)\n`;
        message += `• 🔄 Use linguagem natural\n\n`;

        message += `🆘 *PRECISA DE MAIS AJUDA?*\n`;
        message += `Digite "comandos" para lista completa`;

        return message;
    }

    generateGeneralWeatherResponse(weatherData, userContext) {
        const city = weatherData.city || userContext.preferredCity || 'sua cidade';

        return `🌤️ *Informação meteorológica geral*\n\n` +
            `📍 Localização: ${city}\n` +
            `🌡️ Temperatura: ${weatherData.temperature}°C\n` +
            `🌤️ Condições: ${weatherData.description}\n` +
            `💧 Humidade: ${weatherData.humidity}%\n\n` +
            `💡 *Pode perguntar:*\n` +
            `• Previsões (amanhã, semana)\n` +
            `• Dicas práticas (roupa, atividades)\n` +
            `• Comparações entre cidades\n` +
            `• Alertas meteorológicos\n\n` +
            `✨ Use as sugestões abaixo para explorar mais!`;
    }

    // ========================================
    // SUGESTÕES DE FOLLOW-UP
    // ========================================

    async generateFollowUpSuggestions(suggestionType, weatherData, userContext) {
        console.log(`🔄 Gerando sugestões follow-up para: ${suggestionType}`);

        switch (suggestionType) {
            case 'practical_tips_activities':
                return this.getActivitiesFollowUp(weatherData, userContext);

            case 'practical_tips_clothing':
                return this.getClothingFollowUp(weatherData, userContext);

            case 'practical_tips_hot':
            case 'practical_tips_cold':
            case 'practical_tips_rain':
                return this.getWeatherTipsFollowUp(weatherData, userContext);

            case 'weather_forecast_tomorrow':
            case 'weather_forecast_week':
            case 'weather_forecast_rain':
                return this.getForecastFollowUp(weatherData, userContext);

            case 'weather_comparison_cities':
                return this.getComparisonFollowUp(weatherData, userContext);

            case 'system_help':
                return this.getHelpFollowUp(userContext);

            default:
                return this.getGeneralFollowUp(weatherData, userContext);
        }
    }

    getActivitiesFollowUp(weatherData, userContext) {
        const temp = parseInt(weatherData.temperature || 25);
        const description = weatherData.description.toLowerCase();

        if (description.includes('chuva')) {
            return ["Vai parar chuva?", "Atividades casa", "Filmes hoje"];
        }

        if (temp > 30) {
            return ["Locais frescos", "Dicas calor", "Piscinas perto"];
        }

        if (temp < 18) {
            return ["Locais quentes", "Dicas frio", "Cafés perto"];
        }

        return ["Previsão semana", "Outras cidades", "Que roupa usar"];
    }

    getClothingFollowUp(weatherData, userContext) {
        const description = weatherData.description.toLowerCase();

        if (description.includes('chuva')) {
            return ["Vai parar chuva?", "Atividades chuva", "Calçados chuva"];
        }

        return ["Tempo amanhã", "Atividades hoje", "Previsão semana"];
    }

    getWeatherTipsFollowUp(weatherData, userContext) {
        return ["Atividades hoje", "Previsão amanhã", "Outras cidades"];
    }

    getForecastFollowUp(weatherData, userContext) {
        return ["Que roupa usar", "Atividades", "Comparar cidades"];
    }

    getComparisonFollowUp(weatherData, userContext) {
        return ["Melhor cidade", "Tempo amanhã", "Atividades"];
    }

    getHelpFollowUp(userContext) {
        const level = userContext.expertiseLevel || 'basic';

        if (level === 'basic') {
            return ["Tempo hoje", "Que roupa usar", "Atividades"];
        } else {
            return ["Configurações", "Comandos", "Análise técnica"];
        }
    }

    getGeneralFollowUp(weatherData, userContext) {
        return ["Tempo amanhã", "Atividades hoje", "Dicas úteis"];
    }

    // ========================================
    // FALLBACK PARA SUGESTÕES
    // ========================================

    createFallbackSuggestionResponse(suggestionText, weatherData) {
        console.log('🚨 Usando resposta fallback para sugestão');

        return {
            success: false,
            response: `🤖 Recebi a sua sugestão "${suggestionText}".\n\n` +
                `Para melhor ajudá-lo, pode ser mais específico?\n\n` +
                `💡 Exemplos:\n` +
                `• "tempo hoje Maputo"\n` +
                `• "que roupa usar"\n` +
                `• "atividades para hoje"\n` +
                `• "vai chover?"`,
            suggestions: ["Tempo hoje", "Atividades", "Ajuda"],
            suggestionType: 'fallback',
            originalSuggestion: suggestionText
        };
    }

    // ===============================================
    // MÉTODO PRINCIPAL - GERAR SUGESTÕES
    // ===============================================

    async generateSuggestions(analysis, weatherData, userContext = {}) {
        try {
            // Validar e sanitizar parâmetros de entrada
            analysis = this.sanitizeAnalysis(analysis);
            weatherData = this.sanitizeWeatherData(weatherData);
            userContext = this.sanitizeUserContext(userContext);

            console.log('🔄 Gerando sugestões...', {
                type: analysis.type,
                city: analysis.city,
                intent: analysis.intent,
                expertise: analysis.expertiseLevel
            });

            // 1. Verificar cache primeiro
            const cacheKey = this.createCacheKey(analysis, weatherData, userContext);
            const cached = this.getCachedSuggestions(cacheKey);
            if (cached) {
                console.log('✅ Sugestões do cache');
                return cached;
            }

            // 2. Tentar gerar sugestões inteligentes via OpenAI
            let suggestions = null;
            if (this.token) {
                suggestions = await this.generateIntelligentSuggestions(analysis, weatherData, userContext);
            }

            // 3. Fallback para sugestões baseadas em regras
            if (!suggestions || suggestions.length === 0) {
                console.log('🔄 Usando sugestões baseadas em regras');
                suggestions = this.generateRuleBasedSuggestions(analysis, weatherData, userContext);
            }

            // 4. Validar e limpar sugestões
            const validatedSuggestions = this.validateSuggestions(suggestions);

            // 5. Adicionar ao cache
            this.cacheSuggestions(cacheKey, validatedSuggestions);

            console.log('✅ Sugestões geradas:', validatedSuggestions);
            return validatedSuggestions;

        } catch (error) {
            console.error('❌ Erro ao gerar sugestões:', error.message);
            return this.getEmergencyFallbackSuggestions(analysis, weatherData);
        }
    }

    // ===============================================
    // SUGESTÕES INTELIGENTES VIA OPENAI
    // ===============================================

    async generateIntelligentSuggestions(analysis, weatherData, userContext) {
        try {
            const prompt = this.buildSuggestionsPrompt(analysis, weatherData, userContext);
            const response = await this.callOpenAI(prompt, 0.8);

            // Tentar parsear a resposta como JSON
            let suggestions;
            try {
                suggestions = JSON.parse(response);
            } catch (parseError) {
                // Se não for JSON válido, tentar extrair sugestões do texto
                suggestions = this.extractSuggestionsFromText(response);
            }

            return Array.isArray(suggestions) ? suggestions : [];

        } catch (error) {
            console.error('Erro na geração inteligente de sugestões:', error.message);
            return null;
        }
    }

    buildSuggestionsPrompt(analysis, weatherData, userContext) {
        const timeContext = weatherData.isForecast ? "previsão para amanhã" : "dados atuais";
        const temperature = weatherData.isForecast ?
            `${weatherData.minTemp}°C - ${weatherData.maxTemp}°C` :
            `${weatherData.temperature}°C`;

        return `
Gere 3 sugestões úteis e relevantes para um usuário moçambicano da Beira baseado nesta consulta meteorológica:

CONTEXTO DA CONSULTA:
- Tipo: ${analysis.type} (${timeContext})
- Cidade: ${analysis.city}
- Intenção: ${analysis.intent}
- Nível do usuário: ${analysis.expertiseLevel}

DADOS CLIMÁTICOS:
- Temperatura: ${temperature}
- Condições: ${weatherData.description}
- Humidade: ${weatherData.humidity || 'N/A'}%

PERFIL DO USUÁRIO:
- Consultas anteriores: ${userContext.queryCount || 0}
- Cidade frequente: ${userContext.lastCity || 'N/A'}
- Preferência: ${userContext.preferredComplexity || 'basic'}
- Horário: ${this.getCurrentTimeContext()}

DIRETRIZES PARA SUGESTÕES:
1. MÁXIMO 18 caracteres por sugestão (para caber nos botões WhatsApp)
2. Use português moçambicano casual e familiar
3. Priorize relevância para a situação atual
4. Misture diferentes tipos: previsões, dicas práticas, comparações
5. Considere o contexto temporal (manhã, tarde, noite)

TIPOS DE SUGESTÕES DISPONÍVEIS:
- Previsões: "Tempo amanhã", "Próxima semana", "Fim-de-semana"
- Práticas: "Que roupa?", "Atividades", "Dicas calor/frio"
- Comparações: "Outras cidades", "Ontem vs hoje"
- Educativas: "O que é...?", "Como funciona?"
- Alertas: "Vai chover?", "Alertas"
- Comandos: "Ajuda", "Configurar"

EXEMPLOS DE LINGUAGEM MOÇAMBICANA:
- "Tempo amanhã?" (não "Previsão para amanhã")
- "Que roupa usar?" (não "Vestuário recomendado")
- "Vai chover?" (não "Probabilidade de precipitação")
- "Como está?" (não "Condições atuais")
- "Dicas calor" (não "Recomendações temperatura")

CONTEXTO ESPECÍFICO:
${this.getSpecificContext(analysis, weatherData, userContext)}

IMPORTANTE: Retorne APENAS um array JSON com 3 sugestões, nada mais.
Exemplo: ["Tempo amanhã?", "Que roupa usar?", "Vai chover?"]

Sugestões:`;
    }

    getSpecificContext(analysis, weatherData, userContext) {
        const contexts = [];

        // Contexto baseado na temperatura
        if (weatherData.temperature || weatherData.maxTemp) {
            const temp = parseInt(weatherData.temperature || weatherData.maxTemp);
            if (temp > 30) contexts.push("- Clima quente: priorizar dicas de refrescamento");
            if (temp < 15) contexts.push("- Clima frio: priorizar dicas de aquecimento");
        }

        // Contexto baseado nas condições
        if (weatherData.description.toLowerCase().includes('chuva')) {
            contexts.push("- Chuva: incluir sugestões sobre proteção e atividades internas");
        }

        // Contexto temporal
        const timeContext = this.getCurrentTimeContext();
        if (timeContext === 'morning') {
            contexts.push("- Manhã: focar no dia que vem pela frente");
        } else if (timeContext === 'evening') {
            contexts.push("- Noite: focar no dia seguinte");
        }

        // Contexto do usuário
        if (userContext.queryCount > 5) {
            contexts.push("- Usuário experiente: incluir opções mais avançadas");
        }

        return contexts.length > 0 ? contexts.join('\n') : "- Primeira consulta: focar em opções básicas e úteis";
    }

    extractSuggestionsFromText(text) {
        // Tentar extrair sugestões de texto livre
        const lines = text.split('\n').filter(line => line.trim());
        const suggestions = [];

        for (const line of lines) {
            // Procurar por padrões como "1. ", "- ", ou apenas linhas curtas
            const cleaned = line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
            if (cleaned.length > 0 && cleaned.length <= 20) {
                suggestions.push(cleaned);
            }
        }

        return suggestions.slice(0, 3);
    }

    // ===============================================
    // SUGESTÕES BASEADAS EM REGRAS
    // ===============================================

    generateRuleBasedSuggestions(analysis, weatherData, userContext) {
        console.log('🔄 Gerando sugestões baseadas em regras...');

        const suggestions = [];
        const usedSuggestions = new Set();

        // 1. Sugestão baseada no contexto principal
        const primarySuggestion = this.getPrimarySuggestion(analysis, weatherData, userContext);
        if (primarySuggestion && !usedSuggestions.has(primarySuggestion)) {
            suggestions.push(primarySuggestion);
            usedSuggestions.add(primarySuggestion);
        }

        // 2. Sugestão baseada nas condições climáticas
        const weatherSuggestion = this.getWeatherBasedSuggestion(weatherData, userContext);
        if (weatherSuggestion && !usedSuggestions.has(weatherSuggestion)) {
            suggestions.push(weatherSuggestion);
            usedSuggestions.add(weatherSuggestion);
        }

        // 3. Sugestão baseada no tempo/contexto
        const timeSuggestion = this.getTimeBasedSuggestion(analysis, weatherData, userContext);
        if (timeSuggestion && !usedSuggestions.has(timeSuggestion)) {
            suggestions.push(timeSuggestion);
            usedSuggestions.add(timeSuggestion);
        }

        // 4. Preencher com sugestões padrão se necessário
        const defaultSuggestions = this.getDefaultSuggestions(analysis.expertiseLevel);
        for (const suggestion of defaultSuggestions) {
            if (suggestions.length >= 3) break;
            if (!usedSuggestions.has(suggestion)) {
                suggestions.push(suggestion);
                usedSuggestions.add(suggestion);
            }
        }

        return suggestions.slice(0, 3);
    }

    getPrimarySuggestion(analysis, weatherData, userContext) {
        // Baseado no tipo de consulta atual
        switch (analysis.type) {
            case 'weather_data':
                return weatherData.isForecast ? "Previsão 7 dias" : "Tempo amanhã?";

            case 'comparison':
                return "Outras cidades";

            case 'practical_tips':
                return "Mais dicas";

            case 'weather_education':
                return "Explicar melhor";

            default:
                return "Tempo hoje";
        }
    }

    getWeatherBasedSuggestion(weatherData, userContext) {
        const description = weatherData.description.toLowerCase();
        const temp = parseInt(weatherData.temperature || weatherData.maxTemp || 25);

        // Baseado nas condições climáticas
        if (description.includes('chuva') || description.includes('chuvoso')) {
            return "Vai parar chuva?";
        }

        if (temp > 30) {
            return "Dicas calor";
        }

        if (temp < 15) {
            return "Dicas frio";
        }

        if (description.includes('sol') || description.includes('claro')) {
            return "Atividades hoje";
        }

        if (description.includes('nuvem') || description.includes('nublado')) {
            return "Vai chover?";
        }

        return "Que roupa usar?";
    }

    getTimeBasedSuggestion(analysis, weatherData, userContext) {
        const timeContext = this.getCurrentTimeContext();
        const isWeekend = this.isWeekend();

        if (isWeekend) {
            return "Fim-de-semana";
        }

        switch (timeContext) {
            case 'morning':
                return weatherData.isForecast ? "Tempo hoje" : "Planos hoje";

            case 'afternoon':
                return "Tempo noite";

            case 'evening':
            case 'night':
                return "Amanhã cedo";

            default:
                return "Próxima semana";
        }
    }

    getDefaultSuggestions(expertiseLevel) {
        switch (expertiseLevel) {
            case 'basic':
                return ["Ajuda", "Tempo amanhã?", "Que roupa usar?"];

            case 'intermediate':
                return ["Comparar cidades", "Previsão 7 dias", "Atividades"];

            case 'advanced':
                return ["Análise técnica", "Tendências", "Configurações"];

            default:
                return ["Ajuda", "Mais info", "Configurar"];
        }
    }

    // ===============================================
    // SUGESTÕES DE EMERGÊNCIA
    // ===============================================

    getEmergencyFallbackSuggestions(analysis, weatherData) {
        console.log('🚨 Usando sugestões de emergência');

        const city = analysis.city || 'sua cidade';
        const isRaining = weatherData.description.toLowerCase().includes('chuva');

        if (isRaining) {
            return ["Vai parar chuva?", "Dicas chuva", "Atividades casa"];
        }

        return ["Tempo amanhã?", "Que roupa usar?", "Mais info"];
    }

    // ===============================================
    // MÉTODOS DE SANITIZAÇÃO
    // ===============================================

    sanitizeAnalysis(analysis) {
        if (!analysis || typeof analysis !== 'object') {
            return {
                type: "weather_data",
                city: "maputo",
                intent: "consulta_basica",
                expertiseLevel: "basic",
                context: {
                    timeframe: "hoje",
                    weatherAspect: "geral"
                }
            };
        }

        return {
            type: analysis.type || "weather_data",
            city: analysis.city || "maputo",
            intent: analysis.intent || "consulta_basica",
            expertiseLevel: analysis.expertiseLevel || "basic",
            context: analysis.context || {
                timeframe: "hoje",
                weatherAspect: "geral"
            }
        };
    }

    sanitizeWeatherData(weatherData) {
        if (!weatherData || typeof weatherData !== 'object') {
            return {
                city: "Maputo",
                temperature: "25",
                description: "ensolarado",
                humidity: "65",
                isForecast: false
            };
        }

        return {
            city: weatherData.city || "Maputo",
            temperature: weatherData.temperature || weatherData.maxTemp || "25",
            minTemp: weatherData.minTemp || weatherData.temperature || "20",
            maxTemp: weatherData.maxTemp || weatherData.temperature || "30",
            description: weatherData.description || "ensolarado",
            humidity: weatherData.humidity || "65",
            isForecast: Boolean(weatherData.isForecast)
        };
    }

    sanitizeUserContext(userContext) {
        if (!userContext || typeof userContext !== 'object') {
            return {
                queryCount: 0,
                lastCity: "maputo",
                preferredCity: "maputo",
                expertiseLevel: "basic"
            };
        }

        return {
            queryCount: userContext.queryCount || 0,
            lastCity: userContext.lastCity || "maputo",
            preferredCity: userContext.preferredCity || "maputo",
            expertiseLevel: userContext.expertiseLevel || "basic",
            preferredComplexity: userContext.preferredComplexity || "basic"
        };
    }

    // ===============================================
    // UTILITÁRIOS
    // ===============================================

    validateSuggestions(suggestions) {
        if (!Array.isArray(suggestions)) {
            return this.predefinedSuggestions.weather_basic;
        }

        const validated = suggestions
            .filter(s => typeof s === 'string' && s.trim().length > 0)
            .map(s => s.trim())
            .map(s => s.length > 18 ? s.substring(0, 18) : s)
            .slice(0, 3);

        // Se não temos sugestões suficientes, completar com padrão
        while (validated.length < 3) {
            const fallback = this.predefinedSuggestions.weather_basic[validated.length];
            if (fallback && !validated.includes(fallback)) {
                validated.push(fallback);
            } else {
                validated.push("Mais info");
            }
        }

        return validated;
    }

    getCurrentTimeContext() {
        const hour = new Date().getHours();

        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    isWeekend() {
        const day = new Date().getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    }

    // ===============================================
    // SISTEMA DE CACHE
    // ===============================================

    createCacheKey(analysis, weatherData, userContext) {
        const keyParts = [
            analysis.type,
            analysis.city,
            analysis.intent,
            weatherData.description,
            Math.floor(parseInt(weatherData.temperature || weatherData.maxTemp || 20) / 5) * 5, // Arredondado para 5°C
            this.getCurrentTimeContext(),
            userContext.expertiseLevel || 'basic'
        ];

        return keyParts.join('|');
    }

    getCachedSuggestions(cacheKey) {
        const cached = this.suggestionsCache.get(cacheKey);
        if (!cached) return null;

        // Verificar se não expirou
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.suggestionsCache.delete(cacheKey);
            return null;
        }

        return cached.suggestions;
    }

    cacheSuggestions(cacheKey, suggestions) {
        this.suggestionsCache.set(cacheKey, {
            suggestions: suggestions,
            timestamp: Date.now()
        });

        // Limpar cache antigo se ficar muito grande
        if (this.suggestionsCache.size > 100) {
            const oldestKey = this.suggestionsCache.keys().next().value;
            this.suggestionsCache.delete(oldestKey);
        }
    }

    // ===============================================
    // COMUNICAÇÃO COM OPENAI
    // ===============================================

    async callOpenAI(prompt, temperature = 0.7) {
        if (!this.token) {
            throw new Error('Token OpenAI não configurado');
        }

        const requestData = {
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: "Você é um especialista em criar sugestões de interação para um chatbot meteorológico moçambicano. Sempre retorne apenas arrays JSON válidos com sugestões curtas e práticas."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: this.maxTokens,
            temperature: temperature,
            top_p: 1,
            frequency_penalty: 0.3,
            presence_penalty: 0.1
        };

        const response = await axios.post(
            `${this.baseURL}/chat/completions`,
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        return response.data.choices[0].message.content.trim();
    }

    // ===============================================
    // MÉTODOS PÚBLICOS ADICIONAIS
    // ===============================================

    // Obter sugestões para um contexto específico
    getSuggestionsForContext(context, userLevel = 'basic') {
        const contextSuggestions = this.predefinedSuggestions[context];
        if (contextSuggestions) {
            return contextSuggestions.slice(0, 3);
        }

        return this.predefinedSuggestions.weather_basic;
    }

    // ===============================================
    // MÉTODOS DE RESPOSTA BASEADOS EM REGRAS (FALLBACK)
    // ===============================================

    generateRuleBasedResponse(suggestionType, weatherData, userContext) {
        const temp = parseInt(weatherData.temperature || weatherData.maxTemp || 25);
        const city = weatherData.city || userContext.preferredCity || 'sua região';

        const responses = {
            activities_request: () => {
                if (temp > 30) {
                    return `🏊‍♀️ *Atividades para Clima Quente em ${city}*\n\nCom ${temp}°C, recomendo:\n\n• Natação ou praia 🏖️\n• Cinemas climatizados 🎬\n• Centros comerciais 🛍️\n• Parques com sombra 🌳\n• Atividades aquáticas 💦\n\n*Dica:* Evite o sol entre 10h-15h!`;
                } else if (temp > 20) {
                    return `🚶‍♀️ *Atividades Perfeitas para ${city}*\n\nCom ${temp}°C, ideal para:\n\n• Caminhadas ao ar livre 🚶‍♀️\n• Ciclismo 🚴‍♀️\n• Piqueniques no parque 🧺\n• Visitas a museus 🏛️\n• Desportos ao ar livre ⚽\n\n*Aproveite este tempo agradável!*`;
                } else {
                    return `☕ *Atividades para Clima Fresco em ${city}*\n\nCom ${temp}°C, melhor:\n\n• Cafés aconchegantes ☕\n• Bibliotecas e livrarias 📚\n• Cinemas 🎭\n• Museus 🖼️\n• Atividades internas 🏠\n\n*Vista-se bem quentinho!*`;
                }
            },

            clothing_advice: () => {
                if (temp > 30) {
                    return `👕 *Vestuário para ${temp}°C*\n\n*Roupas recomendadas:*\n• Tecidos leves (algodão, linho) 👕\n• Cores claras ⚪\n• Chapéu ou boné 👒\n• Óculos de sol 🕶️\n• Protector solar 🧴\n\n*Evite:* Roupas escuras e sintéticas`;
                } else if (temp > 20) {
                    return `👔 *Vestuário Ideal para ${temp}°C*\n\n*Perfect para:*\n• Camisa leve + calças 👔\n• Vestidos frescos 👗\n• Sapatos fechados 👟\n• Casaco leve à noite 🧥\n\n*Tempo ideal para qualquer roupa!*`;
                } else {
                    return `🧥 *Vestuário para ${temp}°C*\n\n*Vista camadas:*\n• Casaco ou camisola 🧥\n• Calças compridas 👖\n• Sapatos fechados 👞\n• Cachecol se necessário 🧣\n\n*Mantenha-se aquecido!*`;
                }
            },

            weather_tips_hot: () => {
                return `🌡️ *Dicas para Calor Intenso*\n\n*Hidratação:*\n• Beba água constantemente 💧\n• Sumos naturais sem açúcar 🥤\n• Evite álcool e cafeína ❌\n\n*Proteção:*\n• Fique na sombra 🌳\n• Use protector solar ☀️\n• Evite sol 10h-15h 🕐\n\n*Sinais de alerta:* Tonturas, náuseas, dores de cabeça`;
            },

            weather_tips_cold: () => {
                return `❄️ *Dicas para Clima Frio*\n\n*Aquecimento:*\n• Vista camadas de roupa 🧥\n• Bebidas quentes ☕\n• Movimento e exercício 🏃‍♀️\n\n*Cuidados:*\n• Proteja extremidades 🧤\n• Mantenha-se seco 🌂\n• Cuidado com superfícies escorregadias ⚠️`;
            },

            weather_tips_rain: () => {
                return `🌧️ *Dicas para Tempo Chuvoso*\n\n*Proteção:*\n• Guarda-chuva resistente ☂️\n• Sapatos impermeáveis 👢\n• Roupa com capuz 🧥\n\n*Segurança:*\n• Cuidado no trânsito 🚗\n• Evite áreas alagadas 🌊\n• Conduza devagar 🚙\n\n*Aproveitamento:* Leia um livro, filme em casa 📚`;
            },

            forecast_tomorrow: () => {
                return `📅 *Previsão para Amanhã*\n\nVou consultar as fontes meteorológicas mais recentes para ${city}.\n\n*Preparação sugerida:*\n• Verifique a previsão de manhã 🌅\n• Prepare roupa alternativa 👕\n• Tenha guarda-chuva disponível ☂️\n\n*Voltarei com informações atualizadas!*`;
            },

            rain_prediction: () => {
                const humidity = weatherData.humidity || 60;
                const chance = humidity > 80 ? 'alta' : humidity > 60 ? 'moderada' : 'baixa';
                return `🌧️ *Análise de Chuva para ${city}*\n\n*Condições atuais:*\n• Humidade: ${humidity}% 💧\n• Probabilidade: ${chance} 📊\n• Temperatura: ${temp}°C 🌡️\n\n*Recomendação:*\n${chance === 'alta' ? 'Leve guarda-chuva!' : 'Provavelmente não chove'} ☂️`;
            },

            help_request: () => {
                return `🆘 *Como Posso Ajudar*\n\n*Comandos disponíveis:*\n• Nome da cidade - tempo atual 🌍\n• "Tempo amanhã" - previsão 📅\n• "Dicas calor/frio" - conselhos 💡\n• "Que roupa usar" - vestuário 👕\n• "O que fazer" - atividades 🎯\n\n*Digite sua pergunta naturalmente!* 💬`;
            },

            general_weather: () => {
                return `🌤️ *Informação Meteorológica*\n\n*Condições em ${city}:*\n• Temperatura: ${temp}°C 🌡️\n• Estado: ${weatherData.description || 'Informação limitada'} ☁️\n• Humidade: ${weatherData.humidity || 'N/A'}% 💧\n\n*Posso ajudar com mais detalhes específicos!* 🤝`;
            }
        };

        const responseGenerator = responses[suggestionType] || responses.general_weather;
        return responseGenerator();
    }

    getRuleBasedFollowUp(suggestionType, weatherData) {
        const temp = parseInt(weatherData.temperature || weatherData.maxTemp || 25);

        const followUps = {
            activities_request: temp > 25 ?
                ["Dicas calor", "Que roupa", "Tempo amanhã"] :
                ["Que roupa", "Outras cidades", "Tempo amanhã"],

            clothing_advice: temp > 30 ?
                ["Dicas calor", "O que fazer", "Protector solar"] :
                ["O que fazer", "Tempo amanhã", "Outras cidades"],

            weather_tips_hot: ["Que roupa", "Onde refrescar", "Tempo amanhã"],
            weather_tips_cold: ["Que roupa", "Bebidas quentes", "Tempo amanhã"],
            weather_tips_rain: ["Que roupa", "Ativ. internas", "Quando para"],

            forecast_tomorrow: ["Que roupa", "O que fazer", "Outras cidades"],
            rain_prediction: ["Guarda-chuva", "Planos B", "Tempo amanhã"],
            help_request: ["Tempo atual", "Previsão", "Dicas úteis"],
            general_weather: ["O que fazer", "Que roupa", "Tempo amanhã"]
        };

        return followUps[suggestionType] || followUps.general_weather;
    }

    // Limpar cache manualmente
    clearCache() {
        this.suggestionsCache.clear();
        console.log('✅ Cache de sugestões limpo');
    }

    // Obter estatísticas do cache
    getCacheStats() {
        return {
            size: this.suggestionsCache.size,
            maxSize: 100,
            expiry: this.cacheExpiry / 60000 + ' minutos'
        };
    }

    // Teste de conectividade
    async testConnection() {
        if (!this.token) {
            return {
                success: false,
                message: "Token OpenAI não configurado - usando apenas sugestões predefinidas",
                fallbackMode: true
            };
        }

        try {
            const testPrompt = 'Retorne apenas: ["Teste 1", "Teste 2", "Teste 3"]';
            const response = await this.callOpenAI(testPrompt, 0.1);
            const parsed = JSON.parse(response);

            return {
                success: true,
                message: "Conexão OpenAI OK - sugestões inteligentes disponíveis",
                test: parsed
            };
        } catch (error) {
            return {
                success: false,
                message: "Erro na conexão OpenAI - usando fallback",
                error: error.message,
                fallbackMode: true
            };
        }
    }
}

module.exports = SuggestionsHandler;
