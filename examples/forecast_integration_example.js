// examples/forecast_integration_example.js
const WeatherService = require('../weather_api/weather_service');

class ForecastBot {
    constructor() {
        this.weatherService = new WeatherService();
    }

    // Função principal para responder com previsão de 7 dias
    async getForecastResponse(city, days = 7) {
        try {
            const forecast = await this.weatherService.getWeatherForecast(city, days);
            return this.formatForecastMessage(forecast);
        } catch (error) {
            return `❌ Desculpe, não consegui obter a previsão para "${city}". Verifique se o nome da cidade está correto.`;
        }
    }

    // Formatador para resposta de previsão completa
    formatForecastMessage(forecast) {
        let message = `🌤️ *Previsão de ${forecast.forecasts.length} dias para ${forecast.city}*\n\n`;

        forecast.forecasts.forEach((day, index) => {
            const emoji = this.getWeatherEmoji(day.description, day.icon);
            const tempRange = `${day.minTemp}${forecast.units} - ${day.maxTemp}${forecast.units}`;

            message += `${emoji} *${day.dayName}*\n`;
            message += `🌡️ ${tempRange}\n`;
            message += `☀️ ${day.description}\n`;

            if (day.humidity) {
                message += `💧 Umidade: ${day.humidity}%\n`;
            }

            if (day.chanceOfRain && day.chanceOfRain > 0) {
                message += `🌧️ Chuva: ${day.chanceOfRain}%\n`;
            }

            if (day.windSpeed && day.windSpeed > 0) {
                message += `💨 Vento: ${day.windSpeed} km/h\n`;
            }

            message += '\n';
        });

        message += `📊 _Dados fornecidos por ${forecast.source}_`;
        return message;
    }

    // Formatador para previsão resumida (3 dias)
    async getShortForecastResponse(city) {
        try {
            const forecast = await this.weatherService.getWeatherForecast(city, 3);

            let message = `🌤️ *Previsão para ${forecast.city}:*\n\n`;

            forecast.forecasts.forEach(day => {
                const emoji = this.getWeatherEmoji(day.description);
                message += `${emoji} *${day.dayName}:* ${day.minTemp}-${day.maxTemp}${forecast.units} | ${day.description}\n`;
            });

            return message;
        } catch (error) {
            return `❌ Não foi possível obter a previsão para "${city}".`;
        }
    }

    // Previsão apenas para hoje e amanhã
    async getTodayTomorrowForecast(city) {
        try {
            const forecast = await this.weatherService.getWeatherForecast(city, 2);

            let message = `🌤️ *Previsão ${forecast.city}:*\n\n`;

            forecast.forecasts.forEach(day => {
                const emoji = this.getWeatherEmoji(day.description);
                const alerts = this.getWeatherAlerts(day);

                message += `${emoji} *${day.dayName}*\n`;
                message += `🌡️ ${day.minTemp}${forecast.units} - ${day.maxTemp}${forecast.units}\n`;
                message += `☀️ ${day.description}\n`;

                if (alerts.length > 0) {
                    message += `⚠️ ${alerts.join(', ')}\n`;
                }
                message += '\n';
            });

            return message;
        } catch (error) {
            return `❌ Não foi possível obter a previsão para "${city}".`;
        }
    }

    // Gerar emojis baseados na descrição do tempo
    getWeatherEmoji(description, icon = '') {
        const desc = description.toLowerCase();

        if (desc.includes('sol') || desc.includes('limpo') || desc.includes('clear')) return '☀️';
        if (desc.includes('chuva') || desc.includes('rain') || desc.includes('chuvisco')) return '🌧️';
        if (desc.includes('trovoada') || desc.includes('tempestade') || desc.includes('storm')) return '⛈️';
        if (desc.includes('neve') || desc.includes('snow')) return '❄️';
        if (desc.includes('nuvem') || desc.includes('nublado') || desc.includes('cloud')) return '☁️';
        if (desc.includes('neblina') || desc.includes('fog') || desc.includes('mist')) return '🌫️';
        if (desc.includes('vento') || desc.includes('wind')) return '💨';

        // Fallback para ícones da API
        if (icon) {
            if (icon.includes('01')) return '☀️'; // clear sky
            if (icon.includes('02') || icon.includes('03')) return '⛅'; // few clouds, scattered clouds
            if (icon.includes('04')) return '☁️'; // broken clouds
            if (icon.includes('09') || icon.includes('10')) return '🌧️'; // shower rain, rain
            if (icon.includes('11')) return '⛈️'; // thunderstorm
            if (icon.includes('13')) return '❄️'; // snow
            if (icon.includes('50')) return '🌫️'; // mist
        }

        return '🌤️'; // default
    }

