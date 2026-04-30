#!/bin/bash

# 🗂️ SCRIPT DE BACKUP DO BOT WHATSAPP
# Criado por: SolanoJr
# Data: 29/04/2026

# Configurações
PROJECT_DIR="/home/solanojr/bot-wpp"
BACKUP_DIR="/home/solanojr/backups"
SESSION_DIR=".wwebjs_auth"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="bot-wpp-backup-${TIMESTAMP}"
RETENTION_DAYS=7

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]❌${NC} $1"
}

# Início do backup
log "🚀 Iniciando backup do Bot WhatsApp..."

# Verificar se está no diretório correto
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Diretório do projeto não encontrado: $PROJECT_DIR"
    exit 1
fi

# Criar diretório de backups se não existir
if [ ! -d "$BACKUP_DIR" ]; then
    log "📁 Criando diretório de backups: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Entrar no diretório do projeto
cd "$PROJECT_DIR" || {
    log_error "Falha ao acessar diretório do projeto"
    exit 1
}

# Verificar se a sessão existe
if [ ! -d "$SESSION_DIR" ]; then
    log_warning "Diretório de sessão não encontrado: $SESSION_DIR"
    log_warning "Criando backup de configurações anyway..."
    SESSION_DIR="."
fi

# Parar o bot antes do backup (opcional)
log "🔄 Verificando status do bot..."
if pm2 list | grep -q "bot-wpp.*online"; then
    log "📱 Bot está online. Criando backup com bot em execução..."
    # NOTA: Poderia parar o bot aqui, mas vamos manter online para evitar downtime
else
    log "📱 Bot está offline."
fi

# Criar backup
log "📦 Compactando sessão e configurações..."

# Comando de backup
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
    --exclude=node_modules \
    --exclude=backscan-frontend-main \
    --exclude=.git \
    --exclude=*.log \
    --exclude=nohup.out \
    --exclude=__pycache__ \
    --exclude=*.tmp \
    --exclude=*.temp \
    "$SESSION_DIR" \
    commands/ \
    services/ \
    config/ \
    whatsapp.js \
    package.json \
    package-lock.json \
    .env.example \
    STATUS.md \
    README*.md \
    backup.sh

# Verificar se o backup foi criado
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
    log_success "Backup criado com sucesso!"
    log_success "📁 Arquivo: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    log_success "📏 Tamanho: $BACKUP_SIZE"
else
    log_error "Falha ao criar backup!"
    exit 1
fi

# Limpar backups antigos
log "🧹 Limpando backups antigos (mais de $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -name "bot-wpp-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Contar backups restantes
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "bot-wpp-backup-*.tar.gz" | wc -l)
log_success "📊 Mantidos $BACKUP_COUNT backups no sistema."

# Listar backups recentes
log "📋 Backups recentes:"
ls -lh "$BACKUP_DIR"/bot-wpp-backup-*.tar.gz | tail -5

# Verificar espaço em disco
DISK_USAGE=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}')
log_info "💾 Uso de disco em $BACKUP_DIR: $DISK_USAGE"

log_success "🎉 Backup concluído com sucesso!"
log "📅 Próximo backup automático em 24 horas (se configurado no crontab)"

# Informações de restauração
echo ""
log "📖 Para restaurar este backup:"
echo "   cd $PROJECT_DIR"
echo "   tar -xzf ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "   pm2 restart bot-wpp"
echo ""

exit 0
