// whatsapp_api/connection.js - Adaptado para Temperature Bot
const axios = require("axios");

class WhatsAppApi {
    constructor(token, phoneNumberID) {
        this.token = token;
        this.phoneNumberID = phoneNumberID;
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
        } catch (error) {
            console.error('Error sending message:', error.response ? error.response.data : error.message);
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

        try {
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
        } catch (error) {
            console.error("Error sending template message:", error.response ? error.response.data : error.message);
            throw error;
        }
    }

    // Método principal para enviar mensagens interativas
    async enviarMensagemInterativaUsandoWhatsappAPI(mensagemInterativa) {
        try {
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
        } catch (error) {
            console.error('Error sending interactive message:', error.response ? error.response.data : error.message);
            throw error;
        }
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
                        {
                            type: "reply",
                            reply: {
                                id: `alerts_${cidade}`,
                                title: "🚨 Configurar Alertas"
                            }
                        },
                        {
                            type: "reply",
                            reply: {
                                id: "share_weather",
                                title: "📤 Compartilhar"
                            }
                        }
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
}

module.exports = WhatsAppApi;