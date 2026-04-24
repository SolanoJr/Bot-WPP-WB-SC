# Bot-WPP

Sistema operacional para bot de WhatsApp com:

- bot em `whatsapp-web.js`
- backend real em Node.js + Express
- persistencia em SQLite
- controle de instancias
- telemetria de uso
- coleta de feedback
- pronto para deploy no Render

## Visao geral

O repositorio pode continuar publico para demonstracao. O uso real do bot continua controlado por voce em duas camadas:

- licenca por numero do WhatsApp
- autorizacao de instancia no backend

Traduzindo sem romantizar:

- qualquer pessoa pode clonar o codigo
- nem toda pessoa consegue operar o bot
- a instancia so funciona se o backend responder `authorized`
- voce consegue ver quem esta usando, quais comandos foram usados e revogar a instancia quando quiser

## Stack

### Bot

- Node.js
- `whatsapp-web.js`
- `qrcode-terminal`
- `axios`
- `dotenv`
- Jest

### Backend

- Node.js
- Express
- SQLite com `better-sqlite3`
- `dotenv`

## Requisitos

- Node.js 18+
- npm 9+
- acesso a internet
- um numero de WhatsApp autenticado para operar o bot oficial

## Estrutura

```text
bot-wpp/
├─ backend/
│  ├─ app.js
│  ├─ database/
│  │  ├─ connection.js
│  │  └─ init.js
│  ├─ repositories/
│  │  ├─ feedbackRepository.js
│  │  ├─ instanceRepository.js
│  │  └─ usageRepository.js
│  ├─ routes/
│  │  ├─ feedbackRoutes.js
│  │  ├─ instanceRoutes.js
│  │  └─ usageRoutes.js
│  └─ services/
│     ├─ feedbackService.js
│     ├─ instanceService.js
│     └─ usageService.js
├─ commands/
├─ services/
├─ utils/
├─ whatsapp.js
├─ index.js
├─ mock-license-api.js
├─ render.yaml
├─ .env.example
└─ README.md
```

## Backend local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Criar `.env`

Use o arquivo `.env.example` como base.

Exemplo minimo para backend + bot local:

```env
PORT=4010
DB_PATH=./backend/database.sqlite
ADMIN_API_KEY=trocar_essa_chave
CONTROL_API_URL=http://127.0.0.1:4010
CONTROL_REGISTRATION_KEY=troque-essa-chave
CONTROL_HEARTBEAT_INTERVAL_MS=60000
INSTANCE_OPERATOR_NAME=solano
INSTANCE_LABEL=pc-principal
LOCATION_CAPTURE_BASE_URL=http://127.0.0.1:4010
LOCATION_REQUEST_TTL_MS=600000
LICENSE_API_URL=http://127.0.0.1:4010/licenca
LOCAL_AUTHORIZED_NUMBERS=5511999999999@c.us
ADMIN_NUMBERS=5511999999999@c.us
LICENSE_REVALIDATION_INTERVAL_MS=300000
```

### 3. Subir o backend

```bash
npm start
```

Isso sobe o backend em `http://127.0.0.1:4010` por padrao.

### 4. Subir o bot

Em outro terminal:

```bash
npm run bot:start
```

## Fluxo do sistema

### `index.js`

Ponto de entrada do bot.

### `whatsapp.js`

Orquestra tudo do lado do bot:

- carrega comandos automaticamente
- valida licenca do numero
- registra a instancia no backend
- inicia heartbeat periodico
- aplica moderacao antes dos comandos
- executa comandos com `commandExecutor`
- envia telemetria de uso ao backend quando o comando executa com sucesso

### `backend/app.js`

Ponto de entrada do backend:

- inicializa Express
- cria schema SQLite
- registra rotas
- responde requests de instancias, uso e feedback

### `commands/`

Cada comando segue o contrato:

```js
module.exports = {
  name: 'nome',
  description: 'descricao',
  async execute(msg, args, context) {
    // logica
  }
};
```

### `services/`

No bot:

