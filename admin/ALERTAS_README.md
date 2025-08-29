# 🚨 Sistema de Alertas - TempBot Admin

## 📋 Visão Geral

O Sistema de Alertas permite que administradores enviem notificações importantes para usuários do TempBot com base na região que eles consultaram. É uma ferramenta poderosa para comunicação de emergência, avisos meteorológicos e informações importantes.

## 🔐 Segurança

**Senha de Confirmação:** `joana@bot`

Esta senha é obrigatória para confirmar o envio de qualquer alerta, garantindo que apenas administradores autorizados possam enviar mensagens em massa.

## 🎯 Funcionalidades

### 1. Seleção de Região
- **Cidades específicas**: Maputo, Beira, Nampula, Quelimane, Tete, Chimoio, Pemba, Xai-Xai, Lichinga, Inhambane
- **Todos os usuários**: Opção para enviar para toda a base de usuários

### 2. Tipos de Alerta
- 🚨 **Urgente**: Para emergências e situações críticas
- ⚠️ **Aviso Importante**: Para alertas que requerem atenção
- ℹ️ **Informação**: Para comunicados gerais
- 🌩️ **Alerta Meteorológico**: Para condições climáticas extremas
- 🛡️ **Segurança**: Para questões de segurança pública

### 3. Personalização da Mensagem
- **Título**: Até 100 caracteres
- **Mensagem**: Até 1000 caracteres
- **Dados meteorológicos**: Opção de incluir condições atuais da região
- **Visualização**: Preview antes do envio

## 📱 Como Usar

### Passo 1: Acessar o Painel
```
http://localhost:3000/admin
```
1. Clique na seção "Alertas" na barra lateral
2. A página do sistema de alertas será carregada

### Passo 2: Configurar o Alerta
1. **Selecione a região**: Escolha a cidade ou "Todos os usuários"
2. **Escolha o tipo**: Selecione o tipo de alerta apropriado
3. **Digite o título**: Máximo 100 caracteres
4. **Escreva a mensagem**: Máximo 1000 caracteres
5. **Opcionalmente**: Marque para incluir dados meteorológicos

### Passo 3: Visualizar e Confirmar
1. Clique em **"Visualizar"** para ver como ficará a mensagem
2. Verifique o número de usuários que receberão o alerta
3. Digite a senha: `joana@bot`
4. Clique em **"Enviar Alerta"**

## 📊 Estatísticas em Tempo Real

### Painel de Usuários por Região
- Mostra quantos usuários há em cada região
- Atualizado automaticamente
- Ajuda a estimar o alcance do alerta

### Contagem Dinâmica
- Ao selecionar uma região, mostra quantos usuários receberão o alerta
- Útil para planejamento e validação

## 🔍 Exemplos de Uso

### Alerta Meteorológico Urgente
```
Tipo: 🌩️ Alerta Meteorológico
Título: Ciclone Tropical Aproximando-se de Beira
Região: Beira
Mensagem: ATENÇÃO! Ciclone tropical categoria 3 aproximando-se da região da Beira. 
Ventos de até 150km/h previstos para as próximas 6 horas. EVACUEM áreas baixas 
IMEDIATAMENTE. Procurem abrigos seguros. Evitem sair de casa.
Incluir dados meteorológicos: ✅
```

### Aviso de Segurança
```
Tipo: 🛡️ Segurança  
Título: Evitar Zona do Porto - Alagamentos
Região: Maputo
Mensagem: Devido às chuvas intensas, a zona do porto de Maputo está alagada. 
Evitem circular pela área até segunda ordem. Rotas alternativas disponíveis 
pela Av. Julius Nyerere.
Incluir dados meteorológicos: ❌
```

### Informação Geral
```
Tipo: ℹ️ Informação
Título: Novo Sistema de Alertas Ativo
Região: Todos os usuários
Mensagem: O TempBot agora tem um sistema de alertas para situações meteorológicas 
importantes! Vocês receberão avisos automáticos quando houver condições perigosas 
na vossa região. Mantenham-se seguros!
Incluir dados meteorológicos: ❌
```

## 🎨 Como a Mensagem Aparece no WhatsApp

