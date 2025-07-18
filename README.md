# 📖 WhatsApp Bible Bot  

Este projeto é um **bot para WhatsApp**, construído com **Node.js e Express**, que permite aos usuários acessarem áudios da **Bíblia** em diferentes idiomas. Ele armazena os usuários localmente em um arquivo JSON(Atualmente nessa fase e poderá mudar noutra fase) e processa mensagens recebidas via **Webhook do WhatsApp**.  

---

## 🚀 Introdução  

O **WhatsApp Bible Bot** permite que os usuários:  
✅ Escolham um idioma para interagir.  
✅ Busquem livros e capítulos da Bíblia.  
✅ Recebam áudios dos capítulos solicitados no WhatsApp.  
✅ Tenham seus dados armazenados localmente em um arquivo JSON.  

---

## 🛠️ Configuração e Instalação  

### 1️⃣ **Clone o Repositório**  

```sh
git clone https://github.com/Equip-Mozambique/FONTE-WHATSAPP.git
cd seu-repositorio
```

### 2️⃣ **Instale as Dependências**  

```sh
npm install
```

### 3️⃣ **Inicie o Servidor**  

```sh
npm start
```

O servidor estará rodando em `http://localhost:3000`. 🚀  

---

## 📡 Endpoints da API  

### **1️⃣ Salvar um Usuário**  

Os usuários são armazenados no arquivo **users.json**.  

- **Rota:** `POST /save-user`  
- **Body (JSON):**  

```json
{
  "contact": "+5511999999999",
  "language": "pt-BR"
}
```

- **Resposta:**  

```json
{
  "message": "Usuário salvo ou atualizado com sucesso!"
}
```

- **O que acontece?**  
  - Se o usuário já existir, ele será atualizado.  
  - Se não existir, ele será adicionado ao `users.json`.  

---

### **2️⃣ Buscar Usuário por Contato**  

- **Rota:** `GET /user/:contact`  
- **Exemplo:** `/user/+5511999999999`  
- **Resposta:**  

```json
{
  "contact": "+5511999999999",
  "language": "pt-BR",
  "last_access": "2024-02-12T12:34:56.789Z"
}
```

- **O que acontece?**  
  - Se o usuário for encontrado, retorna seus dados.  
  - Se não for encontrado, retorna um erro 404.  

---

### **3️⃣ Webhook para Mensagens do WhatsApp**  

- **Rota:** `POST /webhook`  
- **Descrição:** Processa mensagens enviadas ao bot e responde automaticamente.  

---

## 📝 Como Funciona o Armazenamento?  

Os usuários são armazenados no arquivo **users.json** no seguinte formato:  

```json
[
  {
    "contact": "+5511999999999",
    "language": "pt-BR",
    "last_access": "2024-02-12T12:34:56.789Z"
  }
]
```

A cada nova interação, o bot **lê e atualiza** esse arquivo.  

---

## 🧪 Como Rodar os Testes  

Se houver testes automatizados, rode:  

```sh
npm test
```

---

## 📜 Licença  

Este projeto está sob a licença **MIT**.  

---

## 🔗 Links Úteis  

- [Documentação do Express](https://expressjs.com/)  
- [API da Bíblia Brain](https://biblebrain.com/api)  

---

Agora o **README.md** está 100% alinhado com seu projeto, **sem MongoDB** e com armazenamento em JSON. 🔥  

Se precisar de ajustes, só avisar! 🚀
