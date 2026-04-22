# Bot-WPP-WB-SC

Bot de WhatsApp baseado em `whatsapp-web.js` com carregamento automatico de comandos, tratamento centralizado de respostas, autorizacao remota por numero, telemetria de uso, moderacao automatica e testes automatizados.

## 1. Descricao do projeto

Este projeto inicia um cliente do WhatsApp Web, autentica via QR Code e executa comandos recebidos em mensagens com prefixo `!`.

Exemplos:

- `!test`
- `!ping`
- `!info a b`
- `!help`

## 1.1 Limite real de seguranca

Este repositorio pode ser publico, entao qualquer pessoa pode baixar o codigo.

O controle real do sistema nao acontece no Git. Ele acontece em 3 camadas:

- autorizacao do numero via `LICENSE_API_URL`
- fallback local via `LOCAL_AUTHORIZED_NUMBERS`
- comandos administrativos via `ADMIN_NUMBERS`

Isso significa:

- uma pessoa pode ate ver o codigo se o repositorio for publico
- mas nao consegue subir uma instancia funcional do bot sem passar pela autorizacao
- e nao consegue usar comandos administrativos sem estar na lista de admins

Se voce quiser impedir leitura do codigo tambem, o caminho nao e tecnico dentro do bot. O caminho e tornar o repositorio privado.

Tambem existe uma diferenca pratica entre 3 tipos de acesso:

- acesso ao codigo para leitura: depende de o repositorio ser publico ou privado
- acesso ao codigo para escrever no repositorio principal: depende de voce dar permissao no GitHub
- acesso ao bot em execucao: depende da licenca, fallback local e lista de admins

Essas camadas sao independentes. Dar acesso ao Git para o Caio nao significa dar acesso operacional ao bot. E deixar o repositorio publico nao significa liberar o bot para qualquer pessoa.

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

- analisar moderacao antes de qualquer comando
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
- `usageService.js`: telemetria de uso em memoria
- `moderationService.js`: anti-spam e acao automatica em grupos

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

## 6.3 Quem precisa escanear QR Code

### Cenario 1: voce operando o bot oficial

Esse e o fluxo principal do projeto hoje.

- o numero do bot ja esta autenticado na sua maquina
- voce roda o bot aqui
- voce testa aqui
- o bot real responde daqui

Nesse cenario, so voce precisa manter a sessao do WhatsApp funcionando.

### Cenario 2: Caio apenas desenvolvendo

Se o Caio so vai:

- implementar codigo
- rodar testes
- subir no Git

entao ele nao precisa escanear QR Code.

Ele nao precisa instalar outro WhatsApp so para programar.

### Cenario 3: Caio rodando uma instancia propria para teste real

So nesse caso o Caio precisaria:

- criar o `.env` dele
- estar autorizado pela licenca ou pelo fallback
- rodar `npm start`
- escanear QR Code com um numero que ele controla

Ou seja: escanear QR Code e um requisito de operacao do bot, nao de desenvolvimento do codigo.

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

Antes de tudo, defina qual acesso o Caio vai ter.

### Opcao A: Caio so implementa e te envia alteracoes

Fluxo recomendado quando voce quer manter controle forte.

- se o repositorio for publico, ele pode clonar, criar um fork e te enviar Pull Request
- se o repositorio for privado, voce precisa adicionar o Caio como colaborador no GitHub para ele acessar
- nesse modelo, ele nao precisa operar o bot oficial

### Opcao B: Caio tambem pode escrever direto no repositorio principal

Nesse caso, alem do acesso de leitura, voce precisa adicionar permissao de escrita para ele no GitHub.

Isso continua sendo diferente de dar acesso ao bot em execucao.

### Se o Caio vai apenas programar e subir no Git

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

4. Rodar os testes

```bash
npm test
```

5. Implementar a alteracao

6. Enviar a alteracao

Opcoes:

- se ele tiver acesso de escrita, pode fazer push na branch combinada
- se nao tiver, ele cria um fork e te manda Pull Request

Nesse fluxo ele nao precisa escanear QR Code.

### Se o Caio precisar rodar uma instancia dele para teste real

Voce precisa decidir uma destas opcoes:

1. autorizar o numero dele na API de licenca
2. colocar o numero dele em `LOCAL_AUTHORIZED_NUMBERS` no `.env` dele
3. colocar o numero dele em `ADMIN_NUMBERS` se voce quiser dar privilegio administrativo

Depois disso, o fluxo dele fica:

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

5. Ajustar o `.env` dele com um numero autorizado

6. Iniciar o bot

```bash
npm start
```

7. Escanear o QR code no WhatsApp

8. Testar um comando simples

```text
!ping
```

## Como voce testar por aqui

Esse e o fluxo operacional mais importante, porque e daqui que o bot oficial realmente responde.

1. Confirmar que o numero oficial continua autenticado

2. Conferir seu `.env`

Exemplo:

```env
LICENSE_API_URL=http://127.0.0.1:4010/licenca
LOCAL_AUTHORIZED_NUMBERS=SEU_NUMERO@c.us
ADMIN_NUMBERS=SEU_NUMERO@c.us
LICENSE_REVALIDATION_INTERVAL_MS=300000
```

3. Se quiser testar sem backend real, subir o mock:

```bash
npm run mock:license
```

4. Em outro terminal, iniciar o bot:

```bash
npm start
```

5. Esperar os logs:

- `Bot conectado`
- `Bot online`
- `Licenca valida`

6. Testar comandos basicos no WhatsApp:

```text
!ping
!status
!admin auth
!admin usage
!welcome
```

7. Testar moderacao em grupo com cuidado

Exemplo de mensagem suspeita:

```text
bet agora https://site-suspeito.com
```

Esperado:

- mensagem apagada
- tentativa de remover o usuario do grupo quando possivel
- tentativa de bloquear contato
- log da acao no terminal

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
- telemetria de uso
- moderacao automatica
- rate limit
- validacao de admin

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

- Nao versione `.wwebjs_auth/`
- Nao versione `.wwebjs_cache/`
- Nao versione `node_modules/`
- Nao versione `.env`
- O estado de autenticacao do WhatsApp fica em `.wwebjs_auth/`
- Se esse diretorio for apagado, sera necessario escanear o QR Code novamente
- `LOCAL_AUTHORIZED_NUMBERS` funciona como fallback de seguranca quando a API remota falha
- `ADMIN_NUMBERS` define quem pode usar os comandos administrativos
- telemetria de uso fica em memoria e zera ao reiniciar o processo
- moderacao automatica roda antes do processamento de comandos

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

### O Caio consegue programar sem rodar o bot real?

- Sim
- para programar, ele so precisa do codigo, `npm install` e `npm test`
- ele so precisa escanear QR se for subir uma instancia propria para teste real

### O que eu preciso fazer daqui para o Caio conseguir trabalhar?

- decidir se ele vai trabalhar so via Pull Request ou com acesso direto ao repositorio principal
- se o repositorio for privado, adicionar o Caio como colaborador no GitHub
- se ele precisar rodar uma instancia propria, autorizar o numero dele na licenca remota ou no fallback local
- se ele precisar usar comandos administrativos, adicionar o numero dele em `ADMIN_NUMBERS`
- se ele so for programar e te mandar codigo, nada disso de QR Code e necessario

### Como impedir alguem de usar o bot mesmo com o codigo publico?

- mantenha a validacao remota de licenca funcionando
- mantenha a lista de fallback local restrita
- mantenha `ADMIN_NUMBERS` restrito
- se quiser impedir leitura do codigo, torne o repositorio privado

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
- `!admin status|auth|commands|usage`: comandos administrativos para numeros autorizados
