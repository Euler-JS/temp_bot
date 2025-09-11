const OpenAI = require('./open_ai/open_ai');

(async function () {
    const bot = new OpenAI();
    const weatherData = { city: 'Beira', temperature: 22, description: 'céu limpo', humidity: 88 };
    const analysis = { intent: 'ideias_de_atividades' };

    // Build prompt to see what would be sent to AI (or if token missing, fallback will be used)
    const prompt = bot.buildWeatherResponsePrompt(analysis, weatherData, {});
    console.log('\n--- PROMPT ---\n');
    console.log(prompt);
})();
