# 🌤️ Previsão de 7 Dias com OpenWeatherMap

Este módulo implementa um sistema robusto de previsão meteorológica para 7 dias usando principalmente a API do OpenWeatherMap, com fallback para WeatherAPI.

## ✨ Funcionalidades

- 📅 **Previsão de 1-7 dias** para qualquer cidade do mundo
- 🌡️ **Suporte a Celsius e Fahrenheit**
- ⚡ **Sistema de cache inteligente** (10 minutos)
- 🔄 **Fallback automático** entre APIs
- 🌍 **Suporte a múltiplos idiomas** (português por padrão)
- 📱 **Formatação otimizada** para WhatsApp/Telegram

## 🚀 Como Usar

### Instalação Básica

```javascript
const WeatherService = require('./weather_api/weather_service');
const weatherService = new WeatherService();
```

### Exemplos de Uso

#### 1. Previsão Básica de 7 Dias
```javascript
// Previsão padrão (7 dias em Celsius)
const forecast = await weatherService.getWeatherForecast('São Paulo');
console.log(forecast);
```

#### 2. Previsão Personalizada
```javascript
// 3 dias em Fahrenheit
const forecast = await weatherService.getWeatherForecast('Miami', 3, 'fahrenheit');
```

#### 3. Integração com Bot (Recomendado)
```javascript
const ForecastBot = require('./examples/forecast_integration_example');
const bot = new ForecastBot();

// Previsão formatada para WhatsApp
const message = await bot.getForecastResponse('Rio de Janeiro');
console.log(message);
```

## 📊 Formato de Resposta

### Resposta da API Principal
```javascript
{
  city: "São Paulo",
  country: "BR", 
  forecasts: [
    {
      date: "2025-09-04",
      dayName: "Hoje",
      maxTemp: 28,
      minTemp: 18,
      avgTemp: 24,
      description: "céu limpo",
      icon: "01d",
      humidity: 35,
      windSpeed: 4
    },
    // ... mais 6 dias
  ],
  units: "°C",
  source: "OpenWeatherMap"
}
```

### Resposta Formatada para Bot
```
🌤️ *Previsão de 7 dias para São Paulo*

☀️ *Hoje*
🌡️ 18°C - 28°C
☀️ céu limpo
💧 Umidade: 35%
💨 Vento: 4 km/h

☀️ *Amanhã*
🌡️ 18°C - 27°C
☀️ céu limpo
💧 Umidade: 47%
💨 Vento: 6 km/h

📊 _Dados fornecidos por OpenWeatherMap_
```

## 🤖 Integração com Bot

### Comandos Suportados

| Comando | Função | Exemplo |
|---------|--------|---------|
| Previsão completa | `getForecastResponse(city, 7)` | "Como vai estar o tempo na próxima semana?" |
| Hoje e amanhã | `getTodayTomorrowForecast(city)` | "Como vai estar amanhã?" |
| Fim de semana | `getWeekendForecast(city)` | "Como vai estar no fim de semana?" |
| Resumo 3 dias | `getShortForecastResponse(city)` | "Resumo do tempo" |

### Processamento de Linguagem Natural

```javascript
// O bot entende comandos naturais
const response = await bot.processNaturalLanguage(
  "Como vai estar o tempo nos próximos 7 dias?", 
  "Lisboa"
);
```

**Comandos reconhecidos:**
- "próxima semana", "7 dias", "próximos dias"
- "hoje e amanhã", "amanhã"
- "fim de semana", "sábado e domingo"  
- "3 dias", "resumo"

## 🔧 Configuração Avançada

### Variáveis de Ambiente

```bash
# .env
OPENWEATHER_API_KEY=sua_chave_aqui
WEATHERAPI_KEY=sua_chave_weatherapi_aqui
```

### Customização de Cache

```javascript
const weatherService = new WeatherService();
// Cache personalizado (em milissegundos)
weatherService.cacheTimeout = 5 * 60 * 1000; // 5 minutos
```

