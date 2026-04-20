# Bot-WPP-WB-SC

Bot de WhatsApp baseado em `whatsapp-web.js` com carregamento automatico de comandos, tratamento centralizado de respostas, autorizacao remota por numero e testes automatizados.

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
- `axios`
- `dotenv`
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

### Configurar ambiente

1. Crie um arquivo `.env` na raiz do projeto
2. Use `.env.example` como base

Exemplo:

```env
LICENSE_API_URL=http://127.0.0.1:4010/licenca
LOCAL_AUTHORIZED_NUMBERS=5511999999999@c.us,5511888888888@c.us
LICENSE_REVALIDATION_INTERVAL_MS=300000
ADMIN_NUMBERS=5511999999999@c.us,5511888888888@c.us
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
- validar a licenca do numero conectado na inicializacao
- revalidar a licenca periodicamente sem derrubar o bot em runtime

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
- `loggerService.js`: logging estruturado
- `authService.js`: autorizacao remota, fallback local e revalidacao

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

## 6.1 Configuracao de autorizacao

Variaveis suportadas em `.env`:

- `LICENSE_API_URL`: URL da API remota de licenca
- `LOCAL_AUTHORIZED_NUMBERS`: numeros autorizados localmente separados por virgula
- `LICENSE_REVALIDATION_INTERVAL_MS`: intervalo da revalidacao em milissegundos
- `ADMIN_NUMBERS`: numeros com permissao para comandos administrativos

Comportamento:

- na inicializacao, o bot consulta a API remota
- se a API falhar, o fallback `LOCAL_AUTHORIZED_NUMBERS` sempre e usado como backup
- se o numero nao estiver autorizado nem remotamente nem no fallback, o bot bloqueia na inicializacao
- depois que o bot sobe, a revalidacao periodica apenas loga problemas e nao derruba o processo

## 6.2 Mock local de API

Para testar sem backend real:

```bash
npm run mock:license
```

O mock sobe por padrao em:

```text
http://127.0.0.1:4010/licenca
```

Exemplo de chamada:

```text
http://127.0.0.1:4010/licenca?numero=5511999999999@c.us
```

Resposta:

```json
{ "authorized": true }
```

## Como outro desenvolvedor comecar (ex: Caio)

1. Clonar o repositorio

```bash
git clone <URL_DO_REPOSITORIO>
cd bot-wpp
```

2. Instalar dependencias

```bash
npm install
```

3. Criar `.env` com base em `.env.example`

4. Subir o mock de licenca se quiser testar sem backend real

```bash
npm run mock:license
```

5. Iniciar o bot

```bash
npm start
```

6. Escanear o QR code no WhatsApp

7. Testar um comando simples

```text
!ping
```

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
│  ├─ status.js
│  ├─ test.js
│  ├─ welcome.js
│  └─ admin.js
├─ services/
│  ├─ authService.js
│  ├─ commandExecutor.js
│  ├─ loggerService.js
│  └─ replyService.js
├─ mock-license-api.js
├─ license.js
├─ authService.js
├─ utils/
│  ├─ validator.js
│  └─ validator.test.js
├─ index.js
├─ whatsapp.js
├─ whatsapp.test.js
├─ .env.example
├─ package.json
├─ package-lock.json
└─ .gitignore
```

## 9. Observacoes importantes

- Nao versione `.wwebjs_auth/`
- Nao versione `.wwebjs_cache/`
- Nao versione `node_modules/`
- Nao versione `.env`
- O estado de autenticacao do WhatsApp fica em `.wwebjs_auth/`
- Se esse diretorio for apagado, sera necessario escanear o QR Code novamente
- `LOCAL_AUTHORIZED_NUMBERS` funciona como fallback de seguranca quando a API remota falha

## 10. Troubleshooting basico

### O QR Code nao aparece

- Confirme que o comando `npm start` foi executado na raiz do projeto
- Verifique se as dependencias foram instaladas com `npm install`

### O bot nao responde aos comandos

- Verifique se o terminal exibiu `Bot online`
- Confirme que a mensagem comeca com `!`
- Confirme que o comando existe na pasta `commands/`
- Reinicie o bot depois de adicionar ou alterar comandos

### O bot bloqueia na inicializacao

- Verifique se `LICENSE_API_URL` esta correto
- Verifique se o numero do bot existe na autorizacao remota
- Se a API estiver fora, confirme se o numero esta presente em `LOCAL_AUTHORIZED_NUMBERS`

### Quero testar a licenca localmente

- Rode `npm run mock:license`
- Aponte `LICENSE_API_URL` para `http://127.0.0.1:4010/licenca`
- Defina `MOCK_AUTHORIZED_NUMBERS` se quiser mudar quem o mock autoriza

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
- `!status`: mostra status, quantidade de comandos e timestamp
- `!test`: responde com `comando test funcionando`
- `!welcome`: exemplo de comando simples para onboarding
- `!admin status|auth|commands`: comandos administrativos para numeros autorizados
