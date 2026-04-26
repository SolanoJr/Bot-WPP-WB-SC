# 📍 Sistema de Localização !ondeestou

## 🎯 Visão Geral

Sistema completo de localização GPS para WhatsApp Bot com arquitetura produto-ready, seguro e escalável.

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Bot WPP       │    │   Backend API    │    │   Relay API     │
│   (Tailscale)   │◄──►│   (Tailscale)    │◄──►│   (Público)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲
                                │
                                ▼
                       ┌──────────────────┐
                       │  Página GPS      │
                       │ (Cloudflare Pages)│
                       └──────────────────┘
```

## 📋 Componentes

### 1. Bot WhatsApp (Tailscale)
- **Arquivo:** `commands/ondeestou.js`
- **Função:** Gera tokens, envia links, faz polling por respostas
- **Recursos:** Telemetria, tratamento de erros, timeout

### 2. Backend API (Tailscale)
- **Arquivo:** `backend/routes/locationRoutes.js`
- **Função:** Gerencia tokens, armazena localizações
- **Recursos:** Limpeza automática, validação

### 3. Relay API (Público)
- **Arquivo:** `relay/server.js`
- **Função:** Bridge público↔privado, endpoint para frontend
- **Deploy:** Render/Fly.io/Heroku (grátis)

### 4. Página GPS (HTTPS Válido)
- **Arquivo:** `public/location-pages/index.html`
- **Função:** Captura GPS, envia para relay
- **Deploy:** Cloudflare Pages (grátis)

### 5. Telemetria
- **Arquivo:** `services/telemetryService.js`
- **Função:** Registro de uso, retenção, analytics
- **Retenção:** 90 dias uso, 180 dias moderação, 365 dias feedback

### 6. Testes Automáticos
- **Arquivo:** `tests/autotest.js`
- **Função:** Validação de comandos, permissões, health endpoints
- **Execução:** `node scripts/run-tests.js`

## 🚀 Deploy

### 1. Servidor (Tailscale)
```bash
# Atualizar código
git pull
cd /home/solanojr/bot-wpp
npm install
pm2 restart bot-backend --update-env
pm2 restart bot-wpp --update-env
```

### 2. Relay API (Render)
```bash
# Criar conta no Render
# Fazer deploy de /relay/
# Configurar variáveis:
# BACKEND_URL=http://100.101.218.16:4010
# RELAY_AUTH=sua-chave-secreta
```

### 3. Página GPS (Cloudflare Pages)
```bash
# Criar conta no Cloudflare
# Fazer deploy de /public/location-pages/
# Configurar domínio: bot-wpp.pages.dev
```

### 4. Configuração Final
```bash
# No servidor
export RELAY_URL=https://bot-wpp-relay.onrender.com
export LOCATION_PAGE_URL=https://bot-wpp.pages.dev
pm2 restart bot-wpp --update-env
```

## 🧪 Testes

### Executar Suite Completa
```bash
node scripts/run-tests.js
```

### Testes Individuais
```bash
# Teste de comandos
node tests/autotest.js

# Health endpoints
curl http://127.0.0.1:4010/health
curl https://127.0.0.1:8443/health
```

## 📊 Fluxo Completo

1. **Usuário:** `!ondeestou`
2. **Bot:** Gera token + envia link HTTPS + infos do chat
3. **Usuário:** Clica link, permite GPS
4. **Página:** Captura coords, envia para relay
5. **Relay:** Repassa para backend (Tailscale)
6. **Backend:** Processa e armazena resposta
7. **Bot:** Polling, encontra resposta, envia WhatsApp

## 🔒 Segurança

- **HTTPS válido** (Cloudflare Pages)
- **Criptografia** end-to-end
- **Tokens únicos** com expiração
- **Sem dados sensíveis** em logs
- **Retenção automática** (LGPD compliance)

## 📈 Telemetria

### Dados Coletados
- `commandName`, `timestamp`, `instanceId`
- `groupId`, `userId`, `success/failure`
- `latency`, `argsCount`

### NÃO Coletado
- Conteúdo completo de mensagens
- Dados pessoais sensíveis
- Mídia/arquivos

## 🛠️ Manutenção

### Limpeza Automática
```bash
# Logs antigos (30 dias)
find ./logs -name "*.log" -mtime +30 -delete

# Telemetria expirada
node -e "require('./services/telemetryService').cleanup()"
```

### Monitoramento
```bash
# Status PM2
pm2 status
pm2 logs bot-wpp --lines 50

# Health check
curl http://127.0.0.1:4010/health
```

## 🚨 Troubleshooting

### GPS Não Funciona
- Verificar HTTPS válido: `https://bot-wpp.pages.dev`
- Testar em navegador moderno
- Permitir localização nas configurações

### Bot Não Responde
- Verificar relay: `curl https://bot-wpp-relay.onrender.com/health`
- Verificar backend: `curl http://127.0.0.1:4010/health`
- Verificar logs: `pm2 logs bot-wpp`

### Link Expirado
- Token válido por 10 minutos
- Gerar novo link com `!ondeestou`

## 📝 Changelog

### v2.0.0 - Arquitetura Produto-Ready
- ✅ Separação frontend/backend
- ✅ HTTPS válido (Cloudflare Pages)
- ✅ Relay API público
- ✅ Telemetria com retenção
- ✅ Testes automáticos
- ✅ Polling robusto

### v1.0.0 - Experimental
- ❌ HTTPS auto-assinado
- ❌ Backend tentando enviar WhatsApp
- ❌ Sem testes automáticos

## 🎯 Próximos Melhorias

- [ ] Dashboard de telemetria
- [ ] Geolocalização por IP (fallback)
- [ ] Multi-idiomas
- [ ] Rate limiting avançado
- [ ] Integração com maps API

---

**Status:** ✅ Produto-ready para deploy
