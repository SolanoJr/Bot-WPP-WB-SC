# Runbook - Bot WPP (Recuperação + Ponto de Restauração)

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES RÁPIDAS

### 1. Erro de Sintaxe (SyntaxError)
**Sintomas:** PM2 logs mostra erro em linha específica, bot não inicia

**Diagnóstico Rápido:**
```bash
# Verificar linha exata no arquivo
nl -ba whatsapp.js | sed -n '315,330p'

# Procurar por texto específico
grep -n "TEST MESSAGE" whatsapp.js || true

# Verificar integridade do arquivo
sha256sum whatsapp.js
```

**Solução Definitiva:**
```bash
# 1. Parar e limpar logs
pm2 stop bot-wpp
pm2 flush
rm -f /home/solanojr/.pm2/logs/bot-wpp-*.log

# 2. Sobrescrever arquivo com versão limpa do git
git show HEAD:whatsapp.js > whatsapp.js

# 3. Validar e reiniciar
node -c whatsapp.js
pm2 start bot-wpp
```

### 2. Bot em Loop de QR Code
**Sintomas:** "QR gerado" repetidamente, não conecta

**Causa:** Sessão expirada ou WhatsApp em cooldown

**Solução:**
```bash
# 1. Parar bot para evitar mais tentativas
pm2 stop bot-wpp

# 2. Limpar dispositivos no WhatsApp (manual)
# WhatsApp Business → Configurações → Dispositivos conectados → Desconectar TODOS

# 3. Aguardar cooldown (30-120 minutos)

# 4. Tentativa única após cooldown
pm2 start bot-wpp
pm2 logs bot-wpp --lines 40 --nostream
```

**Plano B (se necessário):**
```bash
pm2 stop bot-wpp
cd /home/solanojr/bot-wpp
mv .wwebjs_auth .wwebjs_auth.bak.$(date +%F-%H%M%S)
pm2 start bot-wpp
```

### 3. Processo Automático Modificando Arquivos
**Sintomas:** Arquivo corrompido mesmo após correção

**Solução:**
```bash
# Limpar cache completo
pm2 stop bot-wpp
rm -rf /home/solanojr/.pm2/logs/bot-wpp*
rm -rf node_modules/.cache
npm cache clean --force

# Forçar versão limpa
git show HEAD:whatsapp.js > whatsapp.js
node -c whatsapp.js
pm2 start bot-wpp
```

## 📋 PONTO DE RESTAURAÇÃO (BACKUP)

### Criar Backup Completo
```bash
# 1. Criar diretório de backups
mkdir -p /home/solanojr/backups

# 2. Backup sessão WhatsApp
cd /home/solanojr/bot-wpp
tar -czf /home/solanojr/backups/wwebjs_auth_$(date +%F-%H%M%S).tgz .wwebjs_auth

# 3. Backup banco SQLite
tar -czf /home/solanojr/backups/database_$(date +%F-%H%M%S).tgz backend/database.sqlite

# 4. Salvar estado PM2
pm2 save
```

### Verificar Backup
```bash
ls -la /home/solanojr/backups/
```

## 🔧 MANUTENÇÃO PREVENTIVA

### Limpar Repositório Git
```bash
cd /home/solanojr/bot-wpp

# Verificar status
git status

# Limpar arquivos não versionados
git reset --hard HEAD
git clean -fd

# Confirmar limpeza
git status
```

### Validar Funcionamento
```bash
# 1. Verificar status dos processos
pm2 status

# 2. Testar comandos básicos
# Enviar !help no WhatsApp

# 3. Verificar logs em tempo real
pm2 logs bot-wpp --lines 0

# 4. Verificar uso no backend
curl -s http://127.0.0.1:4010/usage/summary \
  -H "x-admin-key: 139a64448be023c3bcb50d4c1c8f8cb6349a1b495a52fac75f646820602810b8" \
  | python3 -m json.tool
```

## 📝 COMANDOS ÚTEIS

### Diagnóstico Rápido
```bash
# Status completo
pm2 list
pm2 logs bot-wpp --lines 40 --nostream

# Verificar arquivo específico
nl -ba whatsapp.js | sed -n '315,330p'
grep -n "ERRO" whatsapp.js || true

# Validar sintaxe
node -c whatsapp.js
```

### Recuperação Completa
```bash
# Reset total
pm2 stop bot-wpp
pm2 delete bot-wpp
pm2 flush
rm -f /home/solanojr/.pm2/logs/bot-wpp-*.log

# Restaurar do git
git reset --hard HEAD
git clean -fd

# Reiniciar limpo
pm2 start index.js --name bot-wpp
```

## 🚨 COMANDOS DE EMERGÊNCIA

### Parar Tudo
```bash
pm2 stop all
pm2 save
```

### Reiniciar Serviços
```bash
pm2 restart bot-wpp
pm2 restart bot-backend
```

### Verificar Conexão
```bash
# Testar API do backend
curl -s http://127.0.0.1:4010/health

# Verificar logs de erro
pm2 logs bot-wpp --err --lines 20
```

## 📊 ESTRUTURA DE ARQUIVOS

### Comandos do Bot
- `commands/help.js` - Lista comandos
- `commands/ondeestou.js` - Localização
- `commands/bemvindo.js` - Boas-vindas (admin apenas)

### Logs Importantes
- `/home/solanojr/.pm2/logs/bot-wpp-out.log` - Saída principal
- `/home/solanojr/.pm2/logs/bot-wpp-error.log` - Erros

### Backups Automáticos
- `/home/solanojr/backups/wwebjs_auth_*.tgz` - Sessão WhatsApp
- `/home/solanojr/backups/database_*.tgz` - Banco SQLite

## ⚠️ REGRAS DE OURO

1. **NUNCA** edite arquivos diretamente no servidor
2. **SEMPRE** use `git pull` no servidor para atualizar código
3. **FAÇA** backup antes de qualquer mudança
4. **VALIDE** sintaxe com `node -c` antes de reiniciar
5. **LIMPE** logs PM2 após resolver problemas
6. **AGUARDE** cooldown do WhatsApp (30-120min)

---

**Criado em:** 2026-04-25
**Última atualização:** 2026-04-25
**Status:** Funcionando ✅
