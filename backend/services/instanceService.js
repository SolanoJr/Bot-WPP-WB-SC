const instanceRepository = require('../repositories/instanceRepository');
const logger = require('../../services/loggerService');

const ALLOWED_STATUSES = new Set(['pending', 'authorized', 'revoked']);

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const buildInstancePayload = (body = {}) => {
    return {
        id: String(body.instanceId || body.id || '').trim(),
        machineId: String(body.machineId || '').trim(),
        instanceName: String(body.instanceName || body.instanceLabel || '').trim(),
        operatorName: String(body.operatorName || '').trim(),
        whatsappNumber: String(body.whatsappNumber || body.number || '').trim()
    };
};

const ensureInstancePayload = (payload) => {
    if (!payload.id || !payload.machineId || !payload.instanceName || !payload.operatorName || !payload.whatsappNumber) {
        throw createError('Dados da instancia incompletos', 400);
    }

    return payload;
};

const registerInstance = (body) => {
    const payload = ensureInstancePayload(buildInstancePayload(body));
    const now = new Date().toISOString();
    const existing = instanceRepository.findInstanceById(payload.id);

    const instance = instanceRepository.insertInstance({
        id: payload.id,
        machineId: payload.machineId,
        instanceName: payload.instanceName,
        operatorName: payload.operatorName,
        whatsappNumber: payload.whatsappNumber,
        status: existing?.status || 'pending',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        lastHeartbeatAt: existing?.lastHeartbeatAt || null
    });

    logger.info(
        `Instancia registrada: ${instance.id} | numero=${instance.whatsappNumber} | operador=${instance.operatorName} | status=${instance.status}.`
    );

    return {
        status: instance.status,
        instanceId: instance.id,
        machineId: instance.machineId,
        instanceName: instance.instanceName,
        operatorName: instance.operatorName,
        whatsappNumber: instance.whatsappNumber,
        message: instance.status === 'authorized' ? 'Instancia autorizada' : 'Instancia aguardando aprovacao',
        approvedBy: '',
        lastHeartbeatAt: instance.lastHeartbeatAt
    };
};

const registerHeartbeat = (body) => {
    const payload = ensureInstancePayload(buildInstancePayload(body));
    const now = new Date().toISOString();
    const existing = instanceRepository.findInstanceById(payload.id);

    if (!existing) {
        return registerInstance(body);
    }

    const instance = instanceRepository.updateInstanceHeartbeat({
        id: payload.id,
        machineId: payload.machineId,
        instanceName: payload.instanceName,
        operatorName: payload.operatorName,
        whatsappNumber: payload.whatsappNumber,
        updatedAt: now,
        lastHeartbeatAt: now
    });

    logger.info(`Heartbeat recebido da instancia ${instance.id}. Status atual: ${instance.status}.`);

    return {
        status: instance.status,
        instanceId: instance.id,
        machineId: instance.machineId,
        instanceName: instance.instanceName,
        operatorName: instance.operatorName,
        whatsappNumber: instance.whatsappNumber,
        message: instance.status === 'authorized' ? 'Instancia autorizada' : 'Instancia sem autorizacao ativa',
        approvedBy: '',
        lastHeartbeatAt: instance.lastHeartbeatAt
    };
};

const listInstances = () => {
    return instanceRepository.listInstances();
};

const setInstanceStatus = (id, status) => {
    if (!ALLOWED_STATUSES.has(status)) {
        throw createError('Status de instancia invalido', 400);
    }

    const existing = instanceRepository.findInstanceById(id);

    if (!existing) {
        throw createError('Instancia nao encontrada', 404);
    }

    return instanceRepository.updateInstanceStatus({
        id,
        status,
        updatedAt: new Date().toISOString(),
        lastHeartbeatAt: existing.lastHeartbeatAt
    });
};

const approveInstance = (id, metadata = {}) => {
    const instance = setInstanceStatus(id, 'authorized');
    logger.info(
        `Instancia aprovada: ${instance.id} | numero=${instance.whatsappNumber} | approvedBy=${metadata.approvedBy || 'desconhecido'}.`
    );
    return {
        status: instance.status,
        instanceId: instance.id,
        machineId: instance.machineId,
        instanceName: instance.instanceName,
        operatorName: instance.operatorName,
        whatsappNumber: instance.whatsappNumber,
        message: metadata.reason || 'Instancia autorizada',
        approvedBy: metadata.approvedBy || '',
        lastHeartbeatAt: instance.lastHeartbeatAt
    };
};

const revokeInstance = (id, metadata = {}) => {
    const instance = setInstanceStatus(id, 'revoked');
    logger.warn(
        `Instancia revogada: ${instance.id} | numero=${instance.whatsappNumber} | motivo=${metadata.reason || 'sem motivo informado'}.`
    );
    return {
        status: instance.status,
        instanceId: instance.id,
        machineId: instance.machineId,
        instanceName: instance.instanceName,
        operatorName: instance.operatorName,
        whatsappNumber: instance.whatsappNumber,
        message: metadata.reason || 'Instancia revogada',
        approvedBy: metadata.approvedBy || '',
        lastHeartbeatAt: instance.lastHeartbeatAt
    };
};

module.exports = {
    approveInstance,
    buildInstancePayload,
    listInstances,
    registerHeartbeat,
    registerInstance,
    revokeInstance
};
