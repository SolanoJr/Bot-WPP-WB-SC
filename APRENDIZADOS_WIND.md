# Aprendizados Wind - Bot WPP

## 🚨 Regras de Ouro (Nunca Quebrar)

### 1. Deploy em Produção
**NUNCA usar `git pull` em produção**
```bash
# ❌ ERRADO (causa conflitos)
git pull

# ✅ CORRETO (à prova de conflitos)
git fetch --all
git reset --hard origin/main
```

### 2. Force Push no Main
**EVITAR `--force` no branch principal**
```bash
# ❌ ERRADO (reescreve histórico)
git push --force

# ✅ CORRETO (apenas em emergência)
git push --force-with-lease
```

### 3. PM2 Logs podem enganar
**Logs PM2 mostram histórico antigo**
```bash
# Se arquivo está limpo mas log mostra erro:
pm2 flush

# Depois verificar novamente
pm2 logs bot-wpp --lines 40 --nostream
```

### 4. npm ci vs npm install
**npm ci só quando package-lock.json está alinhado**
```bash
# Tentar npm ci primeiro
npm ci

# Se falhar, usar npm install e corrigir lock no PC
npm install
```

## 🔧 Deploy Padrão (Servidor)

### Comandos Exatos
```bash
cd /home/solanojr/bot-wpp
git fetch --all
git reset --hard origin/main
(npm ci || npm install)
pm2 restart bot-wpp --update-env
test -f backend/app.js && pm2 restart bot-backend --update-env || true
pm2 save
```

### Verificação
```bash
# Status dos serviços
pm2 list

# Health check do backend
curl -s http://127.0.0.1:4010/health | python3 -m json.tool
```

## 🚨 Problemas Comuns e Soluções

### Backend "desaparece"
- **Causa:** Commit removeu backend/ mas PM2 ainda tenta executar
- **Solução:** Restaurar do commit anterior: `git checkout <commit> -- backend/`

### Erro de sintaxe "fantasma"
- **Causa:** PM2 logs antigos mostrando erro já corrigido
- **Solução:** `pm2 flush` para limpar logs

### Conflito de dependências
- **Causa:** package.json e package-lock.json desalinhados
- **Solução:** `npm install` no servidor, depois corrigir lock no PC

## 📋 Fluxo PC → Git → Servidor

### 1. Desenvolvimento (PC/Windsurf)
```bash
# Desenvolver e testar localmente
git add .
git commit -m "feat: descrição clara"
git push
```

### 2. Deploy (Produção)
```powershell
# PowerShell no PC
.\DEPLOY_SCRIPT.ps1
```

## 🧪 Testes Pós-Deploy

### WhatsApp
- `!help` - Lista comandos
- `!bemvindo` - Boas-vindas (admin)
- `!ondeestou` - Localização

### Backend
- Health check: `GET /health`
- Uso: `GET /usage/summary`

## 📝 Checklist Antes de Deploy

- [ ] Código testado no PC
- [ ] Sintaxe validada: `node -c arquivo.js`
- [ ] Dependências atualizadas no PC
- [ ] Commits organizados (não gigantes)
- [ ] Push concluído com sucesso

## 🚨 Emergências

### Bot não responde
```bash
# Verificar status
pm2 list

# Verificar logs recentes
pm2 logs bot-wpp --lines 40 --nostream

# Se necessário, reiniciar
pm2 restart bot-wpp --update-env
```

### Backend com erro
```bash
# Health check
curl -s http://127.0.0.1:4010/health

# Verificar logs
pm2 logs bot-backend --lines 40 --nostream
```

## 🎯 Regra Final

**Programar no PC, versionar no Git, deploy no servidor.**
Nunca editar diretamente em produção!

---

**Criado:** 2026-04-25  
**Status:** Funcionando ✅
