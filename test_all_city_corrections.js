#!/usr/bin/env node

/**
 * TESTE COMPLETO - TODAS AS CORREÇÕES DE CIDADES MOÇAMBICANAS
 * 
 * Este script mostra todas as correções implementadas no sistema,
 * não apenas Beira → Lacticinia
 */

const CityNormalizer = require('./weather_api/city_normalizer');

console.log('🇲🇿 CORREÇÕES DE CIDADES MOÇAMBICANAS - COMPLETO');
console.log('═'.repeat(55));

function testAllCorrections() {
    const normalizer = new CityNormalizer();

    // Obter todos os mapeamentos
    const corrections = [
        // Nomes coloniais históricos
        {
            category: '🏛️ NOMES COLONIAIS HISTÓRICOS', tests: [
                ['Lacticīnia', 'Beira'],
                ['Lacticinia', 'Beira'],
                ['Lourenco Marques', 'Maputo'],
                ['Lourenço Marques', 'Maputo'],
                ['Porto Amélia', 'Pemba'],
                ['Vila Pery', 'Chimoio'],
                ['João Belo', 'Xai-Xai'],
                ['António Enes', 'Angoche'],
                ['Vila Cabral', 'Lichinga'],
                ['General Machado', 'Macia']
            ]
        },

        {
            category: '🌐 VARIAÇÕES EM INGLÊS/PORTUGUÊS', tests: [
                ['Maputo City', 'Maputo'],
                ['Maputo Municipality', 'Maputo'],
                ['Cidade de Maputo', 'Maputo'],
                ['Beira City', 'Beira'],
                ['Cidade da Beira', 'Beira'],
                ['Nampula City', 'Nampula'],
                ['Pemba City', 'Pemba'],
                ['Tete City', 'Tete'],
                ['Quelimane City', 'Quelimane'],
                ['Inhambane City', 'Inhambane']
            ]
        },

        {
            category: '📍 PROVÍNCIAS → CAPITAIS', tests: [
                ['Maputo Province', 'Maputo'],
                ['Gaza Province', 'Gaza'],
                ['Sofala Province', 'Beira'],
                ['Inhambane Province', 'Inhambane'],
                ['Manica Province', 'Chimoio'],
                ['Tete Province', 'Tete'],
                ['Zambézia Province', 'Quelimane'],
                ['Nampula Province', 'Nampula'],
                ['Cabo Delgado Province', 'Pemba'],
                ['Niassa Province', 'Lichinga']
            ]
        },

        {
            category: '✅ TESTE CASE-INSENSITIVE', tests: [
                ['LACTICINIA', 'Beira'],
                ['lacticinia', 'Beira'],
                ['LOURENCO MARQUES', 'Maputo'],
                ['lourenco marques', 'Maputo'],
                ['PORTO AMÉLIA', 'Pemba'],
                ['porto amélia', 'Pemba']
            ]
        }
    ];

    corrections.forEach(({ category, tests }) => {
        console.log(`\n${category}:`);
        console.log('─'.repeat(50));

        tests.forEach(([input, expected]) => {
            const result = normalizer.normalize(input);
            const status = result === expected ? '✅' : '❌';
            const arrow = result !== input ? '→' : '=';
            console.log(`   ${status} "${input}" ${arrow} "${result}"`);

            if (result !== expected) {
                console.log(`      ⚠️ Esperado: "${expected}", Obtido: "${result}"`);
            }
        });
    });
}

