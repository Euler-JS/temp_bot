#!/usr/bin/env node

/**
 * DEBUG - VERIFICAR COORDENADAS LACTICINIA vs BEIRA
 * 
 * Este script vai testar as APIs diretamente com as coordenadas recebidas
 * para verificar por que está retornando "Lacticinia" em vez de "Beira"
 */

require('dotenv').config();
const axios = require('axios');

// Coordenadas recebidas na mensagem original
const COORDINATES = {
    latitude: -19.844388961792,
    longitude: 34.892333984375
};

console.log('🔍 DEBUG - INVESTIGANDO COORDENADAS LACTICINIA');
console.log('='.repeat(50));
console.log(`📍 Coordenadas testadas: ${COORDINATES.latitude}, ${COORDINATES.longitude}`);
console.log('='.repeat(50));

async function testOpenWeatherMap() {
    try {
        console.log('\n🌐 TESTANDO OpenWeatherMap:');
        const apiKey = process.env.OPENWEATHER_API_KEY || 'c16789aec9a09c7829b25ac6ba1299ab';
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${COORDINATES.latitude}&lon=${COORDINATES.longitude}&appid=${apiKey}&units=metric&lang=pt`;

        console.log(`   URL: ${url}`);

        const response = await axios.get(url);

        console.log('   ✅ RESPOSTA:');
        console.log(`      🏙️ Cidade: ${response.data.name}`);
        console.log(`      🌍 País: ${response.data.sys.country}`);
        console.log(`      📍 Coordenadas retornadas: ${response.data.coord.lat}, ${response.data.coord.lon}`);
        console.log(`      🌡️ Temperatura: ${Math.round(response.data.main.temp)}°C`);
        console.log(`      🌤️ Condições: ${response.data.weather[0].description}`);

    } catch (error) {
        console.log(`   ❌ ERRO OpenWeatherMap: ${error.message}`);
        if (error.response) {
            console.log(`   📄 Status: ${error.response.status}`);
            console.log(`   📄 Dados: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

async function testWeatherAPI() {
    try {
        console.log('\n🌐 TESTANDO WeatherAPI:');
        const apiKey = process.env.WEATHERAPI_KEY || '8af38a44fc524c3fbe6104545251807';
        const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${COORDINATES.latitude},${COORDINATES.longitude}&lang=pt`;

        console.log(`   URL: ${url}`);

        const response = await axios.get(url);

        console.log('   ✅ RESPOSTA:');
        console.log(`      🏙️ Cidade: ${response.data.location.name}`);
        console.log(`      🌍 País: ${response.data.location.country}`);
        console.log(`      🗺️ Região: ${response.data.location.region}`);
        console.log(`      📍 Coordenadas retornadas: ${response.data.location.lat}, ${response.data.location.lon}`);
        console.log(`      🌡️ Temperatura: ${Math.round(response.data.current.temp_c)}°C`);
        console.log(`      🌤️ Condições: ${response.data.current.condition.text}`);

    } catch (error) {
        console.log(`   ❌ ERRO WeatherAPI: ${error.message}`);
        if (error.response) {
            console.log(`   📄 Status: ${error.response.status}`);
            console.log(`   📄 Dados: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

async function testNearbyLocations() {
    console.log('\n🎯 TESTANDO LOCALIZAÇÕES PRÓXIMAS:');

    const nearbyCoords = [
        { name: 'Beira Centro', lat: -19.8433, lon: 34.8394 },
        { name: 'Beira Porto', lat: -19.8269, lon: 34.8553 },
        { name: 'Coordenada Original', lat: COORDINATES.latitude, lon: COORDINATES.longitude },
        { name: 'Ligeiramente Norte', lat: -19.840, lon: 34.892 },
        { name: 'Ligeiramente Sul', lat: -19.848, lon: 34.892 }
    ];

    for (const coord of nearbyCoords) {
        try {
            const apiKey = process.env.WEATHERAPI_KEY || '8af38a44fc524c3fbe6104545251807';
            const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${coord.lat},${coord.lon}&lang=pt`;

            const response = await axios.get(url);

            console.log(`   📍 ${coord.name} (${coord.lat}, ${coord.lon}):`);
            console.log(`      ➡️ API retorna: ${response.data.location.name}, ${response.data.location.region}`);

        } catch (error) {
            console.log(`   📍 ${coord.name}: ❌ Erro - ${error.message}`);
        }
    }
}

async function testGoogleGeocoding() {
    try {
        console.log('\n🗺️ COMPARANDO COM GOOGLE GEOCODING:');

        // Teste com Google Geocoding API (se disponível)
        const googleKey = process.env.GOOGLE_API_KEY;
        if (googleKey) {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${COORDINATES.latitude},${COORDINATES.longitude}&key=${googleKey}&language=pt`;

            const response = await axios.get(url);

            if (response.data.results.length > 0) {
                const result = response.data.results[0];
                console.log('   ✅ Google Geocoding diz:');
                console.log(`      📍 Endereço: ${result.formatted_address}`);

                // Extrair componentes
                const components = result.address_components;
                const city = components.find(c => c.types.includes('locality'))?.long_name;
                const admin = components.find(c => c.types.includes('administrative_area_level_1'))?.long_name;

                console.log(`      🏙️ Cidade: ${city || 'N/A'}`);
                console.log(`      🗺️ Província/Estado: ${admin || 'N/A'}`);
            }
        } else {
            console.log('   ⚠️ Google API Key não configurada');
        }

    } catch (error) {
        console.log(`   ❌ ERRO Google: ${error.message}`);
    }
}

async function runDebug() {
    await testOpenWeatherMap();
    await testWeatherAPI();
    await testNearbyLocations();
    await testGoogleGeocoding();

    console.log('\n' + '='.repeat(50));
    console.log('🎯 ANÁLISE:');
    console.log('');
    console.log('💡 POSSÍVEIS CAUSAS DO PROBLEMA:');
    console.log('1. 📍 APIs de clima usam bases de dados diferentes para geocodificação reversa');
    console.log('2. 🗺️ "Lacticinia" pode ser um nome histórico/colonial da região');
    console.log('3. 🎯 Coordenadas podem estar em zona limítrofe entre localidades');
    console.log('4. 📊 Diferentes níveis de precisão entre APIs');
    console.log('');
    console.log('🔧 SOLUÇÕES POSSÍVEIS:');
    console.log('1. ✅ Implementar normalização de nomes de cidades moçambicanas');
    console.log('2. 🎯 Usar múltiplas APIs e escolher resultado mais conhecido');
    console.log('3. 📍 Criar mapeamento manual para coordenadas problemáticas');
    console.log('4. 🤖 Implementar correção automática via IA baseada no contexto');
    console.log('='.repeat(50));
}

// Executar debug
runDebug().catch(console.error);
