# Bot-WPP-WB-SC

Bot de WhatsApp baseado em `whatsapp-web.js` com comandos modulares, controle remoto de instancia, autorizacao por numero, telemetria, moderacao automatica e testes automatizados.

## 1. Descricao do projeto

O projeto sobe um cliente do WhatsApp Web, autentica via QR Code e processa mensagens com prefixo `!`.

Exemplos:

- `!ping`
- `!status`
- `!help`
- `!admin auth`
- `!admin usage`

## 1.1 O que este projeto protege de verdade

Este repositorio pode continuar publico. Isso deixa visivel no que voce esta trabalhando, mas nao deve ser confundido com controle de uso.

O controle real acontece em 4 camadas:

- licenca por numero via `LICENSE_API_URL`
- fallback local via `LOCAL_AUTHORIZED_NUMBERS`
- controle remoto de instancia via `CONTROL_API_URL`
- comandos administrativos via `ADMIN_NUMBERS`

Isso significa:

- qualquer pessoa pode ver o codigo se o repositorio for publico
- nem toda pessoa consegue subir uma instancia funcional
- voce pode aprovar ou revogar instancias ligadas ao seu backend
- voce pode ver quais instancias registradas estao tentando operar

Limite honesto: se alguem clonar um repositorio publico e remover sua checagem de controle localmente, nao existe milagre do lado do cliente. O que voce controla de verdade e toda instancia que depende do seu backend para operar.

## 1.2 Tipos de acesso

Estas permissoes sao independentes:

- acesso para ler o codigo: depende de o repositorio ser publico ou privado
- acesso para escrever no repositorio principal: depende de permissao no GitHub
- acesso para usar o bot em execucao: depende da licenca, do controle remoto e da lista de admins

Dar acesso ao Git para o Caio nao significa dar acesso operacional ao bot.

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
- internet
- um numero de WhatsApp para operar a instancia que realmente vai responder

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

1. Crie um arquivo `.env` na raiz
2. Use `.env.example` como base

Exemplo minimo:

```env
LICENSE_API_URL=http://127.0.0.1:4010/licenca
CONTROL_API_URL=http://127.0.0.1:4010/control
CONTROL_REGISTRATION_KEY=troque-essa-chave
CONTROL_HEARTBEAT_INTERVAL_MS=60000
INSTANCE_OPERATOR_NAME=solano
INSTANCE_LABEL=pc-principal
LOCAL_AUTHORIZED_NUMBERS=5511999999999@c.us
ADMIN_NUMBERS=5511999999999@c.us
LICENSE_REVALIDATION_INTERVAL_MS=300000
```

### Iniciar o bot

```bash
npm start
```

### Autenticar no WhatsApp

1. Aguarde `QR gerado`
2. Abra o WhatsApp no celular
3. Acesse `Dispositivos conectados`
4. Escaneie o QR Code
5. Aguarde `Bot online`

## 5. Explicacao do fluxo

### `index.js`

Ponto de entrada da aplicacao.

### `whatsapp.js`

Camada principal de orquestracao. Responsavel por:

- moderacao antes de qualquer comando
- carregamento automatico de comandos
- parser de comando e argumentos
- montagem do `context`
- execucao centralizada de comandos
- validacao de licenca do numero conectado
- validacao de instancia no controle remoto
- heartbeat de controle para permitir revogacao remota

### `commands/`

Cada comando exporta:

```js
module.exports = {
  name: 'nome-do-comando',
  description: 'Descricao curta do comando',
  async execute(msg, args, context) {
    // logica
  }
};
```

### `services/`

- `replyService.js`: resposta padronizada
- `commandExecutor.js`: execucao centralizada
- `loggerService.js`: logs estruturados
- `authService.js`: licenca por numero
- `controlService.js`: registro, aprovacao e heartbeat de instancia
- `usageService.js`: telemetria em memoria
- `moderationService.js`: anti-spam

### `utils/`

Funcoes auxiliares pequenas, como validacao, admin e rate limit.

## 6. Como adicionar um novo comando

1. Crie um arquivo `.js` em `commands/`
2. Exporte `name`, `description` e `execute`
3. Use `context.replyService.sendText(context, 'resposta')`

Exemplo:

```js
module.exports = {
  name: 'exemplo',
  description: 'Comando de exemplo',

  async execute(msg, args, context) {
    void msg;
    await context.replyService.sendText(context, `Recebi ${args.length} argumento(s).`);
  }
};
```

