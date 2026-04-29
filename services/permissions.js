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
 * Limpa o ID do WhatsApp para conter apenas números
 * @param {string} id - ID original (ex: 558581344211@c.us)
 * @returns {string} - Apenas os dígitos (ex: 558581344211)
 */
function cleanId(id) {
    if (!id) return '';
    return id.split('@')[0].replace(/\D/g, '');
}

const CLEAN_MASTER = cleanId(MASTER_USER);
const CLEAN_ADMINS = new Set([...ADMINS].map(id => cleanId(id)));

/**
 * Verifica o nível de permissão do usuário
 * @param {string} userId - ID do usuário no WhatsApp
 * @returns {string} - Nível de permissão
 */
function getUserPermission(userId) {
    const userClean = cleanId(userId);
    
    if (userClean === CLEAN_MASTER) {
        return PERMISSIONS.MASTER;
    }
    
    if (CLEAN_ADMINS.has(userClean)) {
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
    
    const hasPerm = levels[userLevel] >= levels[requiredLevel];

    if (!hasPerm && requiredLevel !== PERMISSIONS.USER) {
        console.log(`🔐 [AUTH-DEBUG] Permissão NEGADA:`);
        console.log(`   - Quem tentou: ${userId} (Clean: ${cleanId(userId)})`);
        console.log(`   - Master Esperado: ${MASTER_USER} (Clean: ${CLEAN_MASTER})`);
        console.log(`   - Nível Requerido: ${requiredLevel}`);
    }

    return hasPerm;
}

/**
 * Verifica se é MASTER
 * @param {string} userId - ID do usuário
 * @returns {boolean} - É MASTER?
 */
function isMaster(userId) {
    const res = getUserPermission(userId) === PERMISSIONS.MASTER;
    if (!res) {
        // Log silencioso para debug interno se houver falha no MASTER
        console.log(`🕵️ [MASTER-CHECK] ${cleanId(userId)} não é o Master ${CLEAN_MASTER}`);
    }
    return res;
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
        cleanId: cleanId(userId),
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
        const userId = msg.author || msg.from;
        
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
            
            return false;
        }
        
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
    ADMINS,
    cleanId
};
