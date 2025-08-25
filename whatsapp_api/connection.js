// whatsapp_api/connection.js - Adaptado para Temperature Bot
require('dotenv').config();
const axios = require("axios");


class WhatsAppApi {
    constructor(token, phoneNumberID) {
        this.token = token;
        this.phoneNumberID = phoneNumberID;
        this.tokenExpirationTime = null;
        this.isRefreshing = false;
        this.refreshPromise = null;
        // console.log('WhatsAppApi initialized with token:', this.token, 'and phoneNumberID:', this.phoneNumberID);
    }

    // ===============================================
    // SISTEMA DE RENOVAÇÃO AUTOMÁTICA DO TOKEN
    // ===============================================

    // Método para atualizar o token
    updateToken(newToken) {
        this.token = newToken;
        this.tokenExpirationTime = Date.now() + (60 * 60 * 1000); // 1 hora
        console.log('✅ Token atualizado com sucesso');
    }

    // Detecta se o token expirou baseado na resposta da API
    isTokenExpired(error) {
        if (!error || !error.response) return false;

        const status = error.response.status;
        const data = error.response.data;

        // Códigos de erro que indicam token expirado/inválido
        const expiredErrorCodes = [401, 403];
        const expiredMessages = [
            'invalid access token',
            'access token has expired',
            'token is invalid',
            'authentication failed'
        ];

        if (expiredErrorCodes.includes(status)) return true;

        if (data && typeof data === 'object') {
            const errorMessage = JSON.stringify(data).toLowerCase();
            return expiredMessages.some(msg => errorMessage.includes(msg));
        }

        return false;
    }

