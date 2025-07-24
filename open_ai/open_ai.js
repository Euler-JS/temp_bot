// SUBSTITUIR COMPLETAMENTE o arquivo open_ai/open_ai.js por este:

require('dotenv').config();
const axios = require('axios');

class OPENAI {
    constructor(token) {
        this.token = token;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = 'gpt-3.5-turbo';
        this.maxTokens = 300;

        // Cache de preprocessamento
        this.preprocessCache = new Map();

        // Expansões e correções comuns
        this.expansions = {
            'temp': 'temperatura',
            'mpt': 'maputo',
            'bra': 'beira',
            'prev': 'previsão',
            'clma': 'clima',
            'amnh': 'amanhã',
            'hje': 'hoje'
        };

        // Cidades com correções
        this.cityCorrections = {
            'maptu': 'maputo',
            'beira': 'beira',
            'nampla': 'nampula',
            'queliman': 'quelimane',
            'teet': 'tete',
            'pemb': 'pemba'
        };

        if (!token) {
            throw new Error('Token da OpenAI é obrigatório');
        }
    }

    // ===============================================
    // PREPROCESSAMENTO INTELIGENTE
    // ===============================================

    preprocessMessage(message, userContext = {}) {
        // Cache key
        const cacheKey = `${message}_${userContext?.expertise || 'basic'}`;
        if (this.preprocessCache.has(cacheKey)) {
            return this.preprocessCache.get(cacheKey);
        }

        let processed = message.toLowerCase().trim();

        // 1. Expandir abreviações
        Object.entries(this.expansions).forEach(([abbr, full]) => {
            const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
            processed = processed.replace(regex, full);
        });

        // 2. Corrigir nomes de cidades
        Object.entries(this.cityCorrections).forEach(([wrong, correct]) => {
            const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
            processed = processed.replace(regex, correct);
        });

        // 3. Detectar contexto implícito
        processed = this.addImplicitContext(processed, userContext);

        // 4. Normalizar duplicações
        processed = this.removeDuplicates(processed);

        const result = {
            original: message,
            processed: processed,
            changes: processed !== message.toLowerCase().trim()
        };

        // Cache resultado
        this.preprocessCache.set(cacheKey, result);
        return result;
    }

    addImplicitContext(message, userContext) {
        // Se mensagem vaga e tem contexto anterior
        if (['e amanhã?', 'e depois?', 'e hoje?', 'e agora?'].includes(message) && userContext.lastCity) {
            return `${message} em ${userContext.lastCity}`;
        }

        // Adicionar cidade padrão se não mencionada
        if (this.isWeatherQuery(message) && !this.hasCity(message) && userContext.preferredCity) {
            return `${message} em ${userContext.preferredCity}`;
        }

        return message;
    }

    removeDuplicates(message) {
        // Remove palavras repetidas consecutivas
        return message.replace(/\b(\w+)\s+\1\b/gi, '$1');
    }

    isWeatherQuery(message) {
        const weatherWords = ['clima', 'tempo', 'temperatura', 'chuva', 'sol', 'vento'];
        return weatherWords.some(word => message.includes(word));
    }

    hasCity(message) {
        const cities = ['maputo', 'beira', 'nampula', 'quelimane', 'tete', 'pemba'];
        return cities.some(city => message.includes(city));
    }

    // ===============================================
    // ANÁLISE INTELIGENTE COM CONTEXTO
    // ===============================================

    async analyzeUserMessage(message, userContext = {}) {
        try {
            // 1. Preprocessar mensagem
            const preprocessed = this.preprocessMessage(message, userContext);

            // 2. Determinar nível de expertise
            const expertiseLevel = this.determineExpertiseLevel(userContext);

            // 3. Construir prompt com contexto completo
            const prompt = this.buildContextualAnalysisPrompt(
                preprocessed.processed,
                userContext,
                expertiseLevel
            );

            const response = await this.callOpenAI(prompt, 0.1);
            const analysis = JSON.parse(response);

            return {
                success: true,
                analysis: {
                    ...analysis,
                    expertiseLevel: expertiseLevel,
                    preprocessed: preprocessed.changes,
                    originalMessage: message,
                    processedMessage: preprocessed.processed
                }
            };

        } catch (error) {
            console.error('Erro ao analisar mensagem:', error.message);
            return {
                success: false,
                analysis: this.createAdvancedFallback(message, userContext),
                error: error.message
            };
        }
    }

