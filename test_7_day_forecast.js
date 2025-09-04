// test_7_day_forecast.js
const WeatherService = require('./weather_api/weather_service');

async function test7DayForecast() {
    const weatherService = new WeatherService();

    console.log('🌤️  Testando previsão de 7 dias com OpenWeatherMap...\n');

    try {
        // Testar com diferentes cidades
        const cities = ['São Paulo', 'Rio de Janeiro', 'Lisboa', 'Nova York'];

        for (const city of cities) {
            console.log(`\n📍 Previsão para ${city}:`);
            console.log('='.repeat(50));

            const forecast = await weatherService.getWeatherForecast(city, 7);

            console.log(`🏙️  Cidade: ${forecast.city}, ${forecast.country}`);
            console.log(`🔗 Fonte: ${forecast.source}`);
            console.log(`🌡️  Unidade: ${forecast.units}\n`);

            forecast.forecasts.forEach((day, index) => {
                console.log(`📅 ${day.dayName} (${day.date})`);
                console.log(`   🌡️  Temperatura: ${day.minTemp}${forecast.units} - ${day.maxTemp}${forecast.units} (média: ${day.avgTemp}${forecast.units})`);
                console.log(`   ☀️  Descrição: ${day.description}`);
                console.log(`   💧 Umidade: ${day.humidity}%`);
                if (day.windSpeed) {
                    console.log(`   💨 Vento: ${day.windSpeed} km/h`);
                }
                if (day.chanceOfRain) {
                    console.log(`   🌧️  Chance de chuva: ${day.chanceOfRain}%`);
                }
                console.log('');
            });

            // Adicionar delay para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Testar com unidades Fahrenheit
        console.log('\n🌡️  Testando com Fahrenheit:');
        console.log('='.repeat(50));

        const forecastF = await weatherService.getWeatherForecast('Miami', 5, 'fahrenheit');
        console.log(`🏙️  ${forecastF.city}, ${forecastF.country} (${forecastF.source})`);

        forecastF.forecasts.slice(0, 3).forEach(day => {
            console.log(`📅 ${day.dayName}: ${day.minTemp}${forecastF.units} - ${day.maxTemp}${forecastF.units} | ${day.description}`);
        });

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

// Função para testar cache
async function testForecastCache() {
    const weatherService = new WeatherService();

    console.log('\n⚡ Testando sistema de cache...\n');

    const city = 'São Paulo';

    // Primeira busca (vai para a API)
    console.log('🔍 Primeira busca (API):');
    const start1 = Date.now();
    await weatherService.getWeatherForecast(city, 3);
    const time1 = Date.now() - start1;
    console.log(`⏱️  Tempo: ${time1}ms\n`);

    // Segunda busca (deve vir do cache)
    console.log('🔍 Segunda busca (cache):');
    const start2 = Date.now();
    await weatherService.getWeatherForecast(city, 3);
    const time2 = Date.now() - start2;
    console.log(`⏱️  Tempo: ${time2}ms\n`);

    console.log(`🚀 Cache é ${Math.round(time1 / time2)}x mais rápido!`);
}

// Executar testes
async function runAllTests() {
    try {
        await test7DayForecast();
        await testForecastCache();

        console.log('\n✅ Todos os testes concluídos com sucesso!');
    } catch (error) {
        console.error('❌ Erro nos testes:', error.message);
    }
}

// Executar se este arquivo for chamado diretamente
if (require.main === module) {
    runAllTests();
}

module.exports = { test7DayForecast, testForecastCache };
