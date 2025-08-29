// Teste para verificar se weatherService está funcionando
const WeatherService = require('./weather_api/weather_service');

async function testarWeatherService() {
    console.log('🌦️ TESTANDO WEATHER SERVICE\n');

    const weatherService = new WeatherService();

    try {
        console.log('📍 Testando obtenção de dados para Beira...');

        const weatherData = await weatherService.getCurrentWeather('Beira', 'celsius');

        if (weatherData) {
            console.log('✅ Dados obtidos com sucesso:');
            console.log('• Cidade:', weatherData.city);
            console.log('• Temperatura:', weatherData.temperature + '°C');
            console.log('• Descrição:', weatherData.description);
            console.log('• Humidade:', weatherData.humidity + '%');
            console.log('• Dados completos:', JSON.stringify(weatherData, null, 2));
        } else {
            console.log('❌ Nenhum dado retornado');
        }

    } catch (error) {
        console.log('❌ Erro ao obter dados meteorológicos:');
        console.log('• Mensagem:', error.message);
        console.log('• Stack:', error.stack);
    }

    // Testar outras cidades
    const cities = ['Maputo', 'Nampula', 'Quelimane'];

    for (const city of cities) {
        try {
            console.log(`\n📍 Testando ${city}...`);
            const data = await weatherService.getCurrentWeather(city, 'celsius');
            console.log(`✅ ${city}: ${data?.temperature || 'N/A'}°C - ${data?.description || 'N/A'}`);
        } catch (error) {
            console.log(`❌ ${city}: Erro - ${error.message}`);
        }
    }
}

testarWeatherService().catch(console.error);
