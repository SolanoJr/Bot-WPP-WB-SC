/**
 * 🔐 SISTEMA DE LICENCIAMENTO E CONTROLE
 * 
 * Controle total de acesso baseado em .env
 * Permite controle sem precisar privar repositório
 */

require('dotenv').config();

class LicenseManager {
    constructor() {
        this.licenseKey = process.env.LICENSE_KEY;
        this.expires = process.env.LICENSE_EXPIRES;
        this.domain = process.env.ALLOWED_DOMAIN;
        this.authorizedDevs = process.env.AUTHORIZED_DEVELOPERS?.split(',') || [];
        this.ownerEmail = process.env.OWNER_EMAIL;
        
        // Controle de usuários
        this.enableUserControl = process.env.ENABLE_USER_CONTROL === 'true';
        this.defaultDailyLimit = parseInt(process.env.DEFAULT_DAILY_LIMIT) || 1000;
        this.enableBlocking = process.env.ENABLE_BLOCKING === 'true';
        this.requireAuth = process.env.REQUIRE_AUTH === 'true';
        
        // Multi-dispositivo
        this.mainNumber = process.env.MAIN_NUMBER;
        this.allowedNumbers = process.env.ALLOWED_NUMBERS?.split(',') || [];
        this.deviceLimit = parseInt(process.env.DEVICE_LIMIT) || 5;
        
        // Logs e auditoria
        this.enableAuditLogs = process.env.ENABLE_AUDIT_LOGS === 'true';
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.auditRetentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS) || 30;
        
        // Controle comercial
        this.enableBilling = process.env.ENABLE_BILLING === 'true';
        this.paymentWebhook = process.env.PAYMENT_WEBHOOK_URL;
        this.subscriptionWebhook = process.env.SUBSCRIPTION_WEBHOOK_URL;
        
        // Segurança
        this.jwtSecret = process.env.JWT_SECRET;
        this.apiKey = process.env.API_KEY;
        this.encryptionKey = process.env.ENCRYPTION_KEY;
        
