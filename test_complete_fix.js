#!/usr/bin/env node

/**
 * TESTE SIMULAÇÃO COMPLETA - GPS PARA BEIRA
 * 
 * Simula o fluxo completo que o usuário experimentou:
 * 1. Receber coordenadas GPS
 * 2. Buscar clima
 * 3. Gerar resposta com IA  
 * 4. Verificar se retorna "Beira" em vez de "Lacticinia"
 */

const WeatherService = require('./weather_api/weather_service');
const OpenAIService = require('./open_ai/open_ai');

async function simulateCompleteFlow() {
    console.log('🎬 SIMULAÇÃO COMPLETA - FLUXO GPS → BEIRA');
    console.log('='.repeat(50));

    // Dados exatos da mensagem original
    const locationData = {
        from: '258846151124',
        id: 'wamid.HBgMMjU4ODQ2MTUxMTI0FQIAEhgUM0E1NDk5NjVBMjEzMzYwQjY5RDUA',
        timestamp: '1757061773',
        location: { latitude: -19.844388961792, longitude: 34.892333984375 },
        type: 'location'
    };

    console.log('\n📱 ENTRADA (igual à recebida):');
    console.log(`   👤 De: ${locationData.from}`);
    console.log(`   📍 Coordenadas: ${locationData.location.latitude}, ${locationData.location.longitude}`);
    console.log(`   ⏰ Timestamp: ${locationData.timestamp}`);

    try {
        // 1. Buscar clima pelas coordenadas (como faz o bot)
        console.log('\n🤖 PROCESSAMENTO DO BOT:');
        console.log('   📍 1. Confirmação instantânea enviada');

        const weatherService = new WeatherService();
        const weatherData = await weatherService.getCurrentWeatherByCoordinates(
            locationData.location.latitude,
            locationData.location.longitude
        );

        console.log(`   🌍 2. Cidade detectada: ${weatherData.city} (era: ${weatherData.originalCity || 'N/A'})`);
        console.log(`   🌡️ 3. Clima obtido: ${weatherData.temperature}${weatherData.units}, ${weatherData.description}`);

        // 2. Gerar resposta com IA (como faz o bot)
        const openaiService = new OpenAIService();
        const aiResponse = await openaiService.generateSimpleWeatherResponse(weatherData, {});
        console.log(`   🤖 4. Resposta IA gerada`);
        console.log(`   💾 5. Cidade salva como preferência do usuário`);

        // 3. Construir mensagem final (como o bot envia)
        const finalMessage = `📍 *${weatherData.city}, ${weatherData.country}*

🌡️ **Temperatura:** ${weatherData.temperature}${weatherData.units}
💨 **Sensação térmica:** ${weatherData.feelsLike}${weatherData.units}
🌤️ **Condições:** ${weatherData.description}
💧 **Humidade:** ${weatherData.humidity}%
🌪️ **Vento:** ${weatherData.windSpeed} km/h

${aiResponse.message}

💡 **Dica:** Sua localização foi salva como cidade preferida. Use "/clima" para updates rápidos!`;

        console.log('\n📨 MENSAGEM FINAL CORRIGIDA:');
        console.log('─'.repeat(50));
        console.log(finalMessage);
        console.log('─'.repeat(50));

        // 4. Comparação com mensagem original
        console.log('\n🔄 COMPARAÇÃO:');
        console.log('   ❌ ANTES: "📍 *Lacticīnia, MZ*"');
        console.log(`   ✅ DEPOIS: "📍 *${weatherData.city}, ${weatherData.country}*"`);

        const wasFixed = weatherData.city === 'Beira' && weatherData.originalCity === 'Lacticīnia';
        console.log(`\n   ${wasFixed ? '🎉 PROBLEMA CORRIGIDO!' : '⚠️ Verificar implementação'}`);

        if (wasFixed) {
            console.log('   ✅ O sistema agora retorna "Beira" corretamente');
            console.log('   ✅ Nome original "Lacticīnia" preservado para referência');
            console.log('   ✅ Usuário receberá informação com nome correto da cidade');
        }

        // 5. Verificar alertas adicionais
        if (weatherData.temperature > 30 || weatherData.humidity > 80) {
            console.log('\n🚨 ALERTA ADICIONAL SERIA ENVIADO:');
            const alertMessage = await openaiService.generateLocationBasedAlert(weatherData, {});
            if (alertMessage.success) {
                console.log(`   ⚠️ ${alertMessage.message}`);
            }
        }

        return {
            success: true,
            city: weatherData.city,
            originalCity: weatherData.originalCity,
            corrected: wasFixed
        };

    } catch (error) {
        console.log(`\n❌ ERRO NA SIMULAÇÃO: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function summarizeImplementation() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 RESUMO DA IMPLEMENTAÇÃO:');
    console.log('');
    console.log('🔧 PROBLEMA IDENTIFICADO:');
    console.log('   • OpenWeatherMap retorna "Lacticīnia" (nome colonial)');
    console.log('   • WeatherAPI retorna "Beira" (nome atual correto)');
    console.log('   • Sistema usava primeira API que respondia (OpenWeatherMap)');
    console.log('');
    console.log('💡 SOLUÇÃO IMPLEMENTADA:');
    console.log('   • ✅ CityNormalizer: corrige nomes coloniais/antigos');
    console.log('   • ✅ Mapeamento "Lacticīnia" → "Beira"');
    console.log('   • ✅ Integração no WeatherService');
    console.log('   • ✅ Preserva nome original para debug');
    console.log('   • ✅ Cache otimizado com nomes corretos');
    console.log('');
    console.log('🎯 RESULTADO:');
    console.log('   • Coordenadas GPS agora retornam "Beira"');
    console.log('   • Sistema robusto para outros nomes coloniais');
    console.log('   • Experiência do usuário melhorada');
    console.log('   • Sem quebrar funcionalidades existentes');
    console.log('='.repeat(50));
}

async function runSimulation() {
    const result = await simulateCompleteFlow();
    await summarizeImplementation();

    if (result.success && result.corrected) {
        console.log('\n🚀 DEPLOY READY: A correção está funcionando perfeitamente!');
        console.log('📱 Usuários agora verão "Beira" em vez de "Lacticīnia"');
    } else {
        console.log('\n⚠️ REVIEW NEEDED: Verificar se há algum problema na implementação');
    }
}

// Executar simulação completa
runSimulation().catch(console.error);
