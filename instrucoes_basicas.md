# 🌡️ Guia de Migração: Bible Bot → Temperature Bot

## 📋 Checklist de Migração

### 1. **Estrutura de Arquivos**
```
projeto/
├── index.js (atualizar completamente)
├── whatsapp_api/
│   └── connection.js (manter - já funciona)
├── weather_api/
│   └── weather_service.js (criar novo)
├── users.json (manter estrutura, limpar dados)
├── logs/ (manter)
├── .env (criar/atualizar)
└── package.json (atualizar dependências)
```

### 2. **Remover Arquivos Antigos**
- `bible_brain_api/` (toda a pasta)
- `translations/` (se não for usar multilíngue)
- Qualquer arquivo relacionado à Bíblia

### 3. **Criar Novos Arquivos**
- `weather_api/weather_service.js`
- `.env` com configurações de APIs meteorológicas

### 4. **Obter Chaves de API**

#### OpenWeatherMap (Gratuita)
1. Acesse: https://openweathermap.org/api
2. Crie conta gratuita
3. Obtenha API key
4. Limite: 1000 calls/dia

#### WeatherAPI (Freemium)
1. Acesse: https://www.weatherapi.com
2. Crie conta
3. Obtenha API key
4. Limite: 1 milhão calls/mês (gratuito)

### 5. **Atualizar Variáveis de Ambiente**

Substitua as variáveis do projeto bíblico por:

```env
# Manter do projeto anterior
WHATSAPP_TOKEN=seu_token_existente
PHONE_NUMBER_ID=seu_phone_id_existente

# Adicionar novas
OPENWEATHER_API_KEY=sua_chave_openweather
WEATHERAPI_KEY=sua_chave_weatherapi
WEBHOOK_VERIFY_TOKEN=TEMPBOT2024
```

### 6. **Atualizar index.js**

#### Substituir importações:
```javascript
// REMOVER:
// const FonteAI = require("./bible_brain_api/ai/fonte_ai");
// const Translations = require("./translations/translation");

// ADICIONAR:
const WeatherService = require("./weather_api/weather_service");
require('dotenv').config();
```

#### Substituir inicializações:
```javascript
// REMOVER:
// const fonteAI = new FonteAI(API_BASE_URL_FONTE_AI, MODEL, STREAM);

// ADICIONAR:
const weatherService = new WeatherService();
```

### 7. **Comandos de Usuário**

#### Comandos Antigos → Novos:
```javascript
// REMOVER optionsCases antigos e usar:
const optionsCases = [
    "/clima",
    "/previsao", 
    "/configurar",
    "/ajuda",
    "/historico"
];
```

### 8. **Estrutura de Dados do Usuário**

#### Antes (Bible Bot):
```json
{
  "contact": "846151124",
  "language_name": "Portugues",
  "code": "PORBSP",
  "prefix": "N2DA",
  "chat": false
}
```

#### Depois (Temperature Bot):
```json
{
  "contact": "846151124",
  "preferredCity": "Maputo",
  "units": "celsius",
  "language": "pt",
  "notifications": false,
  "weatherHistory": []
}
```

### 9. **Testes de Funcionalidade**

Após implementação, teste:

1. **Comando básico**: "Clima em Maputo"
2. **Configurações**: "/configurar"
3. **Histórico**: "/historico"
4. **Previsão**: "/previsao"
5. **Localização**: Enviar localização GPS

### 10. **Deploy e Monitoramento**

#### Comandos de instalação:
```bash
# Instalar novas dependências
npm install axios dotenv node-cron

# Remover dependências antigas (se não usadas)
npm uninstall dependencias_biblicas_antigas

# Iniciar aplicação
npm start
```

### 11. **Webhook WhatsApp**

Mantenha a mesma configuração do webhook, apenas mude o token de verificação:

**Antes**: `FONTEEQUIP`
**Depois**: `TEMPBOT2024`

### 12. **Mensagens de Exemplo**

#### Usuários podem testar com:
- "Clima em Maputo"
- "Temperatura Beira"
- "Tempo Lisboa"
- "/ajuda"
- "/configurar"

### 13. **Monetização (Opcional)**

Baseado na precificação do PDF:
- Cobrança por consulta premium
- Relatórios personalizados
- Dashboard web (115.000 MZN estimado)

### 14. **Backup de Dados**

Antes da migração:
```bash
# Backup dos usuários atuais
cp users.json users_backup_bible.json

# Backup dos logs
cp -r logs/ logs_backup_bible/
```

### 15. **Testes Finais**

✅ Webhook responde corretamente
✅ APIs de clima funcionam
✅ Mensagens interativas funcionam
✅ Configurações salvam corretamente
✅ Histórico é mantido
✅ Cache funciona (performance)

---

## 🎯 Resultado Final

Com essa migração você terá:
- ✅ Bot funcional de temperatura
- ✅ Múltiplas APIs com fallback
- ✅ Interface rica (botões, listas)
- ✅ Configurações personalizadas
- ✅ Histórico de consultas
- ✅ Cache para performance
- ✅ Suporte a localização GPS

**Tempo estimado de migração**: 4-6 horas para desenvolvedor experiente