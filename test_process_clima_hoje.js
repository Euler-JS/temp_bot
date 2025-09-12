const { processAdvancedTextMessage } = require('./index');

(async () => {
    // Isto depende do módulo exportar a função; index.js may not export it. We'll instead require open_ai and simulate flow.
    const openaiService = require('./open_ai/open_ai');
    const OpenAI = new openaiService();

    const message = 'Clima hoje';
    // Simulate user last_city in DB by calling functions directly is complex; instead test adaptedAnalysis detection logic via analyzeMessage
    const analysisResult = await OpenAI.analyzeMessage(message, { lastCity: 'Beira' });
    console.log('Analysis result:', analysisResult);
})();
