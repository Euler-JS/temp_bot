// open_ai/multilingual_handler.js
/**
 * SISTEMA MULTILÍNGUE PARA JOANA BOT
 * 
 * Implementa suporte para múltiplas línguas usando:
 * - Detecção automática de idioma
 * - Tradução bidirecional
 * - Modelos multilíngues (BERT, mBERT, NLLB)
 * - Cache inteligente por idioma
 */

require('dotenv').config();
const axios = require('axios');

class MultilingualHandler {
    constructor(openaiToken) {
        this.token = openaiToken;
        this.baseURL = 'https://api.openai.com/v1';

        // Cache por idioma
        this.languageCache = new Map();
        this.translationCache = new Map();

        // Idiomas suportados (expandível)
        this.supportedLanguages = {
            'pt': { name: 'Português', native: 'Português', priority: 1 },
            'en': { name: 'English', native: 'English', priority: 2 },
            'es': { name: 'Español', native: 'Español', priority: 3 },
            'fr': { name: 'Français', native: 'Français', priority: 4 },
            'sw': { name: 'Swahili', native: 'Kiswahili', priority: 5 },
            'zu': { name: 'Zulu', native: 'isiZulu', priority: 6 },
            'xh': { name: 'Xhosa', native: 'isiXhosa', priority: 7 },
            'af': { name: 'Afrikaans', native: 'Afrikaans', priority: 8 },
            'sn': { name: 'Shona', native: 'chiShona', priority: 9 },
            'ts': { name: 'Tsonga', native: 'Xitsonga', priority: 10 }
        };

        // Padrões específicos para Moçambique
        this.mozambiquePatterns = {
            pt: [
                'eh pá', 'fixes', 'eish', 'tás', 'estás', 'vais', 'tempo', 'clima',
                'maputo', 'beira', 'nampula', 'quelimane', 'tete', 'pemba',
                'chover', 'calor', 'frio', 'chuva', 'sol', 'nuvens'
            ],
            en: [
                'weather', 'temperature', 'rain', 'hot', 'cold', 'sunny', 'cloudy',
                'forecast', 'today', 'tomorrow', 'celsius', 'fahrenheit'
            ],
            sw: [
                'hali ya hewa', 'mvua', 'jua', 'baridi', 'joto', 'leo', 'kesho',
                'mawingu', 'upepo'
            ]
        };

        console.log('🌍 Sistema Multilíngue inicializado');
        console.log(`📊 Suporte a ${Object.keys(this.supportedLanguages).length} idiomas`);
    }

    /**
     * Detecta o idioma de uma mensagem
     */
    async detectLanguage(message) {
        try {
            // Cache check
            const cacheKey = `detect_${message.substring(0, 50)}`;
            if (this.languageCache.has(cacheKey)) {
                return this.languageCache.get(cacheKey);
            }

            // 1. Detecção por padrões específicos (mais rápida)
            const patternDetection = this.detectByPatterns(message);
            if (patternDetection.confidence > 0.8) {
                this.languageCache.set(cacheKey, patternDetection);
                return patternDetection;
            }

            // 2. Detecção via OpenAI (mais precisa)
            const aiDetection = await this.detectLanguageWithAI(message);

            // Cache result
            this.languageCache.set(cacheKey, aiDetection);

            return aiDetection;

        } catch (error) {
            console.log('⚠️ Erro na detecção de idioma, assumindo português');
            return {
                language: 'pt',
                confidence: 0.5,
                method: 'fallback',
                native_name: 'Português'
            };
        }
    }

    /**
     * Detecção por padrões (método rápido)
     */
    detectByPatterns(message) {
        const lowerMessage = message.toLowerCase();
        const scores = {};

        // Inicializar scores
        Object.keys(this.mozambiquePatterns).forEach(lang => {
            scores[lang] = 0;
        });

        // Calcular scores baseado em padrões
        Object.entries(this.mozambiquePatterns).forEach(([lang, patterns]) => {
            patterns.forEach(pattern => {
                if (lowerMessage.includes(pattern)) {
                    scores[lang] += pattern.length / message.length;
                }
            });
        });

        // Encontrar idioma com maior score
        const bestMatch = Object.entries(scores).reduce((a, b) =>
            scores[a[0]] > scores[b[0]] ? a : b
        );

        const confidence = bestMatch[1];
        const language = confidence > 0.3 ? bestMatch[0] : 'pt'; // Default português

        return {
            language: language,
            confidence: Math.min(confidence * 2, 1), // Normalizar
            method: 'pattern',
            native_name: this.supportedLanguages[language]?.native || 'Português'
        };
    }