    determineExpertiseLevel(userContext) {
        const queryCount = userContext.queryCount || 0;
        const complexity = userContext.preferredComplexity;

        // Override manual
        if (complexity) return complexity;

        // Baseado em número de consultas
        if (queryCount < 3) return 'basic';
        if (queryCount < 10) return 'intermediate';
        return 'advanced';
    }

    buildContextualAnalysisPrompt(message, userContext, expertiseLevel) {
        const conversationHistory = userContext.conversationHistory || [];
        const lastCity = userContext.lastCity;
        const preferredCity = userContext.preferredCity;

        return `
Você é um analisador meteorológico avançado com memória contextual.

MENSAGEM ATUAL: "${message}"
NÍVEL DO USUÁRIO: ${expertiseLevel}
CIDADE PREFERIDA: ${preferredCity || 'nenhuma'}
ÚLTIMA CIDADE CONSULTADA: ${lastCity || 'nenhuma'}

HISTÓRICO DE CONVERSA (últimas 3 interações):
${conversationHistory.slice(-3).map((h, i) =>
            `${i + 1}. "${h.message}" → ${h.intent} (${h.city || 'sem cidade'})`
        ).join('\n') || 'Primeira interação'}

PERFIL DO USUÁRIO:
- Total de consultas: ${userContext.queryCount || 0}
- Padrão de consultas: ${this.analyzeQueryPattern(conversationHistory)}
- Complexidade preferida: ${expertiseLevel}

RETORNE APENAS JSON:
{
    "type": "weather_data | weather_education | comparison | reminder | off_topic",
    "city": "cidade_extraída",
    "intent": "intenção_específica", 
    "action": "ação_a_executar",
    "confidence": 0.95,
    "context": {
        "isFollowUp": true/false,
        "implicitCity": "cidade_implícita_do_contexto",
        "timeframe": "hoje|amanha|semana",
        "complexity": "basic|intermediate|advanced",
        "weatherAspect": "temperatura|chuva|vento|geral"
    },
    "suggestions": [
        "pergunta_relacionada_1",
        "pergunta_relacionada_2"
    ],
    "userProfile": {
        "updateExpertise": "manter|aumentar|diminuir",
        "preferredStyle": "casual|technical|detailed"
    }
}

EXEMPLOS CONTEXTUAIS:
- Se disse "e amanhã?" após consulta de Maputo → "amanhã Maputo"
- Se sempre pergunta sobre mesma cidade → use cidade padrão
- Se é usuário avançado → suggestions mais técnicas
        `.trim();
    }

    analyzeQueryPattern(history) {
        if (!history || history.length < 2) return 'novo_usuario';

        const cities = history.map(h => h.city).filter(Boolean);
        const uniqueCities = [...new Set(cities)];

        if (uniqueCities.length === 1) return 'cidade_fixa';
        if (uniqueCities.length > 3) return 'multiplas_cidades';
        return 'padrao_normal';
    }

    // ===============================================
    // SISTEMA DE PROMPTS ESPECIALIZADOS
    // ===============================================

    async generateContextualResponse(analysis, weatherData, userContext) {
        try {
            const { expertiseLevel, context } = analysis;
            const prompt = this.selectSpecializedPrompt(analysis, weatherData, userContext);

            const response = await this.callOpenAI(prompt, 0.7);

            // Gerar sugestões inteligentes
            const suggestions = await this.generateIntelligentSuggestions(analysis, weatherData, userContext);

            return {
                success: true,
                response: response,
                suggestions: suggestions,
                expertiseLevel: expertiseLevel
            };

        } catch (error) {
            console.error('Erro ao gerar resposta contextual:', error);
            return {
                success: false,
                response: this.createBasicResponse(weatherData),
                suggestions: [],
                error: error.message
            };
        }
    }

