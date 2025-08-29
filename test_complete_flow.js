// Teste da função completa handleAdvancedWeatherData
const WeatherService = require('./weather_api/weather_service');
const OPENAI = require('./open_ai/open_ai');

async function testarFluxoCompleto() {
    console.log('🧪 TESTANDO FLUXO COMPLETO DE WEATHER DATA\n');

    // Simular dados de entrada do sistema real
    const mockAnalysis = {
        type: "weather_data",
        action: "current",
        intent: "weather_query_current",
        city: "Beira",
        confidence: 0.85,
        entities: {
            cities: ["Beira"],
            timeframe: "none",
            weather_aspect: "general",
            activity_type: "none"
        },
        timeframe: "none",
        weather_aspect: "general",
        response_type: "informative",
        requires_weather_data: true,
        adaptedFromAI: true
    };

    const mockPhoneNumber = "258846151124";
    const mockUser = {
        id: 1,
        contact: mockPhoneNumber,
        query_count: 1,
        expertise_level: 'basic'
    };

    console.log('📋 Dados de entrada:');
    console.log('• Análise cidade:', mockAnalysis.city);
    console.log('• Usuário:', mockUser.contact);
    console.log('• Ação:', mockAnalysis.action);

    try {
        // 1. Instanciar serviços
        const weatherService = new WeatherService();
        const openaiService = new OPENAI();

        // 2. Obter dados meteorológicos
        console.log('\n🌦️ Obtendo dados meteorológicos...');
        const weatherData = await weatherService.getCurrentWeather(
            mockAnalysis.city,
            'celsius'
        );

        if (!weatherData || !weatherData.temperature) {
            console.log('❌ Dados meteorológicos não obtidos');
            return;
        }

        console.log('✅ Dados meteorológicos obtidos:', {
            city: weatherData.city,
            temp: weatherData.temperature,
            condition: weatherData.description
        });

        // 3. Gerar resposta contextual
        console.log('\n🤖 Gerando resposta contextual...');
        const contextualResponse = await openaiService.generateContextualResponse(
            mockAnalysis,
            weatherData,
            {
                ...mockUser,
                conversationHistory: []
            }
        );

        // 4. Decidir mensagem final
        let finalMessage;
        if (contextualResponse.success) {
            console.log('✅ Resposta AI bem-sucedida');
            finalMessage = contextualResponse.message;
        } else {
            console.log('⚠️ Resposta AI falhou, usando fallback simples');
            console.log('• Erro contextualResponse:', contextualResponse.error || 'não especificado');
            // Simular createSimpleWeatherMessage
            const emoji = getWeatherEmoji(weatherData.description);
            finalMessage = `${emoji} *${weatherData.city}*\n\n🌡️ ${weatherData.temperature}°C (sensação de ${weatherData.feelsLike || weatherData.temperature}°C)\n💧 Umidade: ${weatherData.humidity}%\n📝 ${weatherData.description}`;
        }

        console.log('\n📤 Mensagem final gerada:');
        console.log('---');
        console.log(finalMessage);
        console.log('---');

        // Verificar se há "undefined" na mensagem
        if (finalMessage.includes('undefined')) {
            console.log('\n❌ PROBLEMA: Mensagem contém "undefined"!');
            console.log('• Verificar quais dados estão undefined');
        } else {
            console.log('\n✅ Mensagem válida, sem "undefined"');
        }

    } catch (error) {
        console.error('\n❌ Erro no fluxo:', error.message);
    }
}

// Função helper para emoji
function getWeatherEmoji(description) {
    if (!description) return '🌤️';

    const desc = description.toLowerCase();
    if (desc.includes('sol') || desc.includes('claro')) return '☀️';
    if (desc.includes('nuvem')) return '☁️';
    if (desc.includes('chuva')) return '🌧️';
    if (desc.includes('neve')) return '❄️';
    if (desc.includes('nevoeiro')) return '🌫️';
    return '🌤️';
}

testarFluxoCompleto().catch(console.error);
