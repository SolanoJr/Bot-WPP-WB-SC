const crypto = require('crypto');
const instanceRepository = require('../repositories/instanceRepository');
const usageRepository = require('../repositories/usageRepository');
const logger = require('../../services/loggerService');

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const registerUsage = (body = {}) => {
    const instanceId = String(body.instanceId || '').trim();

    if (!instanceId) {
        throw createError('instanceId e obrigatorio', 400);
    }

    const instance = instanceRepository.findInstanceById(instanceId);

    if (!instance) {
        throw createError('Instancia nao encontrada', 404);
    }

    const usage = {
        id: crypto.randomUUID(),
        instanceId,
        whatsappNumber: String(body.whatsappNumber || instance.whatsappNumber || '').trim(),
        commandName: String(body.commandName || '').trim(),
        args: JSON.stringify(Array.isArray(body.args) ? body.args : []),
        groupId: body.groupId ? String(body.groupId).trim() : '',
        userId: body.userId ? String(body.userId).trim() : '',
        timestamp: body.timestamp ? String(body.timestamp).trim() : new Date().toISOString()
    };

    if (!usage.whatsappNumber || !usage.commandName) {
        throw createError('Dados de uso incompletos', 400);
    }

    const result = usageRepository.insertUsage(usage);
    logger.info(
        `Uso registrado: instancia=${usage.instanceId} | numero=${usage.whatsappNumber} | comando=${usage.commandName} | usuario=${usage.userId || 'desconhecido'}.`
    );
    return result;
};

const getUsageSummary = ({ limit } = {}) => {
    return usageRepository.getUsageSummary({
        limit: Number(limit) > 0 ? Number(limit) : 10
    });
};

module.exports = {
    getUsageSummary,
    registerUsage
};
