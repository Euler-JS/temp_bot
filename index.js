const express = require("express");
const fs = require("fs");
const util = require('util');
const bodyParser = require("body-parser");
const axios = require("axios");
const WhatsAppApi = require("./whatsapp_api/connection");
const FonteAI = require("./bible_brain_api/ai/fonte_ai");
// const Translations = require("./translations/translation");
const filePath = "./users.json";

const app = express();
const port = process.env.PORT || 3001;
const access = fs.createWriteStream('./logs/access.log');
const error = fs.createWriteStream('./logs/error.log');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//WHATSAPP API-JURIS
const token =
  "EAAIpbaLwXWQBOZBcTQDyZB8Y115ucow04XzRxZBrBrfmVCfSgutzXsc3ZCJeaqz1ZC1AdZCc0ZAZAxPQ0Ka9n6uoTAQNXJ2a1uSTHEJUZC2hHH2XGmjmegwPs2QMD9ZA80nsErJk9iFIx3h6smlDBlFivkWZBfrkVwQOo2Sjbw5reyPGWlUww4lw2ZCgxDi1En15S7FT3wZDZD";
const phoneNumberID = "527203823817674";

//BIBLE API
const API_BASE_URL = "https://4.dbt.io/api/bibles/filesets";
const API_KEY_BIBLE = "68f5c563-ead2-4e92-92f1-709e8c331b6e";
const API_VERSION = "4";
//FIM

// -------------- FONTE AI
const API_BASE_URL_FONTE_AI = "http://localhost:11434/api/generate";
const MODEL = "fdv04:latest";
const STREAM = false;
// -------------- FIM FONTE AI

// -------------- Configuracao de Classes por exportas
const whatsappApi = new WhatsAppApi(token, phoneNumberID);
const fonteAI = new FonteAI(API_BASE_URL_FONTE_AI, MODEL, STREAM);



// -------------- Fim configuracao de classes exportas

//Configuracao de leitura de arquivos

const optionsCases = [
  // "O que é Fonte da Vida Bot?",
  // "/informacoes",
  // "Como receber versículos em aúdio?",
  // "Como escolher língua?",
  // "escolher_lingua",
  "/como_funciona",
  "/escolher_lingua",
  "Choose Language",
  "Escolher Língua",
  // "/chat"
];

// Carrega os usuários na inicialização do servidor
let users = [];
if (fs.existsSync(filePath)) {
  const data = fs.readFileSync(filePath, "utf-8");
  if (data) {
    users = JSON.parse(data);
  }
}

// Função para buscar um usuário pelo número de telefone
function getUserByContact(contact) {
  return users.find((user) => user.contact === contact);
}
// Função para salvar ou atualizar um usuário