## 6.1 Configuracao de autorizacao e controle

Variaveis principais:

- `LICENSE_API_URL`: API de licenca do numero do WhatsApp
- `LOCAL_AUTHORIZED_NUMBERS`: fallback local se a API falhar
- `LICENSE_REVALIDATION_INTERVAL_MS`: revalidacao da licenca
- `CONTROL_API_URL`: backend de controle de instancia
- `CONTROL_REGISTRATION_KEY`: chave de registro da instancia
- `CONTROL_HEARTBEAT_INTERVAL_MS`: intervalo do heartbeat
- `INSTANCE_OPERATOR_NAME`: nome de quem esta operando aquela instancia
- `INSTANCE_LABEL`: apelido legivel da maquina/instancia
- `ADMIN_NUMBERS`: quem pode usar comandos administrativos

Comportamento:

- se a licenca reprovar, o bot nao sobe
- se o controle remoto estiver configurado e a instancia vier `pending`, `revoked` ou `error`, o bot nao sobe
- depois de autorizado, o bot manda heartbeat periodico
- se o backend devolver `revoked`, o processo e encerrado
- se o heartbeat falhar por erro de rede, o bot loga o problema

## 6.2 Quem precisa escanear QR Code

### Cenario 1: voce operando o bot oficial

Esse e o fluxo principal.

- o numero do bot fica autenticado na sua maquina
- voce roda a instancia oficial aqui
- os testes reais nos grupos acontecem aqui

### Cenario 2: Caio apenas desenvolvendo

Se o Caio so vai:

- implementar codigo
- rodar testes
- abrir PR ou fazer push onde voce permitir

entao ele nao precisa escanear QR Code.

### Cenario 3: Caio rodando uma instancia propria

So nesse caso ele precisa:

- um `.env` dele
- um numero dele ou uma conta dele para autenticar
- aprovacao sua no backend de controle
- permissao na licenca e, se necessario, em `ADMIN_NUMBERS`

## 6.3 Mock local de licenca e controle

Para demonstracao local:

```bash
npm run mock:control
```

Esse mock sobe por padrao em `http://127.0.0.1:4010` e atende:

- `GET /licenca`
- `POST /control/register`
- `POST /control/heartbeat`
- `GET /control/instances`
- `POST /control/instances/:id/approve`
- `POST /control/instances/:id/revoke`

Variaveis uteis do mock:

- `MOCK_CONTROL_ADMIN_KEY`
- `MOCK_CONTROL_REGISTRATION_KEY`
- `MOCK_CONTROL_STORE_PATH`
- `MOCK_CONTROL_DEFAULT_STATE`

## 6.4 Como aprovar uma instancia

Fluxo simples:

1. A pessoa configura `.env` com `CONTROL_API_URL` e `CONTROL_REGISTRATION_KEY`
2. Ela roda o bot
3. A instancia registra no backend como `pending`
4. Voce lista as instancias pendentes
5. Voce aprova ou revoga
6. Depois da aprovacao, a instancia consegue subir normalmente

Exemplo para listar instancias no mock local:

```powershell
Invoke-RestMethod -Method Get `
  -Uri http://127.0.0.1:4010/control/instances `
  -Headers @{ 'x-admin-key' = 'admin-local' }
```

Exemplo para aprovar:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:4010/control/instances/SEU_INSTANCE_ID/approve `
  -Headers @{ 'x-admin-key' = 'admin-local' } `
  -ContentType 'application/json' `
  -Body '{"approvedBy":"solano","reason":"Liberado para uso"}'
```

Exemplo para revogar:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:4010/control/instances/SEU_INSTANCE_ID/revoke `
  -Headers @{ 'x-admin-key' = 'admin-local' } `
  -ContentType 'application/json' `
  -Body '{"reason":"Acesso encerrado"}'