    // Gerar alertas baseados nas condições climáticas
    getWeatherAlerts(day) {
        const alerts = [];

        if (day.chanceOfRain && day.chanceOfRain > 70) {
            alerts.push('Alta probabilidade de chuva');
        } else if (day.chanceOfRain && day.chanceOfRain > 40) {
            alerts.push('Possibilidade de chuva');
        }

        if (day.maxTemp > 35) {
            alerts.push('Temperatura muito alta');
        } else if (day.maxTemp < 5) {
            alerts.push('Temperatura muito baixa');
        }

        if (day.windSpeed && day.windSpeed > 30) {
            alerts.push('Ventos fortes');
        }

        if (day.humidity && day.humidity > 85) {
            alerts.push('Umidade muito alta');
        } else if (day.humidity && day.humidity < 20) {
            alerts.push('Ar muito seco');
        }

        return alerts;
    }

    // Função para processar comandos de texto natural
    async processNaturalLanguage(message, city) {
        const text = message.toLowerCase();

        if (text.includes('semana') || text.includes('7 dias') || text.includes('próximos dias')) {
            return await this.getForecastResponse(city, 7);
        }

        if (text.includes('amanhã') || text.includes('hoje e amanhã')) {
            return await this.getTodayTomorrowForecast(city);
        }

        if (text.includes('3 dias') || text.includes('resumo')) {
            return await this.getShortForecastResponse(city);
        }

        if (text.includes('fim de semana') || text.includes('sábado e domingo')) {
            return await this.getWeekendForecast(city);
        }

        // Default: previsão de 3 dias
        return await this.getShortForecastResponse(city);
    }

    // Previsão específica para fim de semana
    async getWeekendForecast(city) {
        try {
            const forecast = await this.weatherService.getWeatherForecast(city, 7);

            // Filtrar apenas sábado e domingo
            const weekend = forecast.forecasts.filter(day => {
                const date = new Date(day.date + 'T00:00:00');
                const dayOfWeek = date.getDay();
                return dayOfWeek === 6 || dayOfWeek === 0; // 6=sábado, 0=domingo
            });

            if (weekend.length === 0) {
                return await this.getShortForecastResponse(city);
            }

            let message = `🏖️ *Previsão para o fim de semana em ${forecast.city}:*\n\n`;

            weekend.forEach(day => {
                const emoji = this.getWeatherEmoji(day.description);
                message += `${emoji} *${day.dayName}:* ${day.minTemp}-${day.maxTemp}${forecast.units}\n`;
                message += `   ${day.description}\n`;
                if (day.chanceOfRain > 0) {
                    message += `   🌧️ Chuva: ${day.chanceOfRain}%\n`;
                }
                message += '\n';
            });

            return message;
        } catch (error) {
            return `❌ Não foi possível obter a previsão de fim de semana para "${city}".`;
        }
    }
}

// Exemplo de uso
async function demonstrateUsage() {
    const bot = new ForecastBot();

    console.log('🤖 Demonstração do Bot de Previsão\n');

    // Teste 1: Previsão completa de 7 dias
    console.log('1️⃣ Previsão de 7 dias:');
    console.log('='.repeat(50));
    const fullForecast = await bot.getForecastResponse('São Paulo', 7);
    console.log(fullForecast);
    console.log('\n');

    // Teste 2: Previsão resumida
    console.log('2️⃣ Previsão resumida (3 dias):');
    console.log('='.repeat(50));
    const shortForecast = await bot.getShortForecastResponse('Rio de Janeiro');
    console.log(shortForecast);
    console.log('\n');

    // Teste 3: Hoje e amanhã
    console.log('3️⃣ Hoje e amanhã:');
    console.log('='.repeat(50));
    const todayTomorrow = await bot.getTodayTomorrowForecast('Lisboa');
    console.log(todayTomorrow);
    console.log('\n');

    // Teste 4: Fim de semana
    console.log('4️⃣ Fim de semana:');
    console.log('='.repeat(50));
    const weekend = await bot.getWeekendForecast('Madrid');
    console.log(weekend);
    console.log('\n');

    // Teste 5: Processamento de linguagem natural
    console.log('5️⃣ Processamento de linguagem natural:');
    console.log('='.repeat(50));
    const naturalResponse = await bot.processNaturalLanguage('Como vai estar o tempo na próxima semana?', 'Paris');
    console.log(naturalResponse);
}

// Executar demonstração se este arquivo for chamado diretamente
if (require.main === module) {
    demonstrateUsage().catch(console.error);
}

module.exports = ForecastBot;
