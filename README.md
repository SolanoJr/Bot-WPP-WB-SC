# 🤖 WarriorBlack Bot - Geolocation System

Sistema de geolocalização em tempo real integrado ao WhatsApp, utilizando uma arquitetura distribuída entre VPS (Bot), Render (Relay) e Cloudflare (Frontend).

## 🏗️ Arquitetura Atual (v1.0.0-JS-STABLE)

- **Bot (Linux VPS)**: Cliente WhatsApp Web que processa comandos e faz o polling de localizações.
- **Relay (Render)**: Servidor Node.js (v20.x) agindo como buffer intermediário. **Arquitetura Pure JS (In-Memory)**, sem dependências nativas para evitar erros de GLIBC.
- **Frontend (Cloudflare Pages)**: Interface web para captura de coordenadas GPS via navegador.

## 🔐 Protocolo de Segurança

O sistema utiliza a chave **WARRIOR_AUTH_KEY** (16 caracteres) para autenticar todas as pontas:
- **Frontend -> Relay**: POST `/location` com header `x-api-key`.
- **Bot -> Relay**: GET `/pending/:chatId` com header `x-api-key`.

## 🚀 Configuração de Ambiente

### Variáveis Necessárias (.env)
```env
WARRIOR_AUTH_KEY=solano_wb_gps_26
RELAY_URL=https://bot-wpp-relay.onrender.com
MASTER_USER=2026...4056@lid
```

### Portas e Endereços
- **Relay**: Rodando em `https://bot-wpp-relay.onrender.com` (Porta padrão 443).
- **Frontend**: Hospedado em `https://bot-wpp-wb-sc.pages.dev`.

## 🛠️ Scripts Disponíveis

- `npm start`: Inicia o Relay (específico para deploy no Render).
- `npm run bot:start`: Inicia o Bot do WhatsApp.
- `npm test`: Executa a suite de testes de integração e segurança.

## 🧠 Estrutura de Dados (In-Memory)

O Relay armazena temporariamente:
- `locations`: Array circular (máx 500) de localizações pendentes.
- `clients`: Map de metadados de usuários (visto por último, total de localizações).
- `telemetry`: Logs de inicialização das instâncias do bot.

---
*Backup de estabilidade disponível na branch: `stable-js-working-v1`*
