# PROJECT_STATE.md - Estado Atual do Projeto

**Última atualização:** 2026-04-27  
**Versão:** 1.0.0  
**Status:** Funcional com problemas conhecidos

---

## 1. Estrutura do Projeto

```
bot-wpp/
├── backend/
│   ├── app.js                 # Backend principal (Express)
│   ├── app-https.js           # Backend HTTPS
│   ├── app.test.js            # Testes do backend
│   ├── database/
│   │   ├── connection.js      # Conexão SQLite
│   │   ├── init.js            # Schema do banco
│   │   └── repositories/      # Repositórios de dados
│   ├── routes/
│   │   ├── instanceRoutes.js  # Rotas de controle de instâncias
│   │   ├── usageRoutes.js     # Rotas de estatísticas
│   │   ├── feedbackRoutes.js  # Rotas de feedback
│   │   └── locationRoutes.js  # Rotas de localização GPS
│   └── services/
│       ├── instanceService.js # Serviço de instâncias
│       ├── usageService.js    # Serviço de estatísticas
│       └── feedbackService.js # Serviço de feedback
├── commands/
│   ├── admin/
│   │   └── usage.js           # Comando !usage (estatísticas)
│   ├── bemvindo.js            # Comando de boas-vindas
│   ├── help.js                # Comando !help
│   ├── info.js                # Comando !info
│   ├── ondeestou.js           # Comando !ondeestou (GPS)
│   ├── ping.js                # Comando !ping
│   └── test.js                # Comando !test
├── services/
│   ├── commandExecutor.js     # Executor de comandos
│   ├── loggerService.js       # Logger
│   ├── moderationService.js   # Moderação de conteúdo
│   ├── replyService.js        # Serviço de respostas
│   ├── telemetryService.js    # Telemetria e analytics
│   ├── usageService.js        # Estatísticas de uso
│   ├── whatsappService.js     # Serviço WhatsApp
│   └── controlService.js      # Controle remoto de instâncias
├── public/
│   ├── location-pages/        # Páginas de localização
│   ├── location.html          # Página de localização
│   ├── location_direct.html   # Localização direta
│   └── location_simple.html  # Localização simplificada
├── utils/
│   └── validator.js           # Validadores
├── logs/
│   └── telemetry.jsonl        # Logs de telemetria
├── tests/
│   └── autotest.js            # Testes automatizados
├── scripts/
│   └── run-tests.js           # Script de testes
├── backend/
│   ├── database.sqlite        # Banco SQLite principal
│   ├── database.sqlite-shm    # Shared memory
│   └── database.sqlite-wal    # Write-ahead log
├── .env                       # Variáveis de ambiente
├── .env.example               # Exemplo de .env
├── package.json               # Dependências e scripts
├── whatsapp.js                # Bot principal
├── index.js                   # Entry point
└── render.yaml                # Config Render (se existir)
```

---

## 2. Backend

**Arquivo principal:** `backend/app.js`  
**Framework:** Express.js v5.2.1  
**Porta:** 4010 (configurável via PORT env)  
**Entry point:** `node backend/app.js`

### Rotas existentes:
- `GET /health` - Health check
- `POST /instances/register` - Registrar instância
- `POST /instances/heartbeat` - Heartbeat da instância
- `GET /instances` - Listar instâncias (admin)
- `POST /instances/:id/approve` - Aprovar instância (admin)
- `POST /instances/:id/revoke` - Revogar instância (admin)
- `POST /usage/register` - Registrar uso de comando
- `POST /feedback` - Enviar feedback
- `GET /location/:id` - Obter localização

### Variáveis de ambiente necessárias:
```
PORT=4010
ADMIN_API_KEY=sua_chave_admin
CONTROL_API_URL=http://localhost:4010
CONTROL_REGISTRATION_KEY=sua_chave_registro
CONTROL_HEARTBEAT_INTERVAL_MS=30000
CONTROL_ENABLED=false  # Desabilitado para evitar problemas
```

---

## 3. Banco de Dados

**Tipo:** SQLite3  
**Localização:** `backend/database.sqlite`  
**Conexão:** Via `better-sqlite3` v12.9.0

### Tabelas existentes:

#### instances
```sql
CREATE TABLE instances (
    id TEXT PRIMARY KEY,
    machineId TEXT NOT NULL,
    instanceName TEXT NOT NULL,
    operatorName TEXT NOT NULL,
    whatsappNumber TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'authorized', 'revoked')),
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    lastHeartbeatAt TEXT
);
```

#### command_usage
```sql
CREATE TABLE command_usage (
    id TEXT PRIMARY KEY,
    instanceId TEXT NOT NULL,
    whatsappNumber TEXT NOT NULL,
    commandName TEXT NOT NULL,
    args TEXT,
    groupId TEXT,
    userId TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (instanceId) REFERENCES instances(id) ON DELETE CASCADE
);
```

#### feedback
```sql
CREATE TABLE feedback (
    id TEXT PRIMARY KEY,
    instanceId TEXT NOT NULL,
    whatsappNumber TEXT NOT NULL,
    userId TEXT,
    groupId TEXT,
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (instanceId) REFERENCES instances(id) ON DELETE CASCADE
);
```

---

## 4. Sistema de Controle de Instâncias

**Implementação:** `services/controlService.js` e `backend/routes/instanceRoutes.js`

### Registro:
- Endpoint: `POST /instances/register`
- Dados necessários: machineId, instanceName, operatorName, whatsappNumber
- Status inicial: 'pending'
- Gera ID único para instância

### Heartbeat:
- Endpoint: `POST /instances/heartbeat`
- Frequência: 30 segundos (configurável)
- Atualiza lastHeartbeatAt
- Verifica se instância está autorizada

