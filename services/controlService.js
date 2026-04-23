require('dotenv').config({ quiet: true });

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('./loggerService');
const { getClientNumber } = require('./authService');

const DEFAULT_CONTROL_HEARTBEAT_INTERVAL_MS = 60000;
const DEFAULT_CONTROL_STATUS = {
    enabled: false,
    state: 'disabled',
    instanceId: '',
    machineId: '',
    number: '',
    operatorName: '',
    instanceLabel: '',
    reason: 'Controle remoto desabilitado',
    approvedBy: '',
    checkedAt: null,
    lastHeartbeatAt: null
};

let controlStatus = { ...DEFAULT_CONTROL_STATUS };

const getDefaultInstanceStatePath = () => {
    return path.join(process.cwd(), '.bot-control', 'instance.json');
};

const getControlConfig = () => {
    return {
        controlApiUrl: (process.env.CONTROL_API_URL || '').trim(),
        registrationKey: (process.env.CONTROL_REGISTRATION_KEY || '').trim(),
        heartbeatIntervalMs: Number(
            process.env.CONTROL_HEARTBEAT_INTERVAL_MS || DEFAULT_CONTROL_HEARTBEAT_INTERVAL_MS
        ),
        operatorName: (process.env.INSTANCE_OPERATOR_NAME || os.userInfo().username || 'desconhecido').trim(),
        instanceLabel: (process.env.INSTANCE_LABEL || os.hostname() || 'instancia-local').trim(),
        instanceStatePath: (process.env.INSTANCE_STATE_PATH || getDefaultInstanceStatePath()).trim()
    };
};

const ensureDirectory = (filePath) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const readJsonFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeJsonFile = (filePath, payload) => {
    ensureDirectory(filePath);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
};

const ensureInstanceIdentity = (options = {}) => {
    const config = getControlConfig();
    const instanceStatePath = options.instanceStatePath || config.instanceStatePath;
    const savedIdentity = readJsonFile(instanceStatePath);

    if (savedIdentity?.instanceId && savedIdentity?.machineId) {
        return savedIdentity;
    }

    const identity = {
        instanceId: crypto.randomUUID(),
        machineId: crypto.randomUUID(),
        createdAt: new Date().toISOString()
    };

    writeJsonFile(instanceStatePath, identity);
    return identity;
};

const setControlStatus = (partialStatus = {}) => {
    controlStatus = {
        ...controlStatus,
        ...partialStatus,
        checkedAt: new Date().toISOString()
    };

    return { ...controlStatus };
};

const getControlStatus = () => {
    return { ...controlStatus };
};

const resetControlStatus = () => {
    controlStatus = { ...DEFAULT_CONTROL_STATUS };
    return getControlStatus();
};

const buildControlHeaders = (config = getControlConfig()) => {
    const headers = {};

    if (config.registrationKey) {
        headers['x-control-key'] = config.registrationKey;
    }

    return headers;
};

const normalizeControlResponse = (response = {}, fallback = {}) => {
    return {
        enabled: true,
        state: response.status || fallback.state || 'pending',
        instanceId: response.instanceId || fallback.instanceId || '',
        machineId: response.machineId || fallback.machineId || '',
        number: response.number || response.whatsappNumber || fallback.number || fallback.whatsappNumber || '',
        operatorName: response.operatorName || fallback.operatorName || '',
        instanceLabel:
            response.instanceLabel ||
            response.instanceName ||
            fallback.instanceLabel ||
            fallback.instanceName ||
            '',
        reason: response.message || response.reason || fallback.reason || 'Sem motivo informado',
        approvedBy: response.approvedBy || fallback.approvedBy || '',
        lastHeartbeatAt: response.lastHeartbeatAt || fallback.lastHeartbeatAt || null
    };
};

const buildInstancePayload = (client, options = {}) => {
    const config = getControlConfig();
    const identity = ensureInstanceIdentity(options);

    return {
        instanceId: identity.instanceId,
        machineId: identity.machineId,
        number: getClientNumber(client),
        operatorName: options.operatorName || config.operatorName,
        instanceLabel: options.instanceLabel || config.instanceLabel,
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        appVersion: process.env.npm_package_version || '1.0.0'
    };
};

const isControlEnabled = (config = getControlConfig()) => {
    return Boolean(config.controlApiUrl);
};

const isInstanceAuthorized = (status = getControlStatus()) => {
    return status.state === 'authorized';
};

