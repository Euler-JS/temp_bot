// test_conselhos_seguranca.js - Teste específico para conselhos de segurança
require('dotenv').config();
const OPENAI = require('./open_ai/open_ai');

async function testSafetyAdvice() {
    console.log('⚠️ TESTANDO CONSELHOS DE SEGURANÇA BASEADOS NA TEMPERATURA\n');

    // Inicializar serviços
    const openaiService = new OPENAI();

    // Contexto do usuário
    const userContext = {
        queryCount: 5,
        expertiseLevel: 'basic',
        lastCity: 'Beira'
    };

    // Teste 1: Calor EXTREMO (>35°C) - MUITO PERIGOSO
    console.log('1️⃣ TESTE: Calor extremo - 37°C (PERIGOSO!)');
    console.log('═══════════════════════════════════════════');

    const extremeHeat = {
        city: 'Beira',
        temperature: 37,
        description: 'Sol muito forte',
        humidity: 85,
        units: '°C'
    };

    try {
        const advice1 = await openaiService.generateSafetyAdvice(extremeHeat, userContext);
        console.log('✅ CONSELHOS DE SEGURANÇA:');
        console.log('▬'.repeat(80));
        console.log(advice1.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${advice1.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${advice1.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 2: Calor intenso (30-32°C)
    console.log('2️⃣ TESTE: Calor intenso - 31°C');
    console.log('══════════════════════════════');

    const intenseHeat = {
        city: 'Maputo',
        temperature: 31,
        description: 'Sol forte',
        humidity: 75,
        units: '°C'
    };

    try {
        const advice2 = await openaiService.generateSafetyAdvice(intenseHeat, userContext);
        console.log('✅ CONSELHOS DE SEGURANÇA:');
        console.log('▬'.repeat(80));
        console.log(advice2.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${advice2.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${advice2.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 3: Frio (15°C)
    console.log('3️⃣ TESTE: Frio - 15°C');
    console.log('═══════════════════════');

    const coldWeather = {
        city: 'Beira',
        temperature: 15,
        description: 'Tempo nublado e ventoso',
        humidity: 80,
        units: '°C'
    };

    try {
        const advice3 = await openaiService.generateSafetyAdvice(coldWeather, userContext);
        console.log('✅ CONSELHOS DE SEGURANÇA:');
        console.log('▬'.repeat(80));
        console.log(advice3.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${advice3.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${advice3.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 4: Chuva (riscos de segurança)
    console.log('4️⃣ TESTE: Chuva forte - 23°C');
    console.log('═══════════════════════════════');

    const rainyWeather = {
        city: 'Beira',
        temperature: 23,
        description: 'Chuva forte com ventos',
        humidity: 95,
        units: '°C'
    };

    try {
        const advice4 = await openaiService.generateSafetyAdvice(rainyWeather, userContext);
        console.log('✅ CONSELHOS DE SEGURANÇA:');
        console.log('▬'.repeat(80));
        console.log(advice4.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${advice4.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${advice4.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 5: Frio EXTREMO (<10°C) - MUITO PERIGOSO
    console.log('5️⃣ TESTE: Frio extremo - 8°C (PERIGOSO!)');
    console.log('═══════════════════════════════════════');

    const extremeCold = {
        city: 'Lichinga',
        temperature: 8,
        description: 'Muito frio com vento forte',
        humidity: 70,
        units: '°C'
    };

    try {
        const advice5 = await openaiService.generateSafetyAdvice(extremeCold, userContext);
        console.log('✅ CONSELHOS DE SEGURANÇA:');
        console.log('▬'.repeat(80));
        console.log(advice5.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${advice5.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${advice5.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    // Teste 6: Temperatura normal mas alta humidade
    console.log('6️⃣ TESTE: Temperatura normal mas alta humidade - 26°C');
    console.log('═══════════════════════════════════════════════════════');

    const highHumidity = {
        city: 'Quelimane',
        temperature: 26,
        description: 'Abafado',
        humidity: 95,
        units: '°C'
    };

    try {
        const advice6 = await openaiService.generateSafetyAdvice(highHumidity, userContext);
        console.log('✅ CONSELHOS DE SEGURANÇA:');
        console.log('▬'.repeat(80));
        console.log(advice6.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${advice6.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${advice6.method}\n`);
    } catch (error) {
        console.error('❌ Erro:', error.message, '\n');
    }

    console.log('🎯 TESTE DE CONSELHOS DE SEGURANÇA CONCLUÍDO!');
    console.log('📈 As respostas devem ser:');
    console.log('  • Focadas em SEGURANÇA e prevenção de perigos');
    console.log('  • Explicar PORQUÊ cada temperatura é perigosa');
    console.log('  • Dar sinais de alerta para reconhecer problemas');
    console.log('  • Em português moçambicano natural');
    console.log('  • Sérias quando falar de perigos, mas amigáveis');
    console.log('  • SEM listas estruturadas - conversacionais');
}

// Executar o teste
testSafetyAdvice().catch(console.error);
