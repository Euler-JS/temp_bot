# 🚀 Configuração do Painel Administrativo - TempBot

## 📋 Passo a Passo Completo

### 1. 🗄️ Configurar Tabelas no Supabase

Primeiro, é necessário criar as tabelas administrativas no banco de dados:

```bash
# Criar tabelas administrativas
npm run setup:admin

# Ou criar tabelas COM dados de teste
npm run setup:admin:seed
```

**Alternativamente**, execute o SQL diretamente no Supabase:
1. Acesse o painel do Supabase
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo `database/admin_tables.sql`

### 2. 🔧 Verificar Configurações

Certifique-se de que o arquivo `.env` está configurado:

```env
# Supabase (obrigatório)
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# OpenAI (obrigatório)
OPEN_AI=sua_chave_openai

# WhatsApp (obrigatório)
WHATSAPP_TOKEN=seu_token_whatsapp
PHONE_NUMBER_ID=seu_phone_number_id

# Configurações opcionais do bot
DEFAULT_EXPERTISE_LEVEL=basic
ENABLE_EXPERTISE_PROGRESSION=true
```

### 3. 🚀 Iniciar o Servidor

```bash
# Instalar dependências (se necessário)
npm install

# Iniciar o servidor
npm start
```

### 4. 🌐 Acessar o Painel

Abra o navegador e acesse:
```
http://localhost:3000/admin
```

### 5. 🧪 Testar o Painel (Opcional)

```bash
# Teste básico
npm run test:admin

# Teste com análise de performance
npm run test:admin:performance
```

## 📊 Funcionalidades Disponíveis

### 🏠 Dashboard Principal
- ✅ Estatísticas em tempo real
- ✅ Gráficos de consultas diárias
- ✅ Cidades mais consultadas
- ✅ Atividade recente dos usuários

### 👥 Gestão de Usuários
- ✅ Lista completa de usuários
- ✅ Busca e filtros
- ✅ Exportação para CSV
- ✅ Dados mascarados para privacidade

### 📈 Analytics Avançados
- ✅ Distribuição por expertise
- ✅ Tendências de crescimento
- ✅ Métricas detalhadas
- ✅ Análise geográfica

### 🌤️ Monitoramento Climático
- ✅ Consultas por cidade
- ✅ Status dos serviços
- ✅ Histórico de consultas

### 📢 Sistema de Alertas
- ✅ **Envio de alertas por região**
- ✅ **Autenticação por senha: `joana@bot`**
- ✅ **Usuários por região em tempo real**
- ✅ **Histórico de alertas enviados**
- ✅ Diferentes tipos de alerta
- ✅ Inclusão de dados meteorológicos
- ✅ Rastreamento de entregas

### 📝 Logs do Sistema
- ✅ Logs em tempo real
- ✅ Filtragem por nível
- ✅ Histórico de eventos

### ⚙️ Configurações
- ✅ Configurações do bot
- ✅ Status do sistema
- ✅ Verificação de conexões

## 🔐 Sistema de Alertas - Detalhes

### Como Enviar Alertas

1. **Acesse a seção "Alertas"** no painel
2. **Selecione a região** (cidade específica ou "Todos")
3. **Escolha o tipo** de alerta:
   - 🚨 **Urgente**: Para emergências
   - ⚠️ **Aviso**: Para alertas importantes
   - ℹ️ **Informação**: Para comunicados gerais
   - 🌩️ **Meteorológico**: Para alertas de clima
   - 🛡️ **Segurança**: Para questões de segurança

4. **Preencha título e mensagem**
5. **Marque "Incluir dados meteorológicos"** se necessário
6. **Digite a senha**: `joana@bot`
7. **Clique em "Enviar Alerta"**

### Recursos do Sistema de Alertas

- **✅ Usuários por Região**: Veja quantos usuários existem em cada cidade
- **✅ Alertas Recentes**: Histórico completo com status de entrega
- **✅ Rastreamento**: Acompanhe quantos alertas foram entregues
- **✅ Logs Detalhados**: Cada envio é registrado nos logs
- **✅ Dados Meteorológicos**: Incluir condições atuais automaticamente

## 🛠️ Resolução de Problemas

### Problema: "Nenhum usuário por região"

**Solução:**
```bash
# 1. Verificar se as tabelas foram criadas
npm run setup:admin

# 2. Verificar se há usuários no sistema
# Acesse Supabase > Editor SQL > Execute:
SELECT COUNT(*) FROM users;

# 3. Verificar se a view foi criada
SELECT * FROM users_by_region LIMIT 5;
```

### Problema: "Alertas recentes não aparecem"

**Solução:**
```bash
# 1. Verificar se a tabela existe
# Acesse Supabase > Editor SQL > Execute:
SELECT COUNT(*) FROM admin_alerts;

# 2. Inserir alerta de teste
INSERT INTO admin_alerts (title, message, alert_type, target_region) 
VALUES ('Teste', 'Alerta de teste', 'informacao', 'all');
```

### Problema: "Erro ao conectar com Supabase"

**Verificações:**
1. ✅ `SUPABASE_URL` está correto no `.env`
2. ✅ `SUPABASE_SERVICE_ROLE_KEY` está correto no `.env`
3. ✅ As tabelas foram criadas: `npm run setup:admin`
4. ✅ O Supabase está acessível

### Problema: "Painel não carrega"

**Verificações:**
1. ✅ Servidor está rodando: `npm start`
2. ✅ Porta 3000 está livre
3. ✅ Arquivo `admin/index.html` existe
4. ✅ Console do browser não mostra erros

## 📱 Testando o Sistema Completo

### 1. Testar Envio de Alerta

```bash
# 1. Certifique-se de que há usuários
# 2. Acesse http://localhost:3000/admin
# 3. Vá para seção "Alertas"
# 4. Tente enviar um alerta de teste:
#    - Região: "all"
#    - Tipo: "informacao"
#    - Título: "Teste do Sistema"
#    - Mensagem: "Este é um teste"
#    - Senha: "joana@bot"
```

### 2. Verificar Logs

```bash
# Após enviar o alerta, verifique:
# 1. Seção "Logs" no painel
# 2. Console do servidor
# 3. Tabela admin_logs no Supabase
```

## 🔄 Manutenção

### Limpeza Automática

O sistema inclui função de limpeza automática:

```sql
-- Executar mensalmente no Supabase
SELECT cleanup_old_logs();
```

### Backup de Alertas

```sql
-- Backup dos últimos 30 dias
SELECT * FROM recent_alerts_summary;
```

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** do servidor
2. **Consulte o console** do navegador (F12)
3. **Execute os testes**: `npm run test:admin`
4. **Verifique as tabelas** no Supabase
5. **Reinicie o servidor** se necessário

---

**✅ Sistema de Alertas Configurado e Funcionando!**

*Painel Administrativo TempBot v2.0 - Sistema de Alertas Ativo*
