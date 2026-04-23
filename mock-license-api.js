require('dotenv').config();

const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const DEFAULT_PORT = Number(process.env.MOCK_LICENSE_API_PORT || 4010);
const DEFAULT_AUTHORIZED_NUMBERS = (process.env.MOCK_AUTHORIZED_NUMBERS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const DEFAULT_CONTROL_ADMIN_KEY = process.env.MOCK_CONTROL_ADMIN_KEY || 'admin-local';
const DEFAULT_CONTROL_REGISTRATION_KEY = process.env.MOCK_CONTROL_REGISTRATION_KEY || '';
const DEFAULT_CONTROL_STORE_PATH = path.resolve(
    process.cwd(),
    process.env.MOCK_CONTROL_STORE_PATH || '.mock-control-store.json'
);
const DEFAULT_CONTROL_STATE = (process.env.MOCK_CONTROL_DEFAULT_STATE || 'pending').trim();

const createLicenseResponse = (number, authorizedNumbers = DEFAULT_AUTHORIZED_NUMBERS) => ({
    authorized: authorizedNumbers.includes(number)
});

const readRequestBody = (request) => new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
        if (chunks.length === 0) {
            resolve({});
            return;
        }

        try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (error) {
            reject(error);
        }
    });
    request.on('error', reject);
});

const ensureStoreFile = (storePath) => {
    if (!fs.existsSync(storePath)) {
        fs.writeFileSync(storePath, JSON.stringify({ instances: {}, usage: [], feedback: [] }, null, 2), 'utf8');
    }
};

const readStore = (storePath) => {
    ensureStoreFile(storePath);
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    store.instances = store.instances || {};
    store.usage = store.usage || [];
    store.feedback = store.feedback || [];
    return store;
};

const writeStore = (storePath, store) => {
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
};

const buildInstanceResponse = (instance) => ({
    status: instance.status,
    instanceId: instance.instanceId,
    machineId: instance.machineId,
    whatsappNumber: instance.whatsappNumber,
    number: instance.whatsappNumber,
    operatorName: instance.operatorName,
    instanceName: instance.instanceName,
    instanceLabel: instance.instanceName,
    message: instance.reason || 'Sem motivo informado',
    approvedBy: instance.approvedBy || '',
    lastHeartbeatAt: instance.lastHeartbeatAt || null
});

const requireAdminKey = (request, adminKey) => request.headers['x-admin-key'] === adminKey;

const requireRegistrationKey = (request, registrationKey) => {
    if (!registrationKey) {
        return true;
    }

    return request.headers['x-control-key'] === registrationKey;
};

const normalizeInstancePayload = (body = {}) => ({
    instanceId: String(body.instanceId || '').trim(),
    machineId: String(body.machineId || '').trim(),
    whatsappNumber: String(body.whatsappNumber || body.number || '').trim(),
    operatorName: String(body.operatorName || '').trim(),
    instanceName: String(body.instanceName || body.instanceLabel || '').trim()
});

const buildSummary = (usage = []) => {
    const countBy = (key) => {
        const counter = new Map();

        for (const item of usage) {
            const value = String(item[key] || '').trim() || 'desconhecido';
            counter.set(value, (counter.get(value) || 0) + 1);
        }

        return Array.from(counter.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'pt-BR'));
    };

    return {
        topCommands: countBy('commandName').map((item) => ({ commandName: item.value, count: item.count })),
        topUsers: countBy('userId').map((item) => ({ userId: item.value, count: item.count })),
        usageByGroup: countBy('groupId').map((item) => ({ groupId: item.value, count: item.count }))
    };
};

