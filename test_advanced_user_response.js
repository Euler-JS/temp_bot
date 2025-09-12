const OPENAI = require('./open_ai/open_ai');

async function testAdvancedUser() {
    try {
        console.log('🧪 Testando resposta para usuário advanced...\n');

        const openaiService = new OPENAI();

        // Simular contexto do usuário advanced (como seria passado no index.js)
        const userContextAdvanced = {
            contact: '258846151124',
            expertise_level: 'advanced',
            preferred_complexity: 'advanced',
            query_count: 349,
            preferred_city: 'Beira',
            conversationHistory: []
        };

        // Simular análise
        const mockAnalysis = {
            intent: 'weather_query_current',
            confidence: 0.95,
            entities: { cities: [], timeframe: 'today', weather_aspect: 'general' },
            requires_weather_data: true
        };

        // Simular dados meteorológicos
        const mockWeatherData = {
            city: 'Beira',
            temperature: 27,
            description: 'nuvens dispersas',
            humidity: 78
        };

        console.log('👤 Contexto do usuário:');
        console.log('- expertise_level:', userContextAdvanced.expertise_level);
        console.log('- preferred_complexity:', userContextAdvanced.preferred_complexity);
        console.log('- contact:', userContextAdvanced.contact);

        console.log('\n🤖 Gerando resposta...');
        const response = await openaiService.generateContextualResponse(
            mockAnalysis,
            mockWeatherData,
            userContextAdvanced
        );

        console.log('\n📤 Resposta gerada:');
        console.log('Success:', response.success);
        if (response.success) {
            console.log('\n📝 Mensagem:');
            console.log(response.message);

            // Verificar se a resposta usa tom formal/técnico (advanced)
            const isFormal = !response.message.includes(' ') &&
                !response.message.includes('mano') &&
                !response.message.includes('fixes');

            const hasTechnicalTerms = response.message.includes('meteorológica') ||
                response.message.includes('humidade relativa') ||
                response.message.includes('sensação térmica') ||
                response.message.includes('atmosférica');

            console.log('\n🔍 Análise da resposta:');
            console.log('- Tom formal (sem gírias):', isFormal);
            console.log('- Termos técnicos:', hasTechnicalTerms);
            console.log('- ✅ Adequada para usuário advanced:', isFormal && hasTechnicalTerms);

            if (!isFormal) {
                console.log('❌ PROBLEMA: Resposta ainda usa tom casual para usuário advanced!');
                console.log('🔍 Gírias encontradas:',
                    response.message.match(/( |mano|fixes|eish)/gi) || 'nenhuma');
            }
        } else {
            console.log('❌ Erro na resposta:', response.message);
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

testAdvancedUser().then(() => {
    console.log('\n✅ Teste completo');
    process.exit(0);
});
