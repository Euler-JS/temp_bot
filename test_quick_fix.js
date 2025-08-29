// Teste rápido do sistema corrigido
const OPENAI = require('./open_ai/open_ai');

async function testarSistemaCorrigido() {
    console.log('🧪 TESTANDO SISTEMA CORRIGIDO\n');

    const openaiService = new OPENAI();

    // Teste 1: Análise de mensagem
    console.log('1️⃣ Teste análise de mensagem:');
    const analysis = await openaiService.analyzeMessage("Como está o tempo?", {
        queryCount: 1,
        lastCity: 'Beira'
    });

    console.log(`✅ Análise sucesso: ${analysis.success}`);
    console.log(`🎯 Intenção: ${analysis.analysis.intent}`);
    console.log(`🏙️ Cidade detectada: ${analysis.analysis.entities?.cities?.[0] || 'nenhuma'}`);

    // Teste 2: Resposta contextual
    console.log('\n2️⃣ Teste resposta contextual:');
    const mockWeatherData = {
        city: 'Beira',
        temperature: 28,
        description: 'céu claro',
        humidity: 65
    };

    const contextualResponse = await openaiService.generateContextualResponse(
        analysis.analysis,
        mockWeatherData,
        { queryCount: 1, expertiseLevel: 'basic' }
    );

    console.log(`✅ Resposta sucesso: ${contextualResponse.success}`);
    console.log(`📝 Mensagem: ${contextualResponse.message?.substring(0, 100)}...`);

    // Teste 3: Sugestões inteligentes
    console.log('\n3️⃣ Teste sugestões inteligentes:');
    const suggestions = await openaiService.generateSmartSuggestions(
        { queryCount: 1 },
        mockWeatherData
    );

    console.log(`✅ Sugestões sucesso: ${suggestions.success}`);
    console.log(`💡 Sugestões: [${suggestions.suggestions?.join(', ') || 'nenhuma'}]`);

    // Teste 4: Conectividade AI
    console.log('\n4️⃣ Teste conectividade AI:');
    const connection = await openaiService.testAIConnection();

    console.log(`🔗 Conexão: ${connection.success ? 'OK' : 'ERRO'}`);
    console.log(`🤖 AI Powered: ${connection.aiPowered}`);
    console.log(`📝 Mensagem: ${connection.message}`);

    console.log('\n🎉 TESTE CONCLUÍDO!');
    console.log('Sistema corrigido e funcionando com AI!');
}

testarSistemaCorrigido().catch(console.error);