const createMockLicenseServer = (options = {}) => {
    const port = options.port || DEFAULT_PORT;
    const authorizedNumbers = options.authorizedNumbers || DEFAULT_AUTHORIZED_NUMBERS;
    const adminKey = options.adminKey || DEFAULT_CONTROL_ADMIN_KEY;
    const registrationKey = options.registrationKey || DEFAULT_CONTROL_REGISTRATION_KEY;
    const storePath = options.storePath || DEFAULT_CONTROL_STORE_PATH;
    const defaultControlState = options.defaultControlState || DEFAULT_CONTROL_STATE;

    const isRegisterRoute = (pathname) => pathname === '/instances/register' || pathname === '/control/register';
    const isHeartbeatRoute = (pathname) => pathname === '/instances/heartbeat' || pathname === '/control/heartbeat';
    const isListInstancesRoute = (pathname) => pathname === '/instances' || pathname === '/control/instances';
    const matchApproveRoute = (pathname) => pathname.match(/^\/(?:control\/)?instances\/([^/]+)\/approve$/);
    const matchRevokeRoute = (pathname) => pathname.match(/^\/(?:control\/)?instances\/([^/]+)\/revoke$/);

    const server = http.createServer(async (request, response) => {
        const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
        const sendJson = (statusCode, payload) => {
            response.writeHead(statusCode, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify(payload));
        };

        if (request.method === 'GET' && requestUrl.pathname === '/licenca') {
            const number = requestUrl.searchParams.get('numero') || '';
            sendJson(200, createLicenseResponse(number, authorizedNumbers));
            return;
        }

        if (request.method === 'POST' && isRegisterRoute(requestUrl.pathname)) {
            if (!requireRegistrationKey(request, registrationKey)) {
                sendJson(401, { status: 'revoked', message: 'Chave de registro invalida' });
                return;
            }

            const body = normalizeInstancePayload(await readRequestBody(request));
            const now = new Date().toISOString();
            const store = readStore(storePath);
            const current = store.instances[body.instanceId] || {};
            const status = current.status || defaultControlState;
            const instance = {
                ...current,
                instanceId: body.instanceId,
                machineId: body.machineId,
                whatsappNumber: body.whatsappNumber,
                operatorName: body.operatorName,
                instanceName: body.instanceName,
                status,
                reason: current.reason || (status === 'authorized' ? 'Instancia autorizada' : 'Instancia aguardando aprovacao'),
                registeredAt: current.registeredAt || now,
                lastHeartbeatAt: current.lastHeartbeatAt || null,
                approvedBy: current.approvedBy || ''
            };

            store.instances[body.instanceId] = instance;
            writeStore(storePath, store);
            sendJson(200, buildInstanceResponse(instance));
            return;
        }

        if (request.method === 'POST' && isHeartbeatRoute(requestUrl.pathname)) {
            if (!requireRegistrationKey(request, registrationKey)) {
                sendJson(401, { status: 'revoked', message: 'Chave de registro invalida' });
                return;
            }

            const body = normalizeInstancePayload(await readRequestBody(request));
            const now = new Date().toISOString();
            const store = readStore(storePath);
            const current = store.instances[body.instanceId] || {
                instanceId: body.instanceId,
                machineId: body.machineId,
                whatsappNumber: body.whatsappNumber,
                operatorName: body.operatorName,
                instanceName: body.instanceName,
                status: defaultControlState,
                reason: defaultControlState === 'authorized' ? 'Instancia autorizada' : 'Instancia aguardando aprovacao',
                approvedBy: ''
            };
            const instance = {
                ...current,
                machineId: body.machineId,
                whatsappNumber: body.whatsappNumber,
                operatorName: body.operatorName,
                instanceName: body.instanceName,
                registeredAt: current.registeredAt || now,
                lastHeartbeatAt: now
            };

            store.instances[body.instanceId] = instance;
            writeStore(storePath, store);
            sendJson(200, buildInstanceResponse(instance));
            return;
        }

        if (request.method === 'GET' && isListInstancesRoute(requestUrl.pathname)) {
            if (!requireAdminKey(request, adminKey)) {
                sendJson(401, { error: 'Admin key invalida' });
                return;
            }

            const store = readStore(storePath);
            const instances = Object.values(store.instances)
                .sort((a, b) => (a.registeredAt || '').localeCompare(b.registeredAt || ''));

            sendJson(200, {
                instances: instances.map((instance) => ({
                    instanceId: instance.instanceId,
                    machineId: instance.machineId,
                    whatsappNumber: instance.whatsappNumber,
                    number: instance.whatsappNumber,
                    operatorName: instance.operatorName,
                    instanceName: instance.instanceName,
                    instanceLabel: instance.instanceName,
                    status: instance.status,
                    reason: instance.reason,
                    approvedBy: instance.approvedBy || '',
                    registeredAt: instance.registeredAt || null,
                    lastHeartbeatAt: instance.lastHeartbeatAt || null
                }))
            });
            return;
        }

        const approveMatch = matchApproveRoute(requestUrl.pathname);

        if (request.method === 'POST' && approveMatch) {
            if (!requireAdminKey(request, adminKey)) {
                sendJson(401, { error: 'Admin key invalida' });
                return;
            }

            const instanceId = decodeURIComponent(approveMatch[1]);
            const body = await readRequestBody(request);
            const store = readStore(storePath);
            const current = store.instances[instanceId];

            if (!current) {
                sendJson(404, { error: 'Instancia nao encontrada' });
                return;
            }

            const updated = {
                ...current,
                status: 'authorized',
                reason: body.reason || 'Instancia autorizada manualmente',
                approvedBy: body.approvedBy || 'admin-local',
                approvedAt: new Date().toISOString()
            };

            store.instances[instanceId] = updated;
            writeStore(storePath, store);
            sendJson(200, buildInstanceResponse(updated));
            return;
        }

        const revokeMatch = matchRevokeRoute(requestUrl.pathname);

        if (request.method === 'POST' && revokeMatch) {
            if (!requireAdminKey(request, adminKey)) {
                sendJson(401, { error: 'Admin key invalida' });
                return;
            }

            const instanceId = decodeURIComponent(revokeMatch[1]);
            const body = await readRequestBody(request);
            const store = readStore(storePath);
            const current = store.instances[instanceId];

            if (!current) {
                sendJson(404, { error: 'Instancia nao encontrada' });
                return;
            }

            const updated = {
                ...current,
                status: 'revoked',
                reason: body.reason || 'Instancia revogada manualmente',
                revokedAt: new Date().toISOString()
            };

            store.instances[instanceId] = updated;
            writeStore(storePath, store);
            sendJson(200, buildInstanceResponse(updated));
            return;
        }

        if (request.method === 'POST' && requestUrl.pathname === '/usage') {
            const body = await readRequestBody(request);
            const store = readStore(storePath);
            store.usage.push({
                instanceId: body.instanceId,
                whatsappNumber: body.whatsappNumber,
                commandName: body.commandName,
                args: Array.isArray(body.args) ? body.args : [],
                groupId: body.groupId || '',
                userId: body.userId || '',
                timestamp: body.timestamp || new Date().toISOString()
            });
            writeStore(storePath, store);
            sendJson(201, { success: true });
            return;
        }

        if (request.method === 'POST' && requestUrl.pathname === '/feedback') {
            const body = await readRequestBody(request);
            const store = readStore(storePath);
            store.feedback.push({
                instanceId: body.instanceId,
                whatsappNumber: body.whatsappNumber,
                userId: body.userId || '',
                groupId: body.groupId || '',
                message: body.message || '',
                createdAt: new Date().toISOString()
            });
            writeStore(storePath, store);
            sendJson(201, { success: true });
            return;
        }

        if (request.method === 'GET' && requestUrl.pathname === '/usage/summary') {
            if (!requireAdminKey(request, adminKey)) {
                sendJson(401, { error: 'Admin key invalida' });
                return;
            }

            const store = readStore(storePath);
            sendJson(200, buildSummary(store.usage));
            return;
        }

        sendJson(404, { error: 'Rota nao encontrada' });
    });

    return {
        server,
        start() {
            return new Promise((resolve) => {
                server.listen(port, '127.0.0.1', () => resolve(server));
            });
        },
        stop() {
            return new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        }
    };
};

if (require.main === module) {
    const mockServer = createMockLicenseServer();

    mockServer.start().then(() => {
        process.stdout.write(`Mock de licenca e controle ativo em http://127.0.0.1:${DEFAULT_PORT}\n`);
        process.stdout.write(`Licenca: http://127.0.0.1:${DEFAULT_PORT}/licenca\n`);
        process.stdout.write(`Controle: http://127.0.0.1:${DEFAULT_PORT}/instances/register\n`);
    });
}

module.exports = {
    DEFAULT_AUTHORIZED_NUMBERS,
    DEFAULT_CONTROL_ADMIN_KEY,
    DEFAULT_CONTROL_REGISTRATION_KEY,
    DEFAULT_CONTROL_STATE,
    DEFAULT_CONTROL_STORE_PATH,
    DEFAULT_PORT,
    buildInstanceResponse,
    createLicenseResponse,
    createMockLicenseServer,
    readStore,
    writeStore
};
