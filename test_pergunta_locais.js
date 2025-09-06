// test_pergunta_locais.js - Testar resposta para "Quais locais posso ir hoje?"

const OPENAI = require('./open_ai/open_ai');
const WeatherService = require('./weather_api/weather_service');

async function testLocationQuestion() {
    console.log('🧪 TESTANDO: "Quais locais posso ir hoje?"\n');

    const openaiService = new OPENAI();
    const weatherService = new WeatherService();

    // 1. Analisar a mensagem com AI
    console.log('1️⃣ Análise da mensagem...');

    const userMessage = "Quais locais posso ir hoje?";

    const analysisResult = await openaiService.analyzeMessage(userMessage, {
        preferredCity: 'Beira',
        language: 'pt',
        queryCount: 5,
        expertiseLevel: 'basic',
        lastCity: 'Beira',
        currentLocation: 'Beira'
    });

    console.log('📊 ANÁLISE AI:');
    console.log('Intent:', analysisResult.analysis.intent);
    console.log('Confiança:', analysisResult.analysis.confidence);
    console.log('Reasoning:', analysisResult.analysis.reasoning);
    console.log('Entities:', JSON.stringify(analysisResult.analysis.entities, null, 2));

    // 2. Buscar dados meteorológicos para Beira
    console.log('\n2️⃣ Buscando dados meteorológicos...');

    let weatherData;
    try {
        weatherData = await weatherService.getCurrentWeather('Beira', 'celsius');
        console.log(`✅ Dados obtidos: ${weatherData.temperature}°C, ${weatherData.description}`);
    } catch (error) {
        console.log('⚠️ Usando dados simulados');
        weatherData = {
            city: 'Beira',
            temperature: 26,
            description: 'parcialmente nublado',
            humidity: 78,
            feelsLike: 28
        };
    }

    // 3. Gerar resposta contextual
    console.log('\n3️⃣ Gerando resposta contextual...');

    const userContext = {
        queryCount: 5,
        expertiseLevel: 'basic',
        lastCity: 'Beira',
        preferredCity: 'Beira',
        conversationHistory: []
    };

    const response = await openaiService.generateContextualResponse(
        analysisResult.analysis,
        weatherData,
        userContext
    );

    if (response.success) {
        console.log('\n📱 RESPOSTA QUE O BOT DEVERIA DAR:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(response.message);
        console.log('═══════════════════════════════════════════════════════════');
    }

    // 4. Gerar sugestões baseadas na temperatura
    console.log('\n4️⃣ Sugestões baseadas na temperatura...');

    const suggestions = await openaiService.generateTemperatureBasedSuggestions(
        weatherData,
        'Beira',
        { userPhone: 'teste', currentSuggestions: [] }
    );

    if (suggestions.success) {
        console.log('🎯 Sugestões para', weatherData.temperature + '°C:', suggestions.suggestions);
    }

    // 5. O que o bot DEVERIA idealmente responder
    console.log('\n5️⃣ RESPOSTA IDEAL ESPERADA:');
    console.log('═══════════════════════════════════════════════════════════');

    const idealResponse = generateIdealResponse(weatherData);
    console.log(idealResponse);

    console.log('═══════════════════════════════════════════════════════════');

    console.log('\n✅ TESTE CONCLUÍDO!');
}

function generateIdealResponse(weatherData) {
    const temp = parseInt(weatherData.temperature);
    const condition = weatherData.description.toLowerCase();
    const isRaining = condition.includes('chuva') || condition.includes('rain');

    let response = `🗺️ *vou te dar umas ideias fixes de locais para ires hoje em Beira!*\n\n`;

    response += `🌤️ *Como está o tempo:*\n`;
    response += `• ${temp}°C - ${weatherData.description}\n`;
    response += `• Humidade: ${weatherData.humidity}%\n\n`;

    if (isRaining) {
        response += `☔ *Com chuva, melhor locais cobertos:*\n`;
        response += `🏬 • Shopping centers (Beira Shopping)\n`;
        response += `🍽️ • Restaurantes com cobertura\n`;
        response += `🎬 • Cinema ou lugares fechados\n`;
        response += `📚 • Bibliotecas ou centros culturais\n`;
        response += `☕ • Cafés aconchegantes\n\n`;
        response += `💡 *Dica:* Leva guarda-chuva se tiveres que sair!`;

    } else if (temp > 30) {
        response += `🔥 *Com ${temp}°C, locais fresquinhos são melhores:*\n`;
        response += `🏖️ • Praia do Macúti (com sombra)\n`;
        response += `🌳 • Parques com árvores grandes\n`;
        response += `🏬 • Shopping centers (ar condicionado)\n`;
        response += `🍨 • Gelatarias para refrescar\n`;
        response += `🏊 • Piscinas ou clubes\n\n`;
        response += `💡 *Dica:* Vai de manhã cedo ou final da tarde!`;

    } else if (temp > 25) {
        response += `😊 *Com ${temp}°C, tens muitas opções boas:*\n`;
        response += `🏖️ • Praia do Macúti\n`;
        response += `🚶 • Centro da cidade (Manga)\n`;
        response += `🌳 • Jardins municipais\n`;
        response += `🛍️ • Mercado central\n`;
        response += `🍽️ • Restaurantes com esplanada\n`;
        response += `⛵ • Porto da Beira\n\n`;
        response += `💡 *Dica:* Tempo perfeito para qualquer atividade!`;

    } else if (temp > 20) {
        response += `🌤️ *Com ${temp}°C fresquinho, ideais:*\n`;
        response += `🚶 • Caminhadas pelo centro\n`;
        response += `☕ • Cafés ao ar livre\n`;
        response += `🏛️ • Museus e centros culturais\n`;
        response += `🛍️ • Compras no centro\n`;
        response += `🌳 • Parques para relaxar\n\n`;
        response += `💡 *Dica:* Leva um casaco leve!`;

    } else {
        response += `🧊 *Com ${temp}°C, melhor locais quentinhos:*\n`;
        response += `☕ • Cafés fechados e aquecidos\n`;
        response += `🏬 • Shopping centers\n`;
        response += `🍽️ • Restaurantes com ambiente fechado\n`;
        response += `🎬 • Cinema\n`;
        response += `📚 • Bibliotecas\n\n`;
        response += `💡 *Dica:* Vista-te bem quente!`;
    }

    response += `\n🏘️ *Locais específicos da Beira:*\n`;
    response += `📍 • Macúti - zona da praia\n`;
    response += `📍 • Manga - centro comercial\n`;
    response += `📍 • Goto - bairro residencial\n`;
    response += `📍 • Munhava - zona movimentada\n\n`;

    response += `💬 *Quer saber mais sobre algum local específico?*\n`;
    response += `Exemplo: "Como está o Macúti hoje?" ou "Restaurantes no Manga"`;

    return response;
}

// Executar teste
testLocationQuestion().catch(console.error);
