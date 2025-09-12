// Configurações do Sistema de Sugestões
// =====================================

module.exports = {
    // Configurações gerais
    general: {
        maxSuggestions: 3,
        maxCharactersPerSuggestion: 18,
        cacheExpiryMinutes: 60,
        maxCacheSize: 100,
        enableIntelligentSuggestions: true,
        fallbackToRules: true
    },

    // Configurações de OpenAI para sugestões
    openai: {
        model: 'gpt-3.5-turbo',
        maxTokens: 200,
        temperature: 0.8,
        timeoutMs: 15000,
        retries: 2
    },

    // Pesos para diferentes tipos de sugestões
    suggestionWeights: {
        contextBased: 0.4,      // Baseado no contexto atual
        weatherBased: 0.3,      // Baseado nas condições climáticas
        timeBased: 0.2,         // Baseado no horário/dia
        userBased: 0.1          // Baseado no perfil do usuário
    },

    // Mapeamento de condições climáticas para sugestões
    weatherConditionMappings: {
        // Temperatura
        hot: {
            threshold: 30,
            suggestions: ["Dicas calor", "Hidratar-se", "Sombra fresca"]
        },
        warm: {
            thresholdMin: 25,
            thresholdMax: 30,
            suggestions: ["Roupas leves", "Atividades", "Proteger sol"]
        },
        cool: {
            thresholdMin: 15,
            thresholdMax: 20,
            suggestions: ["Roupa normal", "Bom para sair", "Atividades"]
        },
        cold: {
            threshold: 15,
            suggestions: ["Dicas frio", "Roupas quentes", "Atividades casa"]
        },

        // Condições específicas
        rain: {
            keywords: ["chuva", "chuvoso", "precipitação"],
            suggestions: ["Vai parar?", "Guarda-chuva", "Atividades casa"]
        },
        sun: {
            keywords: ["sol", "ensolarado", "claro"],
            suggestions: ["Proteção solar", "Atividades ar livre", "Aproveitar sol"]
        },
        clouds: {
            keywords: ["nuvem", "nublado", "encoberto"],
            suggestions: ["Vai chover?", "Tempo muda?", "Roupas normais"]
        },
        wind: {
            keywords: ["vento", "ventoso", "rajadas"],
            suggestions: ["Cuidado vento", "Roupas firmes", "Atividades"]
        }
    },

    // Sugestões baseadas no horário
    timeBasedSuggestions: {
        morning: {
            hours: [6, 7, 8, 9, 10, 11],
            suggestions: ["Tempo hoje", "Que roupa usar", "Planos dia"]
        },
        afternoon: {
            hours: [12, 13, 14, 15, 16, 17],
            suggestions: ["Tempo tarde", "Atividades", "Fim tarde"]
        },
        evening: {
            hours: [18, 19, 20, 21],
            suggestions: ["Tempo noite", "Amanhã como?", "Planos noite"]
        },
        night: {
            hours: [22, 23, 0, 1, 2, 3, 4, 5],
            suggestions: ["Amanhã cedo", "Roupa amanhã", "Previsão manhã"]
        }
    },

    // Sugestões baseadas no dia da semana
    dayBasedSuggestions: {
        weekend: {
            days: [0, 6], // Domingo e Sábado
            suggestions: ["Fim-de-semana", "Atividades", "Passeios"]
        },
        weekday: {
            days: [1, 2, 3, 4, 5],
            suggestions: ["Trabalho", "Roupa trabalho", "Transporte"]
        },
        friday: {
            day: 5,
            suggestions: ["Fim-de-semana", "Sexta-feira", "Planos"]
        },
        monday: {
            day: 1,
            suggestions: ["Semana", "Segunda-feira", "Trabalho"]
        }
    },

    // Sugestões baseadas no nível de expertise
    expertiseLevelSuggestions: {
        basic: {
            priorities: ["practical", "simple", "help"],
            suggestions: ["Ajuda", "Tempo simples", "Dicas básicas"]
        },
        intermediate: {
            priorities: ["detailed", "comparison", "activities"],
            suggestions: ["Mais detalhes", "Comparar", "Atividades"]
        },
        advanced: {
            priorities: ["technical", "analysis", "configuration"],
            suggestions: ["Análise", "Técnico", "Configurar"]
        }
    },

    // Padrões de linguagem moçambicana
    languagePatterns: {
        casual: {
            greetings: ["Como está?", " ", "Fixe"],
            questions: ["Vai chover?", "Como vai estar?", "Que tal?"],
            exclamations: ["Que calor!", "Que frio!", "Que chuva!"]
        },
        formal: {
            greetings: ["Bom dia", "Boa tarde", "Boa noite"],
            questions: ["Qual a previsão?", "Como estará?", "Haverá chuva?"],
            statements: ["Previsão", "Condições", "Temperatura"]
        }
    },

    // Cidades e regiões de Moçambique
    locations: {
        major_cities: ["maputo", "beira", "nampula", "quelimane", "tete", "pemba"],

        regions: {
            north: ["pemba", "nampula", "lichinga"],
            center: ["beira", "quelimane", "tete", "chimoio"],
            south: ["maputo", "xai-xai", "inhambane"]
        },

        popular_destinations: {
            beach: ["costa do sol", "tofo", "vilanculos", "ilha de moçambique"],
            tourist: ["gorongosa", "kruger", "bazaruto"]
        }
    },

    // Contextos especiais
    specialContexts: {
        holidays: {
            christmas: ["25-12"],
            new_year: ["01-01"],
            independence: ["25-06"],
            suggestions: ["Feriado", "Celebração", "Família"]
        },

        events: {
            school_season: {
                months: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                suggestions: ["Escola", "Crianças", "Transporte"]
            },

            rainy_season: {
                months: [11, 12, 1, 2, 3],
                suggestions: ["Época chuvas", "Preparar", "Estradas"]
            },

            dry_season: {
                months: [4, 5, 6, 7, 8, 9, 10],
                suggestions: ["Época seca", "Calor", "Hidratação"]
            }
        }
    },

    // Sugestões de fallback por categoria
    fallbackSuggestions: {
        emergency: ["Ajuda", "Mais info", "Tentar novamente"],

        weather_basic: ["Tempo hoje", "Amanhã como?", "Que roupa usar"],

        weather_advanced: ["Previsão 7 dias", "Análise técnica", "Comparar cidades"],

        practical: ["Atividades", "Dicas úteis", "Planos"],

        help: ["Ajuda", "Comandos", "Configurações"]
    },

    // Configurações de debug e logging
    debug: {
        enableLogging: true,
        logLevel: "info", // error, warn, info, debug
        logSuggestionsGeneration: true,
        logCacheOperations: false,
        logPerformanceMetrics: true
    }
};
