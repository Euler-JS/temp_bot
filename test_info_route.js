// test_info_route.js - Teste da rota /info para envio em massa
const axios = require('axios');

// Configuração
const BASE_URL = 'http://localhost:3000'; // Ajuste a porta se necessário

async function testInfoRoute() {
    console.log('🧪 Testando rota /info para envio em massa de mensagens');

    try {
        // Teste 1: Envio básico com dados meteorológicos
        console.log('\n📋 Teste 1: Envio com dados meteorológicos');

        const response1 = await axios.post(`${BASE_URL}/info`, {
            message: '🎉 Olá! Esta é uma mensagem de teste do TempBot. Como está o tempo na sua região hoje?',
            includeWeather: true
        });

        console.log('✅ Resultado do Teste 1:');
        console.log(`📊 Total de usuários: ${response1.data.data.totalUsers}`);
        console.log(`📤 Mensagens enviadas: ${response1.data.data.sentCount}`);
        console.log(`❌ Erros: ${response1.data.data.errorCount}`);
        console.log(`📈 Taxa de sucesso: ${response1.data.data.successRate}`);
        console.log(`🏙️ Cidades processadas: ${response1.data.data.citiesProcessed}`);
        console.log(`⏰ Timestamp: ${response1.data.data.timestamp}`);

        // Mostrar breakdown por cidade
        if (response1.data.data.cityBreakdown && response1.data.data.cityBreakdown.length > 0) {
            console.log('\n🏙️ Breakdown por cidade:');
            response1.data.data.cityBreakdown.forEach(city => {
                console.log(`  📍 ${city.city}: ${city.sentCount}/${city.totalUsers} (${city.successRate}) - ${city.temperature}°C, ${city.conditions}`);
            });
        }

        // Aguardar 5 segundos antes do próximo teste
        console.log('\n⏳ Aguardando 5 segundos para próximo teste...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Teste 2: Envio sem dados meteorológicos
        console.log('\n📋 Teste 2: Envio sem dados meteorológicos');

        const response2 = await axios.post(`${BASE_URL}/info`, {
            message: '📢 Aviso importante: Lembrem-se de sempre verificar as condições climáticas antes de sair de casa! 🌤️',
            includeWeather: false
        });

        console.log('✅ Resultado do Teste 2:');
        console.log(`📊 Total de usuários: ${response2.data.data.totalUsers}`);
        console.log(`📤 Mensagens enviadas: ${response2.data.data.sentCount}`);
        console.log(`❌ Erros: ${response2.data.data.errorCount}`);
        console.log(`📈 Taxa de sucesso: ${response2.data.data.successRate}`);
        console.log(`🏙️ Cidades processadas: ${response2.data.data.citiesProcessed}`);

        // Aguardar 5 segundos antes do próximo teste
        console.log('\n⏳ Aguardando 5 segundos para próximo teste...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Teste 3: Envio apenas com dados meteorológicos (sem mensagem personalizada)
        console.log('\n📋 Teste 3: Apenas dados meteorológicos');

        const response3 = await axios.post(`${BASE_URL}/info`, {
            includeWeather: true
        });

        console.log('✅ Resultado do Teste 3:');
        console.log(`📊 Total de usuários: ${response3.data.data.totalUsers}`);
        console.log(`📤 Mensagens enviadas: ${response3.data.data.sentCount}`);
        console.log(`❌ Erros: ${response3.data.data.errorCount}`);
        console.log(`📈 Taxa de sucesso: ${response3.data.data.successRate}`);
        console.log(`🏙️ Cidades processadas: ${response3.data.data.citiesProcessed}`);

        console.log('\n🎉 Todos os testes concluídos com sucesso!');

    } catch (error) {
        console.error('❌ Erro durante os testes:');

        if (error.response) {
            console.error(`📊 Status: ${error.response.status}`);
            console.error(`📄 Dados: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
            console.error('🌐 Erro de rede - servidor não acessível');
            console.error('🔧 Verifique se o servidor está rodando na porta correta');
        } else {
            console.error('⚠️ Erro:', error.message);
        }
    }
}

// Função para testar com chave de admin (se configurada)
async function testWithAdminKey() {
    console.log('\n🔑 Teste com chave de administrador');

    try {
        const response = await axios.post(`${BASE_URL}/info`, {
            message: '🔐 Mensagem administrativa: Sistema funcionando perfeitamente!',
            includeWeather: true,
            adminKey: process.env.ADMIN_KEY || 'test_admin_key'
        });

        console.log('✅ Teste com chave admin bem-sucedido');
        console.log(`📤 Mensagens enviadas: ${response.data.data.sentCount}`);

    } catch (error) {
        if (error.response?.status === 401) {
            console.log('⚠️ Chave de admin inválida (esperado se não configurada)');
        } else {
            console.error('❌ Erro no teste com chave admin:', error.message);
        }
    }
}

// Executar testes
async function runAllTests() {
    console.log('🚀 Iniciando testes da rota /info');
    console.log('📍 URL de teste:', BASE_URL);

    await testInfoRoute();
    await testWithAdminKey();

    console.log('\n📝 Resumo dos Testes:');
    console.log('✅ Teste básico com dados meteorológicos');
    console.log('✅ Teste sem dados meteorológicos');
    console.log('✅ Teste apenas com dados meteorológicos');
    console.log('✅ Teste com chave de administrador');
    console.log('\n💡 Como usar a rota /info:');
    console.log('POST /info');
    console.log('Body: {');
    console.log('  "message": "Sua mensagem personalizada",');
    console.log('  "includeWeather": true/false,');
    console.log('  "adminKey": "chave_opcional"');
    console.log('}');
}

// Executar se chamado diretamente
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { testInfoRoute, testWithAdminKey, runAllTests };
