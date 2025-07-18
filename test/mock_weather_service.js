// test/mock_weather_service.js - Simulação do serviço de clima
class MockWeatherService {
    constructor() {
        this.mockData = {
            'maputo': {
                city: 'Maputo',
                country: 'Mozambique',
                temperature: 28,
                feelsLike: 31,
                humidity: 75,
                description: 'Parcialmente nublado',
                icon: '02d',
                source: 'MockWeatherAPI'
            },
            'beira': {
                city: 'Beira',
                country: 'Mozambique',
                temperature: 26,
                feelsLike: 29,
                humidity: 82,
                description: 'Chuva fraca',
                icon: '10d',
                source: 'MockWeatherAPI'
            },
            'nampula': {
                city: 'Nampula',
                country: 'Mozambique',
                temperature: 32,
                feelsLike: 36,
                humidity: 68,
                description: 'Ensolarado',
                icon: '01d',
                source: 'MockWeatherAPI'
            },
            'lisboa': {
                city: 'Lisboa',
                country: 'Portugal',
                temperature: 18,
                feelsLike: 16,
                humidity: 60,
                description: 'Céu limpo',
                icon: '01d',
                source: 'MockWeatherAPI'
            },
            'luanda': {
                city: 'Luanda',
                country: 'Angola',
                temperature: 29,
                feelsLike: 33,
                humidity: 78,
                description: 'Nublado',
                icon: '03d',
                source: 'MockWeatherAPI'
            }
        };

        console.log(`🌤️ Mock Weather Service iniciado com ${Object.keys(this.mockData).length} cidades`);
    }

    async getCurrentWeather(city, units = 'celsius') {
        console.log(`🔍 [MOCK] Buscando clima para: ${city} em ${units}`);

        // Simular delay da API
        await new Promise(resolve => setTimeout(resolve, 1000));

        const cityKey = city.toLowerCase().replace(/\s+/g, '');
        const data = this.mockData[cityKey];

        if (!data) {
            console.log(`❌ [MOCK] Cidade "${city}" não encontrada`);
            throw new Error(`Cidade "${city}" não encontrada`);
        }

        // Converter para Fahrenheit se necessário
        let temperature = data.temperature;
        let feelsLike = data.feelsLike;
        let unitSymbol = '°C';

        if (units === 'fahrenheit') {
            temperature = Math.round((data.temperature * 9 / 5) + 32);
            feelsLike = Math.round((data.feelsLike * 9 / 5) + 32);
            unitSymbol = '°F';
        }

        const result = {
            ...data,
            temperature,
            feelsLike,
            units: unitSymbol
        };

        console.log(`✅ [MOCK] Clima encontrado: ${result.temperature}${unitSymbol} em ${result.city}`);

        return result;
    }

    async getWeatherForecast(city, days = 7) {
        console.log(`📅 [MOCK] Buscando previsão de ${days} dias para: ${city}`);

        await new Promise(resolve => setTimeout(resolve, 800));

        const cityKey = city.toLowerCase().replace(/\s+/g, '');
        const baseData = this.mockData[cityKey];

        if (!baseData) {
            throw new Error(`Previsão não disponível para "${city}"`);
        }

        const forecast = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            // Simular variação de temperatura
            const tempVariation = Math.floor(Math.random() * 8) - 4; // -4 a +4 graus
            const maxTemp = baseData.temperature + tempVariation + Math.floor(Math.random() * 5);
            const minTemp = maxTemp - (5 + Math.floor(Math.random() * 8));

            const conditions = [
                'Ensolarado', 'Parcialmente nublado', 'Nublado',
                'Chuva fraca', 'Tempestade', 'Céu limpo'
            ];

            forecast.push({
                date: date.toISOString().split('T')[0],
                maxTemp,
                minTemp,
                description: conditions[Math.floor(Math.random() * conditions.length)],
                icon: `0${Math.floor(Math.random() * 4) + 1}d`
            });
        }

        console.log(`✅ [MOCK] Previsão de ${days} dias gerada para ${baseData.city}`);

        return forecast;
    }

    async searchCities(query) {
        console.log(`🔍 [MOCK] Buscando cidades com: "${query}"`);

        await new Promise(resolve => setTimeout(resolve, 500));

        const allCities = [
            { name: 'Maputo', region: 'Maputo City', country: 'Mozambique' },
            { name: 'Beira', region: 'Sofala', country: 'Mozambique' },
            { name: 'Nampula', region: 'Nampula', country: 'Mozambique' },
            { name: 'Tete', region: 'Tete', country: 'Mozambique' },
            { name: 'Quelimane', region: 'Zambézia', country: 'Mozambique' },
            { name: 'Lisboa', region: 'Lisboa', country: 'Portugal' },
            { name: 'Porto', region: 'Porto', country: 'Portugal' },
            { name: 'Luanda', region: 'Luanda', country: 'Angola' },
            { name: 'São Paulo', region: 'São Paulo', country: 'Brazil' },
            { name: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'Brazil' }
        ];

        const results = allCities
            .filter(city =>
                city.name.toLowerCase().includes(query.toLowerCase()) ||
                city.region.toLowerCase().includes(query.toLowerCase())
            )
            .map(city => ({
                ...city,
                fullName: `${city.name}, ${city.region}, ${city.country}`
            }));

        console.log(`✅ [MOCK] Encontradas ${results.length} cidades`);

        return results.slice(0, 5);
    }
}

module.exports = MockWeatherService;