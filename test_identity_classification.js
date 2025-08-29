// test_identity_classification.js - Teste específico para classificação de perguntas de identidade
require('dotenv').config();
const OPENAI = require('./open_ai/open_ai');

async function testIdentityClassification() {
    console.log('🔍 TESTANDO CLASSIFICAÇÃO DE PERGUNTAS DE IDENTIDADE\n');

    const openaiService = new OPENAI();

    // Lista de perguntas sobre identidade que devem ser classificadas como NÃO-climáticas
    const identityQuestions = [
        "Que você é?",
        "Quem é você?",
        "O que é isso?",
        "Quem és tu?",
        "O que és?",
        "Qual é o teu nome?",
        "Como te chamas?",
        "Que bot é este?",
        "Quem te criou?",
        "Para que serves?",
        "O que fazes?",
        "Qual é a tua função?"
    ];

    console.log('🤖 TESTANDO PERGUNTAS SOBRE IDENTIDADE:');
    console.log('═'.repeat(60));

    let correctClassifications = 0;
    let totalQuestions = identityQuestions.length;

    for (let i = 0; i < identityQuestions.length; i++) {
        const question = identityQuestions[i];
        console.log(`\n${i + 1}️⃣ Pergunta: "${question}"`);

        try {
            const analysisResult = await openaiService.analyzeMessage(question, {
                preferredCity: 'Beira',
                queryCount: 0
            });

            if (analysisResult.success) {
                const analysis = analysisResult.analysis;
                const isWeatherQuery = openaiService.isWeatherRelatedQuery(analysis);

                console.log(`   📊 Intent: ${analysis.intent}`);
                console.log(`   🎯 Confidence: ${analysis.confidence}`);
                console.log(`   🌤️ É sobre clima: ${isWeatherQuery ? 'SIM' : 'NÃO'}`);
                console.log(`   ✅ Requires weather data: ${analysis.requires_weather_data}`);

                // Verificar se foi classificada corretamente (NÃO sobre clima)
                if (!isWeatherQuery && analysis.requires_weather_data === false) {
                    console.log(`   ✅ CLASSIFICAÇÃO CORRETA`);
                    correctClassifications++;
                } else {
                    console.log(`   ❌ CLASSIFICAÇÃO INCORRETA - deveria ser NÃO-climática`);
                }
            } else {
                console.log(`   ❌ Análise falhou`);
            }

        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}`);
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESULTADOS DA CLASSIFICAÇÃO:');
    console.log(`✅ Corretas: ${correctClassifications}/${totalQuestions}`);
    console.log(`📈 Taxa de sucesso: ${Math.round((correctClassifications / totalQuestions) * 100)}%`);

    if (correctClassifications === totalQuestions) {
        console.log('🎉 PERFEITO! Todas as perguntas de identidade foram classificadas corretamente!');
    } else {
        console.log('⚠️ Algumas perguntas ainda estão sendo mal classificadas.');
        console.log('🔧 É necessário ajustar o prompt de análise.');
    }

    // Testar uma pergunta específica que estava falhando
    console.log('\n🎯 TESTE ESPECÍFICO: "Que você é?"');
    console.log('═'.repeat(40));

    try {
        const specificTest = await openaiService.analyzeMessage("Que você é?", {
            preferredCity: 'Beira',
            queryCount: 0
        });

        if (specificTest.success) {
            const analysis = specificTest.analysis;
            const isWeatherQuery = openaiService.isWeatherRelatedQuery(analysis);

            console.log(`Intent: ${analysis.intent}`);
            console.log(`Confidence: ${analysis.confidence}`);
            console.log(`Reasoning: ${analysis.reasoning}`);
            console.log(`É sobre clima: ${isWeatherQuery ? 'SIM' : 'NÃO'}`);
            console.log(`Requires weather data: ${analysis.requires_weather_data}`);

            if (!isWeatherQuery) {
                console.log('✅ AGORA ESTÁ CORRETO! Vai usar resposta amigável da Joana Bot.');

                // Testar a resposta amigável
                const friendlyResponse = await openaiService.generateFriendlyMozambicanResponse(
                    "Que você é?",
                    analysis,
                    { queryCount: 0, expertiseLevel: 'basic' }
                );

                if (friendlyResponse.success) {
                    console.log('\n📝 RESPOSTA DA JOANA BOT:');
                    console.log('▬'.repeat(50));
                    console.log(friendlyResponse.message);
                    console.log('▬'.repeat(50));
                }
            } else {
                console.log('❌ AINDA ESTÁ INCORRETO! Ainda classifica como clima.');
            }
        }

    } catch (error) {
        console.error('❌ Erro no teste específico:', error.message);
    }

    console.log('\n🎯 TESTE DE CLASSIFICAÇÃO DE IDENTIDADE CONCLUÍDO!');
}

// Executar o teste
testIdentityClassification().catch(console.error);