```
🚨 *Ciclone Tropical Aproximando-se de Beira*

ATENÇÃO! Ciclone tropical categoria 3 aproximando-se da região da Beira. 
Ventos de até 150km/h previstos para as próximas 6 horas. EVACUEM áreas baixas 
IMEDIATAMENTE. Procurem abrigos seguros. Evitem sair de casa.

🌤️ *Condições atuais em Beira:*
🌡️ 28°C
💧 85% umidade
☀️ Nuvens carregadas, vento forte

---
_Alerta enviado pela Joana Bot - 29/08/2025, 14:30:25_
```

## 📈 Métricas e Relatórios

### Durante o Envio
- Contador em tempo real de mensagens enviadas
- Indicador de progresso
- Relatório de erros, se houver

### Após o Envio
- Total de usuários que receberam o alerta
- Número de erros de entrega
- Confirmação de sucesso

### Histórico (Futuro)
- Lista de alertas enviados recentemente
- Estatísticas de engajamento
- Análise de eficácia

## ⚠️ Boas Práticas

### 📝 Escrita de Mensagens
1. **Seja claro e direto**: Use linguagem simples e objetiva
2. **Inclua ações específicas**: Diga exatamente o que fazer
3. **Use emojis apropriados**: Ajudam a transmitir urgência
4. **Mantenha o tom local**: Use português moçambicano quando apropriado

### 🎯 Segmentação
1. **Use regiões específicas**: Evite spam enviando para quem não precisa
2. **Considere o timing**: Evite horários inadequados
3. **Verifique a relevância**: Certifique-se de que o alerta é necessário

### 🔒 Segurança
1. **Proteja a senha**: Nunca compartilhe `joana@bot`
2. **Dupla verificação**: Sempre use o preview antes de enviar
3. **Registre as ações**: Mantenha log do que foi enviado e quando

## 🛠️ Aspectos Técnicos

### API Endpoints
```
POST /admin/send-alert        # Enviar alerta
GET  /admin/region-stats      # Estatísticas por região  
GET  /admin/region-users/:id  # Usuários de uma região
GET  /admin/weather/:region   # Dados meteorológicos
GET  /admin/recent-alerts     # Histórico de alertas
```

### Validações
- Verificação de senha obrigatória
- Limites de caracteres respeitados
- Validação de região existente
- Confirmação de usuários válidos

### Rate Limiting
- Delay automático entre envios para grandes volumes
- Proteção contra sobrecarga da API do WhatsApp
- Gestão de erros e retry automático

## 🚨 Situações de Emergência

### Uso Prioritário
O sistema de alertas deve ser usado prioritariamente para:
1. **Emergências meteorológicas**: Ciclones, cheias, secas extremas
2. **Alertas de segurança**: Zonas perigosas, evacuações
3. **Informações críticas**: Mudanças nos serviços, atualizações importantes

### Protocolo de Emergência
1. **Avalie a situação**: É realmente urgente?
2. **Selecione a região afetada**: Seja específico
3. **Escreva mensagem clara**: Inclua ações específicas
4. **Use tipo "Urgente"**: Para verdadeiras emergências
5. **Inclua dados meteorológicos**: Se relevante
6. **Envie imediatamente**: Não demore em emergências

## 💡 Melhorias Futuras

### Planejadas
- [ ] **Agendamento**: Programar alertas para horários específicos
- [ ] **Templates**: Modelos pré-definidos para situações comuns
- [ ] **Histórico completo**: Banco de dados de todos os alertas
- [ ] **Analytics**: Métricas de abertura e engajamento
- [ ] **Integração INGC**: Alertas automáticos baseados em dados oficiais
- [ ] **Multi-idioma**: Suporte para diferentes idiomas
- [ ] **Geolocalização**: Alertas baseados em localização GPS

### Integrações Possíveis
- [ ] **Sistema Nacional de Alertas**: Integração com INGC
- [ ] **Redes Sociais**: Publicação automática em redes sociais
- [ ] **SMS**: Backup via SMS para situações críticas
- [ ] **Email**: Cópia para administradores

---

**🔒 Sistema Seguro • 🚀 Desenvolvido para TempBot • ⚡ Resposta Rápida em Emergências**
