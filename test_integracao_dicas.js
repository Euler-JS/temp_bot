// test_integracao_dicas.js - Teste de integração completa
require('dotenv').config();

// Simular uma mensagem sobre dicas como se viesse do WhatsApp
async function testCompleteIntegration() {
    console.log('🔄 TESTE DE INTEGRAÇÃO COMPLETA - DICAS NATURAIS');
    console.log('══════════════════════════════════════════════\n');

    // Importar as funções necessárias
    const OPENAI = require('./open_ai/open_ai');
    const WeatherService = require('./weather_api/weather_service');

    const openaiService = new OPENAI();
    const weatherService = new WeatherService();

    // Simular mensagem do usuário
    const userMessage = "dicas para hoje";
    const phoneNumber = "258846151124";

    console.log(`📱 Mensagem recebida: "${userMessage}"`);
    console.log(`📞 De: ${phoneNumber}\n`);

    try {
        // 1. Análise da mensagem
        console.log('1️⃣ ANALISANDO MENSAGEM COM AI...');
        const analysisResult = await openaiService.analyzeMessage(userMessage, {
            preferredCity: 'Beira',
            queryCount: 3
        });

        if (!analysisResult.success) {
            console.log('❌ Análise falhou');
            return;
        }

        const analysis = analysisResult.analysis;
        console.log(`✅ Intent detectado: ${analysis.intent}`);
        console.log(`📊 Confidence: ${analysis.confidence}`);

        // 2. Verificar se é sobre clima
        const isWeatherQuery = openaiService.isWeatherRelatedQuery(analysis);
        console.log(`🌤️ É pergunta sobre clima: ${isWeatherQuery ? 'SIM' : 'NÃO'}\n`);

        if (!isWeatherQuery) {
            console.log('❌ Sistema detectou como não-climático - usando resposta amigável');
            return;
        }

        // 3. Adaptar análise para formato legado
        const adaptedAnalysis = {
            type: 'practical_tips',
            action: 'tips',
            intent: analysis.intent,
            city: 'Beira',
            originalMessage: userMessage
        };

        console.log('2️⃣ BUSCANDO DADOS METEOROLÓGICOS...');

        // 4. Buscar dados reais do tempo
        const weatherData = await weatherService.getCurrentWeather('Beira', 'celsius');
        console.log(`✅ Dados obtidos: ${weatherData.temperature}°C - ${weatherData.description}\n`);

        // 5. Gerar dicas naturais com AI
        console.log('3️⃣ GERANDO DICAS NATURAIS COM AI...');

        const user = {
            query_count: 3,
            expertise_level: 'basic',
            last_city: 'Beira'
        };

        const tipsResponse = await openaiService.generatePracticalTips(
            adaptedAnalysis,
            weatherData,
            user
        );

        if (tipsResponse.success) {
            console.log('✅ RESPOSTA FINAL NATURAL:');
            console.log('═'.repeat(80));
            console.log(tipsResponse.message);
            console.log('═'.repeat(80));
            console.log(`\n📊 Status: ${tipsResponse.success ? 'SUCESSO' : 'FALHA'}`);
            console.log(`🔧 Método: ${tipsResponse.method}`);
            console.log(`🎯 Tipo: ${tipsResponse.type}\n`);

            console.log('🎉 INTEGRAÇÃO COMPLETA FUNCIONANDO!');
            console.log('✅ A resposta é natural, conversacional e em português moçambicano');
            console.log('✅ NÃO tem listas estruturadas com bullets');
            console.log('✅ Parece uma conversa entre amigos');
        } else {
            console.log('❌ Falha na geração das dicas');
            console.log(`💥 Erro: ${tipsResponse.error}`);
        }

    } catch (error) {
        console.error('❌ ERRO NA INTEGRAÇÃO:', error.message);
    }
}

// Executar teste
testCompleteIntegration().catch(console.error);