    selectSpecializedPrompt(analysis, weatherData, userContext) {
        const { expertiseLevel, context, intent } = analysis;
        const age = userContext.age || 'adulto';

        const baseData = `
DADOS METEOROLÓGICOS:
- Cidade: ${weatherData.city}
- Temperatura: ${weatherData.temperature}${weatherData.units}
- Sensação: ${weatherData.feelsLike}${weatherData.units}
- Umidade: ${weatherData.humidity}%
- Condições: ${weatherData.description}
        `;

        // Prompt especializado por nível
        switch (expertiseLevel) {
            case 'basic':
                return `${baseData}

USUÁRIO INICIANTE - LINGUAGEM SIMPLES:
Explique o clima de forma muito simples e prática.
- Use analogias do dia a dia
- Evite termos técnicos
- Foque no que a pessoa precisa saber para o dia
- Máximo 150 palavras
- Muitos emojis
- Dicas práticas simples

Resposta amigável para iniciante:`;

            case 'intermediate':
                return `${baseData}

USUÁRIO INTERMEDIÁRIO - EXPLICATIVO:
Forneça informações balanceadas com algum contexto técnico.
- Explique o "porquê" das condições
- Inclua comparações com ontem/média
- Mencione tendências
- 200-250 palavras
- Emojis moderados
- Dicas contextualizadas

Resposta educativa para intermediário:`;

            case 'advanced':
                return `${baseData}

USUÁRIO AVANÇADO - TÉCNICO:
Análise meteorológica detalhada e técnica.
- Use terminologia meteorológica apropriada
- Inclua dados de pressão, sistemas climáticos
- Análise de padrões
- 250-300 palavras
- Poucos emojis
- Insights meteorológicos profundos

Análise técnica para especialista:`;

            default:
                return this.selectSpecializedPrompt(
                    { ...analysis, expertiseLevel: 'intermediate' },
                    weatherData,
                    userContext
                );
        }
    }

    // ===============================================
    // SUGESTÕES INTELIGENTES
    // ===============================================

    async generateIntelligentSuggestions(analysis, weatherData, userContext) {
        try {
            const prompt = `
Com base nesta consulta meteorológica, gere 3 sugestões inteligentes:

CONSULTA ATUAL:
- Tipo: ${analysis.type}
- Cidade: ${analysis.city}
- Intenção: ${analysis.intent}
- Usuário: ${analysis.expertiseLevel}

DADOS CLIMÁTICOS:
- Temperatura: ${weatherData.temperature}°C
- Condições: ${weatherData.description}

HISTÓRICO USUÁRIO:
- Consultas anteriores: ${userContext.queryCount || 0}
- Padrão: ${userContext.lastCity ? `Frequentemente consulta ${userContext.lastCity}` : 'Novo usuário'}

GERE 3 SUGESTÕES RELEVANTES:
1. Follow-up natural da consulta atual
2. Informação complementar útil
3. Pergunta educativa relacionada

Formato: ["sugestão 1", "sugestão 2", "sugestão 3"]
Máximo 25 caracteres por sugestão (para botões WhatsApp).

Sugestões:`;

            const response = await this.callOpenAI(prompt, 0.8);
            return JSON.parse(response);

        } catch (error) {
            console.error('Erro ao gerar sugestões:', error);
            return this.createFallbackSuggestions(analysis, weatherData);
        }
    }

    createFallbackSuggestions(analysis, weatherData) {
        const suggestions = [];

        if (analysis.city) {
            suggestions.push(`Previsão ${analysis.city}`);
            suggestions.push(`Comparar cidades`);
        }

        if (weatherData.description.includes('chuva')) {
            suggestions.push(`Vai chover amanhã?`);
        } else if (parseInt(weatherData.temperature) > 25) {
            suggestions.push(`Dicas para calor`);
        } else {
            suggestions.push(`O que é ${weatherData.description.split(' ')[0]}?`);
        }

        return suggestions.slice(0, 3);
    }