function saveOrUpdateUser(contact, language_name, code, prefix, chat) {
  const userIndex = users.findIndex((user) => user.contact === contact);

  if (userIndex !== -1) {
    // Usuário já existe, apenas atualiza os dados
    users[userIndex].language_name = language_name;
    users[userIndex].code = code;
    users[userIndex].prefix = prefix;
    users[userIndex].last_access = new Date();
    users[userIndex].chat = chat;
    console.log("Usuário atualizado com sucesso!");
  } else {
    // Usuário não existe, adiciona um novo
    users.push({ contact, language_name, code, prefix, last_access: new Date(), chat });
    console.log("Novo usuário salvo com sucesso!");
  }


  // Salva as alterações no arquivo
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

// -------------- Fim configuracao de leitura de arquivos


// -------------- Rotas de conexoes com o WhatsApp API
app.get("/webhook", async (req, res) => {
  console.log("Estabelecendo conexção com o Webhook! ");
  let mode = req.query["hub.mode"];
  let challange = req.query["hub.challenge"];
  let token = req.query["hub.verify_token"];
  const mytoken = "FONTEEQUIP";
  if (mode && token) {
    if (mode === "subscribe" && token === mytoken) {
      console.log("Conexão estabelecida com sucesso!")
      res.status(200).send(challange);
    } else {
      console.log("Ocorreu um erro ao estabelecer a conexão com o Webhook!")
      res.status(403);
    }
  }
});

//Get fuction route than retorn a text Ola Mundo
app.get("/test", async (req, res) => {
  res.send("Ola Mundo " + new Date().toLocaleString());
});

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "whatsapp_business_account") {
    const entry = body.entry[0];
    const change = entry.changes[0];

    if (change.field === "messages" && change?.value?.messages?.length > 0) {
      const message = change.value.messages[0];
      const remetenteFile = message.from;
      console.log("Mensagem", message, remetenteFile);

      // Processando a saudação inicial
      if (message?.type === "request_welcome") {
        res.sendStatus(200);
        return;
      }

      // Processando a resposta interativa (escolha de idioma)
      if (message?.type === "interactive") {
        const idInterative = message?.interactive?.list_reply?.id;
        if (idInterative.split("&")[0] == "l") {
          await saveOrUpdateUser(remetenteFile, idInterative.split("&")[2], idInterative.split("&")[1], idInterative.split("&")[3], false);

          console.log("Idioma escolhido: ", idInterative.split("&")[1], idInterative);

          const user = getUserByContact(remetenteFile);
          whatsappApi.enviarMensagemUsandoWhatsappAPI(
            `${transalations.translate(user.language_name, 'you_choose')} ${idInterative.split("&")[2]}. ${transalations.translate(user.language_name, 'fist_message_example')}`,
            remetenteFile
          );
        }
        res.sendStatus(200);
        return;
      }

      // Processando a mensagem de texto
      if (message?.type === "text") {
        const user = getUserByContact(remetenteFile); // Verificando se o usuário já tem idioma
        console.log("Teste ", user)
        if (optionsCases.includes(message.text.body)) {
          const resp = await processMessage(message.text.body, remetenteFile, user);
          if (resp) {
            res.sendStatus(200);
            return;
          }
        }

        else {
          const aiProcessed = await processWithAI(message.text.body, remetenteFile, user);
          if (aiProcessed) {
            res.sendStatus(200);
            return;
          }

          // Fallback 
          const texto = removerAcentos(message.text.body).toLowerCase();
          const [livro, capitulo] = texto.split(" ");
          console.log("Fallback:", livro, capitulo);
          sendAudio(texto, remetenteFile, user.code, user.prefix, user);
          res.sendStatus(200);
          return;
        }
        // else {
        //   const name = user
        //   // Se o usuário não escolheu o idioma, pede para escolher
        //   sendMessageUsingWhatsappAPI(
        //     `${transalations.translate(user?.language_name ? user.language_name : 'Portugues', 'please_select_language_error')}`,
        //     remetenteFile
        //   );

        //   sendInterativeMessagesInParts(remetenteFile, user?.language_name ? user.language_name : 'Portugues'); // Envia as opções de idioma
        //   res.sendStatus(200); // Finaliza a resposta para evitar loop
        // }
        try {
          res.sendStatus(200)
        } catch (error) {
          console.log("Status já enviado...")
        }

        return
      }
    } else {
      res.sendStatus(200);
    }
  } else {
    res.sendStatus(404);
  }
});

// --------------- Funcoes de Ajuda
function removerNumerosDepoisDaPalavra(input) {
  return input.replace(/\b(\w+)\s*\d+\b/g, "$1");
}

function extrairNumerosDepoisDaPalavra(input) {
  const match = input.match(/\b\w+\s+(\d+)\b/);
  return match ? match[1] : null;
}

function removerAcentos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
// --------------- Fim Funcoes de Ajuda

// --------------- Funcao de armazenamento de dados de usario

// function saveUser(contact, language) {
//   const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));
//   users.push({ contact, language, last_access: new Date() });
//   fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
//   console.log("Usuário salvo com sucesso!");
// }

async function sendAiAnswer(message, remetenteFile) {
  sendMessageUsingWhatsappAPI(
    `...`,
    remetenteFile)

  const resAi = await fonteAI.aIAnswer(message);

  console.log("Resposta AI ", resAi.response);
  sendMessageUsingWhatsappAPI(resAi.response, remetenteFile)
  return
}

