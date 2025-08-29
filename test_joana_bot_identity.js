// test_joana_bot_identity.js - Teste da identidade da Joana Bot
require('dotenv').config();
const OPENAI = require('./open_ai/open_ai');

async function testJoanaBotIdentity() {
    console.log('🤖 TESTANDO IDENTIDADE DA JOANA BOT\n');

    const openaiService = new OPENAI();

    // Teste 1: Comando /joana
    console.log('1️⃣ TESTE: Comando /joana (apresentação completa)');
    console.log('══════════════════════════════════════════════');

    const introMessage = openaiService.getIntroductionMessage(true);
    console.log('✅ APRESENTAÇÃO COMPLETA:');
    console.log('▬'.repeat(80));
    console.log(introMessage);
    console.log('▬'.repeat(80), '\n');

    // Teste 2: Resposta a cumprimento
    console.log('2️⃣ TESTE: Resposta a cumprimento "Olá"');
    console.log('═══════════════════════════════════════');

    const greetingResponse = openaiService.generateBasicFriendlyResponse("Olá", { intent: 'greeting' });
    console.log('✅ RESPOSTA A CUMPRIMENTO:');
    console.log('▬'.repeat(80));
    console.log(greetingResponse);
    console.log('▬'.repeat(80), '\n');

    // Teste 3: Resposta a pergunta sobre ajuda
    console.log('3️⃣ TESTE: Resposta a "quem és tu?"');
    console.log('══════════════════════════════════');

    const helpResponse = openaiService.generateBasicFriendlyResponse("quem és tu", { intent: 'help' });
    console.log('✅ RESPOSTA SOBRE IDENTIDADE:');
    console.log('▬'.repeat(80));
    console.log(helpResponse);
    console.log('▬'.repeat(80), '\n');

    // Teste 4: Contexto da identidade para prompts
    console.log('4️⃣ TESTE: Contexto de identidade para IA');
    console.log('═══════════════════════════════════════');

    const identityContext = openaiService.getBotIdentityContext();
    console.log('✅ CONTEXTO DE IDENTIDADE:');
    console.log('▬'.repeat(80));
    console.log(identityContext);
    console.log('▬'.repeat(80), '\n');

    // Teste 5: Sugestões com identidade da Joana Bot
    console.log('5️⃣ TESTE: Sugestões incluindo identidade');
    console.log('═══════════════════════════════════════');

    const weatherData = {
        city: 'Beira',
        temperature: 27,
        description: 'Tempo limpo',
        humidity: 70
    };

    const userContext = {
        queryCount: 1,
        expertiseLevel: 'basic',
        lastCity: 'Beira'
    };

    try {
        const suggestions = await openaiService.generateConversationalSuggestions(weatherData, userContext);
        console.log('✅ SUGESTÕES COM IDENTIDADE JOANA BOT:');
        console.log('▬'.repeat(80));
        console.log(suggestions.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${suggestions.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${suggestions.method}\n`);
    } catch (error) {
        console.error('❌ Erro nas sugestões:', error.message, '\n');
    }

    // Teste 6: Conselhos de segurança com identidade
    console.log('6️⃣ TESTE: Conselhos de segurança incluindo identidade');
    console.log('════════════════════════════════════════════════');

    try {
        const safetyAdvice = await openaiService.generateSafetyAdvice(weatherData, userContext);
        console.log('✅ CONSELHOS COM IDENTIDADE JOANA BOT:');
        console.log('▬'.repeat(80));
        console.log(safetyAdvice.message);
        console.log('▬'.repeat(80));
        console.log(`📊 Status: ${safetyAdvice.success ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔧 Método: ${safetyAdvice.method}\n`);
    } catch (error) {
        console.error('❌ Erro nos conselhos:', error.message, '\n');
    }

    console.log('🎯 TESTE DE IDENTIDADE DA JOANA BOT CONCLUÍDO!');
    console.log('📈 Verificações:');
    console.log('  ✅ Nome: Joana Bot deve aparecer nas apresentações');
    console.log('  ✅ Especialidade: Assistente Meteorológico Inteligente');
    console.log('  ✅ Criadora: Associação FACE mencionada');
    console.log('  ✅ Foco: Comunidades moçambicanas, especialmente Beira');
    console.log('  ✅ Comandos: /sugestoes, /conselhos, /joana disponíveis');
}

// Executar o teste
testJoanaBotIdentity().catch(console.error);
