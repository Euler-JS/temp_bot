// test_quick_response.js - Teste da resposta rápida alternativa
require('dotenv').config();
const WhatsAppApi = require("./whatsapp_api/connection");

// Configuração
const token = process.env.WHATSAPP_TOKEN || "";
const phoneNumberID = process.env.PHONE_NUMBER_ID || "";
const testPhoneNumber = process.env.TEST_PHONE_NUMBER || ""; // Adicione seu número de teste no .env

const whatsappApi = new WhatsAppApi(token, phoneNumberID);

async function testQuickResponse() {
    console.log('🧪 Testando nova abordagem de resposta rápida...');

    if (!testPhoneNumber) {
        console.error('❌ Defina TEST_PHONE_NUMBER no arquivo .env para testar');
        return;
    }

    try {
        console.log('1️⃣ Testando confirmação rápida...');
        await whatsappApi.enviarMensagemRapidaProcessando(testPhoneNumber, 'Analisando');

        console.log('⏳ Aguardando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('2️⃣ Enviando resposta completa...');
        await whatsappApi.enviarMensagemUsandoWhatsappAPI(
            '✅ Perfeito! Agora o bot responde rapidamente para mostrar que recebeu a mensagem, depois envia a resposta completa!\n\n🎯 Muito mais natural que antes!',
            testPhoneNumber
        );

        console.log('✅ Teste 1 concluído!\n');

        // Teste 2: Método combinado
        console.log('🔄 Testando método combinado (confirmação + resposta)...');

        await whatsappApi.enviarConfirmacaoEResposta(
            testPhoneNumber,
            '🚀 Esta mensagem foi enviada com confirmação rápida primeiro!\n\nVocê deve ter visto uma mensagem tipo "🧠 Recebido... analisando!" antes desta resposta completa.\n\n💡 Experiência muito melhor!',
            null, // messageId (não temos)
            2500  // 2.5 segundos de espera
        );

        console.log('✅ Teste 2 concluído!\n');

        // Teste 3: Mensagem de carregamento melhorada
        console.log('📋 Testando carregamento melhorado...');

        await whatsappApi.enviarMensagemCarregamento(testPhoneNumber, 'Buscando dados meteorológicos');

        await new Promise(resolve => setTimeout(resolve, 3000));

        await whatsappApi.enviarMensagemUsandoWhatsappAPI(
            '🌤️ Dados encontrados!\n\nMaputo: 25°C, ensolarado\nBeira: 28°C, parcialmente nublado\nNampula: 23°C, chuva leve\n\n📊 Esta foi a simulação completa!',
            testPhoneNumber
        );

        console.log('✅ Todos os testes concluídos com sucesso!');

        // Resumo
        console.log('\n📈 RESUMO DOS TESTES:');
        console.log('1. ✅ Confirmação rápida funcionando');
        console.log('2. ✅ Método combinado funcionando');
        console.log('3. ✅ Carregamento melhorado funcionando');
        console.log('\n🎉 Nova abordagem implementada com sucesso!');

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.response ? error.response.data : error.message);
    }
}

// Executar teste
if (require.main === module) {
    testQuickResponse();
}

module.exports = { testQuickResponse };