function testCoordinateBasedCorrection() {
    console.log('\n🎯 CORREÇÃO BASEADA EM COORDENADAS:');
    console.log('─'.repeat(50));

    const normalizer = new CityNormalizer();

    // Coordenadas de teste para diferentes cidades
    const locationTests = [
        {
            name: 'Beira (coord. originais)',
            coords: { latitude: -19.844388961792, longitude: 34.892333984375 },
            unknownCity: 'Cidade Desconhecida',
            expectedNearest: 'Beira'
        },
        {
            name: 'Próximo a Maputo',
            coords: { latitude: -25.9, longitude: 32.6 },
            unknownCity: 'Local Próximo',
            expectedNearest: 'Maputo'
        },
        {
            name: 'Próximo a Nampula',
            coords: { latitude: -15.1, longitude: 39.3 },
            unknownCity: 'Vila Próxima',
            expectedNearest: 'Nampula'
        },
        {
            name: 'Fora de Moçambique',
            coords: { latitude: -1.0, longitude: 37.0 }, // Quênia
            unknownCity: 'Nairobi',
            expectedNearest: null
        }
    ];

    locationTests.forEach(({ name, coords, unknownCity, expectedNearest }) => {
        console.log(`\n   📍 ${name}:`);
        console.log(`      Coordenadas: ${coords.latitude}, ${coords.longitude}`);

        // Teste se está em Moçambique
        const inMozambique = normalizer.isInMozambique(coords.latitude, coords.longitude);
        console.log(`      Em Moçambique: ${inMozambique ? '✅ Sim' : '❌ Não'}`);

        if (inMozambique && expectedNearest) {
            const nearest = normalizer.findNearestKnownCity(coords.latitude, coords.longitude);
            console.log(`      Cidade mais próxima: ${nearest || 'Nenhuma encontrada'}`);

            // Testar normalização com coordenadas
            const normalized = normalizer.normalize(unknownCity, coords);
            console.log(`      "${unknownCity}" → "${normalized}"`);
        }
    });
}

function showSystemBenefits() {
    console.log('\n' + '═'.repeat(55));
    console.log('💡 BENEFÍCIOS DO SISTEMA DE CORREÇÃO:');
    console.log('');
    console.log('🏛️ NOMES COLONIAIS:');
    console.log('   • Corrige automaticamente nomes desatualizados');
    console.log('   • Preserva contexto histórico para debug');
    console.log('   • 10+ correções de nomes coloniais implementadas');
    console.log('');
    console.log('🌍 APIS INTERNACIONAIS:');
    console.log('   • OpenWeatherMap: frequentemente usa nomes antigos');
    console.log('   • WeatherAPI: geralmente mais atualizada');
    console.log('   • Sistema normaliza independente da API usada');
    console.log('');
    console.log('📍 INTELIGÊNCIA GEOGRÁFICA:');
    console.log('   • Detecta se coordenadas estão em Moçambique');
    console.log('   • Sugere cidade mais próxima para nomes desconhecidos');
    console.log('   • Raio de 50km para inferência automática');
    console.log('');
    console.log('🔄 FLEXIBILIDADE:');
    console.log('   • Case-insensitive (maiúsculas/minúsculas)');
    console.log('   • Múltiplas variações do mesmo nome');
    console.log('   • Fácil adição de novas correções');
    console.log('');
    console.log('⚡ PERFORMANCE:');
    console.log('   • Cache preserva nomes corrigidos');
    console.log('   • Processamento instantâneo');
    console.log('   • Não impacta velocidade do bot');
    console.log('═'.repeat(55));
}

function showUsageExamples() {
    console.log('\n📱 EXEMPLOS DE USO REAL:');
    console.log('');
    console.log('🔄 ANTES (problemas):',);
    console.log('   👤 Usuário envia GPS de Maputo');
    console.log('   🤖 Bot: "📍 Lourenco Marques, MZ" ❌');
    console.log('   😕 Usuário confuso com nome antigo');
    console.log('');
    console.log('✅ DEPOIS (corrigido):');
    console.log('   👤 Usuário envia GPS de Maputo');
    console.log('   🤖 Bot: "📍 Maputo, MZ" ✅');
    console.log('   😊 Usuário reconhece sua cidade');
    console.log('');
    console.log('🎯 CASOS REAIS COBERTOS:');
    console.log('   • GPS da Beira → "Lacticinia" corrigido para "Beira"');
    console.log('   • GPS de Maputo → "Lourenco Marques" corrigido para "Maputo"');
    console.log('   • GPS de Pemba → "Porto Amélia" corrigido para "Pemba"');
    console.log('   • GPS de Chimoio → "Vila Pery" corrigido para "Chimoio"');
    console.log('   • E muito mais...');
}

async function runCompleteTest() {
    testAllCorrections();
    testCoordinateBasedCorrection();
    showSystemBenefits();
    showUsageExamples();

    console.log('\n🚀 CONCLUSÃO:');
    console.log('O sistema não é apenas para Beira - é uma solução completa');
    console.log('para TODAS as cidades moçambicanas que podem ter nomes');
    console.log('coloniais ou variações nas APIs internacionais!');
}

// Executar teste completo
runCompleteTest().catch(console.error);
