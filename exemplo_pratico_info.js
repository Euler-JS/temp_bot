// exemplo_pratico_info.js - Exemplo prático de uso da rota /info

const axios = require('axios');

// Configuração
const SERVER_URL = 'http://localhost:3000'; // Ajuste conforme necessário

// Função para enviar mensagem meteorológica diária
async function enviarBoletimDiario() {
    const mensagem = `🌅 *BOM DIA!*
    
Aqui está o seu boletim meteorológico personalizado para começar bem o dia! ☀️

🤖 A Joana Bot está sempre de olho no tempo para você!`;

    try {
        const response = await axios.post(`${SERVER_URL}/info`, {
            message: mensagem,
            includeWeather: true
        });

        console.log('📊 Boletim Diário Enviado:');
        console.log(`✅ Enviados: ${response.data.data.sentCount}`);
        console.log(`❌ Erros: ${response.data.data.errorCount}`);
        console.log(`📈 Taxa: ${response.data.data.successRate}`);
        console.log(`🏙️ Cidades: ${response.data.data.citiesProcessed}`);

        // Mostrar breakdown por cidade
        if (response.data.data.cityBreakdown) {
            console.log('\n🏙️ Detalhes por cidade:');
            response.data.data.cityBreakdown.forEach(city => {
                console.log(`  📍 ${city.city}: ${city.sentCount}/${city.totalUsers} usuários (${city.temperature}°C)`);
            });
        }

        return response.data;
    } catch (error) {
        console.error('❌ Erro ao enviar boletim diário:', error.message);
    }
}

// Função para alerta de condições extremas
async function enviarAlertaClimatico() {
    const mensagem = `⚠️ *ALERTA METEOROLÓGICO*
    
Condições climáticas especiais detectadas na sua região!

🛡️ Mantenha-se seguro e tome as precauções necessárias.`;

    try {
        const response = await axios.post(`${SERVER_URL}/info`, {
            message: mensagem,
            includeWeather: true
        });

        console.log('🚨 Alerta Climático Enviado:');
        console.log(`✅ Enviados: ${response.data.data.sentCount}`);
        console.log(`❌ Erros: ${response.data.data.errorCount}`);
        console.log(`🏙️ Cidades: ${response.data.data.citiesProcessed}`);

        return response.data;
    } catch (error) {
        console.error('❌ Erro ao enviar alerta:', error.message);
    }
}

// Função para dicas de fim de semana
async function enviarDicasFimDeSemana() {
    const mensagem = `🎉 *DICAS PARA O FIM DE SEMANA!*
    
Como está o tempo na sua cidade hoje? Que tal aproveitar o fim de semana da melhor forma possível!

🌤️ Vamos ver as condições atuais para você planejar suas atividades:`;

    try {
        const response = await axios.post(`${SERVER_URL}/info`, {
            message: mensagem,
            includeWeather: true
        });

        console.log('🎊 Dicas de Fim de Semana Enviadas:');
        console.log(`✅ Enviados: ${response.data.data.sentCount}`);
        console.log(`🏙️ Cidades: ${response.data.data.citiesProcessed}`);

        return response.data;
    } catch (error) {
        console.error('❌ Erro ao enviar dicas:', error.message);
    }
}

// Função para informação geral sem dados meteorológicos
async function enviarInformacaoGeral() {
    const mensagem = `📢 *INFORMAÇÃO IMPORTANTE*
    
Olá! Esperamos que esteja tudo bem com você!

💡 Lembre-se: a Joana Bot está sempre aqui para ajudar você com informações meteorológicas. É só perguntar!

🌤️ Comandos úteis:
• /sugestoes - Dicas personalizadas
• /conselhos - Conselhos por bairro
• /alertas - Verificar perigos meteorológicos

Tenha um ótimo dia! 😊`;

    try {
        const response = await axios.post(`${SERVER_URL}/info`, {
            message: mensagem,
            includeWeather: false // Sem dados meteorológicos desta vez
        });

        console.log('📋 Informação Geral Enviada:');
        console.log(`✅ Enviados: ${response.data.data.sentCount}`);
        console.log(`🏙️ Cidades: ${response.data.data.citiesProcessed}`);

        return response.data;
    } catch (error) {
        console.error('❌ Erro ao enviar informação geral:', error.message);
    }
}

// Função para testar todos os tipos de envio
async function testarTodosOsEnvios() {
    console.log('🚀 Iniciando testes dos diferentes tipos de envio...\n');

    // 1. Boletim diário
    console.log('1️⃣ Testando boletim diário...');
    await enviarBoletimDiario();
    console.log('⏳ Aguardando 10 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 2. Alerta climático
    console.log('2️⃣ Testando alerta climático...');
    await enviarAlertaClimatico();
    console.log('⏳ Aguardando 10 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 3. Dicas de fim de semana
    console.log('3️⃣ Testando dicas de fim de semana...');
    await enviarDicasFimDeSemana();
    console.log('⏳ Aguardando 10 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 4. Informação geral
    console.log('4️⃣ Testando informação geral...');
    await enviarInformacaoGeral();

    console.log('\n✅ Todos os testes concluídos!');
}

// Executar se chamado diretamente
if (require.main === module) {
    console.log('📢 Sistema de Envio em Massa - Exemplos Práticos');
    console.log('================================================\n');

    console.log('Escolha uma opção:');
    console.log('1. Boletim Diário');
    console.log('2. Alerta Climático');
    console.log('3. Dicas de Fim de Semana');
    console.log('4. Informação Geral');
    console.log('5. Testar Todos\n');

    const args = process.argv.slice(2);
    const opcao = args[0] || '1';

    switch (opcao) {
        case '1':
            enviarBoletimDiario();
            break;
        case '2':
            enviarAlertaClimatico();
            break;
        case '3':
            enviarDicasFimDeSemana();
            break;
        case '4':
            enviarInformacaoGeral();
            break;
        case '5':
            testarTodosOsEnvios();
            break;
        default:
            console.log('❌ Opção inválida. Use: node exemplo_pratico_info.js [1-5]');
    }
}

module.exports = {
    enviarBoletimDiario,
    enviarAlertaClimatico,
    enviarDicasFimDeSemana,
    enviarInformacaoGeral,
    testarTodosOsEnvios
};
