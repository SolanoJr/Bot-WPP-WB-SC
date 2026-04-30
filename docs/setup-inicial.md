# 🚀 SETUP INICIAL - COPIE E COLE

## 📋 PASSO 1: CRIAR ARQUIVO .env

**Crie o arquivo `.env` na raiz do projeto (mesma pasta do package.json) com este conteúdo:**

```bash
# 🔐 CONFIGURAÇÕES DE CONTROLE E LICENCIAMENTO
# Configurado para SolanoJr - Administrador do Sistema

# 🚨 LICENÇA DO SISTEMA
LICENSE_KEY=bot-wpp-2026-solanojr-abc123def456
LICENSE_EXPIRES=2027-12-31
ALLOWED_DOMAIN=localhost

# 👥 CONTROLE DE ACESSO
AUTHORIZED_DEVELOPERS=solanojr
OWNER_EMAIL=solanojr@example.com

# 📱 WHATSAPP - MULTI-DISPOSITIVO
MAIN_NUMBER=5588998314322
ALLOWED_NUMBERS=5588998314322
DEVICE_LIMIT=5

# 🌐 SERVIDORES
BACKEND_URL=http://100.101.218.16:4010
RELAY_URL=https://bot-wpp-relay.onrender.com
FRONTEND_URL=https://bot-wpp-wb-sc.pages.dev

# 📊 CONTROLE DE USUÁRIOS
ENABLE_USER_CONTROL=true
DEFAULT_DAILY_LIMIT=1000
ENABLE_BLOCKING=true
REQUIRE_AUTH=true

# 📝 LOGS E AUDITORIA
ENABLE_AUDIT_LOGS=true
LOG_LEVEL=info
AUDIT_RETENTION_DAYS=30

# 💰 CONTROLE COMERCIAL
ENABLE_BILLING=false
PAYMENT_WEBHOOK_URL=
SUBSCRIPTION_WEBHOOK_URL=

# 🔐 SEGURANÇA
JWT_SECRET=jwt_super_secreto_bot_wpp_2026_aqui_32_chars
API_KEY=api_bot_wpp_2026_secreta_aqui
ENCRYPTION_KEY=enc_key_32_characters_long_bot_wpp_2026

# 🚀 DESENVOLVIMENTO
NODE_ENV=development
DEBUG=false
MOCK_PAYMENTS=false
```

---

## 📋 PASSO 2: CRIAR ARQUIVO users.json

**Crie a pasta `data` (se não existir) e dentro dela o arquivo `users.json` com:**

```json
{
  "5588998314322@c.us": {
    "name": "Administrador",
    "status": "active",
    "dailyLimit": 999999,
    "blocked": false,
    "blockReason": null,
    "permissions": ["*"],
    "createdAt": "2026-04-28T00:00:00.000Z",
    "lastUsed": null
  },
  "default": {
    "name": "Usuário Padrão",
    "status": "active",
    "dailyLimit": 1000,
    "blocked": false,
    "blockReason": null,
    "permissions": ["ondeestou", "testrelay", "ping"],
    "createdAt": "2026-04-28T00:00:00.000Z",
    "lastUsed": null
  }
}
```

---

## 🎯 COMO CRIAR OS ARQUIVOS:

### **🪟 NO WINDOWS:**

1. **Abra o Bloco de Notas**
2. **Copie e cole** o conteúdo acima
3. **Arquivo → Salvar como...**
4. **Tipo:** "Todos os arquivos (*.*)"
5. **Nome:** `.env` (ponto na frente!)
6. **Salvar em:** `d:\Desktop\SolanoJr\Programas\bot-wpp\`

7. **Repita para `data/users.json`**

### **🪟 NO VSCODE:**

1. **File → New File**
2. **Cole o conteúdo**
3. **Ctrl+S**
4. **Nome:** `.env` ou `data/users.json`
5. **Salvar**

---

## ✅ VERIFICAÇÃO

**Depois de criar os arquivos:**

1. **Verifique se existem:**
   ```
   d:\Desktop\SolanoJr\Programas\bot-wpp\.env
   d:\Desktop\SolanoJr\Programas\bot-wpp\data\users.json
   ```

2. **Execute o bot:**
   ```bash
   node whatsapp.js
   ```

3. **Teste no WhatsApp:**
   ```
   !admin status
   ```

**Se aparecer "Comando restrito a administradores" → FUNCIONOU!**

---

## 🚨 IMPORTANTE

- **NÃO** envie esses arquivos para o GitHub
- **NÃO** compartilhe suas chaves
- **GUARDE** os arquivos em local seguro
- **CRIE** novos arquivos para cada ambiente (produção, desenvolvimento)

---

## 🎯 PRÓXIMO PASSO

**Depois de criar os arquivos:**
1. **Me avise** que está pronto
2. **Vamos testar** o sistema completo
3. **Vamos sincronizar** tudo no servidor

**Assim você terá 100% de controle!** 🔐
