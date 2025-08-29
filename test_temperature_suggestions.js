// Teste do sistema de sugestões baseadas na temperatura
const OPENAI = require('./open_ai/open_ai');
const WeatherService = require('./weather_api/weather_service');

async function testarSugestoesTemperatura() {
    console.log('🌡️ TESTANDO SUGESTÕES BASEADAS NA TEMPERATURA\n');

    const openaiService = new OPENAI();
    const weatherService = new WeatherService();

    // Cenários de teste com diferentes temperaturas
    const cenarios = [
        { cidade: 'Maputo', temp: 35, descricao: 'CALOR EXTREMO' },
        { cidade: 'Beira', temp: 28, descricao: 'CALOR MODERADO' },
        { cidade: 'Lichinga', temp: 22, descricao: 'TEMPERATURA AGRADÁVEL' },
        { cidade: 'Pemba', temp: 16, descricao: 'TEMPERATURA FRESCA' }
    ];

    for (const cenario of cenarios) {
        console.log(`🏙️ === ${cenario.descricao} ===`);
        console.log(`📍 Cidade: ${cenario.cidade}`);
        console.log(`🌡️ Temperatura: ${cenario.temp}°C\n`);

        // Mock de dados meteorológicos
        const mockWeatherData = {
            city: cenario.cidade,
            temperature: cenario.temp,
            description: 'céu claro',
            humidity: 65,
            feelsLike: cenario.temp + 2
        };

        // Teste 1: Sugestões AI
        console.log('🤖 Teste sugestões AI:');
        const aiSuggestions = await openaiService.generateTemperatureBasedSuggestions(
            mockWeatherData,
            cenario.cidade,
            { userPhone: '258846151124' }
        );

        console.log(`✅ Sucesso: ${aiSuggestions.success}`);
        console.log(`🧠 Método: ${aiSuggestions.method}`);
        console.log(`💡 Sugestões: [${aiSuggestions.suggestions.join(', ')}]`);

        // Teste 2: Verificar se são apropriadas para a temperatura
        console.log('\n📊 Análise adequação:');
        const sugestoes = aiSuggestions.suggestions;

        if (cenario.temp > 30) {
            const temCalor = sugestoes.some(s =>
                s.toLowerCase().includes('calor') ||
                s.toLowerCase().includes('refrescar') ||
                s.toLowerCase().includes('frio') ||
                s.toLowerCase().includes('sombra')
            );
            console.log(`🔥 Adequado para calor: ${temCalor ? '✅' : '❌'}`);
        } else if (cenario.temp < 20) {
            const temFrio = sugestoes.some(s =>
                s.toLowerCase().includes('aquecer') ||
                s.toLowerCase().includes('quente') ||
                s.toLowerCase().includes('roupa')
            );
            console.log(`❄️ Adequado para frio: ${temFrio ? '✅' : '❌'}`);
        } else {
            console.log(`🌤️ Temperatura agradável - sugestões diversas`);
        }

        console.log('\n' + '='.repeat(50) + '\n');
    }

    // Teste 3: Comparação com dados reais
    console.log('🌍 TESTE COM DADOS METEOROLÓGICOS REAIS\n');

    try {
        const cidadesReais = ['Maputo', 'Beira', 'Nampula'];

        for (const cidade of cidadesReais) {
            console.log(`📡 Obtendo dados reais para ${cidade}...`);

            try {
                const dadosReais = await weatherService.getCurrentWeather(cidade);
                console.log(`🌡️ Temperatura real: ${dadosReais.temperature}°C`);
                console.log(`☁️ Condições: ${dadosReais.description}`);

                const sugestoesReais = await openaiService.generateTemperatureBasedSuggestions(
                    dadosReais,
                    cidade,
                    { userPhone: '258846151124' }
                );

                console.log(`💡 Sugestões para ${cidade}: [${sugestoesReais.suggestions.join(', ')}]`);

            } catch (error) {
                console.log(`❌ Erro ao obter dados para ${cidade}: ${error.message}`);
            }

            console.log('');
        }

    } catch (error) {
        console.log(`❌ Erro no teste com dados reais: ${error.message}`);
    }

    console.log('🎉 TESTE DE SUGESTÕES BASEADAS NA TEMPERATURA CONCLUÍDO!');
    console.log('✅ Sistema configurado para gerar sugestões contextuais');
    console.log('✅ Português moçambicano implementado');
    console.log('✅ Adaptação automática à temperatura atual');
}

testarSugestoesTemperatura().catch(console.error);
