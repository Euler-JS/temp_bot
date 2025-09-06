// weather_api/weather_service.js
require('dotenv').config();
const axios = require("axios");
const CityNormalizer = require('./city_normalizer');


class WeatherService {
    constructor() {
        // Múltiplas APIs para fallback
        this.apis = [
            {
                name: 'OpenWeatherMap',
                baseUrl: 'https://api.openweathermap.org/data/2.5',
                key: process.env.OPENWEATHER_API_KEY || 'c16789aec9a09c7829b25ac6ba1299ab'
            },
            {
                name: 'WeatherAPI',
                baseUrl: 'https://api.weatherapi.com/v1',
                key: process.env.WEATHERAPI_KEY || '8af38a44fc524c3fbe6104545251807'
            }
        ];
        this.cache = new Map(); // Cache simples
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutos

        // Inicializar normalizador de cidades
        this.cityNormalizer = new CityNormalizer();
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
                    // Normalizar dados da cidade antes de retornar
                    const normalizedResult = this.cityNormalizer.normalizeWeatherData(result);

                    // Salvar no cache
                    this.cache.set(cacheKey, {
                        data: normalizedResult,
                        timestamp: Date.now()
                    });
                    return normalizedResult;
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

    // Previsão de 7 dias usando OpenWeatherMap como principal
    async getWeatherForecast(city, days = 7, units = 'celsius') {
        const cacheKey = `forecast_${city}_${days}_${units}`;

        // Verificar cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        // Tentar OpenWeatherMap primeiro
        try {
            const result = await this.fetchForecastFromOpenWeather(city, days, units);
            if (result) {
                // Salvar no cache
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
                return result;
            }
        } catch (error) {
            console.log('Erro na previsão OpenWeatherMap:', error.message);
        }

        // Fallback para WeatherAPI
        try {
            const result = await this.fetchForecastFromWeatherAPI(city, days);
            if (result) {
                // Salvar no cache
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
                return result;
            }
        } catch (error) {
            console.log('Erro na previsão WeatherAPI:', error.message);
        }

        throw new Error('Erro ao buscar previsão do tempo - todas as APIs falharam');
    }

    // Implementação específica para previsão do OpenWeatherMap
    async fetchForecastFromOpenWeather(city, days, units) {
        const api = this.apis[0]; // OpenWeatherMap
        const unitsParam = units === 'fahrenheit' ? 'imperial' : 'metric';

        // Primeiro, buscar as coordenadas da cidade
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${api.key}`;
        const geoResponse = await axios.get(geoUrl);

        if (!geoResponse.data || geoResponse.data.length === 0) {
            throw new Error('Cidade não encontrada');
        }

        const { lat, lon } = geoResponse.data[0];

        // Usar a API One Call para previsão de 7 dias
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${api.key}&units=${unitsParam}&lang=pt`;
        const response = await axios.get(forecastUrl);

        // Processar dados para agrupar por dia
        const dailyForecasts = this.groupForecastByDay(response.data.list, days);

        return {
            city: response.data.city.name,
            country: response.data.city.country,
            forecasts: dailyForecasts,
            units: units === 'fahrenheit' ? '°F' : '°C',
            source: 'OpenWeatherMap'
        };
    }

    // Implementação para WeatherAPI (fallback)
    async fetchForecastFromWeatherAPI(city, days) {
        const api = this.apis[1]; // WeatherAPI

        const url = `${api.baseUrl}/forecast.json?key=${api.key}&q=${encodeURIComponent(city)}&days=${days}&lang=pt`;
        const response = await axios.get(url);

        return {
            city: response.data.location.name,
            country: response.data.location.country,
            forecasts: response.data.forecast.forecastday.map(day => ({
                date: day.date,
                dayName: this.formatDateToDayName(day.date),
                maxTemp: Math.round(day.day.maxtemp_c),
                minTemp: Math.round(day.day.mintemp_c),
                avgTemp: Math.round(day.day.avgtemp_c),
                description: day.day.condition.text,
                icon: day.day.condition.icon,
                humidity: day.day.avghumidity,
                chanceOfRain: day.day.daily_chance_of_rain,
                windSpeed: Math.round(day.day.maxwind_kph)
            })),
            units: '°C',
            source: 'WeatherAPI'
        };
    }

    // Agrupar previsões por dia (OpenWeatherMap retorna dados de 3 em 3 horas)
    groupForecastByDay(forecasts, maxDays) {
        const dailyData = {};

        forecasts.forEach(forecast => {
            const date = forecast.dt_txt.split(' ')[0]; // Extrair apenas a data (YYYY-MM-DD)

            if (!dailyData[date]) {
                dailyData[date] = {
                    date: date,
                    dayName: this.formatDateToDayName(date),
                    temps: [],
                    descriptions: [],
                    icons: [],
                    humidity: [],
                    windSpeeds: []
                };
            }

            dailyData[date].temps.push(forecast.main.temp);
            dailyData[date].descriptions.push(forecast.weather[0].description);
            dailyData[date].icons.push(forecast.weather[0].icon);
            dailyData[date].humidity.push(forecast.main.humidity);
            dailyData[date].windSpeeds.push(forecast.wind.speed);
        });

        // Processar e limitar aos dias solicitados
        return Object.values(dailyData)
            .slice(0, maxDays)
            .map(day => ({
                date: day.date,
                dayName: day.dayName,
                maxTemp: Math.round(Math.max(...day.temps)),
                minTemp: Math.round(Math.min(...day.temps)),
                avgTemp: Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length),
                description: this.getMostFrequent(day.descriptions),
                icon: this.getMostFrequent(day.icons),
                humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
                windSpeed: Math.round(Math.max(...day.windSpeeds))
            }));
    }

