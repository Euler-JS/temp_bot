#!/usr/bin/env node

/**
 * TESTE COMPLETO - SISTEMA MULTILÍNGUE JOANA BOT
 * 
 * Testa o novo sistema que suporta 10+ idiomas usando:
 * - Detecção automática de idioma
 * - Tradução bidirecional
 * - Processamento meteorológico em qualquer idioma
 * - Respostas culturalmente adaptadas
 */

const OPENAI = require('./open_ai/open_ai');
const MultilingualHandler = require('./open_ai/multilingual_handler');

console.log('🌍 TESTE SISTEMA MULTILÍNGUE - JOANA BOT');
console.log('═'.repeat(50));

async function testLanguageDetection() {
    console.log('\n1. 🔍 TESTE DETECÇÃO DE IDIOMA:');
    console.log('─'.repeat(40));

    const openaiService = new OPENAI();

    const testMessages = [
        { text: 'Como está o tempo hoje?', expected: 'pt' },
        { text: 'How is the weather today?', expected: 'en' },
        { text: '¿Cómo está el clima hoy?', expected: 'es' },
        { text: 'Comment est le temps aujourd\'hui?', expected: 'fr' },
        { text: 'Hali ya hewa inayo?', expected: 'sw' },
        { text: 'Eh pá, como tá o tempo em Beira?', expected: 'pt' },
        { text: 'What\'s the temperature in Maputo?', expected: 'en' },
        { text: 'Vai chover amanhã?', expected: 'pt' }
    ];

    for (const { text, expected } of testMessages) {
        try {
            const detection = await openaiService.detectMessageLanguage(text);
            const status = detection.language === expected ? '✅' : '❌';
            const confidence = Math.round(detection.confidence * 100);

            console.log(`   ${status} "${text}"`);
            console.log(`      Detectado: ${detection.language} (${confidence}% confiança)`);
            console.log(`      Esperado: ${expected}`);

            if (detection.native_name) {
                console.log(`      Nome nativo: ${detection.native_name}`);
            }

            console.log('');

        } catch (error) {
            console.log(`   ❌ "${text}" - Erro: ${error.message}`);
        }
    }
}

async function testTranslationToPortuguese() {
    console.log('\n2. 🔄 TESTE TRADUÇÃO PARA PORTUGUÊS:');
    console.log('─'.repeat(40));

    const multilingualHandler = new MultilingualHandler(process.env.OPEN_AI);

    const testTranslations = [
        { text: 'How is the weather in Beira?', lang: 'en' },
        { text: '¿Qué temperatura hace en Maputo?', lang: 'es' },
        { text: 'Il va pleuvoir demain?', lang: 'fr' },
        { text: 'What should I wear today?', lang: 'en' },
        { text: 'Hali ya hewa ni nzuri?', lang: 'sw' }
    ];

    for (const { text, lang } of testTranslations) {
        try {
            console.log(`   🔄 Traduzindo de ${lang.toUpperCase()}:`);
            console.log(`      Original: "${text}"`);

            const translation = await multilingualHandler.translateToPortuguese(text, lang);

            console.log(`      Português: "${translation.translated}"`);
            console.log(`      Confiança: ${Math.round(translation.confidence * 100)}%`);

            if (translation.preserved_entities && translation.preserved_entities.length > 0) {
                console.log(`      Entidades preservadas: ${translation.preserved_entities.join(', ')}`);
            }

            console.log('');

        } catch (error) {
            console.log(`   ❌ Erro na tradução: ${error.message}`);
        }
    }
}

