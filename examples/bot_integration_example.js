// Exemplo de integração do Sistema de Sugestões no Bot Principal
// ==============================================================

const OPENAI = require('./open_ai/open_ai');

class BotWithSuggestions {
    constructor() {
        // Inicializar OpenAI com o novo sistema de sugestões
        this.openai = new OPENAI(process.env.OPENAI_API_KEY);

        // Cache para contexto do usuário
        this.userContexts = new Map();
    }

    // Método principal para processar mensagens do usuário
    async processUserMessage(userId, message, weatherData = null) {
        try {
            console.log(`📨 Processando mensagem do usuário ${userId}: "${message}"`);

            // 1. Obter contexto do usuário
            const userContext = this.getUserContext(userId);

            // 2. Analisar a mensagem
            const analysis = await this.openai.analyzeUserMessage(message, userContext);

            if (!analysis.success) {
                return this.createErrorResponse("Erro ao analisar mensagem");
            }

            // 3. Buscar dados meteorológicos se necessário
            if (!weatherData && analysis.analysis.type === 'weather_data') {
                weatherData = await this.fetchWeatherData(analysis.analysis.city);
            }

            // 4. Gerar resposta contextual
            const response = await this.openai.generateContextualResponse(
                analysis.analysis,
                weatherData,
                userContext
            );

            // 5. Gerar sugestões inteligentes
            const suggestions = await this.openai.generateIntelligentSuggestions(
                analysis.analysis,
                weatherData,
                userContext
            );

            // 6. Atualizar contexto do usuário
            this.updateUserContext(userId, analysis.analysis, weatherData);

            // 7. Preparar resposta final
            const finalResponse = {
                message: response.response,
                suggestions: suggestions,
                analysis: analysis.analysis,
                userLevel: userContext.expertiseLevel,
                success: true
            };

            console.log('✅ Resposta gerada com sugestões:', {
                messageLength: finalResponse.message.length,
                suggestionsCount: finalResponse.suggestions.length,
                suggestions: finalResponse.suggestions
            });

            return finalResponse;

        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error.message);
            return this.createErrorResponse("Erro interno", error.message);
        }
    }

    // Método específico para gerar apenas sugestões
    async generateSuggestionsOnly(userId, currentWeather, context = {}) {
        try {
            console.log(`🎯 Gerando apenas sugestões para usuário ${userId}`);

            const userContext = this.getUserContext(userId);

            // Análise simples para sugestões
            const mockAnalysis = {
                type: "weather_data",
                city: context.city || userContext.lastCity || "maputo",
                intent: "consulta_geral",
                expertiseLevel: userContext.expertiseLevel || "basic"
            };

            const suggestions = await this.openai.generateIntelligentSuggestions(
                mockAnalysis,
                currentWeather,
                userContext
            );

            console.log('✅ Sugestões geradas:', suggestions);
            return suggestions;

        } catch (error) {
            console.error('❌ Erro ao gerar sugestões:', error.message);
            return this.getFallbackSuggestions();
        }
    }

    // Método para responder a sugestões clicadas
    async handleSuggestionClick(userId, suggestionText, currentWeather) {
        try {
            console.log(`🔘 Usuário ${userId} clicou na sugestão: "${suggestionText}"`);

            // Processar a sugestão como uma nova mensagem
            const response = await this.processUserMessage(userId, suggestionText, currentWeather);

            // Adicionar contexto de que foi uma sugestão clicada
            response.fromSuggestion = true;
            response.originalSuggestion = suggestionText;

            return response;

        } catch (error) {
            console.error('❌ Erro ao processar sugestão:', error.message);
            return this.createErrorResponse("Erro ao processar sugestão");
        }
    }

    // Método para obter sugestões por contexto específico
    async getSuggestionsForContext(userId, context, userLevel = 'basic') {
        try {
            const handler = this.openai.getSuggestionsHandler();
            const suggestions = handler.getSuggestionsForContext(context, userLevel);

            console.log(`📋 Sugestões para contexto "${context}":`, suggestions);
            return suggestions;

        } catch (error) {
            console.error('❌ Erro ao obter sugestões por contexto:', error.message);
            return this.getFallbackSuggestions();
        }
    }

    // ========================================
    // GESTÃO DE CONTEXTO DO USUÁRIO
    // ========================================

    getUserContext(userId) {
        if (!this.userContexts.has(userId)) {
            this.userContexts.set(userId, {
                queryCount: 0,
                lastCity: null,
                preferredCity: null,
                expertiseLevel: "basic",
                conversationHistory: [],
                lastInteraction: Date.now(),
                preferences: {}
            });
        }

        const context = this.userContexts.get(userId);

        // Limpar contexto antigo (mais de 24 horas)
        if (Date.now() - context.lastInteraction > 24 * 60 * 60 * 1000) {
            context.conversationHistory = [];
            context.queryCount = 0;
        }

        return context;
    }

    updateUserContext(userId, analysis, weatherData) {
        const context = this.getUserContext(userId);

        // Incrementar contador de consultas
        context.queryCount += 1;

        // Atualizar cidade
        if (analysis.city) {
            context.lastCity = analysis.city;
            if (!context.preferredCity) {
                context.preferredCity = analysis.city;
            }
        }

        // Atualizar nível de expertise baseado na experiência
        if (context.queryCount > 10 && context.expertiseLevel === 'basic') {
            context.expertiseLevel = 'intermediate';
            console.log(`📈 Usuário ${userId} promovido para nível intermediário`);
        } else if (context.queryCount > 25 && context.expertiseLevel === 'intermediate') {
            context.expertiseLevel = 'advanced';
            console.log(`📈 Usuário ${userId} promovido para nível avançado`);
        }

        // Adicionar ao histórico
        context.conversationHistory.push({
            message: analysis.intent,
            city: analysis.city,
            intent: analysis.intent,
            timestamp: Date.now()
        });

        // Manter apenas últimas 10 interações
        if (context.conversationHistory.length > 10) {
            context.conversationHistory = context.conversationHistory.slice(-10);
        }

        context.lastInteraction = Date.now();
    }

    // ========================================
    // MÉTODOS AUXILIARES
    // ========================================

    async fetchWeatherData(city) {
        // Simulação - substituir pela API real
        return {
            city: city,
            temperature: "26",
            description: "parcialmente nublado",
            humidity: "70",
            isForecast: false
        };
    }

    createErrorResponse(message, details = null) {
        return {
            message: `❌ ${message}${details ? `: ${details}` : ''}`,
            suggestions: this.getFallbackSuggestions(),
            success: false,
            error: true
        };
    }

    getFallbackSuggestions() {
        return ["Ajuda", "Tempo hoje", "Mais info"];
    }

    // ========================================
    // MÉTODOS DE DIAGNÓSTICO
    // ========================================

    async testSuggestionsSystem() {
        try {
            console.log('🔧 Testando sistema de sugestões...');

            const test = await this.openai.testSuggestionsSystem();
            console.log('Resultado do teste:', test);

            if (test.success) {
                console.log('✅ Sistema de sugestões funcionando com IA');
            } else {
                console.log('⚠️ Sistema funcionando apenas com regras (sem IA)');
            }

            return test;

        } catch (error) {
            console.error('❌ Erro no teste:', error.message);
            return { success: false, error: error.message };
        }
    }

    getSuggestionsStats() {
        return this.openai.getSuggestionsStats();
    }

    clearAllCaches() {
        this.openai.clearSuggestionsCache();
        this.userContexts.clear();
        console.log('🧹 Todos os caches limpos');
    }

    // ========================================
    // EXEMPLOS DE USO
    // ========================================

    async demonstrarUso() {
        console.log('\n🎭 DEMONSTRAÇÃO DO SISTEMA DE SUGESTÕES');
        console.log('========================================\n');

        const userId = 'demo_user_123';

        // Exemplo 1: Consulta básica
        console.log('1️⃣ Consulta básica sobre temperatura:');
        const response1 = await this.processUserMessage(
            userId,
            "qual é a temperatura em maputo?",
            { city: "Maputo", temperature: "28", description: "ensolarado" }
        );
        console.log('Resposta:', response1.message.substring(0, 100) + '...');
        console.log('Sugestões:', response1.suggestions);
        console.log('');

        // Exemplo 2: Clique em sugestão
        console.log('2️⃣ Usuário clica na sugestão "Tempo amanhã?":');
        const response2 = await this.handleSuggestionClick(
            userId,
            "Tempo amanhã?",
            { city: "Maputo", temperature: "30", description: "sol", isForecast: true }
        );
        console.log('Resposta:', response2.message.substring(0, 100) + '...');
        console.log('Sugestões:', response2.suggestions);
        console.log('');

        // Exemplo 3: Contexto de chuva
        console.log('3️⃣ Contexto de chuva:');
        const response3 = await this.processUserMessage(
            userId,
            "vai chover?",
            { city: "Maputo", temperature: "22", description: "chuva moderada" }
        );
        console.log('Sugestões específicas para chuva:', response3.suggestions);
        console.log('');

        // Exemplo 4: Usuário experiente
        console.log('4️⃣ Simulando usuário experiente:');
        const context = this.getUserContext(userId);
        context.queryCount = 30; // Simular experiência
        context.expertiseLevel = 'advanced';

        const response4 = await this.processUserMessage(
            userId,
            "análise meteorológica detalhada",
            { city: "Maputo", temperature: "32", description: "muito quente" }
        );
        console.log('Sugestões para usuário avançado:', response4.suggestions);
        console.log('');

        // Exemplo 5: Apenas sugestões
        console.log('5️⃣ Gerar apenas sugestões:');
        const suggestions = await this.generateSuggestionsOnly(
            userId,
            { city: "Beira", temperature: "35", description: "muito quente" }
        );
        console.log('Sugestões para calor extremo:', suggestions);
        console.log('');

        console.log('✅ Demonstração completa!');
    }
}

// Exportar a classe
module.exports = BotWithSuggestions;

// Execução de demonstração se chamado diretamente
if (require.main === module) {
    const bot = new BotWithSuggestions();
    bot.demonstrarUso().catch(console.error);
}
