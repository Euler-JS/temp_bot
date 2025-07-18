// test/mock_whatsapp_api.js - Simulação da API do WhatsApp para testes
class MockWhatsAppApi {
    constructor(token, phoneNumberID) {
        this.token = token;
        this.phoneNumberID = phoneNumberID;
        console.log(`🤖 Mock WhatsApp API iniciado`);
        console.log(`📱 Phone ID: ${phoneNumberID}`);
        console.log(`🔑 Token: ${token?.substring(0, 10)}...`);
        console.log(`─────────────────────────────────────\n`);
    }

    async enviarMensagemUsandoWhatsappAPI(mensagem, numeroCelular) {
        console.log(`📤 ENVIANDO MENSAGEM PARA: ${numeroCelular}`);
        console.log(`💬 CONTEÚDO:`);

        if (typeof mensagem === 'string') {
            console.log(`   ${mensagem}`);
        } else {
            console.log(`   ${mensagem.text?.body || JSON.stringify(mensagem, null, 2)}`);
        }

        console.log(`─────────────────────────────────────`);

        // Simular delay da API
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            messaging_product: "whatsapp",
            to: numeroCelular,
            message_id: `mock_${Date.now()}`
        };
    }

    async enviarMensagemInterativaUsandoWhatsappAPI(mensagemInterativa) {
        console.log(`🎛️  ENVIANDO MENSAGEM INTERATIVA PARA: ${mensagemInterativa.to}`);
        console.log(`📋 TIPO: ${mensagemInterativa.interactive?.type?.toUpperCase()}`);

        if (mensagemInterativa.interactive?.type === 'button') {
            console.log(`🔘 HEADER: ${mensagemInterativa.interactive.header?.text}`);
            console.log(`📝 BODY: ${mensagemInterativa.interactive.body?.text}`);
            console.log(`🔲 BOTÕES:`);

            mensagemInterativa.interactive.action.buttons?.forEach((button, index) => {
                console.log(`   ${index + 1}. ${button.reply.title} (ID: ${button.reply.id})`);
            });
        }
        else if (mensagemInterativa.interactive?.type === 'list') {
            console.log(`🔘 HEADER: ${mensagemInterativa.interactive.header?.text}`);
            console.log(`📝 BODY: ${mensagemInterativa.interactive.body?.text}`);
            console.log(`👆 BOTÃO: ${mensagemInterativa.interactive.action?.button}`);
            console.log(`📋 SEÇÕES:`);

            mensagemInterativa.interactive.action.sections?.forEach((section, sIndex) => {
                console.log(`   📂 ${section.title}:`);
                section.rows?.forEach((row, rIndex) => {
                    console.log(`      ${sIndex + 1}.${rIndex + 1} ${row.title} (ID: ${row.id})`);
                    if (row.description) {
                        console.log(`           ${row.description}`);
                    }
                });
            });
        }

        console.log(`─────────────────────────────────────`);

        await new Promise(resolve => setTimeout(resolve, 800));

        return {
            messaging_product: "whatsapp",
            to: mensagemInterativa.to,
            message_id: `mock_interactive_${Date.now()}`
        };
    }

    async enviarMensagemUsandoTemplateWhatsappAPI(templateName, numeroCelular, language) {
        console.log(`📋 ENVIANDO TEMPLATE PARA: ${numeroCelular}`);
        console.log(`🏷️  TEMPLATE: ${templateName}`);
        console.log(`🌍 IDIOMA: ${language}`);
        console.log(`─────────────────────────────────────`);

        await new Promise(resolve => setTimeout(resolve, 600));

        return {
            messaging_product: "whatsapp",
            to: numeroCelular,
            message_id: `mock_template_${Date.now()}`
        };
    }

    // Métodos específicos do Temperature Bot
    async enviarMenuConfiguracoes(numeroCelular, usuario = {}) {
        const configData = {
            messaging_product: 'whatsapp',
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "list",
                header: { text: "⚙️ Configurações" },
                body: { text: "Configure suas preferências" },
                action: {
                    button: "Configurar",
                    sections: [{
                        title: "Preferências",
                        rows: [
                            { id: "set_city", title: "Cidade Padrão", description: `Atual: ${usuario?.preferredCity || 'Não definida'}` },
                            { id: "set_units", title: "Temperatura", description: `Atual: ${usuario?.units || 'Celsius'}` }
                        ]
                    }]
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(configData);
    }

    async enviarMenuUnidades(numeroCelular) {
        const unitsData = {
            messaging_product: 'whatsapp',
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "button",
                header: { text: "🌡️ Unidade de Temperatura" },
                body: { text: "Escolha sua preferência:" },
                action: {
                    buttons: [
                        { type: "reply", reply: { id: "units_celsius", title: "Celsius (°C)" } },
                        { type: "reply", reply: { id: "units_fahrenheit", title: "Fahrenheit (°F)" } }
                    ]
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(unitsData);
    }

    async enviarBotoesAcaoRapida(numeroCelular, cidade) {
        const actionData = {
            messaging_product: 'whatsapp',
            to: numeroCelular,
            type: "interactive",
            interactive: {
                type: "button",
                header: { text: `🌤️ Ações para ${cidade}` },
                body: { text: "O que você gostaria de fazer?" },
                action: {
                    buttons: [
                        { type: "reply", reply: { id: `forecast_${cidade}`, title: "📅 Previsão 7 dias" } },
                        { type: "reply", reply: { id: `alerts_${cidade}`, title: "🚨 Alertas" } },
                        { type: "reply", reply: { id: "share_weather", title: "📤 Compartilhar" } }
                    ]
                }
            }
        };

        return await this.enviarMensagemInterativaUsandoWhatsappAPI(actionData);
    }

    async enviarMensagemCarregamento(numeroCelular, acao = 'Processando') {
        return await this.enviarMensagemUsandoWhatsappAPI(
            `⏳ ${acao}...\n\n_Aguarde um momento_`,
            numeroCelular
        );
    }

    async enviarMensagemErro(numeroCelular, erro, sugestao = '') {
        let errorMessage = `❌ *Ops! Algo deu errado*\n\n${erro}\n\n`;
        if (sugestao) errorMessage += `💡 *Sugestão:* ${sugestao}\n\n`;
        errorMessage += `Digite */ajuda* para ver os comandos.`;

        return await this.enviarMensagemUsandoWhatsappAPI(errorMessage, numeroCelular);
    }

    async enviarMensagemSucesso(numeroCelular, mensagem, emoji = '✅') {
        return await this.enviarMensagemUsandoWhatsappAPI(
            `${emoji} *Sucesso!*\n\n${mensagem}`,
            numeroCelular
        );
    }
}

module.exports = MockWhatsAppApi;