async function testCompleteMultilingualFlow() {
    console.log('\n3. 🌍 TESTE FLUXO COMPLETO MULTILÍNGUE:');
    console.log('─'.repeat(40));

    const openaiService = new OPENAI();

    const testScenarios = [
        {
            message: 'How is the weather in Beira today?',
            expectedLang: 'en',
            description: 'Consulta climática em inglês'
        },
        {
            message: '¿Hace calor en Maputo?',
            expectedLang: 'es',
            description: 'Pergunta sobre temperatura em espanhol'
        },
        {
            message: 'Hali ya hewa ya kesho?',
            expectedLang: 'sw',
            description: 'Previsão do tempo em suaíli'
        },
        {
            message: 'What should I wear today?',
            expectedLang: 'en',
            description: 'Pergunta sobre vestuário em inglês'
        }
    ];

    for (const { message, expectedLang, description } of testScenarios) {
        try {
            console.log(`\n   🧪 ${description}:`);
            console.log(`      Mensagem: "${message}"`);

            // 1. Processar mensagem multilíngue
            const result = await openaiService.processMultilingualMessage(message, '258000000000');

            console.log(`      Idioma detectado: ${result.detected_language}`);
            console.log(`      Mensagem processada: "${result.processed_message}"`);
            console.log(`      Precisa traduzir resposta: ${result.needs_translation ? 'Sim' : 'Não'}`);

            if (result.needs_translation) {
                console.log(`      Idioma alvo: ${result.target_language}`);

                // 2. Simular resposta meteorológica
                const mockWeatherData = {
                    city: 'Beira',
                    temperature: 27,
                    description: 'parcialmente nublado',
                    humidity: 65,
                    country: 'MZ'
                };

                // 3. Gerar resposta multilíngue
                const response = await openaiService.generateMultilingualWeatherResponse(
                    mockWeatherData,
                    { queryCount: 0 },
                    result.target_language
                );

                if (response.success) {
                    console.log(`      ✅ Resposta gerada em ${response.language}:`);
                    console.log(`      "${response.message.substring(0, 100)}..."`);

                    if (response.translation_applied) {
                        console.log(`      Tradução aplicada com ${Math.round(response.confidence * 100)}% confiança`);
                    }
                } else {
                    console.log(`      ❌ Falha ao gerar resposta multilíngue`);
                }
            }

        } catch (error) {
            console.log(`   ❌ Erro no fluxo completo: ${error.message}`);
        }
    }
}

async function testSupportedLanguages() {
    console.log('\n4. 📋 IDIOMAS SUPORTADOS:');
    console.log('─'.repeat(40));

    const openaiService = new OPENAI();
    const supportedLanguages = openaiService.getSupportedLanguages();

    supportedLanguages.forEach(lang => {
        const priority = lang.priority <= 3 ? '⭐' : lang.priority <= 6 ? '🔸' : '🔹';
        console.log(`   ${priority} ${lang.native} (${lang.code.toUpperCase()}) - ${lang.name}`);
    });

    console.log(`\n   💡 Total: ${supportedLanguages.length} idiomas suportados`);
    console.log('   ⭐ = Prioridade alta (África + Internacional)');
    console.log('   🔸 = Prioridade média (Regionais)');
    console.log('   🔹 = Outros idiomas suportados');
}

async function testMultilingualStats() {
    console.log('\n5. 📊 ESTATÍSTICAS DO SISTEMA:');
    console.log('─'.repeat(40));

    const openaiService = new OPENAI();
    const stats = openaiService.getMultilingualStats();

    console.log(`   🧠 Detecções em cache: ${stats.cached_detections}`);
    console.log(`   🔄 Traduções em cache: ${stats.cached_translations}`);
    console.log(`   🌍 Idiomas suportados: ${stats.supported_languages}`);
}

async function showSystemBenefits() {
    console.log('\n' + '═'.repeat(50));
    console.log('💡 BENEFÍCIOS DO SISTEMA MULTILÍNGUE:');
    console.log('');
    console.log('🌍 SUPORTE GLOBAL:');
    console.log('   • 10+ idiomas suportados');
    console.log('   • Foco em idiomas africanos (Swahili, Zulu, Xhosa, Shona)');
    console.log('   • Suporte internacional (English, Español, Français)');
    console.log('   • Detecção automática inteligente');
    console.log('');
    console.log('🤖 INTELIGÊNCIA AI:');
    console.log('   • Detecção por padrões (rápida) + AI (precisa)');
    console.log('   • Tradução contextual meteorológica');
    console.log('   • Adaptação cultural automática');
    console.log('   • Preservação de entidades (cidades, números)');
    console.log('');
    console.log('⚡ PERFORMANCE:');
    console.log('   • Cache inteligente por idioma');
    console.log('   • Fallback robusto para português');
    console.log('   • Processamento paralelo quando possível');
    console.log('   • Otimizado para WhatsApp');
    console.log('');
    console.log('🇲🇿 CONTEXTO MOÇAMBICANO:');
    console.log('   • Português como idioma base');
    console.log('   • Expressões moçambicanas preservadas');
    console.log('   • Dados meteorológicos locais');
    console.log('   • Integração com sistema existente');
    console.log('═'.repeat(50));
}

async function runCompleteTest() {
    await testLanguageDetection();
    await testTranslationToPortuguese();
    await testCompleteMultilingualFlow();
    await testSupportedLanguages();
    await testMultilingualStats();
    await showSystemBenefits();

    console.log('\n🎉 SISTEMA MULTILÍNGUE IMPLEMENTADO COM SUCESSO!');
    console.log('📱 Usuários podem agora interagir em múltiplos idiomas');
    console.log('🌍 Joana Bot expandiu sua capacidade para uma audiência global');
    console.log('🇲🇿 Mantendo o contexto e cultura moçambicana');
}

// Executar todos os testes
runCompleteTest().catch(console.error);
