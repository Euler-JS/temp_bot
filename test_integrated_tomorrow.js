// Teste integrado da função handleTomorrowForecastCommand

async function testIntegratedTomorrowForecast() {
    try {
        console.log('🧪 Teste integrado: handleTomorrowForecastCommand\n');

        // Importar dependências necessárias
        const SupabaseService = require('./database/supabase');

        // Mock das funções necessárias
        const mockWhatsappApi = {
            enviarMensagemCarregamento: async (phone, msg) => {
                console.log(`📤 Carregamento para ${phone}: ${msg}`);
            },
            enviarMensagemUsandoWhatsappAPI: async (msg, phone) => {
                console.log(`📤 Mensagem para ${phone}:`);
                console.log(msg);
                console.log('---');
            }
        };

        const mockWeatherService = {
            getWeatherForecast: async (city, days) => {
                console.log(`🌤️ Buscando previsão para ${city} (${days} dias)`);
                return {
                    city: city,
                    units: '°C',
                    forecasts: [
                        { // hoje
                            minTemp: 22,
                            maxTemp: 30,
                            description: 'parcialmente nublado',
                            humidity: 75,
                            chanceOfRain: 20,
                            windSpeed: 8
                        },
                        { // amanhã
                            minTemp: 19,
                            maxTemp: 29,
                            description: 'céu limpo',
                            humidity: 62,
                            chanceOfRain: 5,
                            windSpeed: 10,
                            dayName: 'Amanhã'
                        }
                    ]
                };
            }
        };

        // Simular função saveOrUpdateAdvancedUser
        const mockSaveOrUpdateAdvancedUser = async (phone, data) => {
            console.log(`💾 Atualizando usuário ${phone}:`, data);
        };

        // Buscar usuário real advanced
        const supabaseService = new SupabaseService();
        const advancedUser = await supabaseService.getUserByContact('258846151124');

        console.log('👤 Usuário advanced encontrado:');
        console.log('- expertise_level:', advancedUser?.expertise_level);
        console.log('- preferred_complexity:', advancedUser?.preferred_complexity);
        console.log('- preferred_city:', advancedUser?.preferred_city);

        // Extrair e adaptar a função handleTomorrowForecastCommand (simulação)
        console.log('\n🚀 Executando handleTomorrowForecastCommand adaptado...\n');

        const phoneNumber = '258846151124';
        const user = advancedUser;

        console.log(`📅 Comando /amanha acionado para ${phoneNumber}`);

        // Buscar dados atuais do clima para determinar a cidade
        const targetCity = user?.preferred_city || user?.last_city || 'Beira';

        await mockWhatsappApi.enviarMensagemCarregamento(phoneNumber, `📅 Analisando previsão meteorológica para amanhã em ${targetCity}...`);

        // Buscar previsão de 2 dias (hoje e amanhã)
        const forecast = await mockWeatherService.getWeatherForecast(targetCity, 2);

        if (!forecast || !forecast.forecasts || forecast.forecasts.length < 2) {
            await mockWhatsappApi.enviarMensagemUsandoWhatsappAPI(
                `❌ Não foi possível obter a previsão meteorológica para amanhã em ${targetCity}. Favor tentar novamente.`,
                phoneNumber
            );
            return null;
        }

        // Pegar dados de amanhã (índice 1)
        const tomorrowData = forecast.forecasts[1];

        // Detectar nível de expertise do usuário
        const userLevel = (user && (user.expertiseLevel || user.expertise_level || user.preferred_complexity)) ?
            (user.expertiseLevel || user.expertise_level || user.preferred_complexity) : 'basic';

        console.log(`🎯 Nível do usuário detectado: ${userLevel}`);

        // Definir instruções de tom baseadas no nível do usuário
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
- Linguagem moçambicana casual, gírias OK (" ", "mano", etc.)
- Evite termos técnicos complexos
- Foque no prático e útil`;
            }
        };

        const toneInstructions = getToneInstructionsForLevel(userLevel);

        // Preparar prompt para a AI gerar a resposta
        const tomorrowPrompt = `
Sou a Joana Bot, assistente meteorológica especializada na cidade da Beira e arredores! 🇲🇿

NÍVEL DO USUÁRIO: ${userLevel}

Baseado nos dados meteorológicos oficiais para amanhã em ${forecast.city}:

🌡️ Temperatura: ${tomorrowData.minTemp}${forecast.units} - ${tomorrowData.maxTemp}${forecast.units}
📝 Condições: ${tomorrowData.description}
💧 Umidade: ${tomorrowData.humidity || 'não disponível'}%
🌧️ Chance de chuva: ${tomorrowData.chanceOfRain || 0}%
💨 Vento: ${tomorrowData.windSpeed || 'não disponível'} km/h

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

        // Simular chamada para OpenAI (usando o serviço real)
        const OPENAI = require('./open_ai/open_ai');
        const openaiService = new OPENAI();

        console.log('🤖 Chamando OpenAI...');
        const aiResponse = await openaiService.callOpenAI(tomorrowPrompt, 0.7);

        let tomorrowMessage;
        if (aiResponse && aiResponse.trim()) {
            tomorrowMessage = aiResponse.trim();
            console.log('✅ Resposta AI para amanhã gerada com sucesso');
        } else {
            console.log('⚠️ AI falhou, usando fallback para amanhã adaptado ao nível:', userLevel);
            tomorrowMessage = `📅 *Análise meteorológica para amanhã em ${forecast.city}* (FALLBACK)\n\nDados indisponíveis via AI, resposta técnica em modo de backup.`;
        }

        await mockWhatsappApi.enviarMensagemUsandoWhatsappAPI(tomorrowMessage, phoneNumber);

        // Simular atualização dos dados do usuário
        await mockSaveOrUpdateAdvancedUser(phoneNumber, {
            preferred_city: targetCity,
            last_command: '/amanha'
        });

        console.log('\n✅ Função executada com sucesso');
        return tomorrowMessage;

    } catch (error) {
        console.error('❌ Erro no teste integrado:', error.message);
        return null;
    }
}

testIntegratedTomorrowForecast().then(() => {
    console.log('\n✅ Teste integrado completo');
    process.exit(0);
});
