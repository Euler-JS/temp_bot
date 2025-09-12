
// Dados específicos de locais na Beira para sugestões contextualizadas

const beiraLocations = {
    praias: [
        {
            nome: "Praia da Vileiro",
            descricao: "Praia urbana, boa para passeios e frutos do mar frescos",
            tipo: "urbana"
        },
        {
            nome: "Praia do Macuti",
            descricao: "Famosa pelo farol e pelo navio encalhado, ótima para fotos",
            tipo: "historica"
        },
        {
            nome: "Praia de Savane",
            descricao: "A 32 km da cidade, acessível por barco. Ideal para esportes aquáticos",
            distancia: "32 km",
            tipo: "esportes"
        },
        // {
        //     nome: "Praia de Nova Sofala (Danga)",
        //     descricao: "Ambiente tranquilo e isolado, ideal para descanso",
        //     tipo: "tranquila"
        // }
    ],

    lazer: [
        {
            nome: "Parque Nacional da Gorongosa",
            descricao: "Um dos maiores parques de Moçambique, safáris e vida selvagem",
            coordenadas: "Lat -18.766, Long 34.5",
            tipo: "natureza"
        },
        {
            nome: "Reserva Nacional de Marromeu",
            descricao: "Área natural com hipopótamos, búfalos e aves marinhas",
            tipo: "natureza"
        },
        {
            nome: "Grutas de Khodzue",
            descricao: "Cavernas profundas com significado cultural e místico",
            tipo: "cultural"
        },
        {
            nome: "Santuário de Mwane Mukuru",
            descricao: "Local espiritual em Nova Sofala, ligado a crenças locais",
            tipo: "espiritual"
        },
        {
            nome: "Parque de Infraestruturas Verdes - Bacia 1",
            descricao: "Área de lazer e drenagem sustentável, parte do projeto de adaptação climática",
            tipo: "urbano"
        },
        {
            nome: "Parque de Infraestruturas Verdes - Bacia 2",
            descricao: "Espaço urbano com vegetação e infraestrutura ecológica",
            tipo: "urbano"
        },
        {
            nome: "Parque de Infraestruturas Verdes - Bacia 3",
            descricao: "Zona de lazer e proteção ambiental integrada na cidade",
            tipo: "urbano"
        },
        {
            nome: "Novo Cine-Beira",
            descricao: "Cinema moderno para lazer e entretenimento",
            tipo: "entretenimento"
        }
    ],

    historicos: [
        {
            nome: "Farol do Rio Macuti",
            descricao: "Farol com listras vermelhas e brancas, símbolo da cidade",
            tipo: "simbolo"
        },
        {
            nome: "Catedral da Beira",
            descricao: "Igreja gótica inaugurada em 1925, feita com pedras da Fortaleza de Sofala",
            ano: 1925,
            tipo: "religioso"
        },
        {
            nome: "Estação dos Caminhos de Ferro",
            descricao: "Edifício icônico da arquitetura moderna em Moçambique",
            tipo: "arquitetura"
        },
        {
            nome: "Casa dos Bicos",
            descricao: "Espaço cultural usado para feiras, carnavais e exposições",
            tipo: "cultural"
        },
        {
            nome: "Grande Hotel da Beira",
            descricao: "Antigo hotel de luxo dos anos 50, hoje abandonado",
            ano: 1950,
            tipo: "arquitetura"
        },
        {
            nome: "Monumento do Massacre de Inhaminga",
            descricao: "Memorial em homenagem às vítimas do colonialismo",
            tipo: "memorial"
        }
    ],

    restaurantes: [
        {
            nome: "Restaurante do Chefe Anselmo",
            descricao: "Especializado em frutos do mar. 'Non stop Sea-food!'",
            especialidade: "frutos_do_mar",
            fonte: "TripAdvisor"
        },
        {
            nome: "Restaurant Solange",
            descricao: "Cozinha variada em ambiente agradável. 'Great food, great service'",
            especialidade: "variada",
            fonte: "TripAdvisor"
        },
        {
            nome: "TUGA's",
            descricao: "Cozinha portuguesa/europeia com toque local",
            especialidade: "portuguesa",
            fonte: "TripAdvisor"
        },
        {
            nome: "Clube Náutico",
            descricao: "Restaurante com vista para a praia, culinária internacional. 'Beautiful beach view restaurant'",
            especialidade: "internacional",
            vista: "praia",
            fonte: "TripAdvisor"
        },
        {
            nome: "Restaurante Biques",
            descricao: "Cardápio variado: frutos do mar, europeia, portuguesa. 'Great food, good vibe'",
            especialidade: "variada",
            fonte: "TripAdvisor"
        },
        {
            nome: "Lunamar",
            descricao: "Culinária europeia em ambiente descontraído",
            especialidade: "europeia",
            fonte: "TripAdvisor"
        },
        {
            nome: "KaSushi Beira",
            descricao: "Especializado em comida japonesa e outras asiáticas",
            especialidade: "japonesa",
            fonte: "TripAdvisor"
        },
        {
            nome: "Só Bolos",
            descricao: "Padaria e café para café da manhã ou lanches",
            especialidade: "padaria",
            fonte: "TripAdvisor"
        },
        {
            nome: "Restaurante Beira Sol",
            descricao: "Culinária portuguesa, frutos do mar",
            especialidade: "portuguesa",
            fonte: "TripAdvisor"
        }
    ],

    fastFood: [
        {
            nome: "KFC Beira",
            descricao: "Frango frito famoso mundialmente, com várias opções de refeição rápida",
            coordenadas: "Lat -19.83473, Long 34.83831",
            tipo: "internacional"
        },
        {
            nome: "S'Specials",
            descricao: "Fast food local com burgers, hotdogs, hotwings e bebidas (Estoril, próximo à bomba Galp)",
            localizacao: "Estoril",
            tipo: "local"
        },
        {
            nome: "No Quintal Fast-food & Drinks",
            descricao: "Lanches como X-Quintal e drinks criativos (com promoções diárias)",
            especialidade: "drinks",
            tipo: "local"
        },
        {
            nome: "FastFood Luisabel",
            descricao: "Especialidades locais como sopa, chamuças, rissóis e bolos",
            especialidade: "local",
            tipo: "local"
        },
        {
            nome: "KaseKome",
            descricao: "Rede local de fast-food com hambúrgueres e sanduíches",
            tipo: "local"
        },
        {
            nome: "King Pie",
            descricao: "Franquia sul-africana especializada em tortas salgadas e doces",
            origem: "sul_africana",
            especialidade: "tortas"
        }
    ]
};