```

## Como outro desenvolvedor comecar (ex: Caio)

### Se o Caio vai apenas programar

1. Clonar o repositorio
2. Rodar `npm install`
3. Criar `.env` com base em `.env.example`
4. Rodar `npm test`
5. Implementar a alteracao
6. Te mandar PR ou push, conforme a permissao que voce der no GitHub

Nesse fluxo ele nao precisa de QR Code nem de uma instancia aprovada.

### Se o Caio vai rodar uma instancia propria

Voce precisa fazer 3 coisas daqui:

1. dar a chave de registro que voce decidiu usar
2. aprovar a instancia dele no backend de controle
3. garantir que o numero dele esteja autorizado na licenca e, se necessario, em `ADMIN_NUMBERS`

Depois disso, o fluxo dele e:

1. `git clone`
2. `npm install`
3. configurar `.env`
4. `npm run mock:control` se estiver usando o mock local
5. `npm start`
6. escanear o QR com o numero que ele vai usar
7. esperar aprovacao ou reiniciar depois que voce aprovar

## Como voce testar por aqui

Fluxo operacional recomendado:

1. conferir seu `.env`
2. subir `npm run mock:control` se quiser demonstrar tudo localmente
3. em outro terminal, rodar `npm start`
4. esperar os logs:
   - `Bot conectado`
   - `Bot online`
   - `Licenca valida`
   - `Instancia autorizada pelo controle remoto` ou mensagem de pendencia/revogacao
5. testar no WhatsApp:
   - `!ping`
   - `!status`
   - `!admin auth`
   - `!admin usage`
   - `!welcome`
6. testar moderacao em grupo com cuidado

Mensagem suspeita de exemplo:

```text
bet agora https://site-suspeito.com
```

Esperado:

- mensagem apagada
- tentativa de remover o usuario do grupo
- tentativa de bloquear o contato
- log da acao

## 7. Como rodar os testes

```bash
npm test
```

Cobertura atual:

- loader de comandos
- parser de comandos
- fluxo de mensagens
- cenarios de erro
- reply service
- executor central
- telemetria
- moderacao
- admin
- rate limit
- auth service
- control service
- mock de licenca e controle

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
│  ├─ admin.js
│  └─ admin/
│     └─ usage.js
├─ services/
│  ├─ authService.js
│  ├─ commandExecutor.js
│  ├─ controlService.js
│  ├─ loggerService.js
│  ├─ moderationService.js
│  ├─ replyService.js
│  └─ usageService.js
├─ mock-license-api.js
├─ license.js
├─ authService.js
├─ utils/
│  ├─ isAdmin.js
│  ├─ rateLimiter.js
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

- nao versione `.wwebjs_auth/`
- nao versione `.wwebjs_cache/`
- nao versione `.bot-control/`
- nao versione `.env`
- nao versione `node_modules/`
- `.bot-control/instance.json` guarda a identidade persistente da instancia
- telemetria fica em memoria e zera ao reiniciar
- moderacao roda antes dos comandos
- `CONTROL_REGISTRATION_KEY` deve ser tratada como segredo operacional
- repositrio publico mostra o codigo, nao concede uso do bot por si so

## 10. Troubleshooting basico

### O bot bloqueia na inicializacao

Verifique nesta ordem:

- `LICENSE_API_URL`
- `CONTROL_API_URL`
- `CONTROL_REGISTRATION_KEY`
- status da instancia no backend de controle
- se o numero esta permitido pela licenca ou fallback

### Quero ver quem esta usando

Liste as instancias no backend de controle.

No mock local:

```powershell
Invoke-RestMethod -Method Get `
  -Uri http://127.0.0.1:4010/control/instances `
  -Headers @{ 'x-admin-key' = 'admin-local' }
```

### Quero derrubar uma instancia

Revogue a instancia pelo backend. No heartbeat seguinte, o bot encerra.

### O Caio consegue programar sem rodar o bot real?

Sim. Para programar ele precisa de codigo, `npm install` e `npm test`.

### Como aceitar so eu, o Caio e mais uma pessoa?

Modelo recomendado:

1. mantenha `ADMIN_NUMBERS` apenas com os numeros que devem ter poder administrativo
2. mantenha a licenca remota ou o fallback local apenas com os numeros permitidos
3. aprove no controle remoto apenas as instancias dessas pessoas
4. se uma delas perder acesso, revogue a instancia no backend e remova o numero da licenca/admin se necessario

### O que voce precisa fazer daqui para liberar o Caio

- se ele so vai programar: dar acesso no GitHub ou receber PR dele
- se ele vai operar instancia: entregar `CONTROL_REGISTRATION_KEY`, aprovar a instancia dele e liberar o numero dele na licenca

## Comandos atuais

- `!help`: lista os comandos disponiveis
- `!info`: mostra horario atual, id do chat e quantidade de argumentos
- `!ping`: responde com `pong`
- `!status`: mostra licenca, controle de instancia e uptime
- `!test`: responde com `comando test funcionando`
- `!welcome`: exemplo simples de onboarding
- `!admin status|auth|commands|usage`: comandos administrativos
