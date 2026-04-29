/**
 * 🔐 SISTEMA DE PERMISSÕES DO BOT
 * 
 * Controle de acesso baseado em níveis de usuário
 */

require('dotenv').config();

// Configuração de usuários
const MASTER_USER = process.env.MASTER_USER || '558581344211@c.us';
const MASTER_NUMBER = process.env.MASTER_NUMBER || ''; // Novo número pessoal/testes
const ADMINS = new Set((process.env.ADMINS || '').split(',').filter(Boolean));

// Níveis de permissão
const PERMISSIONS = {
    MASTER: 'MASTER',    // Controle total
    ADMIN: 'ADMIN',      // Controle de grupo
    USER: 'USER'         // Usuário comum
};

/**
 * Limpa o ID do WhatsApp para conter apenas números e normaliza o 9º dígito (Brasil)
 * @param {string} id - ID original (ex: 5588998314322@c.us)
 * @returns {string} - Apenas os dígitos normalizados (sem o 9 extra se houver)
 */
function cleanId(id) {
    if (!id) return '';
    
    // 1. Pega apenas a parte antes do @ e remove não-dígitos
    let cleaned = id.split('@')[0].replace(/\D/g, '');
    
    // 2. Normalização do 9º dígito para o Brasil
    // Se tem 13 dígitos, começa com 55 e o 5º dígito é 9, remove o 9
    // Ex: 55 88 9 98314322 -> 55 88 98314322
    if (cleaned.length === 13 && cleaned.startsWith('55') && cleaned[4] === '9') {
        cleaned = cleaned.substring(0, 4) + cleaned.substring(5);
    }
    
    return cleaned;
}

const CLEAN_MASTERS = new Set([
    cleanId(MASTER_USER),
    cleanId(MASTER_NUMBER)
].filter(Boolean));

const CLEAN_ADMINS = new Set([...ADMINS].map(id => cleanId(id)));

/**
 * Verifica o nível de permissão do usuário
 * @param {string} userId - ID do usuário no WhatsApp
 * @returns {string} - Nível de permissão
 */
function getUserPermission(userId) {
    const userClean = cleanId(userId);
    
    if (CLEAN_MASTERS.has(userClean)) {
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
    const userClean = cleanId(userId);

    // Log de PROVA REAL solicitado pelo usuário
    if (requiredLevel !== PERMISSIONS.USER) {
        console.log(`[PERMISSÃO] Recebido de: ${userClean} | Masters Configurados: ${[...CLEAN_MASTERS].join(', ')} | Resultado: [${hasPerm ? 'SIM' : 'NÃO'}]`);
    }

    if (!hasPerm && requiredLevel !== PERMISSIONS.USER) {
        console.log(`🔐 [AUTH-DEBUG] Detalhes da Falha:`);
        console.log(`   - ID Original: ${userId}`);
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
    MASTER_NUMBER,
    ADMINS,
    cleanId
};
