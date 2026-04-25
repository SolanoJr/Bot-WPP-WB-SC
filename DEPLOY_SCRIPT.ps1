# Deploy Script - Bot WPP (PowerShell)
# Uso: .\DEPLOY_SCRIPT.ps1

param(
    [string]$Server = "solanojr@100.101.218.16"
)

Write-Host "🚀 Iniciando deploy do Bot WPP..." -ForegroundColor Green

# 1. Commit no PC (se houver mudanças)
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "📝 Mudanças detectadas, fazendo commit..." -ForegroundColor Yellow
    git add .
    git commit -m "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    git push
} else {
    Write-Host "✅ Nenhuma mudança detectada no PC" -ForegroundColor Green
}

# 2. Deploy no servidor
Write-Host "🔄 Fazendo deploy no servidor..." -ForegroundColor Yellow
$deployCmd = @"
cd /home/solanojr/bot-wpp && 
echo '=== ANTES DO DEPLOY ===' && 
git rev-parse --short HEAD && 
pm2 list && 
echo '=== INICIANDO DEPLOY ===' && 
git pull && 
npm ci && 
pm2 restart bot-wpp --update-env && 
echo '=== DEPLOY CONCLUÍDO ===' && 
pm2 list && 
pm2 logs bot-wpp --lines 10 --nostream
"@

ssh $Server $deployCmd

Write-Host "✅ Deploy concluído!" -ForegroundColor Green
