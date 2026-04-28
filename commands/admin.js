/**
 * 🔐 COMANDOS DE ADMINISTRAÇÃO
 * 
 * Controle total do sistema para administradores
 */

const LicenseManager = require('../config/license');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'admin',
    description: 'Comandos de administração do sistema',
    async execute(msg, client, args) {
        try {
            // 🔐 Verificar se é administrador
            const license = new LicenseManager();
            
            if (!license.isAdmin(msg.from)) {
                await msg.reply('❌ Comando restrito a administradores.');
                return;
            }
            
            if (!args[0]) {
                await this.showHelp(msg);
                return;
            }
            
            const command = args[0].toLowerCase();
            
            switch (command) {
                case 'status':
                    await this.showStatus(msg, license);
                    break;
                case 'users':
                    await this.showUsers(msg, license);
                    break;
                case 'adduser':
                    await this.addUser(msg, args.slice(1));
                    break;
                case 'block':
                    await this.blockUser(msg, args[1]);
                    break;
                case 'unblock':
                    await this.unblockUser(msg, args[1]);
                    break;
                case 'logs':
                    await this.showLogs(msg, args[1]);
                    break;
                case 'stats':
                    await this.showStats(msg, license);
                    break;
                case 'config':
                    await this.showConfig(msg, license);
                    break;
                case 'backup':
                    await this.createBackup(msg);
                    break;
                default:
                    await this.showHelp(msg);
            }
            
        } catch (error) {
            console.error('Erro no comando admin:', error);
            await msg.reply('❌ Erro ao executar comando de administração.');
        }
    },
    
    async showHelp(msg) {
        const helpText = [
            '🔐 *COMANDOS DE ADMINISTRAÇÃO*',
            '',
            '📋 *Comandos disponíveis:*',
            '',
            '🔍 `!admin status` - Status do sistema',
            '👥 `!admin users` - Lista de usuários',
            '➕ `!admin adduser <id> <nome> <limite>` - Adicionar usuário',
            '🚫 `!admin block <id>` - Bloquear usuário',
            '✅ `!admin unblock <id>` - Desbloquear usuário',
            '📊 `!admin logs [dias]` - Ver logs (padrão: 7 dias)',
            '📈 `!admin stats` - Estatísticas de uso',
            '⚙️  `!admin config` - Configurações atuais',
            '💾 `!admin backup` - Criar backup',
            '',
            '🎯 *Exemplo:* `!admin adduser 5588998314322 "João" 1000`'
        ].join('\n');
        
        await msg.reply(helpText);
    },
    
    async showStatus(msg, license) {
        const status = license.getSystemStatus();
        const uptime = process.uptime();
        const days = Math.floor(uptime / (24 * 60 * 60));
        const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((uptime % (60 * 60)) / 60);
        
        const statusText = [
            '🔐 *STATUS DO SISTEMA*',
            '',
            '📋 *Licença:*',
            `✅ Válida: ${status.license.valid ? 'Sim' : 'Não'}`,
            `🔑 Chave: ${status.license.key}`,
            `📅 Expira: ${status.license.expires}`,
            `🌐 Domínio: ${status.license.domain}`,
            '',
            '👥 *Controle de Usuários:*',
            `🔓 Ativado: ${status.userControl.enabled ? 'Sim' : 'Não'}`,
            `📊 Limite padrão: ${status.userControl.dailyLimit}`,
            `🚫 Bloqueio: ${status.userControl.blockingEnabled ? 'Sim' : 'Não'}`,
            `🔐 Autenticação: ${status.userControl.authRequired ? 'Sim' : 'Não'}`,
            '',
            '📱 *Multi-Dispositivo:*',
            `🔓 Ativado: ${status.multiDevice.enabled ? 'Sim' : 'Não'}`,
            `📞 Número principal: ${status.multiDevice.mainNumber || 'Não configurado'}`,
            `📱 Números permitidos: ${status.multiDevice.allowedNumbers}`,
            `🔌 Limite de dispositivos: ${status.multiDevice.deviceLimit}`,
            '',
            '⏰ *Uptime:*',
            `🕐 ${days}d ${hours}h ${minutes}m`,
            '',
            `🤖 *Node.js:* ${process.version}`,
            `💾 *Memória:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        ].join('\n');
        
        await msg.reply(statusText);
    },
    
    async showUsers(msg, license) {
        const users = license.loadUsers();
        const usage = license.loadUsage();
        const today = new Date().toDateString();
        
        let userText = [
            '👥 *LISTA DE USUÁRIOS*',
            '',
            '📊 *Status | Nome | Hoje | Limite | Bloqueado*',
            ''
        ];
        
        for (const [userId, user] of Object.entries(users)) {
            const todayUsage = usage[userId]?.[today] || 0;
            const status = user.blocked ? '🚫' : '✅';
            const blocked = user.blocked ? 'Sim' : 'Não';
            
            userText.push(`${status} ${user.name} | ${todayUsage} | ${user.dailyLimit} | ${blocked}`);
        }
        
        if (Object.keys(users).length === 0) {
            userText.push('📭 Nenhum usuário cadastrado');
        }
        
        await msg.reply(userText.join('\n'));
    },
    
    async addUser(msg, args) {
        if (args.length < 3) {
            await msg.reply('❌ Uso: `!admin adduser <id> <nome> <limite>`');
            return;
        }
        
        const [userId, name, limitStr] = args;
        const limit = parseInt(limitStr);
        
        if (!limit || limit < 1) {
            await msg.reply('❌ Limite deve ser um número válido maior que 0');
            return;
        }
        
        const license = new LicenseManager();
        const users = license.loadUsers();
        
        users[userId] = {
            name: name.replace(/['"]/g, ''),
            status: 'active',
            dailyLimit: limit,
            blocked: false,
            blockReason: null,
            permissions: ['ondeestou', 'testrelay', 'ping'],
            createdAt: new Date().toISOString(),
            lastUsed: null
        };
        
        if (license.saveUsers(users)) {
            await msg.reply(`✅ Usuário "${name}" adicionado com limite diário de ${limit}`);
        } else {
            await msg.reply('❌ Erro ao adicionar usuário');
        }
    },
    
    async blockUser(msg, userId) {
        if (!userId) {
            await msg.reply('❌ Uso: `!admin block <id>`');
            return;
        }
        
        const license = new LicenseManager();
        const users = license.loadUsers();
        
        if (!users[userId]) {
            await msg.reply('❌ Usuário não encontrado');
            return;
        }
        
        users[userId].blocked = true;
        users[userId].blockReason = 'Bloqueado por administrador';
        
        if (license.saveUsers(users)) {
            await msg.reply(`🚫 Usuário "${users[userId].name}" bloqueado com sucesso`);
        } else {
            await msg.reply('❌ Erro ao bloquear usuário');
        }
    },
    
    async unblockUser(msg, userId) {
        if (!userId) {
            await msg.reply('❌ Uso: `!admin unblock <id>`');
            return;
        }
        
        const license = new LicenseManager();
        const users = license.loadUsers();
        
        if (!users[userId]) {
            await msg.reply('❌ Usuário não encontrado');
            return;
        }
        
        users[userId].blocked = false;
        users[userId].blockReason = null;
        
        if (license.saveUsers(users)) {
            await msg.reply(`✅ Usuário "${users[userId].name}" desbloqueado com sucesso`);
        } else {
            await msg.reply('❌ Erro ao desbloquear usuário');
        }
    },
    
    async showLogs(msg, daysStr) {
        const days = parseInt(daysStr) || 7;
        const logsPath = path.join(__dirname, '..', 'data', 'audit.log');
        
        try {
            if (!fs.existsSync(logsPath)) {
                await msg.reply('📭 Nenhum log encontrado');
                return;
            }
            
            const content = fs.readFileSync(logsPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const recentLogs = lines
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(log => log && new Date(log.timestamp) >= cutoffDate)
                .slice(-20); // Últimos 20 logs
            
            if (recentLogs.length === 0) {
                await msg.reply(`📭 Nenhum log nos últimos ${days} dias`);
                return;
            }
            
            let logText = [
                `📋 *LOGS DOS ÚLTIMOS ${days} DIAS*`,
                '',
                '📊 *Data | Ação | Detalhes*',
                ''
            ];
            
            recentLogs.forEach(log => {
                const date = new Date(log.timestamp).toLocaleString('pt-BR');
                const details = JSON.stringify(log.details).substring(0, 50) + '...';
                logText.push(`${date} | ${log.action} | ${details}`);
            });
            
            await msg.reply(logText.join('\n'));
            
        } catch (error) {
            console.error('Erro ao ler logs:', error);
            await msg.reply('❌ Erro ao ler logs');
        }
    },
    
    async showStats(msg, license) {
        const users = license.loadUsers();
        const usage = license.loadUsage();
        const today = new Date().toDateString();
        
        let totalUsers = Object.keys(users).length;
        let activeUsers = 0;
        let blockedUsers = 0;
        let totalUsageToday = 0;
        
        for (const [userId, user] of Object.entries(users)) {
            if (user.blocked) {
                blockedUsers++;
            } else {
                activeUsers++;
            }
            
            totalUsageToday += usage[userId]?.[today] || 0;
        }
        
        const statsText = [
            '📊 *ESTATÍSTICAS DO SISTEMA*',
            '',
            '👥 *Usuários:*',
            `📊 Total: ${totalUsers}`,
            `✅ Ativos: ${activeUsers}`,
            `🚫 Bloqueados: ${blockedUsers}`,
            '',
            '📈 *Uso Hoje:*',
            `🔥 Total de requisições: ${totalUsageToday}`,
            `📊 Média por usuário: ${activeUsers > 0 ? Math.round(totalUsageToday / activeUsers) : 0}`,
            '',
            '💾 *Sistema:*',
            `⏰ Uptime: ${Math.floor(process.uptime() / 3600)}h`,
            `🧠 Memória: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        ].join('\n');
        
        await msg.reply(statsText);
    },
    
    async showConfig(msg, license) {
        const status = license.getSystemStatus();
        
        const configText = [
            '⚙️  *CONFIGURAÇÕES ATUAIS*',
            '',
            '🔐 *Licença:*',
            `✅ Válida: ${status.license.valid ? 'Sim' : 'Não'}`,
            `📅 Expira: ${status.license.expires}`,
            '',
            '👥 *Controle:*',
            `🔓 Usuários: ${status.userControl.enabled ? 'Sim' : 'Não'}`,
            `📊 Limite padrão: ${status.userControl.dailyLimit}`,
            `🚫 Bloqueio: ${status.userControl.blockingEnabled ? 'Sim' : 'Não'}`,
            '',
            '📱 *Dispositivos:*',
            `🔓 Multi: ${status.multiDevice.enabled ? 'Sim' : 'Não'}`,
            `📞 Principal: ${status.multiDevice.mainNumber || 'Não'}`,
            `📱 Permitidos: ${status.multiDevice.allowedNumbers}`,
            '',
            '🔒 *Segurança:*',
            `📋 Auditoria: ${status.security.auditEnabled ? 'Sim' : 'Não'}`,
            `📊 Nível log: ${status.security.logLevel}`,
            `📅 Retenção: ${status.security.retentionDays} dias`
        ].join('\n');
        
        await msg.reply(configText);
    },
    
    async createBackup(msg) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const backupDir = path.join(__dirname, '..', 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
            
            const license = new LicenseManager();
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                users: license.loadUsers(),
                usage: license.loadUsage(),
                config: license.getSystemStatus()
            };
            
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
            
            await msg.reply(`✅ Backup criado: backup-${timestamp}.json`);
            
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            await msg.reply('❌ Erro ao criar backup');
        }
    }
};
