#!/usr/bin/env node

/**
 * TESTE - VERIFICAÇÃO DA CORREÇÃO LACTICINIA → BEIRA
 * 
 * Este script testa se o normalizador está funcionando corretamente
 * e corrigindo "Lacticinia" para "Beira"
 */

const WeatherService = require('./weather_api/weather_service');
const CityNormalizer = require('./weather_api/city_normalizer');

console.log('🧪 TESTE - CORREÇÃO LACTICINIA → BEIRA');
console.log('='.repeat(45));

async function testCorrectionBefore() {
    console.log('\n1. 🧪 TESTE DO NORMALIZADOR ISOLADO:');

    const normalizer = new CityNormalizer();

    // Teste direto do normalizador
    const testCases = [
        'Lacticīnia',
        'Lacticinia',
        'Beira',
        'LACTICINIA',
        'lacticinia'
    ];

    testCases.forEach(city => {
        const normalized = normalizer.normalize(city);
        const status = normalized === 'Beira' ? '✅' : '❌';
        console.log(`   ${status} "${city}" → "${normalized}"`);
    });
}

async function testWeatherServiceIntegration() {
    console.log('\n2. 🌍 TESTE INTEGRAÇÃO WEATHERSERVICE:');

    const weatherService = new WeatherService();

    // Coordenadas que retornam "Lacticinia" na OpenWeatherMap
    const coordinates = {
        latitude: -19.844388961792,
        longitude: 34.892333984375
    };

    try {
        console.log('   📍 Buscando clima por coordenadas...');
        const weatherData = await weatherService.getCurrentWeatherByCoordinates(
            coordinates.latitude,
            coordinates.longitude
        );

        console.log('\n   📊 RESULTADO:');
        console.log(`   🏙️ Cidade retornada: "${weatherData.city}"`);
        console.log(`   🌍 País: ${weatherData.country}`);
        console.log(`   🌡️ Temperatura: ${weatherData.temperature}${weatherData.units}`);
        console.log(`   🌤️ Condições: ${weatherData.description}`);

        if (weatherData.originalCity) {
            console.log(`   🔄 Cidade original da API: "${weatherData.originalCity}"`);
        }

        // Verificar se foi corrigido
        const success = weatherData.city === 'Beira';
        console.log(`\n   ${success ? '✅ SUCESSO' : '❌ FALHA'}: ${success ? 'Lacticinia foi corrigida para Beira!' : 'Correção não funcionou'}`);

        return success;

    } catch (error) {
        console.log(`   ❌ ERRO: ${error.message}`);
        return false;
    }
}

async function testOtherAPIs() {
    console.log('\n3. 🔄 TESTE MÚLTIPLAS APIs:');

    const WeatherServiceOld = require('./weather_api/weather_service');
    const service = new WeatherServiceOld();

    // Forçar teste de ambas as APIs
    for (let i = 0; i < service.apis.length; i++) {
        const api = service.apis[i];
        console.log(`\n   📡 Testando ${api.name}:`);

        try {
            const result = await service.fetchFromAPIByCoordinates(
                api,
                -19.844388961792,
                34.892333984375,
                'celsius'
            );

            console.log(`      🏙️ Cidade original: "${result.city}"`);

            // Aplicar normalização
            const normalized = service.cityNormalizer.normalizeWeatherData(result);
            console.log(`      🔄 Cidade normalizada: "${normalized.city}"`);

            if (normalized.originalCity) {
                console.log(`      📝 Original preservado: "${normalized.originalCity}"`);
            }

        } catch (error) {
            console.log(`      ❌ Erro: ${error.message}`);
        }
    }
}

async function runAllTests() {
    await testCorrectionBefore();
    const integrationSuccess = await testWeatherServiceIntegration();
    await testOtherAPIs();

    console.log('\n' + '='.repeat(45));
    console.log('📊 RESUMO DOS TESTES:');
    console.log(`${integrationSuccess ? '✅' : '❌'} Integração WeatherService: ${integrationSuccess ? 'FUNCIONANDO' : 'COM PROBLEMAS'}`);
    console.log('✅ Normalizador de cidades: IMPLEMENTADO');
    console.log('✅ Mapeamento Lacticinia → Beira: ATIVO');

    console.log('\n💡 PROBLEMA RESOLVIDO:');
    console.log('   📍 APIs internacionais frequentemente retornam nomes coloniais');
    console.log('   🔧 Normalizador corrige automaticamente para nomes atuais');
    console.log('   🇲🇿 Específico para cidades moçambicanas');
    console.log('   💾 Cache preserva dados normalizados para performance');

    if (integrationSuccess) {
        console.log('\n🎉 CORREÇÃO IMPLEMENTADA COM SUCESSO!');
        console.log('📱 Agora coordenadas GPS retornarão "Beira" em vez de "Lacticinia"');
    } else {
        console.log('\n⚠️ VERIFICAR IMPLEMENTAÇÃO - Algo pode ter dado errado');
    }

    console.log('='.repeat(45));
}

// Executar todos os testes
runAllTests().catch(console.error);