        // Ambiente
        this.nodeEnv = process.env.NODE_ENV || 'development';
        this.debug = process.env.DEBUG === 'true';
        this.mockPayments = process.env.MOCK_PAYMENTS === 'true';
    }

    // 🔑 Validação de licença
    validateLicense() {
        const errors = [];
        
        // Verificar chave de licença
        if (!this.licenseKey || this.licenseKey === 'sua_chave_de_licenca_aqui') {
            errors.push('❌ LICENSE_KEY não configurada ou usando valor padrão');
        }
        
        // Verificar expiração
        if (this.expires) {
            const expiryDate = new Date(this.expires);
            if (expiryDate <= new Date()) {
                errors.push(`❌ Licença expirou em ${expiryDate.toLocaleDateString('pt-BR')}`);
            }
        }
        
        // Verificar domínio (em produção)
        if (this.nodeEnv === 'production' && this.domain) {
            const currentDomain = process.env.NODE_DOMAIN || 'localhost';
            if (currentDomain !== this.domain) {
                errors.push(`❌ Domínio não autorizado: ${currentDomain} (esperado: ${this.domain})`);
            }
        }
        
        // Verificar desenvolvedor autorizado
        const currentUser = process.env.USER || process.env.USERNAME || 'unknown';
        if (this.authorizedDevs.length > 0 && !this.authorizedDevs.includes(currentUser)) {
            errors.push(`❌ Desenvolvedor não autorizado: ${currentUser}`);
        }
        
        if (errors.length > 0) {
            console.error('🚨 ERROS DE LICENÇA:');
            errors.forEach(error => console.error(`   ${error}`));
            
            if (this.nodeEnv === 'production') {
                console.error('🛑 Sistema bloqueado - configure a licença corretamente');
                process.exit(1);
            } else {
                console.warn('⚠️  Modo desenvolvimento - sistema funcionando com limitações');
            }
            return false;
        }
        
        console.log('✅ Licença válida - sistema autorizado');
        return true;
    }

    // 👥 Controle de usuários
    isUserAuthorized(userId) {
        if (!this.enableUserControl) {
            return true; // Controle desabilitado
        }
        
        try {
            const users = this.loadUsers();
            const user = users[userId];
            
            if (!user) {
                this.logAudit('unauthorized_access', { userId, action: 'command_execution' });
                return false;
            }
            
            if (user.blocked) {
                this.logAudit('blocked_access', { userId, reason: user.blockReason });
                return false;
            }
            
            // Verificar limites diários
            if (this.checkDailyLimit(userId, user)) {
                return true;
            }
            
            this.logAudit('limit_exceeded', { userId, limit: user.dailyLimit });
            return false;
            
        } catch (error) {
            console.error('❌ Erro ao verificar autorização:', error);
            return false;
        }
    }

    // 📊 Carregar usuários
    loadUsers() {
        try {
            const fs = require('fs');
            const path = require('path');
            const usersPath = path.join(__dirname, '..', 'data', 'users.json');
            
            if (fs.existsSync(usersPath)) {
                const data = fs.readFileSync(usersPath, 'utf8');
                return JSON.parse(data);
            }
            
            // Usuários padrão para primeira execução
            return {
                'default': {
                    name: 'Usuário Padrão',
                    status: 'active',
                    dailyLimit: this.defaultDailyLimit,
                    blocked: false,
                    permissions: ['ondeestou', 'testrelay', 'ping']
                }
            };
        } catch (error) {
            console.error('❌ Erro ao carregar usuários:', error);
            return {};
        }
    }

    // 📊 Salvar usuários
    saveUsers(users) {
        try {
            const fs = require('fs');
            const path = require('path');
            const usersPath = path.join(__dirname, '..', 'data', 'users.json');
            
            // Criar diretório data se não existir
            const dataDir = path.dirname(usersPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar usuários:', error);
            return false;
        }
    }

    // 📊 Verificar limite diário
    checkDailyLimit(userId, user) {
        try {
            const today = new Date().toDateString();
            const usage = this.loadUsage();
            const userUsage = usage[userId] || {};
            const todayUsage = userUsage[today] || 0;
            
            const limit = user.dailyLimit || this.defaultDailyLimit;
            
            if (todayUsage >= limit) {
                console.log(`📊 Usuário ${userId} atingiu limite diário: ${todayUsage}/${limit}`);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar limite diário:', error);
            return true; // Permitir em caso de erro
        }
    }

    // 📊 Registrar uso
    registerUsage(userId, action) {
        if (!this.enableUserControl) {
            return;
        }
        
        try {
            const today = new Date().toDateString();
            const usage = this.loadUsage();
            
            if (!usage[userId]) {
                usage[userId] = {};
            }
            
            if (!usage[userId][today]) {
                usage[userId][today] = 0;
            }
            
            usage[userId][today]++;
            
            this.saveUsage(usage);
            this.logAudit('usage_registered', { userId, action, date: today });
            
        } catch (error) {
            console.error('❌ Erro ao registrar uso:', error);
        }
    }

    // 📊 Carregar uso
    loadUsage() {
        try {
            const fs = require('fs');
            const path = require('path');
            const usagePath = path.join(__dirname, '..', 'data', 'usage.json');
            
            if (fs.existsSync(usagePath)) {
                const data = fs.readFileSync(usagePath, 'utf8');
                return JSON.parse(data);
            }
            
            return {};
        } catch (error) {
            console.error('❌ Erro ao carregar uso:', error);
            return {};
        }
    }

    // 📊 Salvar uso
    saveUsage(usage) {
        try {
            const fs = require('fs');
            const path = require('path');
            const usagePath = path.join(__dirname, '..', 'data', 'usage.json');
            
            const dataDir = path.dirname(usagePath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2));
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar uso:', error);
            return false;
        }
    }

    // 📱 Controle de multi-dispositivo
    isNumberAllowed(number) {
        if (!this.mainNumber) {
            return true; // Controle desabilitado
        }
        
        return this.allowedNumbers.includes(number) || number === this.mainNumber;
    }

    // 🔐 Auditoria e logs
    logAudit(action, details) {
        if (!this.enableAuditLogs) {
            return;
        }
        
        try {
            const fs = require('fs');
            const path = require('path');
            const auditPath = path.join(__dirname, '..', 'data', 'audit.log');
            
            const logEntry = {
                timestamp: new Date().toISOString(),
                action,
                details,
                user: process.env.USER || process.env.USERNAME || 'unknown',
                ip: process.env.REMOTE_ADDR || 'local'
            };
            
            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(auditPath, logLine);
            
        } catch (error) {
            console.error('❌ Erro ao registrar auditoria:', error);
        }
    }

    // 🎯 Verificação de permissões
    hasPermission(userId, command) {
        if (!this.enableUserControl) {
            return true; // Controle desabilitado
        }
        
        try {
            const users = this.loadUsers();
            const user = users[userId];
            
            if (!user) {
                return false;
            }
            
            const permissions = user.permissions || ['ondeestou']; // Padrão mínimo
            return permissions.includes('*') || permissions.includes(command);
            
        } catch (error) {
            console.error('❌ Erro ao verificar permissão:', error);
            return false;
        }
    }

    // 📊 Status do sistema
    getSystemStatus() {
        return {
            license: {
                valid: this.validateLicense(),
                key: this.licenseKey?.substring(0, 10) + '...',
                expires: this.expires,
                domain: this.domain
            },
            userControl: {
                enabled: this.enableUserControl,
                dailyLimit: this.defaultDailyLimit,
                blockingEnabled: this.enableBlocking,
                authRequired: this.requireAuth
            },
            multiDevice: {
                enabled: !!this.mainNumber,
                mainNumber: this.mainNumber,
                allowedNumbers: this.allowedNumbers.length,
                deviceLimit: this.deviceLimit
            },
            security: {
                auditEnabled: this.enableAuditLogs,
                logLevel: this.logLevel,
                retentionDays: this.auditRetentionDays
            },
            commercial: {
                billingEnabled: this.enableBilling,
                paymentsMocked: this.mockPayments
            }
        };
    }
}

module.exports = LicenseManager;
