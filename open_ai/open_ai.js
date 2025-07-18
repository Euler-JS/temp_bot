require('dotenv').config();
const axios = require('axios');


class OPENAI {
    constructor(token) {
        this.token = token;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = 'gpt-3.5-turbo'; // Ou 'gpt-4' para melhor qualidade
        this.maxTokens = 300;

        if (!token) {
            throw new Error('Token da OpenAI é obrigatório');
        }
    }

    // Método principal para humanizar dados de clima
    async humanizeWeatherData(weatherData, userContext = {}) {
        try {
            const prompt = this.buildWeatherPrompt(weatherData, userContext);

            const response = await this.callOpenAI(prompt);

            return {
                success: true,
                humanizedText: response,
                originalData: weatherData
            };

        } catch (error) {
            console.error('Erro ao humanizar dados do clima:', error.message);

            // Fallback: retornar dados básicos se a IA falhar
            return {
                success: false,
                humanizedText: this.createFallbackMessage(weatherData),
                originalData: weatherData,
                error: error.message
            };
        }
    }

    // Humanizar previsão de vários dias
    async humanizeWeatherForecast(forecastData, cityName, userContext = {}) {
        try {
            const prompt = this.buildForecastPrompt(forecastData, cityName, userContext);

            const response = await this.callOpenAI(prompt);

            return {
                success: true,
                humanizedText: response,
                originalData: forecastData
            };

        } catch (error) {
            console.error('Erro ao humanizar previsão:', error.message);

            return {
                success: false,
                humanizedText: this.createFallbackForecast(forecastData, cityName),
                originalData: forecastData,
                error: error.message
            };
        }
    }

    // Gerar recomendações personalizadas baseadas no clima
    async generateWeatherRecommendations(weatherData, userPreferences = {}) {
        try {
            const prompt = this.buildRecommendationPrompt(weatherData, userPreferences);

            const response = await this.callOpenAI(prompt);

            return {
                success: true,
                recommendations: response,
                weatherData: weatherData
            };

        } catch (error) {
            console.error('Erro ao gerar recomendações:', error.message);

            return {
                success: false,
                recommendations: this.createFallbackRecommendations(weatherData),
                error: error.message
            };
        }
    }

    // Chamar API da OpenAI
    async callOpenAI(prompt, temperature = 0.7) {
        const requestData = {
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: "Você é um assistente meteorológico amigável especializado em explicar informações climáticas de forma simples e prática para pessoas comuns. Use linguagem clara, evite jargões técnicos e inclua dicas úteis quando apropriado."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: this.maxTokens,
            temperature: temperature,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        };

        const response = await axios.post(
            `${this.baseURL}/chat/completions`,
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 segundos timeout
            }
        );

