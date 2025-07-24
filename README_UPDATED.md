# 🌡️ Temperature Bot WhatsApp com IA e Supabase

Bot inteligente de WhatsApp para consultas meteorológicas com IA contextual, memória persistente e progressão de expertise do usuário.

## 🚀 Funcionalidades

### ✨ Principais
- **Consultas Climáticas Inteligentes**: Temperatura, umidade, condições climáticas
- **IA Contextual**: Respostas personalizadas baseadas no nível do usuário
- **Memória Persistente**: Histórico de conversas e preferências no Supabase
- **Progressão Automática**: Sistema de níveis (básico → intermediário → avançado)
- **Sugestões Inteligentes**: Recomendações baseadas no contexto

### 🧠 Recursos Avançados
- **Múltiplas APIs Meteorológicas**: OpenWeatherMap e WeatherAPI
- **Análise Contextual**: ChatGPT processa intenções e contexto
- **Comparação de Cidades**: Compare clima entre diferentes locais
- **Educação Meteorológica**: Explicações adaptadas ao nível do usuário
- **Alertas Personalizados**: Notificações baseadas em preferências

## 🛠️ Tecnologias

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **IA**: OpenAI GPT-3.5-turbo
- **WhatsApp**: Meta Business API
- **Deploy**: Vercel
- **Weather**: OpenWeatherMap + WeatherAPI

## 📋 Pré-requisitos

1. **Node.js** 18+ 
2. **Conta Supabase** (gratuita)
3. **WhatsApp Business API** (Meta for Developers)
4. **OpenAI API Key**
5. **APIs Meteorológicas** (opcionais)

## 🚀 Configuração Rápida

### 1. Clone e Instale
```bash
git clone https://github.com/seu-usuario/temperature-whatsapp-bot
cd temperature-whatsapp-bot
npm install
```

### 2. Configure o Supabase

**2.1. Crie um projeto no [Supabase](https://supabase.com)**

**2.2. Execute o SQL no Editor do Supabase:**
```sql
-- Copie e cole o conteúdo do arquivo database/schema.sql
```

**2.3. Obtenha as credenciais:**
- URL: Settings > API > Project URL
- Service Role Key: Settings > API > service_role (secret key)

### 3. Configure as Variáveis
```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

### 4. Configure WhatsApp Business
1. Acesse [Meta for Developers](https://developers.facebook.com)
2. Crie um app Business
3. Adicione WhatsApp Product
4. Configure webhook: `https://seu-dominio.vercel.app/webhook`
5. Token de verificação: `TEMPBOT2024`

### 5. Deploy no Vercel
```bash
npm install -g vercel
vercel --prod
```

Configure as variáveis de ambiente no painel do Vercel.

## 🔧 Configuração Detalhada

### Variáveis de Ambiente (.env)
```bash
# WhatsApp Business API
WHATSAPP_TOKEN=seu_token_aqui
PHONE_NUMBER_ID=seu_phone_number_id

# OpenAI
OPEN_AI=sua_openai_key

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# Opcionais
OPENWEATHER_API_KEY=sua_key
WEATHERAPI_KEY=sua_key
PORT=3000
```

### Estrutura do Banco (Supabase)
```sql
users (
  id UUID PRIMARY KEY,
  contact VARCHAR(20) UNIQUE,
  preferred_city VARCHAR(100),
  units VARCHAR(20) DEFAULT 'celsius',
  language VARCHAR(10) DEFAULT 'pt',
  notifications BOOLEAN DEFAULT false,
  query_count INTEGER DEFAULT 1,
  expertise_level VARCHAR(20) DEFAULT 'basic',
  conversation_history JSONB DEFAULT '[]',
  weather_preferences JSONB,
  weather_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_access TIMESTAMPTZ DEFAULT NOW()
)
```

## 📊 Migração de Dados

Se você tem dados no `users.json`, migre para o Supabase:

```bash
npm run migrate
```

O script irá:
- Ler dados do `users.json`
- Converter para formato Supabase
- Migrar preservando histórico
- Criar backup automático

## 🎯 Uso

### Comandos do Bot
```
📱 Comandos Básicos:
• "Clima em Maputo"
• "Vai chover amanhã?"
• "Temperatura atual"

🧠 Comandos Intermediários:
• "Compare Maputo e Beira"
• "Previsão para a semana"
• "O que causa a chuva?"

🎓 Comandos Avançados:
• "Análise meteorológica detalhada"
• "Configurar alertas personalizados"
• "Dados históricos de temperatura"
```

### Sistema de Progressão
- **Básico** (0-2 consultas): Linguagem simples, emojis
- **Intermediário** (3-9 consultas): Explicações educativas
- **Avançado** (10+ consultas): Terminologia técnica

## 📈 Monitoramento

### Endpoints de Status
```bash
# Estatísticas do bot
GET /stats

# Health check
GET /health
```

### Logs no Vercel
- Function logs mostram atividade em tempo real
- Supabase Dashboard para análise de dados

## 🐛 Troubleshooting

### Problemas Comuns

**1. Erro de conexão Supabase**
```bash
❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios
```
- Verifique as variáveis no .env
- Confirme que a tabela `users` existe

**2. WhatsApp não responde**
```bash
❌ Error sending message: Request failed with status code 401
```
- Verifique WHATSAPP_TOKEN
- Confirme webhook configurado

**3. OpenAI timeout**
```bash
❌ Erro ao analisar mensagem: timeout
```
- Verifique OPEN_AI key
- Teste conexão com ChatGPT

### Debug Mode
```bash
NODE_ENV=development npm run dev
```

## 🔒 Segurança

- **RLS**: Row Level Security no Supabase (opcional)
- **API Keys**: Nunca exponha no código
- **Rate Limiting**: Implementado no WhatsApp
- **Sanitização**: Dados validados antes do armazenamento

## 📊 Estrutura de Arquivos

```
temperature-whatsapp-bot/
├── index.js                 # Servidor principal
├── database/
│   ├── supabase.js          # Serviço de database
│   └── schema.sql           # Schema das tabelas
├── whatsapp_api/
│   └── connection.js        # API WhatsApp
├── weather_api/
│   └── weather_service.js   # Serviços meteorológicos
├── open_ai/
│   └── open_ai.js           # Integração OpenAI
├── scripts/
│   └── migrate.js           # Script de migração
├── .env.example            # Exemplo de variáveis
└── README.md               # Documentação
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/temperature-whatsapp-bot/issues)
- **Documentação**: Este README
- **Supabase Docs**: [docs.supabase.com](https://docs.supabase.com/)

## 🎉 Créditos

Desenvolvido com ❤️ para a comunidade de desenvolvedores em Moçambique.

---

**⭐ Se este projeto foi útil, deixe uma estrela no GitHub!**