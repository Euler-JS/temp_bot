const axios = require("axios");
const Translations = require("../transalations/translation");
const transalations = new Translations();

let token = "";
let phoneNumberID = "";
class WhatsAppApi {
    constructor(token, phoneNumberID) {
        this.token = token;
        this.phoneNumberID = phoneNumberID;
    }

    async enviarMensagemUsandoWhatsappAPI(mensagem, numeroCelular) {
        console.log(mensagem, numeroCelular)
        if (!mensagem?.messaging_product) {
            mensagem = {
                messaging_product: 'whatsapp',
                to: numeroCelular,
                text: {
                    body: mensagem.replace(/<\/?[^>]+(>|$)/g, "")
                }
            }
        }
        const messageData = mensagem
        axios.post(`https://graph.facebook.com/v19.0/${this.phoneNumberID}/messages`, messageData, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        }).then(response => {
            console.log('Message sent successfully:', response.data);
            return ""
        }).catch(error => {
            console.error('Error sending message:', error.response ? error.response.data : error.message);
        });
    }

    async enviarMensagemUsandoTemplateWhatsappAPI(templateName, numeroCelular, language) {
        console.log(language)
        const messageData = {
            messaging_product: "whatsapp",
            to: numeroCelular,
            type: "template",
            template: {
                name: templateName,  // Nome do template no WhatsApp Business Manager
                language: {
                    code: language  // Idioma do template (exemplo: português do Brasil)
                },
                // components: [
                //     {
                //         type: "body",
                //         parameters: variables.map(value => ({
                //             type: "text",
                //             text: value
                //         }))
                //     }
                // ]
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
            console.log("Mensagem enviada com sucesso:", response.data);
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error.response ? error.response.data : error.message);
        }
    }

    async enviarMensagemComAudioUsandoWhatsappAPI(mensagem, numeroCelular, urlArquivo) {
        const proxyUrl = `https://whatsapp.fontedavida.org/proxy-audio?url=${encodeURIComponent(urlArquivo)}`;
        const messageData = {
            messaging_product: 'whatsapp',
            to: numeroCelular,
            "type": 'audio',
            ['audio']: {
                // caption: 'audio',// Áudio não suporta legendas
                link: proxyUrl
            },
        };
        try {
            axios.post(`https://graph.facebook.com/v19.0/${this.phoneNumberID}/messages`, messageData, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                console.log('Message sent successfully:', response.data);
                return ""
            }).catch(error => {
                console.error('Error sending message:', error.response ? error.response.data : error.message);
            });
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        }
    }

    async enviarMensagemInterativaUsandoWhatsappAPI(mensagemInterativa) {
        axios.post(`https://graph.facebook.com/v19.0/${this.phoneNumberID}/messages`, mensagemInterativa, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        }).then(response => {
            console.log('Interactive message sent successfully:', response.data);
        }).catch(error => {
            console.error('Error sending interactive message:', error.response ? error.response.data : error.message);
        });
    }

    async enviarLinguasPorPartes(dadosApi, remetenteFile, language_name) {
        const mensagensInterativas = await this.processarOpcoesDeLivros(dadosApi, remetenteFile, language_name);
        for (const mensagemInterativa of mensagensInterativas) {
            this.enviarMensagemInterativaUsandoWhatsappAPI(mensagemInterativa);
        }
    }

    processarOpcoesDeLivros(myLanguages, remetenteFile, language_name) {
        // console.log("Hello ", `${transalations.translate(language_name, 'you_choose')}`);
        // return
        const maxRowsPerSection = 10; // Limite de itens por seção
        const messages = [];
        console.log(myLanguages);

        for (let i = 0; i < myLanguages.length; i += maxRowsPerSection) {
            const sections = [
                {
                    title: `${transalations.translate(language_name, 'select_language_interative')} ${Math.floor(i / maxRowsPerSection) + 1}`, // Título da seção
                    rows: myLanguages.slice(i, i + maxRowsPerSection).map(item => ({
                        id: 'l&' + item.abbr + '&' + item.language + '&' + item.prefix, // O ID será o "abbr"
                        title: `${item.language.length > 72 ? item.language.substring(0, 72) : item.language}`, // O título será o "language"
                        description: `${item.name.length > 72 ? item.name.substring(0, 72) : item.name}` // Descrição customizada com ISO e Data
                    }))
                }
            ];

            const mensagemInterativa = {
                messaging_product: 'whatsapp',
                recipient_type: "individual",
                to: remetenteFile,
                type: "interactive",
                interactive: {
                    type: "list",
                    header: {
                        type: "text",
                        //${incidente.nome.length > 72 ? incidente.nome.substring(0, 72): incidente.nome}
                        text: `${transalations.translate(language_name, 'select_language_interative').length > 72 ?
                            transalations.translate(language_name, 'select_language_interative').substring(0, 72) :
                            transalations.translate(language_name, 'select_language_interative')} ` + (messages.length + 1)
                    },
                    body: {
                        text: `${transalations.translate(language_name, 'select_language').length > 72 ?
                            transalations.translate(language_name, 'select_language').substring(0, 72) :
                            transalations.translate(language_name, 'select_language')}`
                    },
                    footer: {
                        text: `${transalations.translate(language_name, 'interative_btn').length > 72 ?
                            transalations.translate(language_name, 'interative_btn').substring(0, 72) :
                            transalations.translate(language_name, 'interative_btn')}`
                    },
                    action: {
                        button: `${transalations.translate(language_name, 'interative_see_idiomas').length > 72 ?
                            transalations.translate(language_name, 'interative_see_idiomas').substring(0, 72) :
                            transalations.translate(language_name, 'interative_see_idiomas')}`,
                        sections: sections
                    }
                }
            };

            messages.push(mensagemInterativa);
        }
        return messages;
    }
}

module.exports = WhatsAppApi