# 📢 Rota /info - Sistema de Envio em Massa

## 📋 Descrição
A rota `/info` permite enviar mensagens para todos os usuários cadastrados no TempBot, incluindo automaticamente as informações meteorológicas de cada localização dos usuários.

## 🎯 Funcionalidades

### ✅ O que a rota faz:
- Busca todos os usuários cadastrados no sistema
- Para cada usuário, obtém a temperatura e condições meteorológicas da sua cidade preferida
- Envia uma mensagem personalizada + dados meteorológicos via WhatsApp
- Retorna estatísticas completas do envio

### 📊 Dados incluídos automaticamente:
- 🌡️ Temperatura atual
- 💧 Umidade 
- 📝 Condições climáticas
- 🌡️ Sensação térmica (se disponível)
- 🏙️ Nome da cidade

## 🚀 Como Usar

### 1. Via cURL (Terminal)
```bash
# Envio básico com dados meteorológicos
curl -X POST http://localhost:3000/info \
  -H "Content-Type: application/json" \
  -d '{
    "message": "🎉 Olá! Como está o tempo na sua região hoje?",
    "includeWeather": true
  }'

# Envio sem dados meteorológicos
curl -X POST http://localhost:3000/info \
  -H "Content-Type: application/json" \
  -d '{
    "message": "📢 Aviso importante do TempBot!",
    "includeWeather": false
  }'

# Apenas dados meteorológicos (sem mensagem personalizada)
curl -X POST http://localhost:3000/info \
  -H "Content-Type: application/json" \
  -d '{
    "includeWeather": true
  }'
```

### 2. Via JavaScript/Node.js
```javascript
const axios = require('axios');

async function sendMassMessage() {
    try {
        const response = await axios.post('http://localhost:3000/info', {
            message: '🌤️ Previsão especial do TempBot para você!',
            includeWeather: true
        });
        
        console.log('✅ Mensagens enviadas:', response.data.data.sentCount);
        console.log('📊 Total usuários:', response.data.data.totalUsers);
        console.log('📈 Taxa sucesso:', response.data.data.successRate);
    } catch (error) {
        console.error('❌ Erro:', error.response?.data || error.message);
    }
}

sendMassMessage();
```

### 3. Via Postman/Insomnia
```
POST http://localhost:3000/info
Content-Type: application/json

{
    "message": "Sua mensagem personalizada aqui",
    "includeWeather": true,
    "adminKey": "chave_opcional"
}
```

## 📋 Parâmetros da Rota

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `message` | string | ❌ | Mensagem personalizada a ser enviada |
| `includeWeather` | boolean | ❌ | Se deve incluir dados meteorológicos (padrão: true) |
| `adminKey` | string | ❌ | Chave de segurança opcional |

## 📊 Resposta da API

### ✅ Sucesso (200)
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "sentCount": 147,
    "errorCount": 3,
    "successRate": "98.0%",
    "includeWeather": true,
    "message": "Mensagem enviada para 147 de 150 usuários",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "details": [
    {
      "contact": "258*****",
      "city": "Maputo",
      "status": "sent"
    }
  ]
}
```

### ❌ Erro (500)
```json
{
  "success": false,
  "error": "Erro interno do servidor",
  "details": "Mensagem de erro específica"
}
```

## 📝 Exemplo de Mensagem Enviada

```
🎉 Olá! Como está o tempo na sua região hoje?

🌤️ Tempo atual em Maputo:
🌡️ Temperatura: 28°C
💧 Umidade: 65%
📝 Condições: Parcialmente nublado
🌡️ Sensação térmica: 31°C

---
Mensagem enviada pela Joana Bot - 15/01/2024 10:30:00
```

## 🛡️ Segurança

### Chave de Administrador (Opcional)
Você pode adicionar uma chave de segurança no arquivo `.env`:
```env
ADMIN_KEY=sua_chave_secreta_aqui
```

Depois use na requisição:
```json
{
    "message": "Mensagem administrativa",
    "adminKey": "sua_chave_secreta_aqui"
}
```

## 🧪 Testar a Rota

### 1. Execute o arquivo de teste
```bash
node test_info_route.js
```

### 2. Ou teste manualmente
```bash
# Certifique-se que o servidor está rodando
npm start

# Em outro terminal, execute o teste
curl -X POST http://localhost:3000/info \
  -H "Content-Type: application/json" \
  -d '{"message": "Teste!", "includeWeather": true}'
```

## ⚙️ Configurações Internas

### Limitações de Rate
- Delay automático de 200ms entre mensagens (para grupos grandes)
- Proteção contra sobrecarga da API do WhatsApp

### Tratamento de Erros
- Continua enviando mesmo se houver falhas individuais
- Log detalhado de sucessos e erros
- Retorna estatísticas completas

### Cidades Suportadas
- Maputo, Beira, Nampula, Quelimane, Tete, Chimoio, Pemba, Xai-Xai, Lichinga, Inhambane
- Fallback para "Maputo" se cidade não definida

## 🔧 Troubleshooting

### Problema: "Nenhum usuário encontrado"
- Verifique se há usuários na base de dados
- Confirme conexão com Supabase

### Problema: "Erro ao buscar clima"
- Verifique API key do serviço meteorológico
- Confirme conectividade à internet

### Problema: "Erro ao enviar WhatsApp"
- Verifique token do WhatsApp
- Confirme phone_number_id

## 📈 Monitoramento

Os logs da rota incluem:
- ✅ Número total de usuários
- ✅ Sucessos e erros de envio
- ✅ Taxa de sucesso geral
- ✅ Cidades processadas
- ✅ Tempo de execução

## 💡 Dicas de Uso

1. **Mensagens Curtas**: WhatsApp tem limite de caracteres
2. **Horários Apropriados**: Evite horários muito tarde/cedo
3. **Frequência**: Não abuse do envio em massa
4. **Teste Primeiro**: Use com poucos usuários antes de envio geral
5. **Monitor Logs**: Acompanhe os resultados no console
