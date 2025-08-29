const OPENAI = require('../open_ai/open_ai');
require('dotenv').config();

// Teste do novo sistema de sugestões
async function testSuggestionsSystem() {
    console.log('🧪 TESTE DO SISTEMA DE SUGESTÕES');
    console.log('=====================================\n');

    // Inicializar OpenAI
    const openai = new OPENAI(process.env.OPENAI_API_KEY);

    // Teste 1: Conectividade do sistema de sugestões
    console.log('1️⃣ Testando conectividade do sistema de sugestões...');
    const connectionTest = await openai.testSuggestionsSystem();
    console.log('Resultado:', connectionTest);
    console.log('');

    // Teste 2: Sugestões baseadas em regras (sem OpenAI)
    console.log('2️⃣ Testando sugestões baseadas em regras...');

    const mockAnalysis = {
        type: "weather_data",
        city: "maputo",
        intent: "consulta_temperatura",
        expertiseLevel: "basic",
        context: {
            timeframe: "hoje",
            weatherAspect: "temperatura"
        }
    };

    const mockWeatherData = {
        city: "Maputo",
        temperature: "28",
        description: "céu claro",
        humidity: "65",
        isForecast: false
    };

    const mockUserContext = {
        queryCount: 3,
        lastCity: "maputo",
        preferredCity: "maputo",
        expertiseLevel: "basic"
    };

    // Forçar uso de regras desabilitando token temporariamente
    const originalToken = openai.suggestionsHandler.token;
    openai.suggestionsHandler.token = null;

    const ruleBasedSuggestions = await openai.generateIntelligentSuggestions(
        mockAnalysis,
        mockWeatherData,
        mockUserContext
    );

    console.log('Sugestões baseadas em regras:', ruleBasedSuggestions);

    // Restaurar token
    openai.suggestionsHandler.token = originalToken;
    console.log('');

    // Teste 3: Sugestões inteligentes (com OpenAI se disponível)
    if (connectionTest.success) {
        console.log('3️⃣ Testando sugestões inteligentes com OpenAI...');

        const intelligentSuggestions = await openai.generateIntelligentSuggestions(
            mockAnalysis,
            mockWeatherData,
            mockUserContext
        );

        console.log('Sugestões inteligentes:', intelligentSuggestions);
        console.log('');
    }

    // Teste 4: Diferentes contextos climáticos
    console.log('4️⃣ Testando diferentes contextos climáticos...');

    const testScenarios = [
        {
            name: "Chuva",
            weatherData: { ...mockWeatherData, description: "chuva moderada", temperature: "22" }
        },
        {
            name: "Calor extremo",
            weatherData: { ...mockWeatherData, description: "sol intenso", temperature: "35" }
        },
        {
            name: "Frio",
            weatherData: { ...mockWeatherData, description: "nublado", temperature: "12" }
        },
        {
            name: "Previsão amanhã",
            weatherData: {
                ...mockWeatherData,
                isForecast: true,
                minTemp: "20",
                maxTemp: "30",
                description: "parcialmente nublado"
            }
        }
    ];

    for (const scenario of testScenarios) {
        console.log(`   ${scenario.name}:`);
        const suggestions = await openai.generateIntelligentSuggestions(
            mockAnalysis,
            scenario.weatherData,
            mockUserContext
        );
        console.log(`   → ${suggestions.join(', ')}`);
    }
    console.log('');

    // Teste 5: Diferentes níveis de expertise
    console.log('5️⃣ Testando diferentes níveis de expertise...');

    const expertiseLevels = ['basic', 'intermediate', 'advanced'];

    for (const level of expertiseLevels) {
        const levelAnalysis = { ...mockAnalysis, expertiseLevel: level };
        const levelContext = { ...mockUserContext, expertiseLevel: level };

        const suggestions = await openai.generateIntelligentSuggestions(
            levelAnalysis,
            mockWeatherData,
            levelContext
        );

        console.log(`   ${level}: ${suggestions.join(', ')}`);
    }
    console.log('');

    // Teste 6: Sugestões predefinidas por contexto
    console.log('6️⃣ Testando sugestões predefinidas por contexto...');

    const contexts = ['weather_basic', 'weather_rain', 'weather_hot', 'activities', 'help'];

    for (const context of contexts) {
        const suggestions = await openai.getSuggestionsForContext(context);
        console.log(`   ${context}: ${suggestions.join(', ')}`);
    }
    console.log('');

    // Teste 7: Cache e performance
    console.log('7️⃣ Testando cache e performance...');

    const startTime = Date.now();

    // Primeira chamada (sem cache)
    await openai.generateIntelligentSuggestions(mockAnalysis, mockWeatherData, mockUserContext);
    const firstCallTime = Date.now() - startTime;

    // Segunda chamada (com cache)
    const secondStartTime = Date.now();
    await openai.generateIntelligentSuggestions(mockAnalysis, mockWeatherData, mockUserContext);
    const secondCallTime = Date.now() - secondStartTime;

    console.log(`   Primeira chamada: ${firstCallTime}ms`);
    console.log(`   Segunda chamada (cache): ${secondCallTime}ms`);
    console.log(`   Melhoria: ${Math.round((1 - secondCallTime / firstCallTime) * 100)}%`);

    const cacheStats = openai.getSuggestionsStats();
    console.log('   Estatísticas do cache:', cacheStats);
    console.log('');

    // Teste 8: Validação e tratamento de erros
    console.log('8️⃣ Testando validação e tratamento de erros...');

    // Dados inválidos
    const invalidAnalysis = null;
    const invalidWeatherData = {};

    const errorSuggestions = await openai.generateIntelligentSuggestions(
        invalidAnalysis,
        invalidWeatherData,
        {}
    );

    console.log('   Sugestões com dados inválidos:', errorSuggestions);
    console.log('');

    // Limpeza
    console.log('9️⃣ Limpando cache...');
    openai.clearSuggestionsCache();
    console.log('   Cache limpo!');
    console.log('');

    console.log('✅ TESTE COMPLETO!');
    console.log('=====================================');
}

// Executar teste se chamado diretamente
if (require.main === module) {
    testSuggestionsSystem().catch(console.error);
}

module.exports = { testSuggestionsSystem };
