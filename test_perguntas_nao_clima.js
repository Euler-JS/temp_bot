// test_perguntas_nao_clima.js - Testar respostas para perguntas não relacionadas ao clima

const OPENAI = require('./open_ai/open_ai');

async function testNonWeatherQuestions() {
    console.log('🧪 TESTANDO PERGUNTAS NÃO RELACIONADAS AO CLIMA\n');

    const openaiService = new OPENAI();

    // Perguntas que NÃO são sobre clima
    const nonWeatherQuestions = [
        "Olá, como estás?",
        "Qual é a capital de Moçambique?",
        "Como posso aprender inglês?",
        "Onde posso comprar comida?",
        "Que horas são?",
        "Como está a política?",
        "Preciso de ajuda com matemática",
        "Obrigado pela ajuda",
        "Bom dia!",
        "O que é a vida?"
    ];

    // Perguntas que SÃO sobre clima (para comparação)
    const weatherQuestions = [
        "Como está o tempo?",
        "Vai chover hoje?",
        "Temperatura em Maputo",
        "Que roupa usar?",
        "Quais locais posso ir hoje?"
    ];

    console.log('1️⃣ TESTANDO PERGUNTAS NÃO CLIMÁTICAS:');
    console.log('═'.repeat(50));

    for (const question of nonWeatherQuestions) {
        try {
            console.log(`\n❓ Pergunta: "${question}"`);

            // Análise da mensagem
            const analysisResult = await openaiService.analyzeMessage(question, {
                queryCount: 3,
                lastCity: 'Beira'
            });

            if (analysisResult.success) {
                const analysis = analysisResult.analysis;

                // Verificar se é relacionado ao clima
                const isWeatherRelated = openaiService.isWeatherRelatedQuery(analysis);
                console.log(`🌤️ É sobre clima: ${isWeatherRelated ? 'SIM' : 'NÃO'}`);
                console.log(`📊 Intent: ${analysis.intent}`);
                console.log(`🎯 Confidence: ${analysis.confidence}`);

                if (!isWeatherRelated) {
                    // Gerar resposta amigável
                    const friendlyResponse = await openaiService.generateFriendlyMozambicanResponse(
                        question,
                        analysis,
                        { queryCount: 3, lastCity: 'Beira', expertiseLevel: 'basic' }
                    );

                    if (friendlyResponse.success) {
                        console.log('✅ RESPOSTA AMIGÁVEL:');
                        console.log('▬'.repeat(40));
                        console.log(friendlyResponse.message);
                        console.log('▬'.repeat(40));
                    } else {
                        console.log('❌ Erro ao gerar resposta amigável');
                    }
                } else {
                    console.log('⚠️ Sistema classificou como relacionado ao clima');
                }
            }

        } catch (error) {
            console.log(`❌ Erro: ${error.message}`);
        }
    }

    console.log('\n\n2️⃣ TESTANDO PERGUNTAS CLIMÁTICAS (para comparação):');
    console.log('═'.repeat(50));

    for (const question of weatherQuestions) {
        try {
            console.log(`\n❓ Pergunta: "${question}"`);

            const analysisResult = await openaiService.analyzeMessage(question, {
                queryCount: 3,
                lastCity: 'Beira'
            });

            if (analysisResult.success) {
                const analysis = analysisResult.analysis;
                const isWeatherRelated = openaiService.isWeatherRelatedQuery(analysis);

                console.log(`🌤️ É sobre clima: ${isWeatherRelated ? 'SIM' : 'NÃO'}`);
                console.log(`📊 Intent: ${analysis.intent}`);
                console.log(`🎯 Confidence: ${analysis.confidence}`);
            }

        } catch (error) {
            console.log(`❌ Erro: ${error.message}`);
        }
    }

    console.log('\n\n🎯 RESULTADO ESPERADO:');
    console.log('✅ Perguntas não climáticas → Respostas amigáveis em português moçambicano');
    console.log('✅ Perguntas climáticas → Roteamento normal para dados meteorológicos');
    console.log('✅ Sistema deve distinguir claramente entre os dois tipos');

    console.log('\n✅ TESTE CONCLUÍDO!');
}

// Executar teste
testNonWeatherQuestions().catch(console.error);
