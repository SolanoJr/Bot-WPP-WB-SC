#!/usr/bin/env bash

# ------------------------------------------------------------
#  Script de sincronização automática do bot no servidor Linux
#  - Faz pull do repositório remoto
#  - Instala dependências (npm ci) garantindo o lockfile
#  - Compila o projeto (npm run build)
#  - (Re)inicia o processo via PM2 (cria se ainda não existir)
# ------------------------------------------------------------

set -euo pipefail

REPO_DIR="$HOME/bot-wpp"
LOG_FILE="$REPO_DIR/sync_deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Iniciando sincronização ==="

cd "$REPO_DIR"

log "Atualizando código…"
git pull origin main | tee -a "$LOG_FILE"

log "Instalando dependências (npm ci)…"
npm ci | tee -a "$LOG_FILE"

log "Compilando projeto (npm run build)…"
npm run build | tee -a "$LOG_FILE"

log "Reiniciando bot via PM2…"
if pm2 list | grep -q "bot-wpp"; then
  pm2 restart bot-wpp
else
  pm2 start index.js --name bot-wpp
fi

log "=== Sincronização concluída ==="