    // ===============================================
    // COMANDOS NATURAIS AVANÇADOS
    // ===============================================

    async processAdvancedCommand(analysis, userContext) {
        const { intent, context } = analysis;

        switch (intent) {
            case 'comparar_cidades':
                return await this.handleCityComparison(analysis, userContext);

            case 'resumo_semanal':
                return await this.handleWeeklySummary(analysis, userContext);

            case 'criar_lembrete':
                return await this.handleReminderCreation(analysis, userContext);

            case 'explicar_fenomeno':
                return await this.handlePhenomenonExplanation(analysis, userContext);

            default:
                return null;
        }
    }

    async handleCityComparison(analysis, userContext) {
        const prompt = `
Usuário quer comparar clima entre cidades.
Análise: ${JSON.stringify(analysis)}
Histórico: ${userContext.lastCity || 'nenhuma'}

Crie uma resposta que:
1. Pergunte quais cidades comparar (se não especificado)
2. Ou forneça comparação se cidades foram mencionadas
3. Use formato de tabela simples
4. Destaque diferenças principais

Resposta para comparação:`;

        return await this.callOpenAI(prompt, 0.6);
    }

    async handleWeeklySummary(analysis, userContext) {
        const prompt = `
Usuário quer resumo semanal do tempo.
Cidade: ${analysis.city || userContext.preferredCity}
Nível: ${analysis.expertiseLevel}

Crie um resumo que inclua:
1. Tendência geral da semana
2. Dias melhores/piores
3. Recomendações para atividades
4. Alertas importantes

Formato ${analysis.expertiseLevel === 'basic' ? 'simples' : 'detalhado'}:`;

        return await this.callOpenAI(prompt, 0.6);
    }

    async handleReminderCreation(analysis, userContext) {
        return `🔔 *Lembrete Configurado!*

Vou te avisar sobre mudanças climáticas em ${analysis.city || userContext.preferredCity}.

⚙️ Configurações:
• Alertas de chuva: Ativado
• Mudanças bruscas de temperatura: Ativado  
• Horário preferido: ${userContext.preferredNotificationTime || '08:00'}

Para ajustar, digite "configurar alertas".`;
    }

    // ===============================================
    // UTILITÁRIOS AVANÇADOS
    // ===============================================

    createAdvancedFallback(message, userContext) {
        const preprocessed = this.preprocessMessage(message, userContext);

        return {
            type: "weather_data",
            city: userContext.lastCity || userContext.preferredCity,
            intent: "consulta_basica_fallback",
            action: "fetch_current_weather",
            confidence: 0.5,
            context: {
                isFollowUp: false,
                implicitCity: userContext.preferredCity,
                timeframe: "hoje",
                complexity: "basic",
                weatherAspect: "geral"
            },
            suggestions: ["Ajuda", "Configurações", "Histórico"],
            userProfile: {
                updateExpertise: "manter",
                preferredStyle: "casual"
            },
            preprocessed: preprocessed.changes
        };
    }

    createBasicResponse(weatherData) {
        return `🌤️ ${weatherData.city}: ${weatherData.temperature}°C, ${weatherData.description}`;
    }

    // ===============================================
    // MÉTODOS ORIGINAIS MANTIDOS
    // ===============================================

    async callOpenAI(prompt, temperature = 0.7) {
        const requestData = {
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: "Você é um assistente meteorológico especializado com capacidades avançadas de contextualização e personalização de respostas."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: this.maxTokens,
            temperature: temperature,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        };

        const response = await axios.post(
            `${this.baseURL}/chat/completions`,
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return response.data.choices[0].message.content.trim();
    }

    async testConnection() {
        try {
            const testPrompt = "Diga apenas 'Conexão OK' se você está funcionando.";
            const response = await this.callOpenAI(testPrompt);

            return {
                success: true,
                message: "Conexão com OpenAI estabelecida com sucesso!",
                response: response
            };

        } catch (error) {
            return {
                success: false,
                message: "Erro na conexão com OpenAI",
                error: error.message
            };
        }
    }
}

module.exports = OPENAI;