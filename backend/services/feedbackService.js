const crypto = require('crypto');
const instanceRepository = require('../repositories/instanceRepository');
const feedbackRepository = require('../repositories/feedbackRepository');
const logger = require('../../services/loggerService');

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const registerFeedback = (body = {}) => {
    const instanceId = String(body.instanceId || '').trim();

    if (!instanceId) {
        throw createError('instanceId e obrigatorio', 400);
    }

    const instance = instanceRepository.findInstanceById(instanceId);

    if (!instance) {
        throw createError('Instancia nao encontrada', 404);
    }

    const feedback = {
        id: crypto.randomUUID(),
        instanceId,
        whatsappNumber: String(body.whatsappNumber || instance.whatsappNumber || '').trim(),
        userId: body.userId ? String(body.userId).trim() : '',
        groupId: body.groupId ? String(body.groupId).trim() : '',
        message: String(body.message || '').trim(),
        createdAt: body.createdAt ? String(body.createdAt).trim() : new Date().toISOString()
    };

    if (!feedback.whatsappNumber || !feedback.message) {
        throw createError('Dados de feedback incompletos', 400);
    }

    const result = feedbackRepository.insertFeedback(feedback);
    logger.info(
        `Feedback registrado: instancia=${feedback.instanceId} | numero=${feedback.whatsappNumber} | usuario=${feedback.userId || 'desconhecido'}.`
    );
    return result;
};

module.exports = {
    registerFeedback
};
