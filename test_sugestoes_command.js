// Teste do comando /sugestoes com dados reais
const WeatherService = require('./weather_api/weather_service');
const OPENAI = require('./open_ai/open_ai');

async function testarComandoSugestoes() {
    console.log('🧪 TESTANDO COMANDO /SUGESTOES COM DADOS REAIS\n');

    const weatherService = new WeatherService();
    const openaiService = new OPENAI();

    // Simular usuário em Beira
    const mockUser = {
        preferred_city: 'Beira',
        last_city: 'Beira',
        query_count: 157,
        expertise_level: 'basic'
    };

    const userContext = {
        preferredCity: mockUser.preferred_city,
        lastCity: mockUser.last_city,
        queryCount: mockUser.query_count,
        expertiseLevel: mockUser.expertise_level,
        conversationHistory: [],
        weatherPreferences: null
    };

    console.log('1️⃣ Buscando dados meteorológicos para Beira...');
    let weatherData;
    try {
        weatherData = await weatherService.getCurrentWeather('Beira', 'celsius');
        console.log(`✅ Dados obtidos: ${weatherData.temperature}°C, ${weatherData.description}`);
        console.log(`📊 Humidade: ${weatherData.humidity}%`);
    } catch (error) {
        console.log('❌ Erro ao buscar dados:', error.message);
        return;
    }

    console.log('\n2️⃣ Gerando sugestões baseadas na temperatura...');
    const aiSuggestions = await openaiService.generateTemperatureBasedSuggestions(
        weatherData,
        userContext
    );

    console.log('📋 Resultado das sugestões AI:');
    console.log(`✅ Sucesso: ${aiSuggestions.success}`);
    if (aiSuggestions.success) {
        console.log(`💡 Sugestões: [${aiSuggestions.suggestions.join(', ')}]`);
        console.log(`💭 Raciocínio: ${aiSuggestions.reasoning}`);
        console.log(`🌡️ Baseado em: ${aiSuggestions.temperatureContext}`);
    } else {
        console.log(`❌ Erro: ${aiSuggestions.error}`);
    }

    console.log('\n3️⃣ Criando mensagem como seria enviada...');

    let suggestionsMessage = `💡 *aqui tens umas sugestões fixes baseadas no tempo atual!*\n\n`;

    suggestionsMessage += `🌤️ *Tempo agora em ${weatherData.city}:*\n`;
    suggestionsMessage += `• Temperatura: ${weatherData.temperature}°C\n`;
    suggestionsMessage += `• Condições: ${weatherData.description}\n`;
    suggestionsMessage += `• Humidade: ${weatherData.humidity}%\n\n`;

    suggestionsMessage += `👤 *Teu perfil:*\n`;
    const nivelMap = {
        'basic': 'Principiante (tás a começar)',
        'intermediate': 'Médio (já percebes bem)',
        'advanced': 'Experiente (és um expert!)'
    };
    suggestionsMessage += `• Nível: ${nivelMap[userContext.expertiseLevel] || userContext.expertiseLevel}\n`;
    suggestionsMessage += `• Consultas feitas: ${userContext.queryCount}\n\n`;

    suggestionsMessage += `🎯 *Sugestões baseadas nos ${weatherData.temperature}°C atuais:*\n`;

    if (aiSuggestions && aiSuggestions.success && aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0) {
        aiSuggestions.suggestions.forEach((suggestion, index) => {
            suggestionsMessage += `${index + 1}. ${suggestion}\n`;
        });

        if (aiSuggestions.reasoning) {
            suggestionsMessage += `\n💭 *Porquê estas sugestões:*\n${aiSuggestions.reasoning}\n`;
        }
    } else {
        // Fallback baseado na temperatura
        const temp = parseInt(weatherData.temperature);
        if (temp > 30) {
            suggestionsMessage += `1. Dicas para o calor\n`;
            suggestionsMessage += `2. Atividades refrescantes\n`;
            suggestionsMessage += `3. Que roupa usar no calor\n`;
        } else if (temp > 25) {
            suggestionsMessage += `1. Atividades ao ar livre\n`;
            suggestionsMessage += `2. Tempo amanhã\n`;
            suggestionsMessage += `3. Planos para hoje\n`;
        } else if (temp > 20) {
            suggestionsMessage += `1. Que roupa vestir\n`;
            suggestionsMessage += `2. Vai esfriar mais?\n`;
            suggestionsMessage += `3. Atividades para hoje\n`;
        } else {
            suggestionsMessage += `1. Dicas para o frio\n`;
            suggestionsMessage += `2. Como se aquecer\n`;
            suggestionsMessage += `3. Roupas quentes\n`;
        }
    }

    suggestionsMessage += `\n💬 *Como usar:* É só escrever qualquer uma das sugestões aí em cima, ou pergunta o que quiseres.\n`;
    suggestionsMessage += `\n🔄 *Eh pá:* Quanto mais usares o bot, mais ele aprende contigo e as sugestões ficam melhores!`;

    console.log('\n📱 MENSAGEM FINAL SERIA:');
    console.log('=' * 50);
    console.log(suggestionsMessage);
    console.log('=' * 50);

    console.log('\n✅ TESTE CONCLUÍDO!');
    console.log('🎯 O comando /sugestoes agora usa dados meteorológicos reais');
    console.log('🤖 AI gera sugestões baseadas na temperatura atual');
    console.log('🇲🇿 Linguagem em português moçambicano');
}

testarComandoSugestoes().catch(console.error);
