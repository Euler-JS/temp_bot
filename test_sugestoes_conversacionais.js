// test_sugestoes_conversacionais.js - Teste específico para comando /sugestoes
require('dotenv').config();
const OPENAI = require('./open_ai/open_ai');
const WeatherService = require('./weather_api/weather_service');

async function testSuggestionsCommand() {
    console.log('💡 TESTANDO COMANDO /SUGESTOES CONVERSACIONAL\n');

    // Inicializar serviços
    const openaiService = new OPENAI();
    const weatherService = new WeatherService();

    // Simular dados de usuário
    const userContext = {
        preferredCity: 'Beira',
        lastCity: 'Beira',
        queryCount: 8,
        expertiseLevel: 'basic',
        conversationHistory: [],
        weatherPreferences: {}
    };

    // Teste 1: Tempo normal (25°C)
    console.log('1️⃣ TESTE: Temperatura normal (25°C)');
    console.log('═══════════════════════════════════════');

    const weatherData1 = {
        city: 'Beira',
        temperature: 25,
        description: 'Tempo limpo',
        humidity: 65,
        units: '°C'
    };

    try {
        const suggestions1 = await openaiService.generateConversationalSuggestions(weatherData1, userContext);
        console.log('✅ RESPOSTA CONVERSACIONAL:');
        console.log('▬'.repeat(80));
        console.log(suggestions1.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${suggestions1.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${suggestions1.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 2: Tempo quente (33°C)
    console.log('2️⃣ TESTE: Calor intenso (33°C)');
    console.log('═══════════════════════════════');

    const weatherData2 = {
        city: 'Beira',
        temperature: 33,
        description: 'Sol forte',
        humidity: 80,
        units: '°C'
    };

    try {
        const suggestions2 = await openaiService.generateConversationalSuggestions(weatherData2, userContext);
        console.log('✅ RESPOSTA CONVERSACIONAL:');
        console.log('▬'.repeat(80));
        console.log(suggestions2.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${suggestions2.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${suggestions2.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 3: Tempo frio (16°C)
    console.log('3️⃣ TESTE: Tempo frio (16°C)');
    console.log('═══════════════════════════');

    const weatherData3 = {
        city: 'Beira',
        temperature: 16,
        description: 'Tempo nublado',
        humidity: 75,
        units: '°C'
    };

    try {
        const suggestions3 = await openaiService.generateConversationalSuggestions(weatherData3, userContext);
        console.log('✅ RESPOSTA CONVERSACIONAL:');
        console.log('▬'.repeat(80));
        console.log(suggestions3.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${suggestions3.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${suggestions3.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 4: Tempo chuvoso
    console.log('4️⃣ TESTE: Tempo chuvoso (22°C)');
    console.log('═══════════════════════════════');

    const weatherData4 = {
        city: 'Beira',
        temperature: 22,
        description: 'Chuva moderada',
        humidity: 90,
        units: '°C'
    };

    try {
        const suggestions4 = await openaiService.generateConversationalSuggestions(weatherData4, userContext);
        console.log('✅ RESPOSTA CONVERSACIONAL:');
        console.log('▬'.repeat(80));
        console.log(suggestions4.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${suggestions4.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${suggestions4.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 5: Usuário novo vs experiente
    console.log('5️⃣ TESTE: Usuário experiente');
    console.log('══════════════════════════════');

    const experiencedUserContext = {
        preferredCity: 'Maputo',
        lastCity: 'Maputo',
        queryCount: 45,
        expertiseLevel: 'advanced',
        conversationHistory: [],
        weatherPreferences: {}
    };

    const weatherData5 = {
        city: 'Maputo',
        temperature: 28,
        description: 'Parcialmente nublado',
        humidity: 70,
        units: '°C'
    };

    try {
        const suggestions5 = await openaiService.generateConversationalSuggestions(weatherData5, experiencedUserContext);
        console.log('✅ RESPOSTA CONVERSACIONAL:');
        console.log('▬'.repeat(80));
        console.log(suggestions5.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${suggestions5.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${suggestions5.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    console.log('🎯 TESTE DO COMANDO /SUGESTOES CONCLUÍDO!');
    console.log('📈 As respostas devem ser:');
    console.log('  • Muito conversacionais em português moçambicano');
    console.log('  • SEM listas numeradas (1. 2. 3.)');
    console.log('  • SEM bullets estruturados (•)');
    console.log('  • Como se fosse um amigo dando sugestões');
    console.log('  • Terminando com pergunta sobre o que querem saber mais');
}

// Executar o teste
testSuggestionsCommand().catch(console.error);
