/**
 * 🔐 SISTEMA DE PERMISSÕES DO BOT
 * 
 * Controle de acesso baseado em níveis de usuário
 */

require('dotenv').config();

// Configuração de usuários
const MASTER_USER = process.env.MASTER_USER || '558581344211@c.us';
const ADMINS = new Set((process.env.ADMINS || '').split(',').filter(Boolean));

// Níveis de permissão
const PERMISSIONS = {
    MASTER: 'MASTER',    // Controle total
    ADMIN: 'ADMIN',      // Controle de grupo
    USER: 'USER'         // Usuário comum
};

/**
 * Verifica o nível de permissão do usuário
 * @param {string} userId - ID do usuário no WhatsApp
 * @returns {string} - Nível de permissão
 */
function getUserPermission(userId) {
    // Normalizar ID
    const normalizedId = userId.includes('@c.us') ? userId : `${userId}@c.us`;
    
    if (normalizedId === MASTER_USER) {
        return PERMISSIONS.MASTER;
    }
    
    if (ADMINS.has(normalizedId)) {
        return PERMISSIONS.ADMIN;
    }
    
    return PERMISSIONS.USER;
}

/**
 * Verifica se o usuário tem permissão mínima
 * @param {string} userId - ID do usuário
 * @param {string} requiredLevel - Nível requerido
 * @returns {boolean} - Tem permissão?
 */
function hasPermission(userId, requiredLevel) {
    const userLevel = getUserPermission(userId);
    
    // Hierarquia: MASTER > ADMIN > USER
    const levels = {
        [PERMISSIONS.MASTER]: 3,
        [PERMISSIONS.ADMIN]: 2,
        [PERMISSIONS.USER]: 1
    };
    
    return levels[userLevel] >= levels[requiredLevel];
}

/**
 * Verifica se é MASTER
 * @param {string} userId - ID do usuário
 * @returns {boolean} - É MASTER?
 */
function isMaster(userId) {
    return getUserPermission(userId) === PERMISSIONS.MASTER;
}

/**
 * Verifica se é ADMIN ou superior
 * @param {string} userId - ID do usuário
 * @returns {boolean} - É ADMIN?
 */
function isAdmin(userId) {
    return hasPermission(userId, PERMISSIONS.ADMIN);
}

/**
 * Obtém informações do usuário para debug
 * @param {string} userId - ID do usuário
 * @returns {object} - Informações do usuário
 */
function getUserInfo(userId) {
    const permission = getUserPermission(userId);
    
    return {
        userId,
        permission,
        isMaster: permission === PERMISSIONS.MASTER,
        isAdmin: permission === PERMISSIONS.ADMIN || permission === PERMISSIONS.MASTER,
        isUser: true
    };
}

/**
 * Middleware para comandos que requerem permissão
 * @param {string} requiredLevel - Nível requerido
 * @returns {function} - Middleware function
 */
function requirePermission(requiredLevel) {
    return (msg, client, args, next) => {
        const userId = msg.from || msg.author;
        
        if (!hasPermission(userId, requiredLevel)) {
            const permission = getUserPermission(userId);
            
            switch (requiredLevel) {
                case PERMISSIONS.MASTER:
                    msg.reply('🚫 **Acesso negado!**\n\nEste comando só pode ser usado pelo **MASTER** do bot.');
                    break;
                case PERMISSIONS.ADMIN:
                    msg.reply('🚫 **Acesso negado!**\n\nEste comando requer permissão de **ADMIN** ou superior.');
                    break;
                default:
                    msg.reply('🚫 **Acesso negado!**');
            }
            
            console.log(`🔒 [PERMISSIONS] Acesso negado: ${userId} (${permission}) tentou usar comando nível ${requiredLevel}`);
            return false;
        }
        
        console.log(`🔓 [PERMISSIONS] Acesso permitido: ${userId} (${permission})`);
        return next ? next() : true;
    };
}

module.exports = {
    PERMISSIONS,
    getUserPermission,
    hasPermission,
    isMaster,
    isAdmin,
    getUserInfo,
    requirePermission,
    MASTER_USER,
    ADMINS
};