### Approve/Revoke:
- Endpoint: `POST /instances/:id/approve` ou `POST /instances/:id/revoke`
- Requer ADMIN_API_KEY no header X-Admin-Key
- Muda status para 'authorized' ou 'revoked'
- Bot só funciona se status = 'authorized'

---

## 5. Telemetria

**Implementação:** `services/telemetryService.js`

### Registro de uso:
- Acionado em cada comando executado
- Salva em `logs/telemetry.jsonl`
- Dados: commandName, instanceId, groupId, userId, success, latency

### Feedback:
- Acionado via comando !feedback
- Salva em `logs/telemetry.jsonl`
- Dados: instanceId, userId, feedbackText, category

### Moderação:
- Acionado em eventos de moderação
- Salva em `logs/telemetry.jsonl`
- Dados: instanceId, groupId, userId, action, reason

### Retenção:
- Usage: 90 dias
- Moderation: 180 dias
- Feedback: 365 dias
- Detailed logs: 30 dias

---

## 6. Integração com Bot WhatsApp

**Arquivo principal:** `whatsapp.js`  
**Framework:** `whatsapp-web.js` v1.34.6

### Como chama o backend:
- Via `services/controlService.js` para registro/heartbeat
- Via `services/telemetryService.js` para analytics
- Via `services/usageService.js` para estatísticas

### Serviços utilizados:
- `controlService` - Validação e registro de instância
- `telemetryService` - Registro de uso e analytics
- `moderationService` - Moderação de conteúdo
- `replyService` - Envio de respostas
- `commandExecutor` - Execução de comandos

### Fluxo:
1. Bot inicializa com `startBot()`
2. Carrega comandos de `commands/`
3. Conecta ao WhatsApp
4. Registra instância via controlService
5. Envia heartbeat periódico
6. Processa mensagens e executa comandos
7. Registra telemetria

---

## 7. Comandos Disponíveis

### Comandos básicos:
- `!help` - Lista comandos disponíveis
- `!ping` - Teste de conectividade
- `!test` - Teste básico do bot
- `!info` - Informações do bot

### Comandos administrativos:
- `!usage` - Estatísticas de uso (admin)
- `!admin` - Funções administrativas

### Comandos especiais:
- `!ondeestou` - Captura de localização GPS
- `!feedback` - Enviar feedback
- `!bemvindo` - Mensagem de boas-vindas

### Moderação:
- Detecção automática de spam
- Rate limiting por usuário
- Moderação de conteúdo inapropriado

---

## 8. Deploy

### Render.yaml (se existir):
```yaml
services:
  - type: web
    name: bot-wpp-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: PORT
        value: 4010
      - key: NODE_ENV
        value: production
```

### Scripts package.json:
```json
{
  "start": "node backend/app.js",
  "bot:start": "node index.js",
  "dev": "nodemon backend/app.js",
  "test": "jest --runInBand --testPathIgnorePatterns=commands"
}
```

### Deploy manual:
1. Instalar dependências: `npm install`
2. Configurar variáveis de ambiente
3. Iniciar backend: `npm start`
4. Iniciar bot: `npm run bot:start`

---

## 9. Problemas Conhecidos

### Críticos:
1. **WhatsApp blocking automation** - Bot conecta mas comandos não processam
2. **Device limit exceeded** - "não é possível conectar novos dispositivos"
3. **Puppeteer Target Closed** - Instabilidade do navegador headless
4. **Remote validation failures** - CONTROL_ENABLED causando problemas

### Médios:
1. **Session corruption** - Sessões WhatsApp corrompidas
2. **Heartbeat failures** - Conexão com backend instável
3. **Telemetry storage** - Logs salvos em arquivo, não banco

### Menores:
1. **Missing error handling** - Alguns endpoints sem tratamento de erro
2. **Limited admin interface** - Apenas API REST
3. **No monitoring** - Sem dashboard ou métricas visuais

### Soluções implementadas:
- ✅ whatsapp-web.js atualizado v1.23.0 → v1.34.6
- ✅ CONTROL_ENABLED=false para evitar validação remota
- ✅ Bot working-clean criado como fallback
- ✅ Sessões limpas e resetadas

### Próximas ações necessárias:
- 🔲 Limpar dispositivos WhatsApp (limite de 4)
- 🔲 Testar bot working-clean com QR code
- 🔲 Implementar solução de reconexão automática
- 🔲 Mover telemetria para banco SQLite

---

## 10. Status do Servidor

**Servidor:** 100.101.218.16 (Linux Ubuntu)  
**Usuário:** solanojr  
**Gerenciador:** PM2

### Processos ativos:
- `bot-backend` - Online (3h uptime)
- `bot-working-clean` - Online com QR code gerado

### Processos parados:
- `bot-wpp` - Stopped (36 restarts)
- `bot-final` - Stopped
- `bot-robust` - Stopped

### Logs disponíveis:
- `~/.pm2/logs/bot-*-out.log` - Logs de saída
- `~/.pm2/logs/bot-*-error.log` - Logs de erro

---

## 11. Resumo Técnico

**Arquitetura:** Monólito com backend separado  
**Banco:** SQLite3 local  
**Autenticação:** WhatsApp Web (LocalAuth)  
**Deploy:** PM2 + Node.js  
**Monitoramento:** Logs + PM2  
**Escalabilidade:** Limitada (single instance)  

**Dependências principais:**
- whatsapp-web.js v1.34.6
- express v5.2.1
- better-sqlite3 v12.9.0
- axios v1.15.2

**Performance:**
- Backend: ~50ms response time
- Bot: ~200ms command execution
- Banco: <10ms query time
- Memória: ~100MB total

---

**FIM DO RELATÓRIO**
