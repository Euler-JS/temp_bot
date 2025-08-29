# 📊 Painel Administrativo - TempBot

## 🎯 Visão Geral

O Painel Administrativo do TempBot é uma interface web completa para monitoramento e gestão do bot de WhatsApp. Oferece insights detalhados sobre usuários, estatísticas de uso, analytics avançados e configurações do sistema.

## 🚀 Como Acessar

1. **Inicie o servidor do bot:**
   ```bash
   npm start
   ```

2. **Acesse o painel:**
   ```
   http://localhost:3000/admin
   ```

## 📋 Funcionalidades

### 🏠 Dashboard Principal
- **Estatísticas em tempo real**: Total de usuários, usuários ativos, consultas realizadas
- **Gráficos interativos**: Consultas por dia, cidades mais consultadas
- **Atividade recente**: Últimas interações dos usuários
- **Status dos serviços**: Database, OpenAI, WhatsApp

### 👥 Gestão de Usuários
- **Lista completa de usuários** com informações mascaradas para privacidade
- **Filtros e busca** por contacto, cidade ou nível de expertise
- **Exportação em CSV** para análise externa
- **Detalhes individuais** de cada usuário

### 📈 Analytics Avançados
- **Distribuição por expertise**: Básico, Intermediário, Avançado
- **Tendências de crescimento**: Gráfico de usuários acumulados
- **Métricas detalhadas**: Consultas por usuário, taxa de retenção
- **Cidades populares**: Ranking das cidades mais consultadas

### 🌤️ Monitoramento Climático
- **Consultas por cidade**: Análise geográfica das consultas
- **Status dos serviços**: Monitoramento de APIs meteorológicas
- **Histórico de consultas**: Tendências de uso por região

### 📝 Logs do Sistema
- **Logs em tempo real**: Eventos do sistema, erros, avisos
- **Filtragem por nível**: Error, Warning, Info, Debug
- **Atualização automática**: Logs atualizados automaticamente

### ⚙️ Configurações
- **Nível de expertise padrão**: Configurar nível inicial dos usuários
- **Progressão automática**: Habilitar/desabilitar evolução automática
- **Status do sistema**: Verificação de conexões e serviços

## 🛠️ Estrutura Técnica

### Arquivos Principais
```
admin/
├── index.html      # Interface principal do painel
├── admin.js        # Lógica JavaScript e interações
└── README.md       # Este arquivo
```

### APIs Utilizadas
```
GET /admin/stats           # Estatísticas gerais
GET /admin/users           # Lista de usuários
GET /admin/analytics       # Analytics avançados
GET /admin/users/:contact  # Detalhes de usuário específico
GET /admin/users/export    # Exportar usuários CSV
GET /admin/logs            # Logs do sistema
POST /admin/settings       # Salvar configurações
GET /health                # Status dos serviços
```

## 📊 Métricas Disponíveis

### Estatísticas Básicas
- **Total de Usuários**: Número total de usuários registrados
- **Usuários Ativos**: Usuários que usaram o bot nos últimos 7 dias
- **Total de Consultas**: Soma de todas as consultas realizadas
- **Usuários com Notificações**: Quantidade com notificações ativadas

### Analytics Avançados
- **Taxa de Retenção**: Percentual de usuários que retornam
- **Consultas por Usuário**: Média de consultas por usuário
- **Tempo de Resposta**: Tempo médio de resposta do sistema
- **Distribuição Geográfica**: Consultas por cidade/região

### Dados Temporais
- **Consultas Diárias**: Gráfico dos últimos 7 dias
- **Crescimento de Usuários**: Tendência dos últimos 30 dias
- **Picos de Uso**: Horários de maior atividade

## 🔐 Segurança e Privacidade

### Proteção de Dados
- **Mascaramento de contactos**: Números de telefone parcialmente ocultos
- **Dados agregados**: Estatísticas sem identificação individual
- **Logs sanitizados**: Informações sensíveis removidas dos logs

### Acesso Restrito
- **Interface local**: Disponível apenas no servidor local
- **Sem autenticação externa**: Requer acesso físico ao servidor
- **Dados temporários**: Informações não persistem no frontend

## 🎨 Interface e Experiência

### Design Responsivo
- **Bootstrap 5**: Framework CSS moderno e responsivo
- **Ícones Bootstrap**: Biblioteca de ícones consistente
- **Charts.js**: Gráficos interativos e animados

### Funcionalidades UX
- **Atualização automática**: Dados atualizados a cada 5 minutos
- **Notificações toast**: Feedback visual das ações
- **Loading states**: Indicadores de carregamento
- **Navegação intuitiva**: Sidebar com seções bem definidas

## 🔄 Atualização de Dados

### Automática
- **Refresh periódico**: A cada 5 minutos automaticamente
- **Botão de atualização**: Atualização manual disponível
- **Status em tempo real**: Última atualização exibida

### Manual
- **Botão principal**: Canto superior direito
- **Botão flutuante**: Canto inferior direito
- **Por seção**: Atualização específica por funcionalidade

## 🐛 Troubleshooting

### Problemas Comuns

**Painel não carrega:**
```bash
# Verificar se o servidor está rodando
npm start
# Verificar porta no console de logs
```

**Dados não aparecem:**
```bash
# Verificar conexão com Supabase
# Verificar variáveis de ambiente
# Consultar logs no console do browser
```

**Gráficos não funcionam:**
```bash
# Limpar cache do browser
# Verificar console para erros JavaScript
# Verificar conectividade com CDNs
```

### Logs de Debug
```javascript
// Abrir console do browser (F12)
// Verificar erros na aba Console
// Verificar requisições na aba Network
```

## 🚀 Melhorias Futuras

### Funcionalidades Planejadas
- [ ] **Autenticação**: Sistema de login para acesso seguro
- [ ] **Alertas**: Notificações para métricas críticas
- [ ] **Relatórios**: Geração de relatórios PDF/Excel
- [ ] **Dashboard personalizado**: Widgets configuráveis
- [ ] **Análise preditiva**: Previsões baseadas em IA
- [ ] **Monitoramento em tempo real**: WebSockets para updates live

### Integrações
- [ ] **Google Analytics**: Tracking avançado de uso
- [ ] **Slack/Teams**: Notificações para administradores
- [ ] **Backup automático**: Scheduled backups
- [ ] **API externa**: Endpoint para integrações

## 📞 Suporte

Para dúvidas ou problemas:

1. **Consulte os logs** no painel ou terminal
2. **Verifique as conexões** na seção Status
3. **Restart o servidor** se necessário
4. **Consulte a documentação** principal do bot

---

**Desenvolvido com ❤️ para o TempBot**

*Painel Administrativo v1.0 - Agosto 2025*
