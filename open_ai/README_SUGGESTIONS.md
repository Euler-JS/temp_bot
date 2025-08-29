# Sistema de Sugestões Inteligentes 🧠

Um sistema avançado para gerar sugestões contextuais e inteligentes para o chatbot meteorológico moçambicano.

## 📋 Visão Geral

O sistema foi desenvolvido para resolver os problemas com respostas de sugestões, fornecendo:

- **Sugestões Inteligentes** via OpenAI (quando disponível)
- **Sugestões Baseadas em Regras** como fallback robusto
- **Cache Inteligente** para melhor performance
- **Validação de Dados** e tratamento de erros
- **Personalização** baseada no perfil do usuário

## 🏗️ Estrutura do Sistema

```
open_ai/
├── open_ai.js              # Classe principal (atualizada)
├── suggestions_handler.js  # Sistema especializado de sugestões
├── suggestions_config.js   # Configurações e mapeamentos
└── README_SUGGESTIONS.md   # Esta documentação
```

## 🚀 Como Usar

### Inicialização Básica

```javascript
const OPENAI = require('./open_ai/open_ai');

// Inicializar com token OpenAI (recomendado)
const openai = new OPENAI(process.env.OPENAI_API_KEY);

// Ou sem token (modo limitado - apenas regras)
const openai = new OPENAI();
```

### Gerar Sugestões

```javascript
const analysis = {
    type: "weather_data",
    city: "maputo",
    intent: "consulta_temperatura",
    expertiseLevel: "basic"
};

const weatherData = {
    city: "Maputo",
    temperature: "28",
    description: "céu claro",
    humidity: "65",
    isForecast: false
};

const userContext = {
    queryCount: 3,
    lastCity: "maputo",
    preferredCity: "maputo"
};

// Gerar sugestões
const suggestions = await openai.generateIntelligentSuggestions(
    analysis, 
    weatherData, 
    userContext
);

console.log(suggestions); // ['Tempo amanhã?', 'Que roupa usar?', 'Atividades hoje']
```

### Acesso Direto ao Handler

```javascript
// Obter o handler de sugestões
const handler = openai.getSuggestionsHandler();

// Gerar sugestões diretamente
const suggestions = await handler.generateSuggestions(analysis, weatherData, userContext);

// Sugestões predefinidas por contexto
const rainSuggestions = handler.getSuggestionsForContext('weather_rain');
console.log(rainSuggestions); // ['Vai chover?', 'Dicas chuva', 'Guarda-chuva?']
```

## 🛠️ Funcionalidades Principais

### 1. Sugestões Inteligentes (OpenAI)

- Geração contextual baseada em IA
- Linguagem moçambicana natural
- Máximo 18 caracteres por sugestão
- Personalização por nível de expertise

### 2. Sugestões Baseadas em Regras

- Sistema robusto de fallback
- Baseado em condições climáticas
- Consideração do horário/dia
- Perfil do usuário

### 3. Cache Inteligente

```javascript
// Verificar estatísticas do cache
const stats = openai.getSuggestionsStats();
console.log(stats); // { size: 7, maxSize: 100, expiry: '60 minutos' }

// Limpar cache
openai.clearSuggestionsCache();
```

### 4. Validação e Tratamento de Erros

O sistema trata automaticamente:
- Dados inválidos ou ausentes
- Falhas de conectividade
- Respostas malformadas da IA
- Timeouts de requisição

## 📊 Tipos de Sugestões

### Por Condição Climática

| Condição | Exemplos de Sugestões |
|----------|----------------------|
| Chuva | "Vai parar?", "Dicas chuva", "Atividades casa" |
| Calor (>30°C) | "Dicas calor", "Hidratar-se", "Sombra fresca" |
| Frio (<15°C) | "Dicas frio", "Roupas quentes", "Atividades casa" |
| Sol | "Proteção solar", "Atividades ar livre", "Aproveitar sol" |

### Por Horário

