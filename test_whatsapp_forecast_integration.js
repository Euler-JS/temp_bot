// test_whatsapp_forecast_integration.js
// Teste que simula exatamente o fluxo do WhatsApp Bot

const WeatherService = require('./weather_api/weather_service');

// Função que simula getUserByContact
async function getUserByContact(phoneNumber) {
    return {
        preferred_city: null,
        last_city: null,
        units: 'celsius'
    };
}

// Função que simula o WhatsApp API
const mockWhatsappApi = {
    async enviarMensagemCarregamento(phoneNumber, message) {
        console.log(`📱 Loading message to ${phoneNumber}: ${message}`);
        return { success: true };
    },

    async enviarMensagemUsandoWhatsappAPI(message, phoneNumber) {
        console.log(`📱 WhatsApp message to ${phoneNumber}:`);
        console.log(message);
        console.log('---');
        return { success: true };
    },

    async enviarMensagemErro(phoneNumber, errorMsg) {
        console.log(`❌ Error message to ${phoneNumber}: ${errorMsg}`);
        return { success: true };
    }
};

// Função que simula getWeatherEmoji
function getWeatherEmoji(description) {
    const desc = description.toLowerCase();
    if (desc.includes('sol') || desc.includes('limpo') || desc.includes('clear')) return '☀️';
    if (desc.includes('chuva') || desc.includes('rain')) return '🌧️';
    if (desc.includes('nuvem') || desc.includes('nublado') || desc.includes('cloud')) return '☁️';
    return '🌤️';
}

// Função que replica handleForecastRequest do index.js
async function handleForecastRequest(phoneNumber, days = 7) {
    try {
        console.log(`📅 Solicitação de previsão de ${days} dias para ${phoneNumber}`);

        const user = await getUserByContact(phoneNumber);
        const city = user?.preferred_city || user?.last_city || 'Beira'; // Mudei para Beira

        await mockWhatsappApi.enviarMensagemCarregamento(phoneNumber, `🔍 Eh pá, deixa ver a previsão de ${days} dias para ${city}...`);

        const weatherService = new WeatherService();
        const forecastData = await weatherService.getWeatherForecast(city, days);

        if (forecastData && forecastData.forecasts && forecastData.forecasts.length > 0) {
            let forecastMessage = `📅 *Previsão de ${days} dias para ${forecastData.city}*\n\n`;

            forecastData.forecasts.slice(0, days).forEach((day, index) => {
                const emoji = getWeatherEmoji(day.description);
                const dayName = day.dayName || (index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' :
                    new Date(day.date).toLocaleDateString('pt-MZ', { weekday: 'long' }));

                forecastMessage += `${emoji} *${dayName}*\n`;
                forecastMessage += `   🌡️ ${day.minTemp}${forecastData.units} - ${day.maxTemp}${forecastData.units}\n`;
                forecastMessage += `   ${day.description}\n`;

                // Adicionar informações extras se disponíveis
                if (day.humidity) {
                    forecastMessage += `   💧 Umidade: ${day.humidity}%\n`;
                }
                if (day.chanceOfRain && day.chanceOfRain > 0) {
                    forecastMessage += `   🌧️ Chuva: ${day.chanceOfRain}%\n`;
                }
                if (day.windSpeed && day.windSpeed > 0) {
                    forecastMessage += `   💨 Vento: ${day.windSpeed} km/h\n`;
                }

                forecastMessage += `\n`;
            });

            forecastMessage += `\n💡 *Dica da Joana Bot:* Planifica as tuas atividades baseado nesta previsão!`;
            forecastMessage += `\n📊 _Dados fornecidos por ${forecastData.source}_`;

            await mockWhatsappApi.enviarMensagemUsandoWhatsappAPI(forecastMessage, phoneNumber);

            console.log('✅ Sucesso: Previsão enviada com êxito');
            return { success: true };

        } else {
            await mockWhatsappApi.enviarMensagemUsandoWhatsappAPI(
                `❌ Eh pá, não consegui obter a previsão para ${city}. Verifica se o nome da cidade está correto e tenta novamente.`,
                phoneNumber
            );

            console.log('❌ Falha: Dados de previsão inválidos');
            return { success: false, reason: 'No forecast data' };
        }
    } catch (error) {
        console.error('❌ Erro ao processar previsão:', error);
        await mockWhatsappApi.enviarMensagemErro(phoneNumber, "Erro ao obter previsão");

        console.log('❌ Falha: Exceção capturada');
        return { success: false, reason: error.message };
    }
}

// Função principal de teste
async function runTest() {
    console.log('🧪 TESTE DE INTEGRAÇÃO - PREVISÃO WHATSAPP BOT');
    console.log('='.repeat(60));
    console.log('');

    // Simular o número de telefone real do log
    const phoneNumber = '258846151124';

    try {
        const result = await handleForecastRequest(phoneNumber, 7);

        console.log('');
        console.log('📊 RESULTADO FINAL:');
        console.log('Success:', result.success);
        if (!result.success) {
            console.log('Reason:', result.reason);
        }

    } catch (error) {
        console.error('💥 ERRO FATAL:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar teste
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = { handleForecastRequest, runTest };