        return response.data.choices[0].message.content.trim();
    }

    // Construir prompt para dados de clima atual
    buildWeatherPrompt(weatherData, userContext) {
        const context = userContext.language === 'en' ? 'em inglês' : 'em português';
        const timeOfDay = this.getTimeOfDay();

        return `
Explique de forma amigável e compreensível as seguintes informações climáticas ${context}:

DADOS DO CLIMA:
- Cidade: ${weatherData.city}, ${weatherData.country}
- Temperatura atual: ${weatherData.temperature}${weatherData.units}
- Sensação térmica: ${weatherData.feelsLike}${weatherData.units}
- Umidade: ${weatherData.humidity}%
- Condições: ${weatherData.description}
- Período do dia: ${timeOfDay}

CONTEXTO DO USUÁRIO:
- Localização: Moçambique
- Público: Pessoas comuns (não meteorologistas)

INSTRUÇÕES:
1. Explique o que significam esses números na prática
2. Compare a sensação térmica com a temperatura real
3. Explique se a umidade está alta/baixa e o que isso significa
4. Dê 2-3 dicas práticas para esse clima
5. Use emojis apropriados
6. Mantenha tom conversacional e amigável
7. Máximo 200 palavras

Exemplo do tom desejado: "O clima está agradável hoje em..." ao invés de "As condições meteorológicas indicam..."
        `.trim();
    }

    // Construir prompt para previsão
    buildForecastPrompt(forecastData, cityName, userContext) {
        const context = userContext.language === 'en' ? 'em inglês' : 'em português';

        const forecastSummary = forecastData.map((day, index) => {
            const dayName = index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' : `Dia ${index + 1}`;
            return `${dayName}: ${day.minTemp}°-${day.maxTemp}°C, ${day.description}`;
        }).join('\n');

        return `
Crie um resumo amigável da previsão do tempo ${context} para ${cityName}:

PREVISÃO DOS PRÓXIMOS DIAS:
${forecastSummary}

INSTRUÇÕES:
1. Identifique tendências (vai esquentar/esfriar, chuva chegando, etc.)
2. Destaque os dias melhores e piores
3. Dê dicas para a semana (quando sair, levar guarda-chuva, etc.)
4. Use linguagem coloquial e amigável
5. Inclua emojis relevantes
6. Máximo 250 palavras
7. Foque no que é mais importante para o dia a dia das pessoas

Evite jargões meteorológicos. Fale como um amigo explicando o tempo.
        `.trim();
    }

    // Construir prompt para recomendações
    buildRecommendationPrompt(weatherData, userPreferences) {
        return `
Baseado nas condições climáticas abaixo, gere recomendações práticas para uma pessoa em Moçambique:

CLIMA ATUAL:
- Temperatura: ${weatherData.temperature}${weatherData.units}
- Sensação térmica: ${weatherData.feelsLike}${weatherData.units}
- Umidade: ${weatherData.humidity}%
- Condições: ${weatherData.description}

PREFERÊNCIAS DO USUÁRIO:
- Atividades: ${userPreferences.activities || 'atividades gerais'}
- Tipo de trabalho: ${userPreferences.workType || 'não especificado'}

GERE RECOMENDAÇÕES PARA:
1. Roupas adequadas
2. Atividades ao ar livre
3. Cuidados com a saúde
4. Melhor horário para sair
5. O que levar na bolsa/mochila

Use linguagem simples e dicas práticas. Máximo 200 palavras.
        `.trim();
    }

    // Mensagem de fallback se a IA falhar
    createFallbackMessage(weatherData) {
        const emoji = this.getWeatherEmoji(weatherData.description);

        return `${emoji} *Clima em ${weatherData.city}*\n\n` +
            `🌡️ A temperatura está em ${weatherData.temperature}${weatherData.units}, ` +
            `com sensação de ${weatherData.feelsLike}${weatherData.units}.\n\n` +
            `💧 A umidade está em ${weatherData.humidity}%. ` +
            `As condições atuais são: ${weatherData.description}.\n\n` +
            `💡 *Dica:* ${this.getBasicTip(weatherData)}`;
    }

    // Previsão de fallback
    createFallbackForecast(forecastData, cityName) {
        let message = `📅 *Previsão para ${cityName}*\n\n`;

        forecastData.slice(0, 3).forEach((day, index) => {
            const dayName = index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' : 'Depois';
            const emoji = this.getWeatherEmoji(day.description);
            message += `${emoji} ${dayName}: ${day.minTemp}° a ${day.maxTemp}°, ${day.description}\n`;
        });

        return message;
    }

    // Recomendações básicas de fallback
    createFallbackRecommendations(weatherData) {
        const temp = parseInt(weatherData.temperature);
        let recommendations = "💡 *Recomendações para hoje:*\n\n";

        if (temp > 30) {
            recommendations += "🌡️ Calor forte: Use roupas leves, beba água, evite sol das 11h-15h\n";
        } else if (temp > 25) {
            recommendations += "🌤️ Clima agradável: Ótimo para atividades ao ar livre\n";
        } else if (temp > 20) {
            recommendations += "👕 Temperatura amena: Leve uma blusa leve\n";
        } else {
            recommendations += "🧥 Clima fresco: Use casaco, especialmente à noite\n";
        }

        if (weatherData.humidity > 80) {
            recommendations += "💧 Umidade alta: Ar pode estar abafado\n";
        }

        if (weatherData.description.toLowerCase().includes('chuva')) {
            recommendations += "☔ Leve guarda-chuva ou capa de chuva";
        }

        return recommendations;
    }

    // Utilitários
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 6) return 'madrugada';
        if (hour < 12) return 'manhã';
        if (hour < 18) return 'tarde';
        return 'noite';
    }

    getWeatherEmoji(description) {
        const desc = description.toLowerCase();
        if (desc.includes('sol') || desc.includes('clear')) return '☀️';
        if (desc.includes('chuva') || desc.includes('rain')) return '🌧️';
        if (desc.includes('nuvem') || desc.includes('cloud')) return '☁️';
        if (desc.includes('tempest') || desc.includes('storm')) return '⛈️';
        return '🌤️';
    }

    getBasicTip(weatherData) {
        const temp = parseInt(weatherData.temperature);

        if (temp > 30) return "Mantenha-se hidratado e procure sombra!";
        if (temp > 25) return "Ótimo clima para atividades ao ar livre!";
        if (temp > 20) return "Temperatura agradável, talvez uma blusa leve seja boa ideia.";
        return "Vista algo mais quente, especialmente à noite.";
    }

    // Método para testar conexão
    async testConnection() {
        try {
            const testPrompt = "Diga apenas 'Conexão OK' se você está funcionando.";
            const response = await this.callOpenAI(testPrompt);

            return {
                success: true,
                message: "Conexão com OpenAI estabelecida com sucesso!",
                response: response
            };

        } catch (error) {
            return {
                success: false,
                message: "Erro na conexão com OpenAI",
                error: error.message
            };
        }
    }


    // Método principal para analisar intenção do usuário
    async analyzeUserMessage(message, userContext = {}) {
        try {
            const prompt = this.buildAnalysisPrompt(message, userContext);

            const response = await this.callOpenAI(prompt, 0.1); // Temperatura baixa para consistência

            // Parse da resposta JSON
            const analysis = JSON.parse(response);

            return {
                success: true,
                analysis: analysis,
                originalMessage: message
            };

        } catch (error) {
            console.error('Erro ao analisar mensagem:', error.message);

            // Fallback simples se IA falhar
            return {
                success: false,
                analysis: this.createFallbackAnalysis(message),
                originalMessage: message,
                error: error.message
            };
        }
    }

    // Construir prompt para análise de intenção
    buildAnalysisPrompt(message, userContext) {
        const defaultCity = userContext.preferredCity || null;
        const language = userContext.language || 'pt';

        return `
Você é um analisador especializado em meteorologia. Analise a mensagem do usuário e retorne APENAS um JSON válido com a estrutura exata abaixo:

MENSAGEM DO USUÁRIO: "${message}"
CIDADE PADRÃO DO USUÁRIO: ${defaultCity || "nenhuma"}
IDIOMA: ${language}

RETORNE APENAS ESTE JSON (sem explicações):
{
    "type": "weather_data | weather_education | off_topic",
    "city": "nome_da_cidade_mencionada | null",
    "intent": "descrição_breve_da_intenção",
    "action": "fetch_current_weather | fetch_forecast | provide_explanation | redirect_to_weather",
    "confidence": 0.95,
    "extracted_info": {
        "mentioned_time": "hoje | amanha | null",
        "weather_aspect": "temperatura | chuva | vento | geral | null",
        "question_type": "current_data | future_data | explanation | null"
    }
}

REGRAS:
1. Se a mensagem é sobre dados meteorológicos (clima atual, previsão, temperatura) → type: "weather_data"
2. Se é pergunta educativa sobre meteorologia (o que é umidade, como funciona, etc) → type: "weather_education"  
3. Se não é sobre meteorologia → type: "off_topic"
4. Se cidade não mencionada mas usuário tem padrão → use a cidade padrão
5. intent deve ser claro e específico
6. confidence entre 0.0 e 1.0

EXEMPLOS:
"Clima em Maputo" → {"type": "weather_data", "city": "Maputo", "intent": "consultar_clima_atual", "action": "fetch_current_weather"}
"O que é umidade?" → {"type": "weather_education", "city": null, "intent": "explicar_umidade", "action": "provide_explanation"}
"Como fazer bolo?" → {"type": "off_topic", "city": null, "intent": "receita_culinaria", "action": "redirect_to_weather"}
    `.trim();
    }

    // Criar análise fallback se IA falhar
    createFallbackAnalysis(message) {
        const lowerMessage = message.toLowerCase();

        // Detectar palavras meteorológicas
        const weatherKeywords = ['clima', 'tempo', 'temperatura', 'chuva', 'sol', 'vento', 'umidade', 'previsao'];
        const educationalKeywords = ['que', 'como', 'porque', 'por que', 'explique', 'significa'];

        const isWeatherRelated = weatherKeywords.some(keyword => lowerMessage.includes(keyword));
        const isEducational = educationalKeywords.some(keyword => lowerMessage.includes(keyword));

        if (isWeatherRelated && isEducational) {
            return {
                type: "weather_education",
                city: null,
                intent: "pergunta_educativa_meteorologia",
                action: "provide_explanation",
                confidence: 0.6,
                extracted_info: {
                    mentioned_time: null,
                    weather_aspect: "geral",
                    question_type: "explanation"
                }
            };
        } else if (isWeatherRelated) {
            return {
                type: "weather_data",
                city: this.extractCityFallback(message),
                intent: "consulta_dados_meteorologicos",
                action: "fetch_current_weather",
                confidence: 0.7,
                extracted_info: {
                    mentioned_time: lowerMessage.includes('amanha') ? 'amanha' : 'hoje',
                    weather_aspect: "geral",
                    question_type: "current_data"
                }
            };
        } else {
            return {
                type: "off_topic",
                city: null,
                intent: "topico_nao_meteorologico",
                action: "redirect_to_weather",
                confidence: 0.8,
                extracted_info: {
                    mentioned_time: null,
                    weather_aspect: null,
                    question_type: null
                }
            };
        }
    }

    // Extração simples de cidade para fallback
    extractCityFallback(message) {
        const cities = ['maputo', 'beira', 'nampula', 'quelimane', 'tete', 'lichinga', 'pemba'];
        const lowerMessage = message.toLowerCase();

        for (const city of cities) {
            if (lowerMessage.includes(city)) {
                return city.charAt(0).toUpperCase() + city.slice(1);
            }
        }

        return null;
    }

    // Método para testar a análise
    async testMessageAnalysis() {
        const testMessages = [
            "Como está temperatura em Maputo",
            "Vai chover amanhã?",
            "O que é umidade relativa?",
            "Como fazer bolo?",
            "Previsão para Beira",
            "Por que chove?"
        ];

        console.log("🧪 Testando análise de mensagens...\n");

        for (const message of testMessages) {
            try {
                const result = await this.analyzeUserMessage(message);
                console.log(`📝 "${message}"`);
                console.log(`📊 Resultado:`, JSON.stringify(result.analysis, null, 2));
                console.log("---");
            } catch (error) {
                console.error(`❌ Erro ao testar "${message}":`, error.message);
            }
        }
    }

    async simpleTest(msg) {
        const result = await this.analyzeUserMessage(msg);
        console.log(`📝 "${msg}"`);
        console.log(`📊 Resultado:`, JSON.stringify(result.analysis, null, 2));
        console.log("---");
    }

    // Configurar modelo (gpt-3.5-turbo, gpt-4, etc.)
    setModel(model) {
        this.model = model;
    }

    // Configurar máximo de tokens
    setMaxTokens(maxTokens) {
        this.maxTokens = maxTokens;
    }
}

module.exports = OPENAI;