// Enviar audio para utilizador, preparado pela AI
async function sendAudio(bookName, phoneNumber, abbr, prefix, user, bookId = null, chapter = null) {

  if (bookId && chapter) {
    const res = await bibleAPI.audioBible.buscarAudioV2(abbr, bookId, chapter, prefix);
    console.log("Res... ", res);

    const urlLink = res?.data ? res?.data[0] : undefined;
    if (urlLink) {
      await sendMessageUsingWhatsappAPI(
        `${transalations.translate(user.language_name, 'processing_audio')}`,
        phoneNumber
      );
      await whatsappApi.enviarMensagemComAudioUsandoWhatsappAPI(
        bookName, phoneNumber, urlLink?.path
      );
    } else {
      await sendMessageUsingWhatsappAPI(
        `${transalations.translate(user.language_name, 'error_geting_audio')}`,
        phoneNumber
      );
    }
    return;
  }

  const extractedBooKName = await removerNumerosDepoisDaPalavra(bookName);
  const bookDetails = booksProcessor.searchBookByName(extractedBooKName);
  const number = extrairNumerosDepoisDaPalavra(bookName);

  const res = await bibleAPI.audioBible.buscarAudioV2(
    abbr,
    bookDetails?.book_id,
    number,
    prefix
  );
  console.log("Res ", res);
  const urlLink = res?.data ? res?.data[0] : undefined;
  if (res === false) {
    sendMessageUsingWhatsappAPI(
      `${transalations.translate(user.language_name, 'error_geting_audio')}`,
      phoneNumber
    )

    sendMessageUsingWhatsappAPI(
      `${transalations.translate(user.language_name, 'message_about_fdv')}`,
      phoneNumber
    )
  }
  if (urlLink) {
    await sendMessageUsingWhatsappAPI(
      `${transalations.translate(user.language_name, 'processing_audio')}`,
      phoneNumber)
    await whatsappApi.enviarMensagemComAudioUsandoWhatsappAPI(
      bookName,
      phoneNumber,
      urlLink?.path
    );
  }
  else {
    console.log("Erro ao buscar o audio");
  }
}

async function sendAudioOld(bookName, phoneNumber, abbr, prefix, user) {
  // const bookName = "Lucas 5"; // Exemplo com erro de digitação
  const extractedBooKName = await removerNumerosDepoisDaPalavra(bookName);
  const bookDetails = booksProcessor.searchBookByName(extractedBooKName);

  const number = extrairNumerosDepoisDaPalavra(bookName);

  const res = await bibleAPI.audioBible.buscarAudioV2(
    abbr,
    bookDetails?.book_id,
    number,
    prefix
  );
  console.log("Res ", res);
  const urlLink = res?.data ? res?.data[0] : undefined;
  if (res === false) {
    sendMessageUsingWhatsappAPI(
      `${transalations.translate(user.language_name, 'error_geting_audio')}`,
      phoneNumber
    )

    // await sendMessageUsingWhatsappAPI(
    //   `...`,
    //   phoneNumber)

    // fonteAI.aIAnswer(bookName).then((res) => {
    //   console.log("Resposta AI ", res.response);
    //   sendMessageUsingWhatsappAPI(res.response, phoneNumber)
    // })
    sendMessageUsingWhatsappAPI(
      `${transalations.translate(user.language_name, 'message_about_fdv')}`,
      phoneNumber
    )
  }
  if (urlLink) {
    await sendMessageUsingWhatsappAPI(
      `${transalations.translate(user.language_name, 'processing_audio')}`,
      phoneNumber)
    await whatsappApi.enviarMensagemComAudioUsandoWhatsappAPI(
      bookName,
      phoneNumber,
      urlLink?.path
    );
  }
  else {
    console.log("Erro ao buscar o audio");
  }
}

function getAllLanguageByCountry(coutry, page, limit) {
  bibleAPI.languageBible.buscarLinguasGerias(
    coutry ? coutry : "MZ",
    page ? page : 1,
    limit ? limit : 10
  );
}

function getAllLanguage() {
  bibleAPI.languageBible.buscarLinguasGerias();
}

function sendInterativeMessagesInParts(phoneNumber, language_name) {
  whatsappApi.enviarLinguasPorPartes(
    myLanguages,
    phoneNumber ? phoneNumber : "846151124",
    language_name
  );
}

async function sendMessageUsingWhatsappAPI(message, phoneNumber) {
  whatsappApi.enviarMensagemUsandoWhatsappAPI(
    message ? message : "Ola......",
    phoneNumber ? phoneNumber : "846151124"
  );
}

function isAudioRequest(message) {
  try {
    const data = JSON.parse(message);
    return data.type === "audio_request";
  } catch (e) {
    // Se não for JSON válido, retorna false
    return false;
  }
}


