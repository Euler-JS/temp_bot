// Teste da função generateContextualResponse isoladamente
const OPENAI = require('./open_ai/open_ai');

async function testarRespostaContextual() {
    console.log('🧪 TESTANDO RESPOSTA CONTEXTUAL ISOLADA\n');

    const openaiService = new OPENAI();

    // Mock de análise
    const mockAnalysis = {
        intent: "weather_query_current",
        confidence: 0.85,
        entities: {
            cities: ["Beira"],
            timeframe: "none",
            weather_aspect: "general",
            activity_type: "none"
        },
        reasoning: "O usuário está perguntando sobre o tempo atual na cidade de Beira.",
        response_type: "informative",
        priority: "high",
        requires_weather_data: true,
        suggested_followup: "none"
    };

    // Mock de dados meteorológicos
    const mockWeatherData = {
        city: 'Beira',
        temperature: 28,
        description: 'céu claro',
        humidity: 65,
        feelsLike: 30
    };

    // Mock de contexto do usuário  
    const mockUserContext = {
        queryCount: 1,
        expertiseLevel: 'basic',
        lastCity: 'Beira'
    };

    console.log('📋 Dados de entrada:');
    console.log('• Análise:', mockAnalysis.intent);
    console.log('• Cidade:', mockWeatherData.city);
    console.log('• Temperatura:', mockWeatherData.temperature + '°C');
    console.log('• Condição:', mockWeatherData.description);

    console.log('\n🤖 Chamando generateContextualResponse...');

    const response = await openaiService.generateContextualResponse(
        mockAnalysis,
        mockWeatherData,
        mockUserContext
    );

    console.log('\n📤 Resultado:');
    console.log('• Sucesso:', response.success);
    console.log('• Mensagem completa:');
    console.log('---');
    console.log(response.message);
    console.log('---');

    if (response.suggestions) {
        console.log('• Sugestões:', response.suggestions);
    }

    if (!response.success) {
        console.log('• Erro:', response.error);
    }

    console.log('\n✅ Teste concluído!');
}

testarRespostaContextual().catch(console.error);
