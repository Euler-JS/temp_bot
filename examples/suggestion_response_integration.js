// Exemplo de integração no bot principal para tratar respostas de sugestões
// ========================================================================

const OPENAI = require('../open_ai/open_ai');

class BotWithSuggestionHandling {
    constructor() {
        this.openai = new OPENAI(process.env.OPENAI_API_KEY);
        this.userContexts = new Map();
    }

    // Método principal para detectar e processar sugestões
    async processMessage(userId, message, weatherData = null) {
        try {
            console.log(`📨 Processando mensagem de ${userId}: "${message}"`);

            const userContext = this.getUserContext(userId);

            // 1. Verificar se é uma resposta a sugestão
            if (this.isSuggestionResponse(message, userContext)) {
                console.log('🎯 Detectada resposta de sugestão');
                return await this.handleSuggestionResponse(userId, message, weatherData);
            }

            // 2. Processamento normal da mensagem
            return await this.handleNormalMessage(userId, message, weatherData);

        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error.message);
            return this.createErrorResponse(error.message);
        }
    }

    // Verificar se a mensagem é uma resposta de sugestão
    isSuggestionResponse(message, userContext) {
        // Verificar se foi uma sugestão enviada recentemente
        const recentSuggestions = userContext.recentSuggestions || [];

        // Lista de padrões comuns de sugestões
        const suggestionPatterns = [
            "há alguma atividade",
            "atividades hoje",
            "que roupa usar",
            "dicas calor",
            "dicas frio",
            "dicas chuva",
            "tempo amanhã",
            "previsão 7 dias",
            "vai chover",
            "comparar cidades",
            "ajuda",
            "onde ir",
            "o que fazer"
        ];

        const lowerMessage = message.toLowerCase().trim();

        // Verificar se corresponde a sugestões recentes
        if (recentSuggestions.includes(lowerMessage)) {
            return true;
        }

        // Verificar se corresponde a padrões de sugestão
        return suggestionPatterns.some(pattern =>
            lowerMessage.includes(pattern) ||
            this.calculateSimilarity(lowerMessage, pattern) > 0.8
        );
    }

    // Processar resposta de sugestão
    async handleSuggestionResponse(userId, suggestionText, weatherData) {
        try {
            console.log(`🎯 Processando resposta de sugestão: "${suggestionText}"`);

            const userContext = this.getUserContext(userId);

            // Buscar dados meteorológicos se necessário
            if (!weatherData) {
                weatherData = await this.fetchCurrentWeatherData(userContext.lastCity || 'maputo');
            }

            // Processar com o sistema especializado
            const result = await this.openai.processSuggestionResponse(
                suggestionText,
                weatherData,
                userContext
            );

            // Atualizar contexto do usuário
            this.updateUserContextAfterSuggestion(userId, suggestionText, result);

            // Preparar resposta final
            const response = {
                type: 'suggestion_response',
                message: result.response,
                suggestions: result.suggestions,
                suggestionType: result.suggestionType,
                success: result.success,
                originalSuggestion: suggestionText
            };

            console.log('✅ Resposta de sugestão processada:', {
                type: result.suggestionType,
                responseLength: result.response.length,
                newSuggestions: result.suggestions.length
            });

            return response;

        } catch (error) {
            console.error('❌ Erro ao processar resposta de sugestão:', error.message);
            return this.createSuggestionErrorResponse(suggestionText, error.message);
        }
    }

    // Processar mensagem normal (não sugestão)
    async handleNormalMessage(userId, message, weatherData) {
        console.log('📝 Processando como mensagem normal');

        const userContext = this.getUserContext(userId);

        // Análise normal da mensagem
        const analysis = await this.openai.analyzeUserMessage(message, userContext);

        if (!analysis.success) {
            return this.createErrorResponse("Erro ao analisar mensagem");
        }

        // Buscar dados meteorológicos se necessário
        if (!weatherData && analysis.analysis.type === 'weather_data') {
            weatherData = await this.fetchCurrentWeatherData(analysis.analysis.city);
        }

        // Gerar resposta contextual
        const response = await this.openai.generateContextualResponse(
            analysis.analysis,
            weatherData,
            userContext
        );

        // Gerar sugestões normais
        const suggestions = await this.openai.generateIntelligentSuggestions(
            analysis.analysis,
            weatherData,
            userContext
        );

        // Atualizar contexto
        this.updateUserContextAfterNormalMessage(userId, analysis.analysis, weatherData, suggestions);

        return {
            type: 'normal_response',
            message: response.response,
            suggestions: suggestions,
            analysis: analysis.analysis,
            success: true
        };
    }

    // ========================================
    // CASOS DE USO ESPECÍFICOS
    // ========================================

    // Simular o caso problemático original
    async simulateProblematicCase() {
        console.log('\n🔍 SIMULANDO CASO PROBLEMÁTICO ORIGINAL');
        console.log('=====================================\n');

        const userId = 'test_user_258846151124';
        const suggestionText = "Há alguma atividade";

        console.log(`👤 Usuário: ${userId}`);
        console.log(`💬 Mensagem: "${suggestionText}"`);
        console.log('🌤️ Contexto: Beira, 28°C, céu claro\n');

        // Dados meteorológicos da Beira
        const weatherData = {
            city: "Beira",
            temperature: "28",
            description: "céu claro",
            humidity: "65",
            isForecast: false
        };

        // Processar com o novo sistema
        const result = await this.processMessage(userId, suggestionText, weatherData);

        console.log('📊 RESULTADO:');
        console.log('=============');
        console.log(`✅ Tipo: ${result.type}`);
        console.log(`📋 Categoria: ${result.suggestionType || 'N/A'}`);
        console.log(`📝 Resposta: ${result.message.substring(0, 200)}...`);
        console.log(`💡 Novas sugestões: ${result.suggestions.join(', ')}`);
        console.log(`🎯 Sucesso: ${result.success}`);

        // Verificar se o problema foi resolvido
        const isFixed = result.suggestionType === 'practical_tips_activities' &&
            !result.message.includes('Lembrete Configurado') &&
            result.message.includes('Atividades');

        console.log(`\n${isFixed ? '✅' : '❌'} PROBLEMA ${isFixed ? 'RESOLVIDO' : 'AINDA EXISTE'}!`);

        if (isFixed) {
            console.log('🎉 O sistema agora interpreta corretamente a consulta sobre atividades!');
        } else {
            console.log('⚠️ O sistema ainda não está interpretando corretamente.');
        }

        return { isFixed, result };
    }

    // Demonstrar diferentes tipos de sugestões sendo tratadas corretamente
    async demonstrateVariousSuggestions() {
        console.log('\n🎭 DEMONSTRAÇÃO DE DIFERENTES SUGESTÕES');
        console.log('=====================================\n');

        const userId = 'demo_user';
        const weatherScenarios = [
            {
                name: "Dia normal",
                weather: { city: "Maputo", temperature: "26", description: "parcialmente nublado" }
            },
            {
                name: "Calor extremo",
                weather: { city: "Tete", temperature: "38", description: "sol intenso" }
            },
            {
                name: "Chuva",
                weather: { city: "Beira", temperature: "22", description: "chuva moderada" }
            },
            {
                name: "Frio",
                weather: { city: "Maputo", temperature: "14", description: "nublado" }
            }
        ];

        const suggestions = [
            "Há alguma atividade",
            "Que roupa usar?",
            "Dicas calor",
            "Vai chover?",
            "Tempo amanhã?"
        ];

        for (const scenario of weatherScenarios) {
            console.log(`🌤️ Cenário: ${scenario.name} (${scenario.weather.city}, ${scenario.weather.temperature}°C)`);

            for (const suggestion of suggestions) {
                const result = await this.processMessage(userId, suggestion, scenario.weather);
                console.log(`   "${suggestion}" → ${result.suggestionType} (${result.success ? 'OK' : 'ERRO'})`);
            }
            console.log('');
        }
    }

    // ========================================
    // GESTÃO DE CONTEXTO
    // ========================================

    getUserContext(userId) {
        if (!this.userContexts.has(userId)) {
            this.userContexts.set(userId, {
                queryCount: 0,
                lastCity: null,
                preferredCity: null,
                expertiseLevel: "basic",
                conversationHistory: [],
                recentSuggestions: [],
                lastInteraction: Date.now()
            });
        }
        return this.userContexts.get(userId);
    }

    updateUserContextAfterSuggestion(userId, suggestionText, result) {
        const context = this.getUserContext(userId);

        // Adicionar sugestão ao histórico
        context.recentSuggestions = context.recentSuggestions || [];
        context.recentSuggestions.push(suggestionText.toLowerCase());

        // Manter apenas últimas 5 sugestões
        if (context.recentSuggestions.length > 5) {
            context.recentSuggestions = context.recentSuggestions.slice(-5);
        }

        // Atualizar estatísticas
        context.queryCount += 1;
        context.lastInteraction = Date.now();

        // Armazenar novas sugestões para próxima detecção
        if (result.suggestions) {
            context.recentSuggestions.push(...result.suggestions.map(s => s.toLowerCase()));
        }
    }

    updateUserContextAfterNormalMessage(userId, analysis, weatherData, suggestions) {
        const context = this.getUserContext(userId);

        context.queryCount += 1;
        context.lastInteraction = Date.now();

        if (analysis.city) {
            context.lastCity = analysis.city;
        }

        // Armazenar sugestões para detecção futura
        if (suggestions) {
            context.recentSuggestions = suggestions.map(s => s.toLowerCase());
        }
    }

    // ========================================
    // MÉTODOS AUXILIARES
    // ========================================

    calculateSimilarity(str1, str2) {
        // Algoritmo simples de similaridade (Dice coefficient)
        const bigrams1 = this.getBigrams(str1);
        const bigrams2 = this.getBigrams(str2);

        const intersection = bigrams1.filter(bigram => bigrams2.includes(bigram));
        return (2 * intersection.length) / (bigrams1.length + bigrams2.length);
    }

    getBigrams(str) {
        const bigrams = [];
        for (let i = 0; i < str.length - 1; i++) {
            bigrams.push(str.substring(i, i + 2));
        }
        return bigrams;
    }

    async fetchCurrentWeatherData(city) {
        // Simulação - substituir pela API real
        return {
            city: city,
            temperature: "26",
            description: "parcialmente nublado",
            humidity: "70",
            isForecast: false
        };
    }

    createErrorResponse(message) {
        return {
            type: 'error',
            message: `❌ ${message}`,
            suggestions: ["Ajuda", "Tentar novamente", "Comandos"],
            success: false
        };
    }

    createSuggestionErrorResponse(suggestionText, error) {
        return {
            type: 'suggestion_error',
            message: `❌ Erro ao processar "${suggestionText}": ${error}`,
            suggestions: ["Tentar novamente", "Ajuda", "Outras opções"],
            success: false,
            originalSuggestion: suggestionText
        };
    }

    // ========================================
    // DEMONSTRAÇÃO COMPLETA
    // ========================================

    async runCompleteDemo() {
        console.log('\n🚀 DEMONSTRAÇÃO COMPLETA DO SISTEMA');
        console.log('===================================\n');

        // 1. Simular o caso problemático
        console.log('1️⃣ Simulando caso problemático original...');
        const problematicResult = await this.simulateProblematicCase();

        // 2. Demonstrar várias sugestões
        console.log('\n2️⃣ Demonstrando tratamento de várias sugestões...');
        await this.demonstrateVariousSuggestions();

        // 3. Teste de performance
        console.log('\n3️⃣ Teste de performance...');
        const startTime = Date.now();

        for (let i = 0; i < 10; i++) {
            await this.processMessage('perf_test', 'Há alguma atividade', {
                city: "Maputo", temperature: "25", description: "ensolarado"
            });
        }

        const endTime = Date.now();
        const avgTime = (endTime - startTime) / 10;
        console.log(`⏱️ Tempo médio por processamento: ${avgTime.toFixed(2)}ms`);

        // 4. Resumo
        console.log('\n📋 RESUMO');
        console.log('=========');
        console.log(`✅ Problema original: ${problematicResult.isFixed ? 'RESOLVIDO' : 'PENDENTE'}`);
        console.log(`📊 Performance: ${avgTime < 50 ? 'EXCELENTE' : avgTime < 100 ? 'BOA' : 'ACEITÁVEL'}`);
        console.log(`🎯 Sistema funcionando: ${problematicResult.result.success ? 'SIM' : 'NÃO'}`);

        return {
            problemFixed: problematicResult.isFixed,
            averageTime: avgTime,
            systemWorking: problematicResult.result.success
        };
    }
}

// Exportar classe
module.exports = BotWithSuggestionHandling;

// Executar demonstração se chamado diretamente
if (require.main === module) {
    const bot = new BotWithSuggestionHandling();
    bot.runCompleteDemo()
        .then(result => {
            console.log('\n🎉 Demonstração concluída!');
            console.log('Resultado:', result);
        })
        .catch(console.error);
}
