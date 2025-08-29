// test_function_questions.js - Teste específico para perguntas sobre função do bot
require('dotenv').config();
const OPENAI = require('./open_ai/open_ai');

async function testFunctionQuestions() {
    console.log('🔍 TESTANDO PERGUNTAS SOBRE FUNÇÃO DO BOT\n');

    const openaiService = new OPENAI();

    console.log('🧹 Usando análises frescas - cache será renovado automaticamente\n');

    // Perguntas que estavam sendo mal classificadas
    const functionQuestions = [
        "O que você faz?",
        "Que é a tua função?",
        "Para que serves?",
        "Qual é a tua função?",
        "O que fazes?",
        "Que bot é este?",
        "Quem te criou?",
        "Como te chamas?"
    ];

    console.log('🤖 TESTANDO PERGUNTAS SOBRE FUNÇÃO DO BOT:');
    console.log('═'.repeat(60));

    let correctClassifications = 0;
    let totalQuestions = functionQuestions.length;

    for (let i = 0; i < functionQuestions.length; i++) {
        const question = functionQuestions[i];
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
                console.log(`   🧠 Reasoning: ${analysis.reasoning}`);
                console.log(`   🌤️ É sobre clima: ${isWeatherQuery ? 'SIM' : 'NÃO'}`);
                console.log(`   ✅ Requires weather data: ${analysis.requires_weather_data}`);

                // Verificar se foi classificada corretamente (NÃO sobre clima)
                if (!isWeatherQuery && analysis.requires_weather_data === false) {
                    console.log(`   ✅ CLASSIFICAÇÃO CORRETA - general_help`);
                    correctClassifications++;

                    // Testar resposta da Joana Bot
                    try {
                        const friendlyResponse = await openaiService.generateFriendlyMozambicanResponse(
                            question,
                            analysis,
                            { queryCount: 0, expertiseLevel: 'basic' }
                        );

                        if (friendlyResponse.success) {
                            console.log(`   💬 Resposta: "${friendlyResponse.message.substring(0, 80)}..."`);
                        }
                    } catch (responseError) {
                        console.log(`   ⚠️ Erro na resposta: ${responseError.message}`);
                    }
                } else {
                    console.log(`   ❌ CLASSIFICAÇÃO INCORRETA - deveria ser general_help, não clima`);
                }
            } else {
                console.log(`   ❌ Análise falhou: ${analysisResult.error || 'Erro desconhecido'}`);
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
        console.log('🎉 PERFEITO! Todas as perguntas sobre função foram classificadas corretamente!');
    } else {
        console.log('⚠️ Algumas perguntas ainda estão sendo mal classificadas.');
        console.log('🔧 É necessário ajustar mais o prompt de análise.');
    }

    // Teste específico das duas perguntas que falhavam
    console.log('\n🎯 TESTE ESPECÍFICO DAS PERGUNTAS PROBLEMÁTICAS:');
    console.log('═'.repeat(50));

    const problematicQuestions = ["O que você faz?", "Que é a tua função?"];

    for (const question of problematicQuestions) {
        console.log(`\n🔍 Testando: "${question}"`);

        try {
            const result = await openaiService.analyzeMessage(question, {
                preferredCity: 'Beira',
                queryCount: 0
            });

            if (result.success) {
                const analysis = result.analysis;
                const isWeatherQuery = openaiService.isWeatherRelatedQuery(analysis);

                console.log(`   Intent: ${analysis.intent}`);
                console.log(`   Confidence: ${analysis.confidence}`);
                console.log(`   É sobre clima: ${isWeatherQuery ? 'SIM ❌' : 'NÃO ✅'}`);
                console.log(`   Requires weather data: ${analysis.requires_weather_data}`);
                console.log(`   Reasoning: ${analysis.reasoning}`);

                if (!isWeatherQuery) {
                    console.log('   ✅ AGORA ESTÁ CORRETO!');
                } else {
                    console.log('   ❌ AINDA ESTÁ INCORRETO!');
                }
            }
        } catch (error) {
            console.error(`   ❌ Erro: ${error.message}`);
        }
    }

    console.log('\n🎯 TESTE DE PERGUNTAS SOBRE FUNÇÃO CONCLUÍDO!');
}

// Executar o teste
testFunctionQuestions().catch(console.error);
