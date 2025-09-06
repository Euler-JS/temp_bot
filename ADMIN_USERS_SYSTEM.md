# Sistema de Gestão de Usuários Administrativos - TempBot

## 🔒 Sistema de Autenticação Implementado

### ✅ Recursos Implementados

- **Autenticação JWT**: Sistema completo de login/logout
- **Proteção de Rotas**: Todas as rotas `/admin/*` são protegidas
- **Gestão de Usuários**: CRUD completo para usuários administrativos
- **Sistema de Permissões**: Controle granular de acesso
- **Auditoria**: Log completo de ações e logins
- **Interface Responsiva**: Dashboard moderno com Bootstrap 5

### 🚀 Como Usar

#### 1. Executar SQL no Supabase

Copie e execute o conteúdo de `database/admin_users.sql` no SQL Editor do Supabase.

#### 2. Iniciar o Servidor

```bash
npm start
```

#### 3. Acessar o Sistema

- **Dashboard**: `http://localhost:3000/admin` (redireciona para login se não autenticado)
- **Login**: `http://localhost:3000/admin/login`

#### 4. Credenciais Padrão

- **Super Admin**: 
  - Usuário: `admin`
  - Senha: `admin123`

- **Moderador**: 
  - Usuário: `moderador` 
  - Senha: `mod123`

### 🔧 Funcionalidades

#### Dashboard Principal
- Estatísticas de usuários do bot
- Gráficos de utilização
- Monitoramento do sistema
- Alertas regionais

#### Gestão de Usuários Admin
- Criar novos usuários administrativos
- Editar permissões e dados
- Visualizar histórico de login
- Log de auditoria completo

#### Sistema de Permissões
- `view_users`: Ver usuários do bot
- `manage_users`: Gerenciar usuários do bot
- `send_alerts`: Enviar alertas regionais
- `view_analytics`: Ver analytics
- `manage_settings`: Gerenciar configurações
- `view_logs`: Ver logs do sistema
- `manage_admins`: Gerenciar usuários administrativos

#### Funções de Usuário
- **Super Admin**: Acesso total
- **Admin**: Acesso completo exceto gestão de admins
- **Moderador**: Foco em alertas e monitoramento

### 🛡️ Segurança

- **JWT Tokens**: Expiração em 8 horas
- **Hash de Senhas**: bcrypt com salt
- **Bloqueio por Tentativas**: 5 tentativas = 15min bloqueado
- **Logs de Auditoria**: Todas as ações são registradas
- **Validação de Sessão**: Verificação automática de tokens

### 📱 Interface

- **Design Responsivo**: Funciona em desktop e mobile
- **Tema Moderno**: Bootstrap 5 com gradientes
- **Notificações**: Alertas em tempo real
- **Charts**: Gráficos interativos com Chart.js

### 🔄 Fluxo de Autenticação

1. Usuário acessa `/admin`
2. Se não autenticado → redireciona para `/admin/login`
3. Login válido → gera JWT token
4. Token armazenado (localStorage/sessionStorage)
5. Todas as requests incluem token no header
6. Backend verifica token em cada request
7. Token inválido/expirado → redireciona para login

### 🗂️ Estrutura de Arquivos

```
admin/
├── login.html              # Página de login
├── index.html              # Dashboard principal  
├── admin.js                 # Lógica do dashboard
├── admin_auth.js            # Serviço de autenticação
└── admin_users_manager.js   # Gestão de usuários admin

database/
└── admin_users.sql          # Schema das tabelas

index.js                     # Rotas protegidas
```

### 🧪 Testar o Sistema

```bash
# Verificar arquivos
node test_auth.js

# Configurar sistema  
node setup_admin.js

# Iniciar servidor
npm start
```

### ⚡ URLs Importantes

- `/admin` - Dashboard (protegido)
- `/admin/login` - Página de login
- `/admin/auth/login` - API de login
- `/admin/auth/logout` - API de logout
- `/admin/auth/verify` - Verificar token
- `/admin/auth/users` - CRUD usuários admin

### 🔍 Próximos Passos

1. Executar SQL no Supabase
2. Testar login com credenciais padrão
3. Criar usuários administrativos adicionais
4. Configurar permissões conforme necessário
5. Personalizar interface se necessário

## ✅ Sistema Completo e Funcional!

O sistema de gestão de usuários administrativos está completamente implementado com autenticação robusta, proteção de rotas, e interface moderna.
