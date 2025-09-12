// Teste para handleForecastRequest com diferentes níveis de expertise

async function testForecastRequestLevels() {
    try {
        console.log('🧪 Testando handleForecastRequest com diferentes níveis...\n');

        // Simular função generateForecastMessageByLevel
        function getWeatherEmoji(description) {
            const desc = description.toLowerCase();
            if (desc.includes('sol') || desc.includes('limpo')) return '☀️';
            if (desc.includes('chuva')) return '🌧️';
            if (desc.includes('nuvem')) return '☁️';
            if (desc.includes('vento')) return '💨';
            return '🌤️';
        }

        function generateForecastMessageByLevel(userLevel, forecastData, days) {
            let forecastMessage = '';

            switch (userLevel) {
                case 'advanced':
                    // Nível avançado: formato técnico e detalhado
                    forecastMessage = `📊 *Análise Meteorológica ${days} Dias - ${forecastData.city}*\n\n`;

                    forecastData.forecasts.slice(0, days).forEach((day, index) => {
                        const emoji = getWeatherEmoji(day.description);
                        const dayName = day.dayName || (index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' :
                            new Date(day.date).toLocaleDateString('pt-MZ', { weekday: 'long', day: 'numeric', month: 'short' }));

                        forecastMessage += `${emoji} **${dayName}**\n`;
                        forecastMessage += `🌡️ Amplitude térmica: ${day.minTemp}${forecastData.units} - ${day.maxTemp}${forecastData.units}\n`;
                        forecastMessage += `📝 Condições atmosféricas: ${day.description}\n`;

                        if (day.humidity) {
                            forecastMessage += `💧 Humidade relativa: ${day.humidity}%\n`;
                        }
                        if (day.chanceOfRain && day.chanceOfRain > 0) {
                            forecastMessage += `🌧️ Probabilidade de precipitação: ${day.chanceOfRain}%\n`;
                        }
                        if (day.windSpeed && day.windSpeed > 0) {
                            forecastMessage += `💨 Velocidade do vento: ${day.windSpeed} km/h\n`;
                        }
                        if (day.pressure) {
                            forecastMessage += `🔘 Pressão atmosférica: ${day.pressure} hPa\n`;
                        }
                        if (day.uvIndex) {
                            forecastMessage += `☀️ Índice UV: ${day.uvIndex}\n`;
                        }

                        forecastMessage += `\n`;
                    });

                    forecastMessage += `\n🎯 **Recomendação técnica:** Baseie o planeamento das atividades na análise dos parâmetros meteorológicos apresentados.`;
                    forecastMessage += `\n📊 _Fonte de dados: ${forecastData.source}_`;
                    break;

                case 'intermediate':
                    // Nível intermediário: equilibrio entre técnico e acessível
                    forecastMessage = `📅 *Previsão Detalhada ${days} Dias - ${forecastData.city}*\n\n`;

                    forecastData.forecasts.slice(0, days).forEach((day, index) => {
                        const emoji = getWeatherEmoji(day.description);
                        const dayName = day.dayName || (index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' :
                            new Date(day.date).toLocaleDateString('pt-MZ', { weekday: 'long', day: 'numeric' }));

                        forecastMessage += `${emoji} **${dayName}**\n`;
                        forecastMessage += `🌡️ Temperatura: ${day.minTemp}${forecastData.units} - ${day.maxTemp}${forecastData.units}\n`;
                        forecastMessage += `📝 Condições: ${day.description}\n`;

                        if (day.humidity) {
                            const humidityLevel = day.humidity > 80 ? 'alta' : day.humidity > 60 ? 'moderada' : 'baixa';
                            forecastMessage += `💧 Humidade: ${day.humidity}% (${humidityLevel})\n`;
                        }
                        if (day.chanceOfRain && day.chanceOfRain > 0) {
                            const rainLevel = day.chanceOfRain > 70 ? 'alta probabilidade' : day.chanceOfRain > 40 ? 'possível' : 'baixa chance';
                            forecastMessage += `🌧️ Chuva: ${day.chanceOfRain}% (${rainLevel})\n`;
                        }
                        if (day.windSpeed && day.windSpeed > 0) {
                            const windLevel = day.windSpeed > 20 ? 'vento forte' : day.windSpeed > 10 ? 'brisa moderada' : 'vento leve';
                            forecastMessage += `💨 Vento: ${day.windSpeed} km/h (${windLevel})\n`;
                        }

                        forecastMessage += `\n`;
                    });

                    forecastMessage += `\n💡 **Dica da Joana Bot:** Planifica as atividades considerando estes dados meteorológicos detalhados!`;
                    forecastMessage += `\n📊 _Dados: ${forecastData.source}_`;
                    break;

                default: // basic
                    // Nível básico: formato simples e amigável
                    forecastMessage = `📅 *Previsão de ${days} dias para ${forecastData.city}*\n\n`;

                    forecastData.forecasts.slice(0, days).forEach((day, index) => {
                        const emoji = getWeatherEmoji(day.description);
                        const dayName = day.dayName || (index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' :
                            new Date(day.date).toLocaleDateString('pt-MZ', { weekday: 'long' }));

                        forecastMessage += `${emoji} *${dayName}*\n`;
                        forecastMessage += `   🌡️ ${day.minTemp}${forecastData.units} - ${day.maxTemp}${forecastData.units}\n`;
                        forecastMessage += `   ${day.description}\n`;

                        // Adicionar informações extras se disponíveis (formato simples)
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
                    break;
            }

            return forecastMessage;
        }

        // Dados simulados de previsão para 7 dias
        const mockForecastData = {
            city: 'Beira',
            units: '°C',
            source: 'OpenWeatherMap',
            forecasts: [
                {
                    date: '2025-09-12',
                    dayName: 'Hoje',
                    minTemp: 18,
                    maxTemp: 28,
                    description: 'céu limpo',
                    humidity: 65,
                    chanceOfRain: 10,
                    windSpeed: 12,
                    pressure: 1015,
                    uvIndex: 7
                },
                {
                    date: '2025-09-13',
                    dayName: 'Amanhã',
                    minTemp: 20,
                    maxTemp: 30,
                    description: 'parcialmente nublado',
                    humidity: 70,
                    chanceOfRain: 25,
                    windSpeed: 8,
                    pressure: 1012,
                    uvIndex: 6
                },
                {
                    date: '2025-09-14',
                    minTemp: 17,
                    maxTemp: 25,
                    description: 'chuva leve',
                    humidity: 85,
                    chanceOfRain: 75,
                    windSpeed: 15,
                    pressure: 1008,
                    uvIndex: 3
                },
                {
                    date: '2025-09-15',
                    minTemp: 19,
                    maxTemp: 27,
                    description: 'sol com algumas nuvens',
                    humidity: 60,
                    chanceOfRain: 15,
                    windSpeed: 10,
                    pressure: 1018,
                    uvIndex: 8
                },
                {
                    date: '2025-09-16',
                    minTemp: 21,
                    maxTemp: 32,
                    description: 'muito sol',
                    humidity: 55,
                    chanceOfRain: 5,
                    windSpeed: 6,
                    pressure: 1020,
                    uvIndex: 9
                }
            ]
        };

        // Testar os três níveis
        const levels = ['basic', 'intermediate', 'advanced'];

        for (const level of levels) {
            console.log(`\n🎯 Testando nível: ${level.toUpperCase()}`);
            console.log('='.repeat(60));

            console.log('📅 Gerando previsão de 5 dias...');
            const forecastMessage = generateForecastMessageByLevel(level, mockForecastData, 5);

            console.log('\n📝 Mensagem gerada:');
            console.log(forecastMessage);

            // Análise da resposta
            const isTechnical = forecastMessage.includes('Amplitude térmica') ||
                forecastMessage.includes('Probabilidade de precipitação') ||
                forecastMessage.includes('Humidade relativa') ||
                forecastMessage.includes('Pressão atmosférica');

            const isBasic = forecastMessage.includes('Dica da Joana Bot') &&
                !forecastMessage.includes('Análise Meteorológica');

            const isIntermediate = forecastMessage.includes('Previsão Detalhada') &&
                forecastMessage.includes('(alta)') ||
                forecastMessage.includes('(moderada)') ||
                forecastMessage.includes('(baixa)');

            console.log('\n🔍 Análise:');
            console.log(`- Formato técnico: ${isTechnical}`);
            console.log(`- Formato básico: ${isBasic}`);
            console.log(`- Formato intermediário: ${isIntermediate}`);

            // Verificar adequação ao nível
            let adequate = false;
            switch (level) {
                case 'basic':
                    adequate = isBasic && !isTechnical;
                    break;
                case 'intermediate':
                    adequate = isIntermediate && !forecastMessage.includes('Amplitude térmica');
                    break;
                case 'advanced':
                    adequate = isTechnical && forecastMessage.includes('Análise Meteorológica');
                    break;
            }

            console.log(`✅ Adequado para nível ${level}: ${adequate}`);

            if (!adequate) {
                console.log(`❌ PROBLEMA: Formato não adequado para nível ${level}!`);
            }

            console.log('\n' + '-'.repeat(60));
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

testForecastRequestLevels().then(() => {
    console.log('\n✅ Teste de níveis de forecast completo');
    process.exit(0);
});