| Período | Exemplos de Sugestões |
|---------|----------------------|
| Manhã (6-11h) | "Tempo hoje", "Que roupa usar", "Planos dia" |
| Tarde (12-17h) | "Tempo tarde", "Atividades", "Fim tarde" |
| Noite (18-21h) | "Tempo noite", "Amanhã como?", "Planos noite" |
| Madrugada (22-5h) | "Amanhã cedo", "Roupa amanhã", "Previsão manhã" |

### Por Nível de Expertise

| Nível | Foco das Sugestões |
|-------|-------------------|
| Básico | Simples, práticas, ajuda |
| Intermediário | Detalhadas, comparações, atividades |
| Avançado | Técnicas, análises, configurações |

## 🔧 Configuração

Edite `suggestions_config.js` para personalizar:

```javascript
module.exports = {
    general: {
        maxSuggestions: 3,
        maxCharactersPerSuggestion: 18,
        cacheExpiryMinutes: 60
    },
    
    // Mapeamentos de condições climáticas
    weatherConditionMappings: {
        hot: {
            threshold: 30,
            suggestions: ["Dicas calor", "Hidratar-se", "Sombra fresca"]
        }
        // ... mais configurações
    }
};
```

## 🧪 Testes

Execute o teste completo do sistema:

```bash
node test/test_suggestions_system.js
```

O teste verifica:
- ✅ Conectividade com OpenAI
- ✅ Sugestões baseadas em regras
- ✅ Diferentes contextos climáticos
- ✅ Níveis de expertise
- ✅ Cache e performance
- ✅ Tratamento de erros

## 📈 Performance

- **Cache**: Reduz tempo de resposta em ~90% para consultas repetidas
- **Fallback**: Sempre funciona mesmo sem OpenAI
- **Validação**: Previne erros em tempo de execução
- **Timeout**: 15 segundos máximo para chamadas OpenAI

## 🔍 Debug e Logs

O sistema gera logs detalhados:

```
🔄 Gerando sugestões... { type: 'weather_data', city: 'maputo', intent: 'consulta_temperatura' }
🔄 Usando sugestões baseadas em regras
✅ Sugestões geradas: ['Tempo amanhã?', 'Atividades hoje', 'Planos hoje']
```

Para desabilitar logs, edite `suggestions_config.js`:

```javascript
debug: {
    enableLogging: false
}
```

## 🚨 Tratamento de Erros

O sistema possui múltiplas camadas de proteção:

1. **Validação de Entrada**: Sanitiza dados inválidos
2. **Fallback Inteligente**: Regras quando IA falha
3. **Sugestões de Emergência**: Sempre retorna algo útil
4. **Cache de Erro**: Evita repetir falhas

## 💡 Exemplos de Uso

### Caso 1: Consulta Básica

```javascript
const suggestions = await openai.generateIntelligentSuggestions(
    { type: "weather_data", city: "beira", intent: "temperatura" },
    { temperature: "25", description: "ensolarado" },
    { queryCount: 1 }
);
// Resultado: ["Tempo amanhã?", "Que roupa usar?", "Atividades hoje"]
```

### Caso 2: Usuário Avançado

```javascript
const suggestions = await openai.generateIntelligentSuggestions(
    { type: "weather_data", expertiseLevel: "advanced" },
    { temperature: "32", description: "muito quente" },
    { queryCount: 15, preferredComplexity: "advanced" }
);
// Resultado: ["Análise térmica", "Índices UV", "Configurações"]
```

### Caso 3: Chuva

```javascript
const suggestions = await openai.generateIntelligentSuggestions(
    { type: "weather_data", city: "maputo" },
    { temperature: "22", description: "chuva moderada" },
    { lastCity: "maputo" }
);
// Resultado: ["Vai parar chuva?", "Dicas chuva", "Atividades casa"]
```

## 🔮 Próximos Passos

- [ ] Integração com histórico de conversa
- [ ] Sugestões baseadas em localização GPS
- [ ] Personalização por faixa etária
- [ ] Sugestões sazonais (época seca/chuvosa)
- [ ] A/B testing de diferentes estilos

---

**Desenvolvido para resolver problemas de sugestões no chatbot meteorológico moçambicano** 🇲🇿