- `authService.js`: licenca por numero
- `controlService.js`: registro e heartbeat da instancia
- `backendTelemetryService.js`: envio de uso e feedback para o backend
- `commandExecutor.js`: execucao centralizada
- `replyService.js`: respostas padronizadas
- `loggerService.js`: logs estruturados

No backend:

- `instanceService.js`: registro, heartbeat, aprovacao e revogacao
- `usageService.js`: persistencia e resumo de uso
- `feedbackService.js`: persistencia de feedback

## Banco de dados

O backend cria 3 tabelas:

### `instances`

- `id`
- `machineId`
- `instanceName`
- `operatorName`
- `whatsappNumber`
- `status`
- `createdAt`
- `updatedAt`
- `lastHeartbeatAt`

### `command_usage`

- `id`
- `instanceId`
- `whatsappNumber`
- `commandName`
- `args`
- `groupId`
- `userId`
- `timestamp`

### `feedback`

- `id`
- `instanceId`
- `whatsappNumber`
- `userId`
- `groupId`
- `message`
- `createdAt`

## Endpoints do backend

### Instancias

- `POST /instances/register`
- `POST /instances/heartbeat`
- `GET /instances`
- `POST /instances/:id/approve`
- `POST /instances/:id/revoke`

### Uso e feedback

- `POST /usage`
- `GET /usage/summary`
- `POST /feedback`

### Localizacao

- `POST /location/request`
- `GET /location/capture/:requestId`
- `POST /location/report`

## Seguranca minima

Os endpoints abaixo exigem header `x-admin-key` igual ao valor de `ADMIN_API_KEY`:

- `GET /instances`
- `POST /instances/:id/approve`
- `POST /instances/:id/revoke`
- `GET /usage/summary`

O registro de instancia e o envio de uso/feedback nao usam essa chave de admin.

## Como conectar o bot ao backend

No `.env` do bot:

```env
CONTROL_API_URL=http://127.0.0.1:4010
LICENSE_API_URL=http://127.0.0.1:4010/licenca
```

Regra operacional:

- se a licenca falhar, o bot nao sobe
- se a instancia vier `pending` ou `revoked`, o bot nao opera
- se o heartbeat devolver `revoked`, o processo encerra

## Como aprovar instancias

### 1. Registrar uma instancia

Quando o bot sobe, ele tenta registrar automaticamente em:

- `POST /instances/register`

### 2. Ver instancias pendentes

Exemplo em PowerShell:

```powershell
Invoke-RestMethod -Method Get `
  -Uri http://127.0.0.1:4010/instances `
  -Headers @{ 'x-admin-key' = 'trocar_essa_chave' }
```

### 3. Aprovar

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:4010/instances/SEU_INSTANCE_ID/approve `
  -Headers @{ 'x-admin-key' = 'trocar_essa_chave' } `
  -ContentType 'application/json' `
  -Body '{"approvedBy":"solano","reason":"Liberado para uso"}'
```

### 4. Revogar

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:4010/instances/SEU_INSTANCE_ID/revoke `
  -Headers @{ 'x-admin-key' = 'trocar_essa_chave' } `
  -ContentType 'application/json' `
  -Body '{"reason":"Acesso encerrado"}'
```

## Telemetria de uso

Depois que um comando executa com sucesso, o bot envia para `POST /usage`:

- instancia
- numero do bot
- comando
- argumentos
- grupo
- usuario
- timestamp

Para consultar resumo:

```powershell
Invoke-RestMethod -Method Get `
  -Uri http://127.0.0.1:4010/usage/summary `
  -Headers @{ 'x-admin-key' = 'trocar_essa_chave' }