    // Função auxiliar para obter o item mais frequente em um array
    getMostFrequent(arr) {
        const frequency = {};
        let maxCount = 0;
        let mostFrequent = arr[0];

        arr.forEach(item => {
            frequency[item] = (frequency[item] || 0) + 1;
            if (frequency[item] > maxCount) {
                maxCount = frequency[item];
                mostFrequent = item;
            }
        });

        return mostFrequent;
    }

    // Formatar data para nome do dia
    formatDateToDayName(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Hoje';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Amanhã';
        } else {
            return date.toLocaleDateString('pt-BR', { weekday: 'long' });
        }
    }

    // Buscar clima por coordenadas GPS
    async getCurrentWeatherByCoordinates(latitude, longitude, units = 'celsius') {
        const cacheKey = `${latitude}_${longitude}_${units}`;

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
                const result = await this.fetchFromAPIByCoordinates(api, latitude, longitude, units);
                if (result) {
                    // Normalizar dados da cidade antes de retornar
                    const normalizedResult = this.cityNormalizer.normalizeWeatherData(result);

                    // Salvar no cache
                    this.cache.set(cacheKey, {
                        data: normalizedResult,
                        timestamp: Date.now()
                    });
                    return normalizedResult;
                }
            } catch (error) {
                console.log(`Erro na API ${api.name} para coordenadas:`, error.message);
                continue; // Tentar próxima API
            }
        }

        throw new Error('Todas as APIs falharam para buscar clima por coordenadas');
    }

    // Implementação para buscar de API específica por coordenadas
    async fetchFromAPIByCoordinates(api, latitude, longitude, units) {
        if (api.name === 'OpenWeatherMap') {
            return await this.fetchFromOpenWeatherByCoordinates(api, latitude, longitude, units);
        } else if (api.name === 'WeatherAPI') {
            return await this.fetchFromWeatherAPIByCoordinates(api, latitude, longitude, units);
        }
    }

    // OpenWeatherMap com coordenadas
    async fetchFromOpenWeatherByCoordinates(api, latitude, longitude, units) {
        const unitsParam = units === 'fahrenheit' ? 'imperial' : 'metric';
        const url = `${api.baseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${api.key}&units=${unitsParam}&lang=pt`;

        const response = await axios.get(url);

        return {
            city: response.data.name,
            country: response.data.sys.country,
            temperature: Math.round(response.data.main.temp),
            description: response.data.weather[0].description,
            humidity: response.data.main.humidity,
            windSpeed: Math.round(response.data.wind.speed * 3.6), // m/s para km/h
            pressure: response.data.main.pressure,
            feelsLike: Math.round(response.data.main.feels_like),
            visibility: response.data.visibility ? Math.round(response.data.visibility / 1000) : null,
            cloudiness: response.data.clouds.all,
            icon: response.data.weather[0].icon,
            units: units === 'fahrenheit' ? '°F' : '°C',
            coordinates: {
                latitude: response.data.coord.lat,
                longitude: response.data.coord.lon
            },
            source: 'OpenWeatherMap'
        };
    }

    // WeatherAPI com coordenadas
    async fetchFromWeatherAPIByCoordinates(api, latitude, longitude, units) {
        const url = `${api.baseUrl}/current.json?key=${api.key}&q=${latitude},${longitude}&lang=pt`;
        const response = await axios.get(url);

        const tempValue = units === 'fahrenheit' ? response.data.current.temp_f : response.data.current.temp_c;
        const feelsLikeValue = units === 'fahrenheit' ? response.data.current.feelslike_f : response.data.current.feelslike_c;

        return {
            city: response.data.location.name,
            country: response.data.location.country,
            temperature: Math.round(tempValue),
            description: response.data.current.condition.text,
            humidity: response.data.current.humidity,
            windSpeed: Math.round(response.data.current.wind_kph),
            pressure: response.data.current.pressure_mb,
            feelsLike: Math.round(feelsLikeValue),
            visibility: response.data.current.vis_km,
            cloudiness: response.data.current.cloud,
            icon: response.data.current.condition.icon,
            units: units === 'fahrenheit' ? '°F' : '°C',
            coordinates: {
                latitude: response.data.location.lat,
                longitude: response.data.location.lon
            },
            source: 'WeatherAPI'
        };
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