// Funções utilitárias para buscar locais
const beiraLocationUtils = {
    // Buscar por categoria
    getByCategory: (categoria) => {
        return beiraLocations[categoria] || [];
    },

    // Buscar por tipo dentro de uma categoria
    getByType: (categoria, tipo) => {
        const items = beiraLocations[categoria] || [];
        return items.filter(item => item.tipo === tipo);
    },

    // Buscar restaurantes por especialidade
    getRestaurantsBySpecialty: (especialidade) => {
        return beiraLocations.restaurantes.filter(rest =>
            rest.especialidade === especialidade
        );
    },



    // Gerar sugestões baseadas no contexto (tempo, hora, etc.)
    getSuggestionsByContext: (context) => {
        const { temperatura, condicao, hora, intent } = context;
        let suggestions = [];

        // Lógica baseada na temperatura
        if (temperatura > 30) {
            // Muito quente - sugerir locais com sombra/água
            suggestions.push(...beiraLocations.praias.slice(0, 2));
            suggestions.push(...beiraLocationUtils.getByType('lazer', 'urbano').slice(0, 2));
        } else if (temperatura < 20) {
            // Mais frio - sugerir atividades internas
            suggestions.push(...beiraLocationUtils.getByType('lazer', 'entretenimento'));
            suggestions.push(...beiraLocationUtils.getByType('historicos', 'cultural'));
        }

        // Lógica baseada na condição climática
        if (condicao?.includes('chuva')) {
            // Chuva - atividades cobertas
            suggestions.push(...beiraLocationUtils.getByType('lazer', 'entretenimento'));
            suggestions.push(...beiraLocationUtils.getByType('historicos', 'cultural'));
        }

        // Lógica baseada no intent
        if (intent?.includes('atividade') || intent?.includes('fazer')) {
            suggestions.push(...getRandomItems(beiraLocations.lazer.slice(0, 3)));
        }

        if (intent?.includes('comer') || intent?.includes('restaurante')) {
            suggestions.push(...getRandomItems(beiraLocations.restaurantes.slice(0, 3)));
        }


        const uniqueSuggestions = [];
        const seen = new Set();
        for (const item of suggestions) {
            if (!seen.has(item.nome)) {
                seen.add(item.nome);
                uniqueSuggestions.push(item);
            }
        }
        return uniqueSuggestions.slice(0, 5); // Máximo 5 sugestões
    },

    // Formatar para WhatsApp
    formatForWhatsApp: (categoria, maxItems = 5) => {
        const items = beiraLocations[categoria] || [];
        const limited = items.slice(0, maxItems);

        return limited.map((item, index) => ({
            id: `${categoria}_${index}`,
            title: item.nome.length > 24 ? item.nome.substring(0, 21) + '...' : item.nome,
            description: item.descricao.length > 72 ? item.descricao.substring(0, 69) + '...' : item.descricao
        }));
    }
};

const getRandomItems = (array, count) => {
    if (!array || array.length === 0) return [];
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
};

module.exports = {
    beiraLocations,
    beiraLocationUtils
};