const buildControlUrl = (route, options = {}) => {
    const config = getControlConfig();
    const controlApiUrl = options.controlApiUrl || config.controlApiUrl;

    if (!controlApiUrl) {
        return '';
    }

    return `${String(controlApiUrl).replace(/\/+$/, '')}${route}`;
};

const postControlEvent = async (route, payload, options = {}) => {
    const controlUrl = buildControlUrl(route, options);

    if (!controlUrl) {
        return null;
    }

    const config = getControlConfig();
    const response = await axios.post(controlUrl, payload, {
        headers: buildControlHeaders(config),
        timeout: options.timeout || 5000
    });

    return response.data;
};

const registerInstance = async (client, options = {}) => {
    const config = getControlConfig();

    if (!isControlEnabled(config)) {
        logger.warn('Controle remoto desabilitado. Defina CONTROL_API_URL para exigir aprovacao por instancia.');
        return setControlStatus({
            enabled: false,
            state: 'disabled',
            reason: 'Controle remoto desabilitado'
        });
    }

    const payload = buildInstancePayload(client, options);
    logger.info(`Registrando instancia ${payload.instanceId} para ${payload.number}.`);

    try {
        const data = await postControlEvent('/instances/register', payload, options);
        const status = setControlStatus(normalizeControlResponse(data, payload));

        logger.info(
            `Controle remoto respondeu para ${status.number}: estado=${status.state}, instancia=${status.instanceId}, operador=${status.operatorName}.`
        );

        return status;
    } catch (error) {
        const status = setControlStatus({
            enabled: true,
            state: 'error',
            instanceId: payload.instanceId,
            machineId: payload.machineId,
            number: payload.number,
            operatorName: payload.operatorName,
            instanceLabel: payload.instanceLabel,
            reason: 'Falha ao registrar a instancia no controle remoto'
        });
        logger.error(`Falha ao registrar a instancia ${payload.instanceId} no controle remoto.`, error);
        return status;
    }
};

const sendHeartbeat = async (client, options = {}) => {
    const config = getControlConfig();

    if (!isControlEnabled(config)) {
        return getControlStatus();
    }

    const payload = buildInstancePayload(client, options);

    try {
        const data = await postControlEvent('/instances/heartbeat', payload, options);
        const status = setControlStatus(normalizeControlResponse(data, payload));

        if (status.state !== 'authorized') {
            logger.warn(
                `Heartbeat retornou estado ${status.state} para a instancia ${status.instanceId}. Motivo: ${status.reason}.`
            );
        }

        return status;
    } catch (error) {
        logger.error(`Falha no heartbeat da instancia ${payload.instanceId}.`, error);
        return setControlStatus({
            enabled: true,
            state: 'error',
            instanceId: payload.instanceId,
            machineId: payload.machineId,
            number: payload.number,
            operatorName: payload.operatorName,
            instanceLabel: payload.instanceLabel,
            reason: 'Falha ao enviar heartbeat para o controle remoto'
        });
    }
};

const createControlHeartbeat = (client, options = {}) => {
    const config = getControlConfig();
    const intervalMs = options.intervalMs || config.heartbeatIntervalMs;
    let timer = null;

    return {
        start() {
            if (!isControlEnabled(config) || !intervalMs || intervalMs <= 0 || timer) {
                return null;
            }

            logger.info(`Heartbeat de controle agendado a cada ${intervalMs} ms.`);

            timer = setInterval(async () => {
                const status = await sendHeartbeat(client, options);

                if (status.state !== 'authorized') {
                    if (typeof options.onUnauthorized === 'function') {
                        options.onUnauthorized(status);
                    }
                    return;
                }

                if (typeof options.onAuthorized === 'function') {
                    options.onAuthorized(status);
                }
            }, intervalMs);

            return timer;
        },
        stop() {
            if (!timer) {
                return;
            }

            clearInterval(timer);
            timer = null;
        }
    };
};

module.exports = {
    DEFAULT_CONTROL_HEARTBEAT_INTERVAL_MS,
    buildControlHeaders,
    buildInstancePayload,
    createControlHeartbeat,
    ensureInstanceIdentity,
    buildControlUrl,
    getControlConfig,
    getControlStatus,
    isControlEnabled,
    isInstanceAuthorized,
    normalizeControlResponse,
    postControlEvent,
    registerInstance,
    resetControlStatus,
    sendHeartbeat,
    setControlStatus
};
