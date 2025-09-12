// test_prompts_naturais.js - Teste dos novos prompts mais soltos e naturais

const OPENAI = require('./open_ai/open_ai');

async function testNaturalPrompts() {
    console.log('🧪 TESTANDO PROMPTS MAIS NATURAIS E FLEXÍVEIS\n');

    const openaiService = new OPENAI();

    // Teste 1: Análise de mensagem com prompt mais solto
    console.log('1️⃣ Testando análise de mensagem...');

    const testMessages = [
        "Há alguma atividade",
        "Eish, que calor!",
        "Beira hoje",
        "Vai chover amanhã?",
        "Que roupa posso usar"
    ];

    for (const message of testMessages) {
        try {
            console.log(`\n📝 Mensagem: "${message}"`);

            const analysis = await openaiService.analyzeMessage(message, {
                queryCount: 5,
                lastCity: 'Beira',
                currentLocation: 'Maputo'
            });

            if (analysis.success) {
                console.log(`✅ Intent: ${analysis.analysis.intent}`);
                console.log(`📊 Confiança: ${analysis.analysis.confidence}`);
                console.log(`💭 Reasoning: ${analysis.analysis.reasoning}`);
            } else {
                console.log(`⚠️ Fallback usado: ${analysis.method}`);
            }

        } catch (error) {
            console.log(`❌ Erro: ${error.message}`);
        }
    }

    // Teste 2: Resposta contextual com prompt mais natural
    console.log('\n\n2️⃣ Testando resposta contextual...');

    const mockWeatherData = {
        city: 'Beira',
        temperature: 28,
        description: 'parcialmente nublado',
        humidity: 75,
        feelsLike: 31
    };

    const mockAnalysis = {
        intent: 'weather_query_current',
        confidence: 0.9,
        response_type: 'informative'
    };

    const mockUserContext = {
        queryCount: 3,
        expertiseLevel: 'basic',
        lastCity: 'Maputo'
    };

    try {
        const response = await openaiService.generateContextualResponse(
            mockAnalysis,
            mockWeatherData,
            mockUserContext
        );

        if (response.success) {
            console.log('✅ Resposta contextual gerada:');
            console.log('════════════════════════════════════════');
            console.log(response.message);
            console.log('════════════════════════════════════════');
        }
    } catch (error) {
        console.log(`❌ Erro resposta contextual: ${error.message}`);
    }

    // Teste 3: Sugestões baseadas na temperatura com prompt mais flexível
    console.log('\n\n3️⃣ Testando sugestões baseadas na temperatura...');

    const temperatureTests = [
        { temp: 35, desc: 'sol intenso' },
        { temp: 22, desc: 'parcialmente nublado' },
        { temp: 16, desc: 'nublado' }
    ];

    for (const test of temperatureTests) {
        try {
            console.log(`\n🌡️ Testando ${test.temp}°C - ${test.desc}`);

            const weatherForSuggestions = {
                temperature: test.temp,
                description: test.desc,
                humidity: 70,
                city: 'Beira'
            };

            const suggestions = await openaiService.generateTemperatureBasedSuggestions(
                weatherForSuggestions,
                'Beira',
                { userPhone: 'teste' }
            );

            if (suggestions.success) {
                console.log(`✅ Sugestões para ${test.temp}°C:`, suggestions.suggestions);
                console.log(`🔧 Método: ${suggestions.method}`);
            } else {
                console.log(`⚠️ Fallback usado:`, suggestions.suggestions);
            }

        } catch (error) {
            console.log(`❌ Erro sugestões: ${error.message}`);
        }
    }

    // Teste 4: Verificar diferença entre prompts antigos vs novos
    console.log('\n\n4️⃣ Comparando estilo de prompts...');
    console.log('🔄 PROMPT ANTIGO: Muito estruturado, formal, categórico');
    console.log('✨ PROMPT NOVO: Natural, conversacional, flexível');
    console.log('\n📝 Exemplo de diferença:');
    console.log('ANTIGO: "SISTEMA: Assistente meteorológico AI para Moçambique"');
    console.log('NOVO: " sou um assistente que entende bem como os moçambicanos falam sobre o tempo"');

    console.log('\n🎯 RESULTADO ESPERADO:');
    console.log('- Análises mais precisas para linguagem moçambicana');
    console.log('- Respostas mais naturais e menos robóticas');
    console.log('- Melhor compreensão de contexto cultural');
    console.log('- Sugestões mais adequadas à temperatura local');

    console.log('\n✅ TESTE DE PROMPTS NATURAIS CONCLUÍDO!');
}

// Executar teste
testNaturalPrompts().catch(console.error);
