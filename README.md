# Bot-WPP-WB-SC

Bot de WhatsApp baseado em `whatsapp-web.js` com carregamento automatico de comandos, tratamento centralizado de respostas e testes automatizados.

## 1. Descricao do projeto

Este projeto inicia um cliente do WhatsApp Web, autentica via QR Code e executa comandos recebidos em mensagens com prefixo `!`.

Exemplos:

- `!test`
- `!ping`
- `!info a b`
- `!help`

## 2. Tecnologias usadas

- Node.js
- `whatsapp-web.js`
- `qrcode-terminal`
- Jest

## 3. Requisitos

- Node.js 18 ou superior
- npm 9 ou superior
- Conta do WhatsApp com acesso ao aplicativo para leitura do QR Code
- Conexao com internet

## 4. Instalacao passo a passo

### Clonar o repositorio

```bash
git clone <URL_DO_REPOSITORIO>
cd bot-wpp
```

### Instalar dependencias

```bash
npm install
```

### Iniciar o bot

```bash
npm start
```

### Autenticar no WhatsApp

1. Aguarde o terminal exibir `QR gerado`.
2. Abra o WhatsApp no celular.
3. Acesse `Dispositivos conectados`.
4. Escaneie o QR Code exibido no terminal.
5. Aguarde o log `Bot online`.

## 5. Explicacao do fluxo

### `index.js`

Ponto de entrada da aplicacao. Importa o modulo principal e inicia o bot.

### `whatsapp.js`

Camada principal de orquestracao. Responsavel por:

- carregar comandos da pasta `commands/`
- validar mensagens com prefixo
- extrair nome do comando e argumentos
- montar o `context`
- encaminhar a execucao para o executor central

### `commands/`

Contem os comandos do bot. Cada arquivo deve exportar:

```js
module.exports = {
  name: 'nome-do-comando',
  description: 'Descricao curta do comando',
  async execute(msg, args, context) {
    // logica do comando
  }
};
```

### `utils/`

Contem funcoes auxiliares pequenas, como validacao de comandos.

### `services/`

Contem servicos centrais da aplicacao:

- `replyService.js`: envio de texto e erro
- `commandExecutor.js`: execucao padronizada de comandos

## 6. Como adicionar um novo comando

1. Crie um arquivo `.js` dentro de `commands/`
2. Exporte um objeto com `name`, `description` e `execute`
3. Use `context.replyService.sendText(context, 'sua resposta')` para responder

Exemplo:

```js
module.exports = {
  name: 'exemplo',
  description: 'Comando de exemplo',

  async execute(msg, args, context) {
    void msg;

    const totalArgs = args.length;
    await context.replyService.sendText(
      context,
      `Comando exemplo executado com ${totalArgs} argumento(s).`
    );
  }
};
```

Depois disso, reinicie o bot. O loader carrega automaticamente os arquivos validos da pasta `commands/`.

## 7. Como rodar os testes

```bash
npm test
```

Os testes cobrem:

- loader de comandos
- parser de comandos e argumentos
- fluxo de mensagens
- cenarios de erro
- servico de resposta
- executor central

## 8. Estrutura de pastas explicada

```text
bot-wpp/
├─ commands/
│  ├─ help.js
│  ├─ info.js
│  ├─ ping.js
│  └─ test.js
├─ services/
│  ├─ commandExecutor.js
│  └─ replyService.js
├─ utils/
│  ├─ validator.js
│  └─ validator.test.js
├─ index.js
├─ whatsapp.js
├─ whatsapp.test.js
├─ package.json
├─ package-lock.json
└─ .gitignore
```

## 9. Observacoes importantes

- Nao versione `.wwebjs_auth/`
- Nao versione `.wwebjs_cache/`
- Nao versione `node_modules/`
- O estado de autenticacao do WhatsApp fica em `.wwebjs_auth/`
- Se esse diretorio for apagado, sera necessario escanear o QR Code novamente

## 10. Troubleshooting basico

### O QR Code nao aparece

- Confirme que o comando `npm start` foi executado na raiz do projeto
- Verifique se as dependencias foram instaladas com `npm install`

### O bot nao responde aos comandos

- Verifique se o terminal exibiu `Bot online`
- Confirme que a mensagem comeca com `!`
- Confirme que o comando existe na pasta `commands/`
- Reinicie o bot depois de adicionar ou alterar comandos

### O bot responde erro ao executar comando

- Rode `npm test`
- Verifique o terminal para identificar o comando que falhou
- Confirme se o comando usa `context.replyService.sendText(...)`

### O WhatsApp pede novo QR Code

- Isso normalmente indica perda da sessao local
- Escaneie novamente o QR Code

## Comandos atuais

- `!help`: lista os comandos disponiveis
- `!info`: mostra horario atual, id do chat e quantidade de argumentos
- `!ping`: responde com `pong`
- `!test`: responde com `comando test funcionando`
