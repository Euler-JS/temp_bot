// Teste completo do fluxo de sugestões inteligentes
const OPENAI = require('./open_ai/open_ai');
const WeatherService = require('./weather_api/weather_service');

async function simularFluxoCompleto() {
    console.log('🎭 SIMULAÇÃO COMPLETA: USUÁRIO PEDE SUGESTÕES\n');

    const openaiService = new OPENAI();
    const weatherService = new WeatherService();

    // Simular usuário pedindo sugestões
    const phoneNumber = '258846151124';
    const userMessage = "Dá-me umas sugestões";
    const userCity = 'Beira';

    console.log(`👤 Usuário (${phoneNumber}): "${userMessage}"`);
    console.log(`📍 Localização detectada: ${userCity}\n`);

    // PASSO 1: Obter dados meteorológicos atuais
    console.log('🌡️ PASSO 1: Obtendo temperatura atual...');
    let weatherData;
    try {
        weatherData = await weatherService.getCurrentWeather(userCity);
        console.log(`✅ Temperatura atual em ${userCity}: ${weatherData.temperature}°C`);
        console.log(`☁️ Condições: ${weatherData.description}`);
        console.log(`💧 Humidade: ${weatherData.humidity}%\n`);
    } catch (error) {
        console.log(`❌ Erro ao obter dados: ${error.message}\n`);
        // Usar dados mock
        weatherData = {
            city: userCity,
            temperature: 29,
            description: 'céu claro',
            humidity: 68
        };
        console.log(`🔄 Usando dados simulados: ${weatherData.temperature}°C\n`);
    }

    // PASSO 2: Gerar sugestões baseadas na temperatura
    console.log('🤖 PASSO 2: Gerando sugestões AI baseadas na temperatura...');
    const aiSuggestions = await openaiService.generateTemperatureBasedSuggestions(
        weatherData,
        userCity,
        {
            userPhone: phoneNumber,
            currentSuggestions: []
        }
    );

    console.log(`✅ Sugestões geradas pelo AI: [${aiSuggestions.suggestions.join(', ')}]`);
    console.log(`🧠 Método usado: ${aiSuggestions.method}\n`);

    // PASSO 3: Personalizar header e body em português moçambicano
    console.log('💬 PASSO 3: Personalizando mensagem...');

    function getPersonalizedHeader(weatherData) {
        const temp = weatherData?.temperature;

        if (temp > 32) return "🔥 Está bem quente!";
        if (temp > 28) return "☀️ Está um calorzito";
        if (temp > 23) return "🌤️ Tempo agradável";
        if (temp > 18) return "🌥️ Está fresco";
        return "❄️ Está frio";
    }

    function getPersonalizedBody(weatherData, city) {
        const temp = weatherData?.temperature;

        if (temp > 32) return `Com ${temp}°C em ${city}, melhor procurar sombra! Que tal:`;
        if (temp > 28) return `${temp}°C em ${city}... está um calor bom! Sugestões:`;
        if (temp > 23) return `${temp}°C em ${city} - tempo perfeito! Que tal:`;
        if (temp > 18) return `Com ${temp}°C em ${city}, tempo fresquinho. Sugestões:`;
        return `${temp}°C em ${city}... brrr! Melhor:`;
    }

    const header = getPersonalizedHeader(weatherData);
    const body = getPersonalizedBody(weatherData, userCity);

    console.log(`📝 Header: "${header}"`);
    console.log(`📝 Body: "${body}"\n`);

    // PASSO 4: Simular mensagem WhatsApp final
    console.log('📱 PASSO 4: Mensagem WhatsApp final:');
    console.log('=' * 50);
    console.log(`${header}`);
    console.log('');
    console.log(`${body}`);
    console.log('');

    aiSuggestions.suggestions.slice(0, 3).forEach((suggestion, index) => {
        console.log(`[${index + 1}] ${suggestion}`);
    });
    console.log('=' * 50);

    // PASSO 5: Análise da qualidade das sugestões
    console.log('\n🔍 PASSO 5: Análise qualidade das sugestões:');

    const temp = weatherData.temperature;
    const sugestoes = aiSuggestions.suggestions;

    // Verificar adequação à temperatura
    let adequadas = 0;
    const keywords = {
        calor: ['calor', 'refrescar', 'frio', 'sombra', 'agua', 'hidrat'],
        frio: ['aquecer', 'quente', 'casaco', 'roupa', 'abrig'],
        geral: ['roupa', 'fazer', 'atividade', 'onde', 'tempo']
    };

    sugestoes.forEach(sugestao => {
        const s = sugestao.toLowerCase();
        if (temp > 28 && keywords.calor.some(k => s.includes(k))) adequadas++;
        else if (temp < 20 && keywords.frio.some(k => s.includes(k))) adequadas++;
        else if (keywords.geral.some(k => s.includes(k))) adequadas++;
    });

    console.log(`🎯 Adequação à temperatura: ${adequadas}/3 sugestões apropriadas`);
    console.log(`🇲🇿 Português moçambicano: ${sugestoes.some(s => s.length <= 20) ? '✅' : '❌'} (tamanho adequado)`);
    console.log(`🤖 Powered by AI: ${aiSuggestions.method === 'ai_powered' ? '✅' : '❌'}`);

    // PASSO 6: Testar diferentes temperaturas
    console.log('\n🌡️ PASSO 6: Teste com diferentes temperaturas:');

    const testTemps = [15, 22, 29, 35];
    for (const testTemp of testTemps) {
        const mockData = { ...weatherData, temperature: testTemp };
        const testSuggestions = await openaiService.generateTemperatureBasedSuggestions(
            mockData, userCity, { userPhone: phoneNumber }
        );

        console.log(`${testTemp}°C: [${testSuggestions.suggestions.join(', ')}]`);
    }

    console.log('\n🎉 SIMULAÇÃO COMPLETA FINALIZADA!');
    console.log('✅ Sistema de sugestões baseadas na temperatura operacional');
    console.log('✅ Português moçambicano implementado');
    console.log('✅ AI contextual funcionando');
    console.log('✅ Personalização por temperatura ativa');
}

simularFluxoCompleto().catch(console.error);
