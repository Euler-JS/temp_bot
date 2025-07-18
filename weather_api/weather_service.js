// weather_api/weather_service.js
const axios = require("axios");

class WeatherService {
    constructor() {
        // Múltiplas APIs para fallback
        this.apis = [
            {
                name: 'OpenWeatherMap',
                baseUrl: 'https://api.openweathermap.org/data/2.5',
                key: process.env.OPENWEATHER_API_KEY || 'sua_chave_aqui'
            },
            {
                name: 'WeatherAPI',
                baseUrl: 'https://api.weatherapi.com/v1',
                key: process.env.WEATHERAPI_KEY || 'sua_chave_aqui'
            }
        ];
        this.cache = new Map(); // Cache simples
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutos
    }

    // Função principal para buscar temperatura
    async getCurrentWeather(city, units = 'celsius') {
        const cacheKey = `${city}_${units}`;

        // Verificar cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        // Tentar APIs em ordem
        for (const api of this.apis) {
            try {
                const result = await this.fetchFromAPI(api, city, units);
                if (result) {
                    // Salvar no cache
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });
                    return result;
                }
            } catch (error) {
                console.log(`Erro na API ${api.name}:`, error.message);
                continue; // Tentar próxima API
            }
        }

        throw new Error('Todas as APIs de clima falharam');
    }

    // Implementação específica para OpenWeatherMap
    async fetchFromAPI(api, city, units) {
        if (api.name === 'OpenWeatherMap') {
            const unitsParam = units === 'fahrenheit' ? 'imperial' : 'metric';
            const url = `${api.baseUrl}/weather?q=${encodeURIComponent(city)}&appid=${api.key}&units=${unitsParam}&lang=pt`;

            const response = await axios.get(url);
            const data = response.data;

            return {
                city: data.name,
                country: data.sys.country,
                temperature: Math.round(data.main.temp),
                feelsLike: Math.round(data.main.feels_like),
                humidity: data.main.humidity,
                description: data.weather[0].description,
                icon: data.weather[0].icon,
                units: units === 'fahrenheit' ? '°F' : '°C',
                source: 'OpenWeatherMap'
            };
        }

        if (api.name === 'WeatherAPI') {
            const url = `${api.baseUrl}/current.json?key=${api.key}&q=${encodeURIComponent(city)}&lang=pt`;

            const response = await axios.get(url);
            const data = response.data;

            const temp = units === 'fahrenheit' ? data.current.temp_f : data.current.temp_c;
            const feelsLike = units === 'fahrenheit' ? data.current.feelslike_f : data.current.feelslike_c;

            return {
                city: data.location.name,
                country: data.location.country,
                temperature: Math.round(temp),
                feelsLike: Math.round(feelsLike),
                humidity: data.current.humidity,
                description: data.current.condition.text,
                icon: data.current.condition.icon,
                units: units === 'fahrenheit' ? '°F' : '°C',
                source: 'WeatherAPI'
            };
        }
    }

    // Previsão de 7 dias
    async getWeatherForecast(city, days = 7) {
        const api = this.apis[1]; // WeatherAPI tem melhor forecast

        try {
            const url = `${api.baseUrl}/forecast.json?key=${api.key}&q=${encodeURIComponent(city)}&days=${days}&lang=pt`;
            const response = await axios.get(url);

            return response.data.forecast.forecastday.map(day => ({
                date: day.date,
                maxTemp: Math.round(day.day.maxtemp_c),
                minTemp: Math.round(day.day.mintemp_c),
                description: day.day.condition.text,
                icon: day.day.condition.icon
            }));
        } catch (error) {
            throw new Error('Erro ao buscar previsão do tempo');
        }
    }

    // Buscar cidades para autocompletar
    async searchCities(query) {
        const api = this.apis[1];

        try {
            const url = `${api.baseUrl}/search.json?key=${api.key}&q=${encodeURIComponent(query)}`;
            const response = await axios.get(url);

            return response.data.slice(0, 5).map(city => ({
                name: city.name,
                region: city.region,
                country: city.country,
                fullName: `${city.name}, ${city.region}, ${city.country}`
            }));
        } catch (error) {
            return [];
        }
    }
}

module.exports = WeatherService;