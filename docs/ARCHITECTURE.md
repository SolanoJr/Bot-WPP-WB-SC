# 🏗️ Arquitetura do Sistema WarriorBlack-Bot

Este documento detalha o fluxo de comunicação e a topografia estratégica do ecossistema do Bot.

## 📡 Visão Geral

O sistema é composto por três pilares integrados que garantem estabilidade, escalabilidade e bypass de limitações geográficas:

```mermaid
graph TD
    A[Bot - Servidor Linux/VPS] <-->|Polling & Auth| B[Relay Server - Render.com]
    C[Frontend - Cloudflare Pages] -->|POST Location| B
    A <-->|WhatsApp Protocol| D[WhatsApp Web API]
    E[Usuário] <-->|Interação| D
    E <-->|GPS| C
```

---

## 🛠️ Componentes

### 1. Bot Core (O Cérebro)
- **Localização**: Servidor Linux (VPS) via PM2.
- **Tecnologia**: Node.js + `whatsapp-web.js`.
- **Função**: Gerencia comandos, integração com Gemini IA e processa as localizações recebidas do Relay.
- **Identificador PM2**: `WarriorBlack-Bot`.

### 2. Relay Server (A Ponte)
- **Localização**: PaaS Render.com.
- **Tecnologia**: Express.js + SQLite.
- **Função**: Atua como um buffer persistente e centralizador. Recebe dados do Frontend e os armazena até que o Bot os solicite via Polling.
- **Segurança**: Autenticação via `x-api-key` e bypass de CORS para o domínio do Cloudflare.

### 3. Frontend Geolocation (A Interface)
- **Localização**: Cloudflare Pages.
- **Tecnologia**: HTML5 + Vanilla JS + Geolocation API.
- **Função**: Página web minimalista e premium que captura as coordenadas GPS do usuário e as envia para o Relay.

---

## 🔐 Fluxo de Autenticação

Todas as comunicações entre os pilares são protegidas pela `API_KEY` (Chave de Elite):

1. **Bot -> Relay**: Envia a chave no header `x-api-key` em todas as requisições de Polling.
2. **Frontend -> Relay**: A chave é passada via parâmetro de URL pelo Bot e injetada no header da requisição POST.
3. **Relay**: Valida a chave contra a variável de ambiente (Environment Variable) antes de qualquer processamento.

---

## 📂 Estrutura de Pastas (Topografia)

- `/commands`: Lógica de cada comando do bot (ex: `$pergunta`, `$ondeestou`).
- `/relay`: Código fonte do servidor intermediário (deploy no Render).
- `/public`: Arquivos estáticos do frontend (deploy no Cloudflare).
- `/scripts`: Ferramentas de manutenção e testes.
- `/docs`: Documentação técnica e estratégica.
- `/services`: Integrações externas (IA Gemini, etc).

---

## 🚀 Ciclo de Vida de uma Localização

1. Usuário digita `$ondeestou`.
2. Bot gera um link único (Token + ChatId + Key) e envia ao usuário.
3. Usuário abre o link no Cloudflare Pages.
4. Frontend captura GPS e faz POST para o Relay.
5. Relay armazena no SQLite.
6. Bot faz Polling no Relay, encontra o dado e envia o mapa no WhatsApp.
7. O dado é marcado como processado e limpo após 24h.
