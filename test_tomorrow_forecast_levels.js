const OPENAI = require('./open_ai/open_ai');

async function testTomorrowForecastLevels() {
    try {
        console.log('🧪 Testando handleTomorrowForecastCommand com diferentes níveis...\n');

        // Simular a função getToneInstructionsForLevel (copiada do index.js)
        const getToneInstructionsForLevel = (level) => {
            switch (level) {
                case 'advanced':
                    return `- RESPOSTA TÉCNICA: Use terminologia meteorológica apropriada (amplitude térmica, probabilidade de precipitação, velocidade do vento)
- Inclua análise detalhada e fundamentada da previsão
- Evite gírias e expressões informais
- Use linguagem formal e profissional
- Mencione dados técnicos quando relevante (pressão atmosférica, índice UV, etc.)`;
                case 'intermediate':
                    return `- RESPOSTA EQUILIBRADA: Combine simplicidade com contexto técnico moderado
- Use alguns termos meteorológicos básicos explicados
- Linguagem moçambicana natural mas educativa
- Balance entre informal e informativo`;
                default: // basic
                    return `- RESPOSTA SIMPLES: Use linguagem muito fácil e acessível
- Linguagem moçambicana casual, gírias OK ("Eh pá", "mano", etc.)
- Evite termos técnicos complexos
- Foque no prático e útil`;
            }
        };

        const openaiService = new OPENAI();

        // Dados simulados de previsão para amanhã
        const mockTomorrowData = {
            minTemp: 18,
            maxTemp: 28,
            description: 'céu limpo',
            humidity: 65,
            chanceOfRain: 10,
            windSpeed: 12,
            dayName: 'Amanhã'
        };

        const mockForecast = {
            city: 'Beira',
            units: '°C'
        };

        // Testar os três níveis
        const levels = ['basic', 'intermediate', 'advanced'];

        for (const level of levels) {
            console.log(`\n🎯 Testando nível: ${level.toUpperCase()}`);
            console.log('='.repeat(50));

            const userLevel = level;
            const toneInstructions = getToneInstructionsForLevel(userLevel);

            const tomorrowPrompt = `
Sou a Joana Bot, assistente meteorológica especializada na cidade da Beira e arredores! 🇲🇿

NÍVEL DO USUÁRIO: ${userLevel}

Baseado nos dados meteorológicos oficiais para amanhã em ${mockForecast.city}:

🌡️ Temperatura: ${mockTomorrowData.minTemp}${mockForecast.units} - ${mockTomorrowData.maxTemp}${mockForecast.units}
📝 Condições: ${mockTomorrowData.description}
💧 Umidade: ${mockTomorrowData.humidity}%
🌧️ Chance de chuva: ${mockTomorrowData.chanceOfRain}%
💨 Vento: ${mockTomorrowData.windSpeed} km/h

INSTRUÇÕES DE TOM:
${toneInstructions}

Gera uma resposta sobre a previsão para amanhã. Inclui:
1. Uma saudação apropriada para o nível
2. Os dados principais apresentados conforme o nível
3. Interpretação meteorológica adequada ao usuário
4. Dicas práticas baseadas no tempo (roupa, atividades, cuidados)
5. Uma despedida motivacional

Máximo ${userLevel === 'basic' ? '250' : userLevel === 'intermediate' ? '350' : '400'} palavras.
            `;

            console.log('🤖 Gerando resposta...');
            const response = await openaiService.callOpenAI(tomorrowPrompt, 0.7);

            console.log('\n📝 Resposta gerada:');
            console.log(response);

            // Análise da resposta
            const isBasic = response.includes('Eh pá') || response.includes('mano') || response.includes('fixes');
            const isTechnical = response.includes('amplitude térmica') ||
                response.includes('probabilidade de precipitação') ||
                response.includes('meteorológica') ||
                response.includes('atmosférica');
            const isFormal = !response.includes('Eh pá') && !response.includes('mano');

            console.log('\n🔍 Análise:');
            console.log(`- Tom casual (gírias): ${isBasic}`);
            console.log(`- Termos técnicos: ${isTechnical}`);
            console.log(`- Tom formal: ${isFormal}`);

            // Verificar adequação ao nível
            let adequate = false;
            switch (level) {
                case 'basic':
                    adequate = isBasic && !isTechnical;
                    break;
                case 'intermediate':
                    adequate = !isBasic && isTechnical && isFormal;
                    break;
                case 'advanced':
                    adequate = isFormal && isTechnical && !isBasic;
                    break;
            }

            console.log(`✅ Adequado para nível ${level}: ${adequate}`);

            if (!adequate) {
                console.log(`❌ PROBLEMA: Resposta não adequada para nível ${level}!`);
            }

            // Aguardar um pouco entre as chamadas
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

testTomorrowForecastLevels().then(() => {
    console.log('\n✅ Teste de níveis completo');
    process.exit(0);
});
