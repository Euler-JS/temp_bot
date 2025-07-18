// test/console_test_bot.js - Teste interativo completo no console
const readline = require('readline');
const fs = require('fs');

// Importar as classes mock
const MockWhatsAppApi = require('./mock_whatsapp_api');
const MockWeatherService = require('./mock_weather_service');

// Configurações do teste
const TEST_PHONE = "846151124";
const TEST_TOKEN = "mock_token_test_123";
const TEST_PHONE_ID = "mock_phone_id_456";

// Inicializar serviços mock
const whatsappApi = new MockWhatsAppApi(TEST_TOKEN, TEST_PHONE_ID);
const weatherService = new MockWeatherService();

// Simular banco de dados de usuários
let users = [];
const usersFile = './test_users.json';

// Interface readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Funções utilitárias
function getUserByContact(contact) {
    return users.find(user => user.contact === contact);
}

function saveOrUpdateUser(contact, preferredCity, units, language, notifications) {
    const userIndex = users.findIndex(user => user.contact === contact);

    if (userIndex !== -1) {
        users[userIndex].preferredCity = preferredCity;
        users[userIndex].units = units;
        users[userIndex].language = language;
        users[userIndex].notifications = notifications;
        users[userIndex].last_access = new Date();
    } else {
        users.push({
            contact,
            preferredCity,
            units: units || 'celsius',
            language: language || 'pt',
            notifications: notifications || false,
            last_access: new Date(),
            weatherHistory: []
        });
    }

    // Salvar no arquivo de teste
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function saveWeatherHistory(contact, city, temperature, conditions) {
    const userIndex = users.findIndex(user => user.contact === contact);

    if (userIndex !== -1) {
        if (!users[userIndex].weatherHistory) {
            users[userIndex].weatherHistory = [];
        }

        users[userIndex].weatherHistory.push({
            city,
            temperature,
            conditions,
            timestamp: new Date()
        });

        if (users[userIndex].weatherHistory.length > 10) {
            users[userIndex].weatherHistory = users[userIndex].weatherHistory.slice(-10);
        }

        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    }
}

// Funções principais do bot (versão simplificada)
async function processTextMessage(messageText, phoneNumber) {
    const user = getUserByContact(phoneNumber);

    console.log(`\n🤖 PROCESSANDO: "${messageText}" de ${phoneNumber}`);
    console.log(`👤 USUÁRIO: ${user ? JSON.stringify(user, null, 2) : 'Novo usuário'}\n`);

    // Comandos específicos
    if (messageText.startsWith('/')) {
        await processCommand(messageText, phoneNumber, user);
        return;
    }

    // Verificar se é consulta de clima
    if (await isWeatherQuery(messageText)) {
        await processWeatherQuery(messageText, phoneNumber, user);
        return;
    }

    // Mensagem de ajuda
    await sendHelpMessage(phoneNumber);
}

async function isWeatherQuery(message) {
    const weatherKeywords = ['clima', 'temperatura', 'tempo', 'weather', 'graus'];
    return weatherKeywords.some(keyword =>
        message.toLowerCase().includes(keyword)
    );
}

async function processWeatherQuery(message, phoneNumber, user) {
    try {
        const cityName = extractCityFromMessage(message) || user?.preferredCity;

        if (!cityName) {
            await whatsappApi.enviarMensagemUsandoWhatsappAPI(
                "Por favor, me informe o nome da cidade. Exemplo: 'Clima em Maputo'",
                phoneNumber
            );
            return;
        }

        await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Buscando clima');

        const weatherData = await weatherService.getCurrentWeather(
            cityName,
            user?.units || 'celsius'
        );

        saveWeatherHistory(phoneNumber, weatherData.city, weatherData.temperature, weatherData.description);

        const weatherMessage = formatWeatherMessage(weatherData);
        await whatsappApi.enviarMensagemUsandoWhatsappAPI(weatherMessage, phoneNumber);

        // Oferecer ações rápidas
        await whatsappApi.enviarBotoesAcaoRapida(phoneNumber, weatherData.city);

    } catch (error) {
        console.error(`❌ Erro ao buscar clima: ${error.message}`);
        await whatsappApi.enviarMensagemErro(
            phoneNumber,
            "Não consegui encontrar informações para essa cidade",
            "Verifique o nome e tente novamente"
        );
    }
}

function extractCityFromMessage(message) {
    const cleanMessage = message
        .toLowerCase()
        .replace(/clima|temperatura|tempo|weather|em|in|de|do|da/g, '')
        .trim();

    return cleanMessage || null;
}

function formatWeatherMessage(data) {
    const emoji = getWeatherEmoji(data.description);

    return `${emoji} *Clima em ${data.city}, ${data.country}*\n\n` +
        `🌡️ *Temperatura:* ${data.temperature}${data.units}\n` +
        `🤲 *Sensação térmica:* ${data.feelsLike}${data.units}\n` +
        `💧 *Umidade:* ${data.humidity}%\n` +
        `📝 *Condições:* ${data.description}\n\n` +
        `_Dados fornecidos por ${data.source}_`;
}

function getWeatherEmoji(description) {
    const desc = description.toLowerCase();
    if (desc.includes('sol') || desc.includes('limpo')) return '☀️';
    if (desc.includes('chuva')) return '🌧️';
    if (desc.includes('nuvem') || desc.includes('nublado')) return '☁️';
    if (desc.includes('tempest')) return '⛈️';
    return '🌤️';
}

async function processCommand(command, phoneNumber, user) {
    switch (command) {
        case '/ajuda':
            await sendHelpMessage(phoneNumber);
            break;

        case '/configurar':
            await whatsappApi.enviarMenuConfiguracoes(phoneNumber, user);
            break;

        case '/historico':
            await sendWeatherHistory(phoneNumber, user);
            break;

        case '/clima':
            if (user?.preferredCity) {
                await processWeatherQuery(`clima em ${user.preferredCity}`, phoneNumber, user);
            } else {
                await whatsappApi.enviarMensagemUsandoWhatsappAPI(
                    "Você ainda não definiu uma cidade padrão. Use /configurar para definir.",
                    phoneNumber
                );
            }
            break;

        case '/previsao':
            if (user?.preferredCity) {
                await sendWeatherForecast(phoneNumber, user.preferredCity, user);
            } else {
                await whatsappApi.enviarMensagemUsandoWhatsappAPI(
                    "Você ainda não definiu uma cidade padrão. Use /configurar para definir.",
                    phoneNumber
                );
            }
            break;

        default:
            await whatsappApi.enviarMensagemUsandoWhatsappAPI(
                `Comando "${command}" não reconhecido. Digite /ajuda para ver comandos disponíveis.`,
                phoneNumber
            );
    }
}

async function sendHelpMessage(phoneNumber) {
    const helpMessage =
        `🤖 *Bot de Temperatura - Ajuda*\n\n` +
        `📋 *Comandos disponíveis:*\n` +
        `• Digite o nome de uma cidade para ver o clima\n` +
        `• /clima - Clima da sua cidade preferida\n` +
        `• /previsao - Previsão de 7 dias\n` +
        `• /configurar - Configurações pessoais\n` +
        `• /historico - Suas consultas recentes\n\n` +
        `💡 *Exemplos:*\n` +
        `• "Clima em Maputo"\n` +
        `• "Temperatura Beira"\n` +
        `• "Tempo em Lisboa"`;

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(helpMessage, phoneNumber);
}

async function sendWeatherHistory(phoneNumber, user) {
    if (!user || !user.weatherHistory || user.weatherHistory.length === 0) {
        await whatsappApi.enviarMensagemUsandoWhatsappAPI(
            "📝 Você ainda não fez consultas de clima. Digite o nome de uma cidade para começar!",
            phoneNumber
        );
        return;
    }

    let historyMessage = "📚 *Histórico de Consultas*\n\n";

    user.weatherHistory.slice(-5).reverse().forEach((entry) => {
        const date = new Date(entry.timestamp);
        const emoji = getWeatherEmoji(entry.conditions);

        historyMessage += `${emoji} *${entry.city}*\n`;
        historyMessage += `   ${entry.temperature}°C | ${entry.conditions}\n`;
        historyMessage += `   ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`;
    });

    await whatsappApi.enviarMensagemUsandoWhatsappAPI(historyMessage, phoneNumber);
}

async function sendWeatherForecast(phoneNumber, city, user) {
    try {
        await whatsappApi.enviarMensagemCarregamento(phoneNumber, 'Buscando previsão');

        const forecast = await weatherService.getWeatherForecast(city, 7);

        let forecastMessage = `📅 *Previsão de 7 dias - ${city}*\n\n`;

        forecast.forEach((day, index) => {
            const date = new Date(day.date);
            const dayName = index === 0 ? 'Hoje' :
                index === 1 ? 'Amanhã' :
                    date.toLocaleDateString('pt-BR', { weekday: 'short' });

            const emoji = getWeatherEmoji(day.description);

            forecastMessage += `${emoji} *${dayName}* (${date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })})\n`;
            forecastMessage += `   ${day.minTemp}° - ${day.maxTemp}° | ${day.description}\n\n`;
        });

        await whatsappApi.enviarMensagemUsandoWhatsappAPI(forecastMessage, phoneNumber);

    } catch (error) {
        await whatsappApi.enviarMensagemErro(
            phoneNumber,
            "Não foi possível obter a previsão do tempo",
            "Tente novamente mais tarde"
        );
    }
}

// Simular mensagens interativas
async function processInteractiveMessage(buttonId, phoneNumber) {
    const user = getUserByContact(phoneNumber);

    console.log(`\n🎛️ PROCESSANDO INTERAÇÃO: "${buttonId}" de ${phoneNumber}\n`);

    if (buttonId.startsWith('forecast_')) {
        const city = buttonId.replace('forecast_', '');
        await sendWeatherForecast(phoneNumber, city, user);
    }
    else if (buttonId === 'set_city') {
        await whatsappApi.enviarMensagemUsandoWhatsappAPI(
            "🏙️ Digite o nome da cidade que você gostaria de definir como padrão:",
            phoneNumber
        );
    }
    else if (buttonId === 'set_units') {
        await whatsappApi.enviarMenuUnidades(phoneNumber);
    }
    else if (buttonId === 'units_celsius') {
        saveOrUpdateUser(phoneNumber, user?.preferredCity, 'celsius', user?.language, user?.notifications);
        await whatsappApi.enviarMensagemSucesso(phoneNumber, "Unidade definida para Celsius (°C)");
    }
    else if (buttonId === 'units_fahrenheit') {
        saveOrUpdateUser(phoneNumber, user?.preferredCity, 'fahrenheit', user?.language, user?.notifications);
        await whatsappApi.enviarMensagemSucesso(phoneNumber, "Unidade definida para Fahrenheit (°F)");
    }
}

// Função principal de teste interativo
async function startConsoleTest() {
    console.log(`
╔══════════════════════════════════════════════════════╗
║            🌡️ TEMPERATURE BOT - TESTE CONSOLE        ║
╚══════════════════════════════════════════════════════╝

Comandos especiais do teste:
• .quit ou .exit    - Sair do teste
• .user             - Mostrar dados do usuário
• .clear            - Limpar console
• .button [id]      - Simular clique em botão
• .reset            - Resetar usuário de teste

Comandos do bot:
• /ajuda           - Mostrar ajuda
• /configurar      - Configurações
• /clima           - Clima da cidade padrão
• /previsao        - Previsão de 7 dias
• /historico       - Histórico de consultas

Exemplos de mensagens:
• "Clima em Maputo"
• "Temperatura Beira"
• "Tempo Lisboa"

Digite uma mensagem para começar:
`);

    // Carregar usuários de teste se existir
    if (fs.existsSync(usersFile)) {
        const data = fs.readFileSync(usersFile, 'utf-8');
        if (data) users = JSON.parse(data);
    }

    function askQuestion() {
        rl.question('👤 Você: ', async (input) => {
            if (input === '.quit' || input === '.exit') {
                console.log('\n👋 Teste finalizado!');
                rl.close();
                return;
            }

            if (input === '.user') {
                const user = getUserByContact(TEST_PHONE);
                console.log('\n👤 Dados do usuário:', user ? JSON.stringify(user, null, 2) : 'Nenhum usuário cadastrado');
                askQuestion();
                return;
            }

            if (input === '.clear') {
                console.clear();
                askQuestion();
                return;
            }

            if (input.startsWith('.button ')) {
                const buttonId = input.replace('.button ', '');
                await processInteractiveMessage(buttonId, TEST_PHONE);
                askQuestion();
                return;
            }

            if (input === '.reset') {
                users = users.filter(u => u.contact !== TEST_PHONE);
                fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
                console.log('\n🔄 Usuário resetado!');
                askQuestion();
                return;
            }

            if (input.trim()) {
                try {
                    await processTextMessage(input, TEST_PHONE);
                } catch (error) {
                    console.error(`❌ Erro no processamento: ${error.message}`);
                }
            }

            console.log('\n'); // Linha em branco
            askQuestion();
        });
    }

    askQuestion();
}

// Iniciar teste
if (require.main === module) {
    startConsoleTest().catch(console.error);
}

module.exports = {
    startConsoleTest,
    processTextMessage,
    processInteractiveMessage
};