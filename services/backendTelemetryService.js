require('dotenv').config({ quiet: true });

const axios = require('axios');
const logger = require('./loggerService');
const { getControlStatus, isControlEnabled } = require('./controlService');

const getBackendConfig = () => ({
    controlApiUrl: String(process.env.CONTROL_API_URL || '').trim(),
    adminApiKey: String(process.env.ADMIN_API_KEY || '').trim()
});

const buildBaseUrl = (baseUrl) => String(baseUrl || '').replace(/\/+$/, '');

const postToBackend = async (route, payload, options = {}) => {
    const config = getBackendConfig();
    const baseUrl = buildBaseUrl(options.baseUrl || config.controlApiUrl);

    if (!baseUrl) {
        return null;
    }

    const response = await axios.post(`${baseUrl}${route}`, payload, {
        headers: options.headers || {},
        timeout: options.timeout || 5000
    });

    return response.data;
};

const getFromBackend = async (route, options = {}) => {
    const config = getBackendConfig();
    const baseUrl = buildBaseUrl(options.baseUrl || config.controlApiUrl);

    if (!baseUrl) {
        return null;
    }

    const response = await axios.get(`${baseUrl}${route}`, {
        headers: options.headers || {},
        timeout: options.timeout || 5000
    });

    return response.data;
};

const buildUsagePayload = (commandName, context) => {
    const controlStatus = getControlStatus();

    return {
        instanceId: controlStatus.instanceId || '',
        whatsappNumber:
            controlStatus.number ||
            context.client?.info?.wid?._serialized ||
            context.authStatus?.number ||
            '',
        commandName,
        args: Array.isArray(context.args) ? context.args : [],
        groupId: context.message?.from || '',
        userId: context.message?.author || context.message?.from || '',
        timestamp: context.timestamp
    };
};

const reportUsage = async (commandName, context, options = {}) => {
    if (!isControlEnabled()) {
        return { sent: false, reason: 'backend_desabilitado' };
    }

    const payload = buildUsagePayload(commandName, context);

    if (!payload.instanceId) {
        logger.warn(`Uso do comando ${commandName} nao enviado: instancia sem registro.`);
        return { sent: false, reason: 'instancia_nao_registrada' };
    }

    try {
        await postToBackend('/usage', payload, options);
        logger.info(`Uso do comando ${commandName} enviado para o backend. Usuario: ${payload.userId}. Grupo: ${payload.groupId}.`);
        return { sent: true, reason: '' };
    } catch (error) {
        logger.error(`Falha ao enviar uso do comando ${commandName} para o backend.`, error);
        return { sent: false, reason: 'erro_envio' };
    }
};

const sendFeedback = async (context, message, options = {}) => {
    if (!isControlEnabled()) {
        return { sent: false, reason: 'backend_desabilitado' };
    }

    const controlStatus = getControlStatus();
    const payload = {
        instanceId: controlStatus.instanceId || '',
        whatsappNumber:
            controlStatus.number ||
            context.client?.info?.wid?._serialized ||
            context.authStatus?.number ||
            '',
        userId: context.message?.author || context.message?.from || '',
        groupId: context.message?.from || '',
        message: String(message || '').trim()
    };

    if (!payload.instanceId) {
        logger.warn('Feedback nao enviado: instancia sem registro no backend.');
        return { sent: false, reason: 'instancia_nao_registrada' };
    }

    try {
        const data = await postToBackend('/feedback', payload, options);
        logger.info(`Feedback recebido e enviado ao backend. Usuario: ${payload.userId}.`);
        return { sent: true, reason: '', data };
    } catch (error) {
        logger.error('Falha ao enviar feedback para o backend.', error);
        return { sent: false, reason: 'erro_envio' };
    }
};

const getUsageSummary = async (options = {}) => {
    const config = getBackendConfig();
    const adminApiKey = String(options.adminApiKey || config.adminApiKey || '').trim();

    if (!isControlEnabled()) {
        return null;
    }

    if (!adminApiKey) {
        logger.warn('Resumo de uso remoto indisponivel: ADMIN_API_KEY nao configurada.');
        return null;
    }

    try {
        return await getFromBackend('/usage/summary', {
            ...options,
            headers: {
                'x-admin-key': adminApiKey
            }
        });
    } catch (error) {
        logger.error('Falha ao buscar resumo de uso no backend.', error);
        return null;
    }
};

module.exports = {
    buildUsagePayload,
    getBackendConfig,
    getUsageSummary,
    postToBackend,
    reportUsage,
    sendFeedback
};