## 🌟 Funcionalidades Especiais

### 1. Sistema de Alertas Automáticos
```javascript
// Detecta automaticamente condições extremas
const alerts = bot.getWeatherAlerts({
  maxTemp: 38,        // Temperatura muito alta
  chanceOfRain: 80,   // Alta probabilidade de chuva
  windSpeed: 35,      // Ventos fortes
  humidity: 90        // Umidade muito alta
});
```

### 2. Emojis Inteligentes
O sistema seleciona automaticamente emojis baseados nas condições:
- ☀️ Céu limpo
- 🌧️ Chuva
- ⛈️ Tempestade
- ❄️ Neve
- ☁️ Nublado
- 🌫️ Neblina

### 3. Formatação de Dias
- "Hoje" para o dia atual
- "Amanhã" para o próximo dia  
- Nomes dos dias em português (segunda-feira, terça-feira, etc.)

## 📈 Performance e Confiabilidade

### Sistema de Fallback
1. **OpenWeatherMap** (principal) - Dados mais precisos
2. **WeatherAPI** (fallback) - Backup automático

### Cache Inteligente
- ⚡ **Velocidade**: Respostas instantâneas para consultas recentes
- 💾 **Economia**: Reduz chamadas à API
- 🔄 **Atualização**: Cache expira em 10 minutos automaticamente

### Tratamento de Erros
```javascript
try {
  const forecast = await weatherService.getWeatherForecast('CidadeInvalida');
} catch (error) {
  console.log('Erro:', error.message);
  // Fallback ou mensagem de erro amigável
}
```

## 🧪 Testes

### Executar Testes
```bash
# Teste completo
node test_7_day_forecast.js

# Teste de integração  
node examples/forecast_integration_example.js
```

### Exemplo de Saída dos Testes
```
🌤️ Testando previsão de 7 dias com OpenWeatherMap...

📍 Previsão para São Paulo:
🏙️ Cidade: São Paulo, BR  
🔗 Fonte: OpenWeatherMap
✅ Todos os testes concluídos com sucesso!
```

## 📱 Exemplos Práticos

### WhatsApp Bot Integration
```javascript
// Em seu handler do WhatsApp
async function handleWeatherRequest(message, city) {
  const bot = new ForecastBot();
  
  if (message.includes('previsão') || message.includes('tempo')) {
    return await bot.processNaturalLanguage(message, city);
  }
}
```

### Telegram Bot Integration
```javascript
bot.onText(/\/previsao (.+)/, async (msg, match) => {
  const city = match[1];
  const forecastBot = new ForecastBot();
  const response = await forecastBot.getForecastResponse(city);
  bot.sendMessage(msg.chat.id, response, {parse_mode: 'Markdown'});
});
```

## 🌍 APIs Suportadas

### OpenWeatherMap (Principal)
- ✅ Previsão de 5 dias/3 horas
- ✅ Dados meteorológicos detalhados
- ✅ Suporte global
- ✅ Múltiplos idiomas

### WeatherAPI (Fallback)  
- ✅ Previsão de até 10 dias
- ✅ Dados de qualidade do ar
- ✅ Alertas meteorológicos
- ✅ Histórico meteorológico

## 🔮 Roadmap Futuro

- [ ] **Alertas push** para condições extremas
- [ ] **Integração com mapas** meteorológicos
- [ ] **Previsão horária** detalhada
- [ ] **Dados de qualidade do ar**
- [ ] **Histórico meteorológico**
- [ ] **Machine Learning** para previsões personalizadas

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs de erro
2. Confirme suas chaves de API
3. Teste com cidades conhecidas
4. Consulte os exemplos fornecidos

---

**🎯 Dica Pro**: Use o cache de forma inteligente consultando a mesma cidade várias vezes para aproveitar a velocidade do cache!
