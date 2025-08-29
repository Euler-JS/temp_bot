const OPENAI = require('../open_ai/open_ai');
require('dotenv').config();

// Teste específico para processamento de respostas de sugestões
async function testSuggestionResponseProcessing() {
    console.log('🧪 TESTE PROCESSAMENTO DE RESPOSTAS DE SUGESTÕES');
    console.log('================================================\n');

    // Inicializar OpenAI
    const openai = new OPENAI(process.env.OPENAI_API_KEY);

    // Dados mockados para testes
    const mockWeatherData = {
        city: "Beira",
        temperature: "28",
        description: "céu claro",
        humidity: "65",
        isForecast: false
    };

    const mockUserContext = {
        queryCount: 5,
        lastCity: "beira",
        preferredCity: "beira",
        expertiseLevel: "basic"
    };

    // Cenários de teste
    const testScenarios = [
        {
            name: "Atividades (problema original)",
            suggestion: "Há alguma atividade",
            expectedType: "practical_tips_activities"
        },
        {
            name: "Atividades variação",
            suggestion: "Atividades hoje",
            expectedType: "practical_tips_activities"
        },
        {
            name: "Que roupa usar",
            suggestion: "Que roupa usar?",
            expectedType: "practical_tips_clothing"
        },
        {
            name: "Dicas para calor",
            suggestion: "Dicas calor",
            expectedType: "practical_tips_hot"
        },
        {
            name: "Tempo amanhã",
            suggestion: "Tempo amanhã?",
            expectedType: "weather_forecast_tomorrow"
        },
        {
            name: "Vai chover",
            suggestion: "Vai chover?",
            expectedType: "weather_forecast_rain"
        },
        {
            name: "Previsão 7 dias",
            suggestion: "Previsão 7 dias",
            expectedType: "weather_forecast_week"
        },
        {
            name: "Comparar cidades",
            suggestion: "Comparar cidades",
            expectedType: "weather_comparison_cities"
        },
        {
            name: "Ajuda",
            suggestion: "Ajuda",
            expectedType: "system_help"
        }
    ];

    console.log('1️⃣ Testando diferentes tipos de sugestões...\n');

    for (const scenario of testScenarios) {
        console.log(`🔹 Testando: ${scenario.name}`);
        console.log(`   Texto: "${scenario.suggestion}"`);

        try {
            const result = await openai.processSuggestionResponse(
                scenario.suggestion,
                mockWeatherData,
                mockUserContext
            );

            console.log(`   ✅ Tipo identificado: ${result.suggestionType}`);
            console.log(`   📝 Resposta: ${result.response.substring(0, 100)}...`);
            console.log(`   💡 Sugestões follow-up: ${result.suggestions.join(', ')}`);

            // Verificar se o tipo está correto
            if (result.suggestionType === scenario.expectedType) {
                console.log(`   ✅ Tipo correto!`);
            } else {
                console.log(`   ⚠️  Esperado: ${scenario.expectedType}, Obtido: ${result.suggestionType}`);
            }

        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}`);
        }

        console.log('');
    }

    // Teste específico com dados de chuva
    console.log('2️⃣ Testando com condições de chuva...\n');

    const rainyWeather = {
        ...mockWeatherData,
        temperature: "22",
        description: "chuva moderada"
    };

    const rainScenarios = [
        "Há alguma atividade",
        "Que roupa usar?",
        "Dicas chuva"
    ];

    for (const suggestion of rainScenarios) {
        console.log(`🌧️ Testando "${suggestion}" com chuva:`);

        const result = await openai.processSuggestionResponse(
            suggestion,
            rainyWeather,
            mockUserContext
        );

        console.log(`   📝 Resposta: ${result.response.substring(0, 150)}...`);
        console.log(`   💡 Sugestões: ${result.suggestions.join(', ')}`);
        console.log('');
    }

    // Teste específico com calor extremo
    console.log('3️⃣ Testando com calor extremo...\n');

    const hotWeather = {
        ...mockWeatherData,
        temperature: "36",
        description: "sol intenso"
    };

    const hotScenarios = [
        "Há alguma atividade",
        "Dicas calor",
        "Que roupa usar?"
    ];

    for (const suggestion of hotScenarios) {
        console.log(`🔥 Testando "${suggestion}" com calor extremo:`);

        const result = await openai.processSuggestionResponse(
            suggestion,
            hotWeather,
            mockUserContext
        );

        console.log(`   📝 Resposta: ${result.response.substring(0, 150)}...`);
        console.log(`   💡 Sugestões: ${result.suggestions.join(', ')}`);
        console.log('');
    }

    // Teste de sugestões mal interpretadas
    console.log('4️⃣ Testando correção de interpretações incorretas...\n');

    const problematicSuggestions = [
        "Há alguma atividade",          // Era interpretado como reminder
        "Alguma atividade",             // Variação
        "Atividades disponíveis",       // Outra variação
        "O que posso fazer",            // Pergunta similar
        "Recomendações atividade"       // Outro formato
    ];

    for (const suggestion of problematicSuggestions) {
        console.log(`🔧 Corrigindo interpretação de: "${suggestion}"`);

        const result = await openai.processSuggestionResponse(
            suggestion,
            mockWeatherData,
            mockUserContext
        );

        // Verificar se não é mais interpretado como reminder
        const isCorrect = result.suggestionType.includes('practical_tips') ||
            result.suggestionType.includes('activities');

        console.log(`   ${isCorrect ? '✅' : '❌'} Tipo: ${result.suggestionType}`);
        console.log(`   📝 Primeira linha: ${result.response.split('\n')[0]}`);
        console.log('');
    }

    // Teste de performance
    console.log('5️⃣ Testando performance do sistema...\n');

    const startTime = Date.now();

    for (let i = 0; i < 5; i++) {
        await openai.processSuggestionResponse(
            "Há alguma atividade",
            mockWeatherData,
            mockUserContext
        );
    }

    const endTime = Date.now();
    const averageTime = (endTime - startTime) / 5;

    console.log(`⏱️ Tempo médio de processamento: ${averageTime.toFixed(2)}ms`);
    console.log('');

    // Teste de fallback
    console.log('6️⃣ Testando fallback com dados inválidos...\n');

    const invalidScenarios = [
        { suggestion: "", weatherData: null, context: null },
        { suggestion: "texto inválido muito longo que não deveria ser uma sugestão", weatherData: {}, context: {} },
        { suggestion: null, weatherData: mockWeatherData, context: mockUserContext }
    ];

    for (let i = 0; i < invalidScenarios.length; i++) {
        console.log(`🚨 Teste fallback ${i + 1}:`);

        try {
            const result = await openai.processSuggestionResponse(
                invalidScenarios[i].suggestion,
                invalidScenarios[i].weatherData,
                invalidScenarios[i].context
            );

            console.log(`   ✅ Fallback funcionou: ${result.success ? 'Sucesso' : 'Erro controlado'}`);
            console.log(`   📝 Resposta: ${result.response.substring(0, 100)}...`);

        } catch (error) {
            console.log(`   ❌ Erro não tratado: ${error.message}`);
        }

        console.log('');
    }

    console.log('✅ TESTE COMPLETO!');
    console.log('==================');
}

// Executar teste se chamado diretamente
if (require.main === module) {
    testSuggestionResponseProcessing().catch(console.error);
}

module.exports = { testSuggestionResponseProcessing };