    /**
     * Detecção via OpenAI (método preciso)
     */
    async detectLanguageWithAI(message) {
        const prompt = `
Detecta o idioma desta mensagem e determina se é relacionada ao clima/tempo:

MENSAGEM: "${message}"

IDIOMAS AFRICANOS/REGIONAIS PRIORITÁRIOS:
- Português (pt) - Moçambique
- Swahili (sw) - África Oriental  
- Zulu (zu) - África do Sul
- Xhosa (xh) - África do Sul
- Shona (sn) - Zimbabwe
- Tsonga (ts) - Moçambique/África do Sul

OUTROS SUPORTADOS:
- English (en)
- Español (es)  
- Français (fr)
- Afrikaans (af)

CONTEXTO: Esta é uma mensagem para um bot meteorológico em Moçambique.

RESPONDE APENAS JSON:
{
    "language": "código_idioma",
    "confidence": 0.95,
    "native_name": "Nome nativo do idioma",
    "is_weather_related": true,
    "detected_location": "cidade se mencionada"
}`;

        try {
            const response = await axios.post(`${this.baseURL}/chat/completions`, {
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 150,
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            let responseText = response.data.choices[0].message.content.trim();

            // Remover marcadores de código se existirem
            responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');

            const result = JSON.parse(responseText);

            return {
                language: result.language || 'pt',
                confidence: result.confidence || 0.8,
                method: 'ai',
                native_name: result.native_name || 'Português',
                is_weather_related: result.is_weather_related || false,
                detected_location: result.detected_location || null
            };

        } catch (error) {
            console.log('⚠️ Erro na detecção AI:', error.message);
            return { language: 'pt', confidence: 0.5, method: 'fallback' };
        }
    }

    /**
     * Traduz mensagem para português (idioma base do sistema)
     */
    async translateToPortuguese(message, sourceLanguage) {
        if (sourceLanguage === 'pt') {
            return { translated: message, confidence: 1.0, source_language: 'pt' };
        }

        const cacheKey = `translate_${sourceLanguage}_pt_${message.substring(0, 30)}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        try {
            const prompt = `
Traduz esta mensagem para português moçambicano natural:

MENSAGEM ORIGINAL: "${message}"
IDIOMA ORIGEM: ${this.supportedLanguages[sourceLanguage]?.name || sourceLanguage}

CONTEXTO: 
- Esta é uma consulta para um bot meteorológico
- Use português natural como falado em Moçambique
- Preserva intenção e contexto meteorológico
- Se mencionar cidades, mantém nomes originais

EXEMPLOS DE ESTILO MOÇAMBICANO:
- "How is the weather?" → "Como está o tempo?"
- "What's the temperature?" → "Qual é a temperatura?"
- "Will it rain tomorrow?" → "Vai chover amanhã?"

RESPONDE APENAS JSON:
{
    "translated": "mensagem traduzida",
    "confidence": 0.95,
    "preserved_entities": ["cidades", "números"],
    "notes": "observações se necessário"
}`;

            const response = await axios.post(`${this.baseURL}/chat/completions`, {
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.2
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            let responseText = response.data.choices[0].message.content.trim();

            // Remover marcadores de código se existirem
            responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');

            const result = JSON.parse(responseText);

            const translation = {
                translated: result.translated || message,
                confidence: result.confidence || 0.8,
                source_language: sourceLanguage,
                preserved_entities: result.preserved_entities || [],
                notes: result.notes || null
            };

            // Cache result
            this.translationCache.set(cacheKey, translation);

            return translation;

        } catch (error) {
            console.log('⚠️ Erro na tradução:', error.message);
            return {
                translated: message,
                confidence: 0.3,
                source_language: sourceLanguage,
                error: 'translation_failed'
            };
        }
    }

    /**
     * Traduz resposta do português para idioma do usuário
     */
    async translateResponse(response, targetLanguage, weatherContext = null) {
        if (targetLanguage === 'pt') {
            return { translated: response, confidence: 1.0, target_language: 'pt' };
        }

        const cacheKey = `response_pt_${targetLanguage}_${response.substring(0, 30)}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        try {
            const contextInfo = weatherContext ? `
DADOS METEOROLÓGICOS:
- Cidade: ${weatherContext.city}
- Temperatura: ${weatherContext.temperature}°C
- Condições: ${weatherContext.description}` : '';

            const prompt = `
Traduz esta resposta meteorológica para ${this.supportedLanguages[targetLanguage]?.name || targetLanguage}:

RESPOSTA EM PORTUGUÊS: "${response}"
IDIOMA DESTINO: ${this.supportedLanguages[targetLanguage]?.native || targetLanguage}
${contextInfo}

INSTRUÇÕES:
- Mantém estilo natural e conversacional
- Preserva emojis e formatação
- Adapta expressões culturais quando necessário  
- Mantém precisão dos dados meteorológicos
- Usa terminologia meteorológica correta no idioma destino

EXEMPLOS DE ADAPTAÇÃO CULTURAL:
- "Eh pá" → Expressão equivalente no idioma destino
- "Como andas?" → Cumprimento cultural apropriado
- Valores temperatura em Celsius (padrão internacional)

RESPONDE APENAS JSON:
{
    "translated": "resposta traduzida",
    "confidence": 0.95,
    "cultural_adaptations": ["adaptações feitas"],
    "preserved_formatting": true
}`;

            const response_ai = await axios.post(`${this.baseURL}/chat/completions`, {
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 400,
                temperature: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            let responseText = response_ai.data.choices[0].message.content.trim();

            // Remover marcadores de código se existirem
            responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');

            const result = JSON.parse(responseText);

            const translation = {
                translated: result.translated || response,
                confidence: result.confidence || 0.8,
                target_language: targetLanguage,
                cultural_adaptations: result.cultural_adaptations || [],
                preserved_formatting: result.preserved_formatting || true
            };

            // Cache result
            this.translationCache.set(cacheKey, translation);

            return translation;

        } catch (error) {
            console.log('⚠️ Erro na tradução da resposta:', error.message);
            return {
                translated: response,
                confidence: 0.3,
                target_language: targetLanguage,
                error: 'response_translation_failed'
            };
        }
    }

    /**
     * Processa mensagem multilíngue completa
     */
    async processMultilingualMessage(message, phoneNumber) {
        console.log(`🌍 Processando mensagem multilíngue de ${phoneNumber}`);

        // 1. Detectar idioma
        const detection = await this.detectLanguage(message);
        console.log(`📊 Idioma detectado: ${detection.language} (${detection.confidence * 100}% confiança)`);

        // 2. Traduzir para português se necessário
        let processedMessage = message;
        let translation = null;

        if (detection.language !== 'pt') {
            translation = await this.translateToPortuguese(message, detection.language);
            processedMessage = translation.translated;
            console.log(`🔄 Traduzido: "${message}" → "${processedMessage}"`);
        }

        return {
            original_message: message,
            processed_message: processedMessage,
            detected_language: detection,
            translation: translation,
            should_translate_response: detection.language !== 'pt',
            target_language: detection.language,
            // Não processar análise aqui - deixar para ser processada pelo sistema principal
            needs_analysis: true
        };
    }

    /**
     * Gera resposta multilíngue final
     */
    async generateMultilingualResponse(portugueseResponse, targetLanguage, weatherContext = null) {
        if (targetLanguage === 'pt') {
            return {
                response: portugueseResponse,
                language: 'pt',
                translation_applied: false
            };
        }

        const translation = await this.translateResponse(portugueseResponse, targetLanguage, weatherContext);

        return {
            response: translation.translated,
            language: targetLanguage,
            translation_applied: true,
            confidence: translation.confidence,
            original_portuguese: portugueseResponse
        };
    }

    /**
     * Obtém informações sobre idiomas suportados
     */
    getSupportedLanguages() {
        return Object.entries(this.supportedLanguages).map(([code, info]) => ({
            code,
            name: info.name,
            native: info.native,
            priority: info.priority
        })).sort((a, b) => a.priority - b.priority);
    }

    /**
     * Limpa cache (útil para manutenção)
     */
    clearCache() {
        this.languageCache.clear();
        this.translationCache.clear();
        console.log('🧹 Cache multilíngue limpo');
    }

    /**
     * Estatísticas de uso
     */
    getUsageStats() {
        return {
            cached_detections: this.languageCache.size,
            cached_translations: this.translationCache.size,
            supported_languages: Object.keys(this.supportedLanguages).length
        };
    }
}

module.exports = MultilingualHandler;