// -------------
async function processWithAI(message, remetenteFile, user) {
  try {
    const aiResponse = await fonteAI.aIAnswer(message);
    const isAudio = isAudioRequest(aiResponse.response);
    if (isAudio) {
      console.log("🎧 Audio request detected");
      if (isAudio.type === "audio_request") {
        console.log("🎧 audio_request detectado");

        if (isAudio.message) {
          await sendMessageUsingWhatsappAPI(isAudio.message, remetenteFile);
        }

        await sendAudio(
          `${isAudio.book_name} ${isAudio.chapter}`,
          remetenteFile,
          user.code,
          user.prefix,
          user,
          isAudio.book_id,
          isAudio.chapter
        );
        return true;
      }
    }

    // Tenta fazer parse como JSON
    try {
      let jsonString = aiResponse.response;  // ← AQUI ESTÁ CERTO
      console.log("🔍 Resposta original:", jsonString);

      if (jsonString.includes('```json')) {
        jsonString = jsonString.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
        console.log("🧹 JSON limpo:", jsonString);
      }


      const parsed = JSON.parse(jsonString);
      console.log("✅ JSON parseado:", parsed);

      if (parsed.type === "audio_request") {
        console.log("🎧 audio_request detectado");

        if (parsed.message) {
          await sendMessageUsingWhatsappAPI(parsed.message, remetenteFile);
        }

        await sendAudio(
          `${parsed.book_name} ${parsed.chapter}`,
          remetenteFile,
          user.code,
          user.prefix,
          user,
          parsed.book_id,
          parsed.chapter
        );
        return true;
      }
    } catch (parseError) {
      console.log("❌ Parse error:", parseError.message);
      // Não é JSON, resposta conversacional
    }

    // Resposta normal
    await sendMessageUsingWhatsappAPI(aiResponse.response, remetenteFile);
    return true;

  } catch (error) {
    console.error("Erro geral:", error);
    return false;
  }
}

// -------------
function processMessage(message, remetente, user) {
  console.log(message, remetente, user)
  const language = user?.language_name ? user.language_name : "Portugues"
  switch (message) {
    case "O que é Fonte da Vida Bot?":
      sendMessageUsingWhatsappAPI(
        `${transalations.translate(language, 'message_about_fdv')}`,
        remetente
      );
      return true;
    case "/informacoes":
      sendMessageUsingWhatsappAPI(
        `${transalations.translate(language, 'info_fdv')}`,
        remetente
      );
      return true;
    case "Como receber versículos em aúdio?":
      sendMessageUsingWhatsappAPI(
        `${transalations.translate(language, 'how_to_receive_audio')}`,
        remetente
      );
      return true;
    case "Escolher Língua":
      sendInterativeMessagesInParts(remetente, "Portugues");
      return true;
    case "escolher_lingua":
      sendInterativeMessagesInParts(remetente, language);
      return true;
    case "Choose Language":
      sendInterativeMessagesInParts(remetente, "English");
      return true;
    case "/como_funciona":
      sendMessageUsingWhatsappAPI(
        `${transalations.translate(language, 'how_fdv_works')}`,
        remetente
      );
      return true;
    case "/escolher_lingua":
      sendInterativeMessagesInParts(remetente, language);
      return true;
    // case "/chat":
    //   const user = getUserByContact(remetente);
    //   if (user && user.chat) {
    //     const chat_ative = user.chat ? "chat_deactivated" : "chat_ativated"
    //     sendMessageUsingWhatsappAPI(
    //       `${transalations.translate(language, chat_ative)}`,
    //       remetente
    //     );
    //     saveOrUpdateUser(remetente, "Portugues", "PORBSP", "N2DA", !user.chat);
    //   }
    //   else {
    //     sendMessageUsingWhatsappAPI(
    //       `${transalations.translate(language, 'chat_ativated')}`,
    //       remetente
    //     );
    //     saveOrUpdateUser(remetente, "Portugues", "PORBSP", "N2DA", true);
    //   }

    //   return true;
    default:
      return false;
  }
}
// -------------

// Funcionalidade de Proxy
// Rota para retransmitir o áudio
app.get('/proxy-audio', async (req, res) => {
  const audioUrl = req.query.url; // O link do áudio será enviado como query param
  if (!audioUrl) {
    return res.status(400).send('URL do áudio não fornecida.');
  }
  try {
    const response = await axios.get(audioUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', 'audio/mpeg');
    response.data.pipe(res);
  } catch (error) {
    console.error('Erro no proxy:', error.message);
    res.status(500).send('Erro ao acessar o áudio.');
  }
});
// Fim

// --------------- Fim Funcao de armazenamento de dados de usario
app.listen(port, async () => {
  console.log(process.env.PORT)
  console.log(
    "Servidor rodando em http://localhost:" + port,
    new Date().toLocaleString()
  );
  // sendInterativeMessagesInParts("846151124");
  // sendMessageUsingWhatsappAPI();

  // whatsappApi.enviarMensagemUsandoTemplateWhatsappAPI(
  //   'start_point_en',
  //   '846151124',
  //   'en_US'
  // )
  // fonteAI.aIAnswer("Ola").then((res) => {
  //   console.log("Resposta AI ", res.response);
  //   sendMessageUsingWhatsappAPI(res.response, '846151124')
  // }
  // );
});