```

O resumo inclui:

- top comandos
- top usuarios
- uso por grupo

## Feedback

Comando do bot:

```text
!feedback sua mensagem aqui
```

Comportamento:

- salva no backend via `POST /feedback`
- responde `feedback enviado com sucesso`

## Localizacao (`!ondeestou`)

Comando do bot:

```text
!ondeestou
```

Comportamento:

- cria uma solicitacao curta de localizacao no backend
- devolve um link para o usuario abrir no navegador
- ao permitir geolocalizacao, o backend recebe latitude/longitude
- se `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` estiverem definidos, envia no Telegram tambem

## Deploy no Render

O projeto ja esta preparado com `render.yaml`.

### Configuracao esperada

- Build command: `npm install`
- Start command: `node backend/app.js`

### Variaveis de ambiente no Render

- `PORT`
- `DB_PATH`
- `ADMIN_API_KEY`
- `CONTROL_REGISTRATION_KEY`
- `LOCATION_CAPTURE_BASE_URL`
- `LOCATION_REQUEST_TTL_MS`
- `TELEGRAM_BOT_TOKEN` (opcional)
- `TELEGRAM_CHAT_ID` (opcional)

Se o bot for rodar apontando para esse backend remoto, no `.env` da maquina que opera o bot:

```env
CONTROL_API_URL=https://SEU_BACKEND_RENDER
LICENSE_API_URL=https://SEU_BACKEND_RENDER/licenca
```

## Mock local

Se quiser demonstrar o fluxo sem backend real:

```bash
npm run mock:control
```

Esse mock responde:

- `GET /licenca`
- `POST /instances/register`
- `POST /instances/heartbeat`
- `GET /instances`
- `POST /instances/:id/approve`
- `POST /instances/:id/revoke`
- `POST /usage`
- `GET /usage/summary`
- `POST /feedback`

## Como outro dev comeca

### Caso 1: Caio so vai codar

Fluxo:

1. clonar o repositorio
2. rodar `npm install`
3. criar `.env` a partir de `.env.example`
4. rodar `npm test`
5. implementar a mudanca
6. subir para o Git

Nesse caso ele nao precisa escanear QR e nao precisa operar o bot oficial.

### Caso 2: Caio vai rodar instancia dele

Alem do fluxo acima, voce precisa:

1. autorizar o numero dele na licenca
2. aprovar a instancia dele no backend
3. se quiser comando admin, colocar o numero dele em `ADMIN_NUMBERS`

## Como voce testa por aqui

### Backend

```bash
npm start
```

### Bot

```bash
npm run bot:start
```

### Fluxo esperado

1. backend sobe
2. bot gera QR
3. voce escaneia
4. bot conecta
5. backend recebe `register`
6. se a instancia estiver aprovada, o bot continua operando

### Testes manuais uteis

- `!ping`
- `!status`
- `!help`
- `!feedback teste rapido`
- `!ondeestou`
- `!admin usage`

## Scripts

- `npm start`: sobe o backend
- `npm run dev`: sobe o backend com nodemon
- `npm run bot:start`: sobe o bot
- `npm run mock:control`: sobe mock local
- `npm test`: roda os testes

## Logs

Os logs sao estruturados e cobrem:

- registro de instancia
- heartbeat
- aprovacao e revogacao
- execucao de comandos
- uso registrado
- feedback recebido

## Observacoes importantes

- nao versione `.env`
- nao versione `.wwebjs_auth/`
- nao versione `.wwebjs_cache/`
- nao versione `.bot-control/`
- nao versione `node_modules/`
- nao versione arquivos `.sqlite`

## Troubleshooting

### O bot nao sobe

Verifique nesta ordem:

1. `LICENSE_API_URL`
2. `CONTROL_API_URL`
3. status da instancia no backend
4. numero autorizado na licenca ou no fallback local

### O backend sobe mas a instancia fica `pending`

Isso nao e bug. Significa que voce ainda nao aprovou a instancia.

### Quero derrubar alguem

Revogue a instancia via endpoint `POST /instances/:id/revoke`.

### Quero ver quem esta usando

Consulte `GET /instances` e `GET /usage/summary`.

### Quero permitir so eu, Caio e mais uma pessoa

Voce precisa controlar 3 listas:

1. numeros autorizados na licenca
2. `ADMIN_NUMBERS` para quem pode usar comandos admin
3. instancias aprovadas no backend

Se tirar uma dessas permissoes, a pessoa perde operacao parcial ou total.
