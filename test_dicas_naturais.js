// test_dicas_naturais.js - Teste específico para dicas práticas naturais
require('dotenv').config();
const OPENAI = require('./open_ai/open_ai');
const WeatherService = require('./weather_api/weather_service');

async function testPracticalTips() {
    console.log('🎯 TESTANDO DICAS PRÁTICAS NATURAIS\n');

    // Inicializar serviços
    const openaiService = new OPENAI();
    const weatherService = new WeatherService();

    // Dados simulados de clima para Beira
    const weatherData = {
        city: 'Beira',
        temperature: 24,
        description: 'Tempo limpo',
        humidity: 65,
        feelsLike: 26
    };

    const userContext = {
        queryCount: 5,
        expertiseLevel: 'basic',
        lastCity: 'Beira'
    };

    // Teste 1: Pergunta geral sobre dicas
    console.log('1️⃣ TESTE: Pergunta geral sobre dicas');
    console.log('═══════════════════════════════════');
    const analysis1 = {
        intent: 'weather_tips',
        type: 'practical_tips',
        action: 'tips',
        originalMessage: 'dicas para hoje'
    };

    try {
        const tips1 = await openaiService.generatePracticalTips(analysis1, weatherData, userContext);
        console.log('✅ RESPOSTA GERADA COM AI:');
        console.log('▬'.repeat(60));
        console.log(tips1.message);
        console.log('▬'.repeat(60));
        console.log(`📊 Status: ${tips1.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${tips1.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 2: Pergunta específica sobre roupa
    console.log('2️⃣ TESTE: Pergunta sobre roupa');
    console.log('═══════════════════════════════');
    const analysis2 = {
        intent: 'clothing_advice',
        type: 'practical_tips',
        action: 'clothing',
        originalMessage: 'que roupa usar hoje'
    };

    try {
        const tips2 = await openaiService.generatePracticalTips(analysis2, weatherData, userContext);
        console.log('✅ RESPOSTA GERADA COM AI:');
        console.log('▬'.repeat(60));
        console.log(tips2.message);
        console.log('▬'.repeat(60));
        console.log(`📊 Status: ${tips2.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${tips2.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 3: Pergunta sobre atividades
    console.log('3️⃣ TESTE: Pergunta sobre atividades');
    console.log('═══════════════════════════════════');
    const analysis3 = {
        intent: 'activity_recommendation',
        type: 'practical_tips',
        action: 'activities',
        originalMessage: 'o que fazer hoje'
    };

    try {
        const tips3 = await openaiService.generatePracticalTips(analysis3, weatherData, userContext);
        console.log('✅ RESPOSTA GERADA COM AI:');
        console.log('▬'.repeat(60));
        console.log(tips3.message);
        console.log('▬'.repeat(60));
        console.log(`📊 Status: ${tips3.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${tips3.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 4: Clima mais frio para ver diferença
    console.log('4️⃣ TESTE: Dicas com tempo frio');
    console.log('══════════════════════════════');
    const coldWeather = {
        city: 'Beira',
        temperature: 16,
        description: 'Tempo nublado',
        humidity: 75,
        feelsLike: 14
    };

    const analysis4 = {
        intent: 'weather_tips',
        type: 'practical_tips',
        action: 'tips',
        originalMessage: 'dicas para o frio'
    };

    try {
        const tips4 = await openaiService.generatePracticalTips(analysis4, coldWeather, userContext);
        console.log('✅ RESPOSTA GERADA COM AI:');
        console.log('▬'.repeat(60));
        console.log(tips4.message);
        console.log('▬'.repeat(60));
        console.log(`📊 Status: ${tips4.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${tips4.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 5: Clima muito quente
    console.log('5️⃣ TESTE: Dicas com calor intenso');
    console.log('═══════════════════════════════');
    const hotWeather = {
        city: 'Beira',
        temperature: 35,
        description: 'Sol forte',
        humidity: 80,
        feelsLike: 38
    };

    const analysis5 = {
        intent: 'weather_tips',
        type: 'practical_tips',
        action: 'tips',
        originalMessage: 'está muito quente'
    };

    try {
        const tips5 = await openaiService.generatePracticalTips(analysis5, hotWeather, userContext);
        console.log('✅ RESPOSTA GERADA COM AI:');
        console.log('▬'.repeat(60));
        console.log(tips5.message);
        console.log('▬'.repeat(60));
        console.log(`📊 Status: ${tips5.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${tips5.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    console.log('🎯 TESTE DE DICAS NATURAIS CONCLUÍDO!');
    console.log('📈 As respostas devem ser:');
    console.log('  • Muito naturais e conversacionais');
    console.log('  • Em português moçambicano casual');
    console.log('  • SEM listas rígidas com bullets');
    console.log('  • Como se fosse um amigo falando');
}

// Executar o teste
testPracticalTips().catch(console.error);