    // Renovar token usando Facebook Graph API
    async renewToken() {
        if (this.isRefreshing) {
            // Se já está renovando, aguarda a renovação atual
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        console.log('🔄 Iniciando renovação do token...');

        this.refreshPromise = this._performTokenRenewal();

        try {
            const result = await this.refreshPromise;
            return result;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    }

    async _performTokenRenewal() {
        try {
            const appId = process.env.FACEBOOK_APP_ID;
            const appSecret = process.env.FACEBOOK_APP_SECRET;

            console.log('🔍 Verificando configurações de renovação...');
            console.log('📱 App ID disponível:', appId ? '✅' : '❌');
            console.log('🔐 App Secret disponível:', appSecret ? '✅' : '❌');
            console.log('🔄 Refresh Token disponível:', process.env.FACEBOOK_REFRESH_TOKEN ? '✅' : '❌');

            if (!appId || !appSecret) {
                throw new Error('Facebook App ID e App Secret são necessários para renovar o token. Configure FACEBOOK_APP_ID e FACEBOOK_APP_SECRET no .env');
            }

            // Método 1: Usar refresh token se disponível
            if (process.env.FACEBOOK_REFRESH_TOKEN) {
                console.log('🔄 Tentando renovar com refresh token...');
                const newToken = await this._renewWithRefreshToken(appId, appSecret);
                if (newToken) {
                    this.updateToken(newToken);
                    return newToken;
                }
            }

            // Método 2: Trocar token de curta duração por longa duração
            console.log('🔄 Tentando estender token de longa duração...');
            const extendedToken = await this._extendAccessToken(appId, appSecret);
            if (extendedToken) {
                this.updateToken(extendedToken);
                return extendedToken;
            }

            throw new Error('Não foi possível renovar o token automaticamente');

        } catch (error) {
            console.error('❌ Erro ao renovar token:', error.message);
            throw error;
        }
    }

    async _renewWithRefreshToken(appId, appSecret) {
        try {
            const response = await axios.post('https://graph.facebook.com/oauth/access_token', {
                grant_type: 'refresh_token',
                refresh_token: process.env.FACEBOOK_REFRESH_TOKEN,
                client_id: appId,
                client_secret: appSecret
            });

            return response.data.access_token;
        } catch (error) {
            console.log('⚠️ Renovação com refresh token falhou:', error.message);
            return null;
        }
    }

    async _extendAccessToken(appId, appSecret) {
        try {
            const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: appId,
                    client_secret: appSecret,
                    fb_exchange_token: this.token
                }
            });

            return response.data.access_token;
        } catch (error) {
            console.log('⚠️ Extensão do token falhou:', error.message);

            // Log adicional para debug
            if (error.response) {
                console.log('📊 Status da resposta:', error.response.status);
                console.log('📄 Dados da resposta:', JSON.stringify(error.response.data, null, 2));
            }

            return null;
        }
    }

    // Wrapper para requisições com renovação automática
    async makeAuthenticatedRequest(requestFn) {
        try {
            return await requestFn();
        } catch (error) {
            if (this.isTokenExpired(error)) {
                console.log('🔄 Token expirado detectado, tentando renovar...');

                try {
                    await this.renewToken();
                    console.log('✅ Token renovado com sucesso, tentando novamente...');
                    return await requestFn();
                } catch (renewError) {
                    console.error('❌ Falha na renovação automática:', renewError.message);
                    console.log('⚠️ Continuando com token atual. Verifique as configurações do Facebook App.');

                    // Em vez de falhar completamente, tenta enviar com o token atual
                    // e retorna um erro mais informativo
                    throw new Error(`Token possivelmente expirado. Verifique o token manualmente. Erro original: ${error.message}`);
                }
            }
            throw error;
        }
    }

    // Método alternativo que tenta enviar sem renovação automática
    async sendMessageWithoutAutoRenewal(mensagem, numeroCelular) {
        try {
            const response = await axios.post(
                `https://graph.facebook.com/v21.0/${this.phoneNumberID}/messages`,
                {
                    messaging_product: "whatsapp",
                    to: numeroCelular,
                    text: { body: mensagem }
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            console.log('✅ Mensagem enviada com sucesso (sem renovação automática)');
            return response.data;
        } catch (error) {
            console.log('❌ Falha ao enviar mensagem:', error.message);
            throw error;
        }
    }

    // Método principal para enviar mensagens de texto
    async enviarMensagemUsandoWhatsappAPI(mensagem, numeroCelular) {
        console.log('Enviando mensagem:', mensagem, 'para:', numeroCelular);

        if (!mensagem?.messaging_product) {
            mensagem = {
                messaging_product: 'whatsapp',
                to: numeroCelular,
                text: {
                    body: mensagem.replace(/<\/?[^>]+(>|$)/g, "")
                }
            }
        }

        const messageData = mensagem;

        try {
            return await this.makeAuthenticatedRequest(async () => {
                const response = await axios.post(
                    `https://graph.facebook.com/v19.0/${this.phoneNumberID}/messages`,
                    messageData,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                console.log('Message sent successfully:', response.data);
                return response.data;
            });
        } catch (error) {
            // Se a renovação automática falhar, tenta enviar direto
            if (error.message.includes('Token possivelmente expirado')) {
                console.log('⚠️ Tentando enviar mensagem sem renovação automática...');
                try {
                    return await this.sendMessageWithoutAutoRenewal(
                        typeof mensagem === 'string' ? mensagem : mensagem.text.body,
                        numeroCelular
                    );
                } catch (fallbackError) {
                    console.log('❌ Fallback também falhou:', fallbackError.message);
                    throw new Error(`Falha ao enviar mensagem. Verifique se o token WhatsApp está válido. Erro: ${fallbackError.message}`);
                }
            }
            throw error;
        }
    }

    // Método para enviar templates (útil para mensagens de boas-vindas)
    async enviarMensagemUsandoTemplateWhatsappAPI(templateName, numeroCelular, language = 'pt_BR') {
        const messageData = {
            messaging_product: "whatsapp",
            to: numeroCelular,
            type: "template",
            template: {
                name: templateName,
                language: {
                    code: language
                }
            }
        };

        return await this.makeAuthenticatedRequest(async () => {
            const response = await axios.post(
                `https://graph.facebook.com/v19.0/${this.phoneNumberID}/messages`,
                messageData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log("Template message sent successfully:", response.data);
            return response.data;
        });
    }

    // Método principal para enviar mensagens interativas
    async enviarMensagemInterativaUsandoWhatsappAPI(mensagemInterativa) {
        return await this.makeAuthenticatedRequest(async () => {
            const response = await axios.post(
                `https://graph.facebook.com/v19.0/${this.phoneNumberID}/messages`,
                mensagemInterativa,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('Interactive message sent successfully:', response.data);
            return response.data;
        });
    }

    // **NOVO** - Menu de configurações do Temperature Bot
    async enviarMenuConfiguracoes(numeroCelular, usuario = {}) {
        const configMenu = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "list",
                header: {
                    type: "text",
                    text: "⚙️ Configurações"
                },
                body: {
                    text: "Configure suas preferências do bot de temperatura:"
                },
                footer: {
                    text: "Selecione uma opção"
                },
                action: {
                    button: "Configurar",
                    sections: [
                        {
                            title: "Preferências Gerais",
                            rows: [
                                {
                                    id: "set_city",
                                    title: "Cidade Padrão",
                                    description: `Atual: ${usuario?.preferredCity || 'Não definida'}`
                                },
                                {
                                    id: "set_units",
                                    title: "Unidade de Temperatura",
                                    description: `Atual: ${usuario?.units === 'fahrenheit' ? 'Fahrenheit' : 'Celsius'}`
                                },
                                {
                                    id: "set_language",
                                    title: "Idioma",
                                    description: `Atual: ${usuario?.language === 'en' ? 'English' : 'Português'}`
                                }
                            ]
                        },
                        {
                            title: "Notificações",
                            rows: [
                                {
                                    id: "toggle_notifications",
                                    title: "Alertas de Clima",
                                    description: `${usuario?.notifications ? 'Ativado' : 'Desativado'}`
                                }
                            ]
                        }
                    ]
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(configMenu);
    }

    // **NOVO** - Menu de seleção de unidades de temperatura
    async enviarMenuUnidades(numeroCelular) {
        const unitsMenu = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "button",
                header: {
                    type: "text",
                    text: "🌡️ Unidade de Temperatura"
                },
                body: {
                    text: "Escolha sua unidade de temperatura preferida:"
                },
                action: {
                    buttons: [
                        {
                            type: "reply",
                            reply: {
                                id: "units_celsius",
                                title: "Celsius (°C)"
                            }
                        },
                        {
                            type: "reply",
                            reply: {
                                id: "units_fahrenheit",
                                title: "Fahrenheit (°F)"
                            }
                        }
                    ]
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(unitsMenu);
    }

    // **NOVO** - Menu de seleção de idioma
    async enviarMenuIdiomas(numeroCelular) {
        const languageMenu = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "button",
                header: {
                    type: "text",
                    text: "🌍 Selecionar Idioma"
                },
                body: {
                    text: "Choose your preferred language / Escolha seu idioma preferido:"
                },
                action: {
                    buttons: [
                        {
                            type: "reply",
                            reply: {
                                id: "lang_pt",
                                title: "🇧🇷 Português"
                            }
                        },
                        {
                            type: "reply",
                            reply: {
                                id: "lang_en",
                                title: "🇺🇸 English"
                            }
                        }
                    ]
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(languageMenu);
    }

    // **NOVO** - Botões de ação rápida para clima
    async enviarBotoesAcaoRapida(numeroCelular, cidade) {
        const quickActions = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "button",
                header: {
                    type: "text",
                    text: `🌤️ Ações para ${cidade}`
                },
                body: {
                    text: "O que você gostaria de fazer?"
                },
                action: {
                    buttons: [
                        {
                            type: "reply",
                            reply: {
                                id: `forecast_${cidade}`,
                                title: "📅 Previsão 7 dias"
                            }
                        },
                        // {
                        //     type: "reply",
                        //     reply: {
                        //         id: `alerts_${cidade}`,
                        //         title: "🚨 Configurar Alertas"
                        //     }
                        // },
                        // {
                        //     type: "reply",
                        //     reply: {
                        //         id: "share_weather",
                        //         title: "📤 Compartilhar"
                        //     }
                        // }
                    ]
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(quickActions);
    }

    // **NOVO** - Lista de cidades sugeridas
    async enviarListaCidadesSugeridas(numeroCelular, cidades, pais = 'Moçambique') {
        if (!cidades || cidades.length === 0) {
            return await this.enviarMensagemUsandoWhatsappAPI(
                "❌ Nenhuma cidade encontrada. Tente digitar de forma diferente.",
                numeroCelular
            );
        }

        const sections = [
            {
                title: `Cidades em ${pais}`,
                rows: cidades.slice(0, 10).map((city, index) => ({
                    id: `city_${city.name.replace(/\s+/g, '_')}`,
                    title: city.name.length > 24 ? city.name.substring(0, 21) + '...' : city.name,
                    description: `${city.region}, ${city.country}`
                }))
            }
        ];

        const cityMenu = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "list",
                header: {
                    type: "text",
                    text: "🏙️ Selecionar Cidade"
                },
                body: {
                    text: "Encontrei várias cidades. Selecione a correta:"
                },
                footer: {
                    text: "Toque para selecionar"
                },
                action: {
                    button: "Ver Cidades",
                    sections: sections
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(cityMenu);
    }

    // **NOVO** - Menu principal do bot
    async enviarMenuPrincipal(numeroCelular, nomeUsuario = '') {
        const mainMenu = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "button",
                header: {
                    type: "text",
                    text: `🌡️ Temperature Bot${nomeUsuario ? ` - Olá, ${nomeUsuario}!` : ''}`
                },
                body: {
                    text: "Bem-vindo ao seu assistente de clima! O que você gostaria de fazer?"
                },
                action: {
                    buttons: [
                        {
                            type: "reply",
                            reply: {
                                id: "quick_weather",
                                title: "🌤️ Clima Agora"
                            }
                        },
                        {
                            type: "reply",
                            reply: {
                                id: "forecast_7days",
                                title: "📅 Previsão 7 Dias"
                            }
                        },
                        {
                            type: "reply",
                            reply: {
                                id: "settings_menu",
                                title: "⚙️ Configurações"
                            }
                        }
                    ]
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(mainMenu);
    }

    // **ADAPTADO** - Função para enviar conteúdo em partes (para previsões longas)
    async enviarConteudoPorPartes(conteudo, numeroCelular, maxLength = 4000) {
        const partes = [];
        let parteAtual = '';

        const linhas = conteudo.split('\n');

        for (const linha of linhas) {
            if ((parteAtual + linha + '\n').length > maxLength) {
                if (parteAtual) {
                    partes.push(parteAtual.trim());
                    parteAtual = linha + '\n';
                } else {
                    // Linha muito longa, dividir forçadamente
                    partes.push(linha.substring(0, maxLength));
                    parteAtual = linha.substring(maxLength) + '\n';
                }
            } else {
                parteAtual += linha + '\n';
            }
        }

        if (parteAtual.trim()) {
            partes.push(parteAtual.trim());
        }

        // Enviar cada parte com um pequeno delay
        for (let i = 0; i < partes.length; i++) {
            await this.enviarMensagemUsandoWhatsappAPI(partes[i], numeroCelular);

            // Delay entre mensagens para evitar rate limiting
            if (i < partes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // **NOVO** - Enviar mensagem com emoji animado (loading)
    async enviarMensagemCarregamento(numeroCelular, acao = 'Processando') {
        const loadingMessage = `⏳ ${acao}...\n\n_Aguarde um momento_`;
        return await this.enviarMensagemUsandoWhatsappAPI(loadingMessage, numeroCelular);
    }

    // **NOVO** - Enviar erro formatado
    async enviarMensagemErro(numeroCelular, erro, sugestao = '') {
        let errorMessage = `❌ *Ops! Algo deu errado*\n\n`;
        errorMessage += `${erro}\n\n`;

        if (sugestao) {
            errorMessage += `💡 *Sugestão:* ${sugestao}\n\n`;
        }

        errorMessage += `Se o problema persistir, digite */ajuda* para ver os comandos disponíveis.`;

        return await this.enviarMensagemUsandoWhatsappAPI(errorMessage, numeroCelular);
    }

    // **NOVO** - Enviar sucesso formatado
    async enviarMensagemSucesso(numeroCelular, mensagem, emoji = '✅') {
        const successMessage = `${emoji} *Sucesso!*\n\n${mensagem}`;
        return await this.enviarMensagemUsandoWhatsappAPI(successMessage, numeroCelular);
    }

    // **NOVO** - Sugestões inteligentes baseadas no contexto
    async enviarSugestoesInteligentes(numeroCelular, sugestoes, contexto = {}) {
        if (!sugestoes || sugestoes.length === 0) return;

        const { cidade, aspectoClima, nivelUsuario } = contexto;

        const headerText = nivelUsuario === 'advanced' ?
            "🧠 Análises Relacionadas" :
            "💡 Você pode se interessar por";

        const suggestionMenu = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "list",
                header: {
                    type: "text",
                    text: headerText
                },
                body: {
                    text: `Baseado na sua consulta${cidade ? ` sobre ${cidade}` : ''}, aqui estão algumas sugestões:`
                },
                footer: {
                    text: "Toque para explorar"
                },
                action: {
                    button: "Ver Sugestões",
                    sections: [
                        {
                            title: "Sugestões Personalizadas",
                            rows: sugestoes.slice(0, 10).map((sugestao, index) => ({
                                id: `smart_suggestion_${index}`,
                                title: sugestao.length > 24 ? sugestao.substring(0, 21) + '...' : sugestao,
                                description: this.getContextualDescription(sugestao, contexto)
                            }))
                        }
                    ]
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(suggestionMenu);
    }

    // **NOVO** - Botões de ação contextual baseados na expertise do usuário
    async enviarAcoesContextuais(numeroCelular, dados, nivelUsuario = 'basic') {
        const { cidade, temperatura, condicoes } = dados;

        let botoes = [];

        // Botões básicos para todos
        botoes.push({
            type: "reply",
            reply: {
                id: `forecast_${cidade}`,
                title: "📅 Previsão 7 dias"
            }
        });

        // Botões intermediários
        if (nivelUsuario === 'intermediate' || nivelUsuario === 'advanced') {
            botoes.push({
                type: "reply",
                reply: {
                    id: `compare_cities`,
                    title: "⚖️ Comparar Cidades"
                }
            });
        }

        // Botões avançados
        if (nivelUsuario === 'advanced') {
            botoes.push({
                type: "reply",
                reply: {
                    id: `detailed_analysis`,
                    title: "📊 Análise Técnica"
                }
            });
        } else {
            botoes.push({
                type: "reply",
                reply: {
                    id: `weather_tips`,
                    title: "💡 Dicas Práticas"
                }
            });
        }

        const contextualActions = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "button",
                header: {
                    type: "text",
                    text: `🌤️ Ações para ${cidade}`
                },
                body: {
                    text: `${temperatura}°C, ${condicoes}\n\nO que você gostaria de fazer agora?`
                },
                action: {
                    buttons: botoes.slice(0, 3) // WhatsApp permite máximo 3 botões
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(contextualActions);
    }

    // **NOVO** - Menu de comparação de cidades inteligente
    async enviarMenuComparacaoCidades(numeroCelular, cidadeAtual, cidadesSugeridas = []) {
        const sections = [
            {
                title: "Comparar com",
                rows: cidadesSugeridas.slice(0, 8).map((cidade, index) => ({
                    id: `compare_${cidadeAtual}_${cidade.replace(/\s+/g, '_')}`,
                    title: cidade,
                    description: `${cidadeAtual} vs ${cidade}`
                }))
            }
        ];

        // Adicionar opção personalizada
        sections[0].rows.push({
            id: "compare_custom",
            title: "Outra cidade",
            description: "Digite o nome da cidade"
        });

        const comparisonMenu = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "list",
                header: {
                    type: "text",
                    text: "⚖️ Comparação Climática"
                },
                body: {
                    text: `Com qual cidade você gostaria de comparar ${cidadeAtual}?`
                },
                footer: {
                    text: "Selecione uma opção"
                },
                action: {
                    button: "Comparar",
                    sections: sections
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(comparisonMenu);
    }

    // **NOVO** - Alertas personalizados baseados no perfil
    async enviarAlertaPersonalizado(numeroCelular, tipoAlerta, dados, perfilUsuario = {}) {
        const { nivelUsuario, preferencias } = perfilUsuario;
        let emoji, titulo, mensagem;

        switch (tipoAlerta) {
            case 'chuva_iminente':
                emoji = '🌧️';
                titulo = 'Alerta de Chuva';
                mensagem = nivelUsuario === 'advanced' ?
                    `Probabilidade de precipitação >80% nas próximas 2h em ${dados.cidade}. Sistema de baixa pressão aproximando-se.` :
                    `Vai chover em breve em ${dados.cidade}! Leve guarda-chuva se for sair.`;
                break;

            case 'temperatura_extrema':
                emoji = dados.temperatura > 35 ? '🔥' : '🧊';
                titulo = dados.temperatura > 35 ? 'Calor Extremo' : 'Frio Intenso';
                mensagem = nivelUsuario === 'advanced' ?
                    `Temperatura ${dados.temperatura}°C (${dados.temperatura > 35 ? 'acima' : 'abaixo'} da média histórica). Índice UV elevado.` :
                    `${dados.temperatura > 35 ? 'Muito calor' : 'Muito frio'} hoje em ${dados.cidade}! ${dados.temperatura > 35 ? 'Beba água e procure sombra' : 'Vista-se bem aquecido'}.`;
                break;

            case 'vento_forte':
                emoji = '💨';
                titulo = 'Alerta de Vento';
                mensagem = `Ventos fortes previstos para ${dados.cidade}. ${nivelUsuario === 'advanced' ? `Velocidade: ${dados.velocidadeVento}km/h.` : 'Cuidado com objetos soltos!'}`;
                break;
        }

        const alertMessage = `${emoji} *${titulo}*\n\n${mensagem}\n\n⏰ ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        return await this.enviarMensagemUsandoWhatsappAPI(alertMessage, numeroCelular);
    }

    // **NOVO** - Resumo semanal inteligente
    async enviarResumoSemanal(numeroCelular, dadosSemana, nivelUsuario = 'basic') {
        const { cidade, temperaturaMedia, diasChuva, melhorDia, piorDia } = dadosSemana;

        let resumo = `📊 *Resumo Semanal - ${cidade}*\n\n`;

        if (nivelUsuario === 'basic') {
            resumo += `🌡️ Temperatura média: ${temperaturaMedia}°C\n`;
            resumo += `☔ Dias com chuva: ${diasChuva}\n`;
            resumo += `✨ Melhor dia: ${melhorDia.dia} (${melhorDia.temperatura}°C)\n`;
            resumo += `😔 Pior dia: ${piorDia.dia} (${piorDia.condicoes})\n\n`;
            resumo += `💡 *Dica da semana:* ${this.gerarDicaSemanal(dadosSemana)}`;
        } else if (nivelUsuario === 'intermediate') {
            resumo += `📈 *Análise da Semana:*\n`;
            resumo += `• Temperatura: ${temperaturaMedia}°C (variação: ${dadosSemana.variacao}°C)\n`;
            resumo += `• Precipitação: ${diasChuva} dias, ${dadosSemana.totalChuva}mm\n`;
            resumo += `• Umidade média: ${dadosSemana.umidadeMedia}%\n\n`;
            resumo += `🎯 *Tendência:* ${dadosSemana.tendencia}\n`;
            resumo += `🔮 *Próxima semana:* ${dadosSemana.previsaoProxima}`;
        } else {
            resumo += `📊 *Análise Meteorológica Detalhada:*\n\n`;
            resumo += `🌡️ Temperatura: ${temperaturaMedia}°C (δ: ${dadosSemana.desvio}°C)\n`;
            resumo += `💧 Precipitação acumulada: ${dadosSemana.totalChuva}mm\n`;
            resumo += `💨 Vento médio: ${dadosSemana.ventoMedio}km/h\n`;
            resumo += `🌀 Pressão média: ${dadosSemana.pressaoMedia}hPa\n\n`;
            resumo += `📈 *Padrões identificados:*\n${dadosSemana.padroes.join('\n')}\n\n`;
            resumo += `🔬 *Análise sinóptica:* ${dadosSemana.analiseSinoptica}`;
        }

        return await this.enviarMensagemUsandoWhatsappAPI(resumo, numeroCelular);
    }

    // **NOVO** - Quiz educativo meteorológico
    async enviarQuizEducativo(numeroCelular, nivelDificuldade = 'basic') {
        const quizzes = {
            basic: {
                pergunta: "🤔 *Quiz do Clima*\n\nO que causa a chuva?",
                opcoes: [
                    { id: "quiz_a", title: "A) Nuvens pesadas" },
                    { id: "quiz_b", title: "B) Evaporação da água" }, // Correto
                    { id: "quiz_c", title: "C) Vento forte" }
                ]
            },
            intermediate: {
                pergunta: "🧠 *Quiz Meteorológico*\n\nQual é a principal causa da formação de ciclones tropicais?",
                opcoes: [
                    { id: "quiz_a", title: "A) Temperatura oceânica >26°C" }, // Correto
                    { id: "quiz_b", title: "B) Ventos alísios" },
                    { id: "quiz_c", title: "C) Baixa umidade" }
                ]
            },
            advanced: {
                pergunta: "🎓 *Quiz Avançado*\n\nO efeito Coriolis é mais intenso em qual latitude?",
                opcoes: [
                    { id: "quiz_a", title: "A) Equador (0°)" },
                    { id: "quiz_b", title: "B) Pólos (90°)" }, // Correto
                    { id: "quiz_c", title: "C) Trópicos (23°)" }
                ]
            }
        };

        const quiz = quizzes[nivelDificuldade];

        const quizMenu = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "button",
                header: {
                    type: "text",
                    text: "🎯 Quiz Meteorológico"
                },
                body: {
                    text: quiz.pergunta
                },
                action: {
                    buttons: quiz.opcoes
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(quizMenu);
    }

    // **NOVO** - Configurações avançadas do usuário
    async enviarMenuConfiguracaoAvancada(numeroCelular, perfilUsuario = {}) {
        const { nivelUsuario, preferencias, notificacoes } = perfilUsuario;

        const configMenu = {
            messaging_product: 'whatsapp',
            recipient_type: "individual",
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "list",
                header: {
                    type: "text",
                    text: "⚙️ Configurações Avançadas"
                },
                body: {
                    text: "Personalize sua experiência meteorológica:"
                },
                footer: {
                    text: "Selecione uma categoria"
                },
                action: {
                    button: "Configurar",
                    sections: [
                        {
                            title: "Personalização",
                            rows: [
                                {
                                    id: "config_expertise",
                                    title: "Nível de Expertise",
                                    description: `Atual: ${nivelUsuario || 'basic'}`
                                },
                                {
                                    id: "config_style",
                                    title: "Estilo de Resposta",
                                    description: `Atual: ${preferencias?.estilo || 'casual'}`
                                },
                                {
                                    id: "config_interests",
                                    title: "Interesses Climáticos",
                                    description: "Personalizar tópicos"
                                }
                            ]
                        },
                        {
                            title: "Notificações Inteligentes",
                            rows: [
                                {
                                    id: "config_alerts",
                                    title: "Alertas Automáticos",
                                    description: `${notificacoes?.alertas ? 'Ativado' : 'Desativado'}`
                                },
                                {
                                    id: "config_schedule",
                                    title: "Horários de Notificação",
                                    description: `${notificacoes?.horario || '08:00'}`
                                },
                                {
                                    id: "config_frequency",
                                    title: "Frequência de Resumos",
                                    description: `${notificacoes?.frequencia || 'Semanal'}`
                                }
                            ]
                        }
                    ]
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(configMenu);
    }

    // **UTILITÁRIOS AUXILIARES**

    getContextualDescription(sugestao, contexto) {
        const { aspectoClima, nivelUsuario } = contexto;

        if (sugestao.includes('previsão')) return 'Ver próximos dias';
        if (sugestao.includes('comparar')) return 'Análise comparativa';
        if (sugestao.includes('que é')) return 'Explicação educativa';
        if (nivelUsuario === 'advanced' && sugestao.includes('análise')) return 'Dados técnicos';

        return 'Informação relacionada';
    }

    gerarDicaSemanal(dadosSemana) {
        if (dadosSemana.diasChuva > 3) {
            return "Semana chuvosa! Tenha sempre guarda-chuva à mão.";
        } else if (dadosSemana.temperaturaMedia > 30) {
            return "Semana quente! Mantenha-se hidratado e evite sol das 11h-15h.";
        } else if (dadosSemana.temperaturaMedia < 20) {
            return "Semana fresca! Roupas em camadas são uma boa opção.";
        } else {
            return "Semana com clima agradável! Aproveite para atividades ao ar livre.";
        }
    }
}

module.exports = WhatsAppApi;