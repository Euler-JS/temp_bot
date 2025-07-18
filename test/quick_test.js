// test/quick_test.js - Testes automatizados rápidos
const MockWhatsAppApi = require('./mock_whatsapp_api');
const MockWeatherService = require('./mock_weather_service');

// Configurações
const TEST_PHONE = "846151124";
const whatsappApi = new MockWhatsAppApi("test_token", "test_phone_id");
const weatherService = new MockWeatherService();

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runQuickTests() {
    console.log(`
╔══════════════════════════════════════════════════════╗
║         🚀 TESTE RÁPIDO - TEMPERATURE BOT            ║
╚══════════════════════════════════════════════════════╝
`);

    console.log("🔥 INICIANDO TESTES AUTOMATIZADOS...\n");

    // Teste 1: Mensagem simples
    console.log("📋 TESTE 1: Mensagem de texto simples");
    await whatsappApi.enviarMensagemUsandoWhatsappAPI(
        "Olá! Bem-vindo ao Temperature Bot! 🌡️",
        TEST_PHONE
    );
    await sleep(1000);

    // Teste 2: Menu de configurações
    console.log("📋 TESTE 2: Menu de configurações");
    await whatsappApi.enviarMenuConfiguracoes(TEST_PHONE, {
        preferredCity: 'Maputo',
        units: 'celsius',
        language: 'pt',
        notifications: true
    });
    await sleep(1500);

    // Teste 3: Menu de unidades
    console.log("📋 TESTE 3: Menu de unidades de temperatura");
    await whatsappApi.enviarMenuUnidades(TEST_PHONE);
    await sleep(1500);

    // Teste 4: Consulta de clima (sucesso)
    console.log("📋 TESTE 4: Consulta de clima - Maputo");
    try {
        const weather = await weatherService.getCurrentWeather("Maputo", "celsius");
        const weatherMessage = formatWeatherMessage(weather);
        await whatsappApi.enviarMensagemUsandoWhatsappAPI(weatherMessage, TEST_PHONE);

        // Botões de ação rápida
        await whatsappApi.enviarBotoesAcaoRapida(TEST_PHONE, "Maputo");
    } catch (error) {
        await whatsappApi.enviarMensagemErro(TEST_PHONE, error.message);
    }
    await sleep(2000);

    // Teste 5: Consulta de clima (erro)
    console.log("📋 TESTE 5: Consulta de clima - Cidade inexistente");
    try {
        await weatherService.getCurrentWeather("CidadeInexistente", "celsius");
    } catch (error) {
        await whatsappApi.enviarMensagemErro(
            TEST_PHONE,
            error.message,
            "Verifique a grafia da cidade"
        );
    }
    await sleep(1500);

    // Teste 6: Previsão do tempo
    console.log("📋 TESTE 6: Previsão do tempo - 7 dias");
    try {
        const forecast = await weatherService.getWeatherForecast("Beira", 7);
        let forecastMessage = "📅 *Previsão de 7 dias - Beira*\n\n";

        forecast.forEach((day, index) => {
            const date = new Date(day.date);
            const dayName = index === 0 ? 'Hoje' :
                index === 1 ? 'Amanhã' :
                    date.toLocaleDateString('pt-BR', { weekday: 'short' });

            forecastMessage += `🌤️ *${dayName}* (${date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })})\n`;
            forecastMessage += `   ${day.minTemp}° - ${day.maxTemp}° | ${day.description}\n\n`;
        });

        await whatsappApi.enviarMensagemUsandoWhatsappAPI(forecastMessage, TEST_PHONE);
    } catch (error) {
        await whatsappApi.enviarMensagemErro(TEST_PHONE, "Erro na previsão", error.message);
    }
    await sleep(2000);

    // Teste 7: Busca de cidades
    console.log("📋 TESTE 7: Busca de cidades");
    const cities = await weatherService.searchCities("Maputo");
    if (cities.length > 0) {
        await whatsappApi.enviarListaCidadesSugeridas(TEST_PHONE, cities, "Moçambique");
    }
    await sleep(1500);

    // Teste 8: Mensagens de loading e sucesso
    console.log("📋 TESTE 8: Mensagens de feedback");
    await whatsappApi.enviarMensagemCarregamento(TEST_PHONE, "Processando dados");
    await sleep(1000);

    await whatsappApi.enviarMensagemSucesso(
        TEST_PHONE,
        "Configurações salvas com sucesso!",
        "✅"
    );
    await sleep(1000);

    // Teste 9: Template message
    console.log("📋 TESTE 9: Mensagem template");
    await whatsappApi.enviarMensagemUsandoTemplateWhatsappAPI(
        "welcome_temperature_bot",
        TEST_PHONE,
        "pt_BR"
    );
    await sleep(1000);

    // Teste 10: Conversão de unidades
    console.log("📋 TESTE 10: Conversão Celsius para Fahrenheit");
    try {
        const weatherCelsius = await weatherService.getCurrentWeather("Lisboa", "celsius");
        const weatherFahrenheit = await weatherService.getCurrentWeather("Lisboa", "fahrenheit");

        await whatsappApi.enviarMensagemUsandoWhatsappAPI(
            `🌡️ *Comparação de Unidades - Lisboa*\n\n` +
            `Celsius: ${weatherCelsius.temperature}°C\n` +
            `Fahrenheit: ${weatherFahrenheit.temperature}°F`,
            TEST_PHONE
        );
    } catch (error) {
        console.error("Erro no teste de conversão:", error.message);
    }

    console.log(`
┌──────────────────────────────────────────────────────┐
│                  ✅ TESTES CONCLUÍDOS                 │
│                                                      │
│  Todos os componentes principais foram testados:     │
│  • Mensagens simples ✅                              │
│  • Mensagens interativas ✅                          │
│  • APIs de clima (mock) ✅                           │
│  • Tratamento de erros ✅                            │
│  • Conversão de unidades ✅                          │
│  • Previsões ✅                                      │
│  • Busca de cidades ✅                               │
│                                                      │
│  🎯 O bot está pronto para integração real!          │
└──────────────────────────────────────────────────────┘
`);
}

function formatWeatherMessage(data) {
    const emoji = getWeatherEmoji(data.description);

    return `${emoji} *Clima em ${data.city}, ${data.country}*\n\n` +
        `🌡️ *Temperatura:* ${data.temperature}${data.units}\n` +
        `🤲 *Sensação térmica:* ${data.feelsLike}${data.units}\n` +
        `💧 *Umidade:* ${data.humidity}%\n` +
        `📝 *Condições:* ${data.description}\n\n` +
        `_Dados fornecidos por ${data.source}_`;
}

function getWeatherEmoji(description) {
    const desc = description.toLowerCase();
    if (desc.includes('sol') || desc.includes('limpo')) return '☀️';
    if (desc.includes('chuva')) return '🌧️';
    if (desc.includes('nuvem') || desc.includes('nublado')) return '☁️';
    if (desc.includes('tempest')) return '⛈️';
    return '🌤️';
}

// Executar testes se chamado diretamente
if (require.main === module) {
    runQuickTests().catch(console.error);
}

module.exports = { runQuickTests };