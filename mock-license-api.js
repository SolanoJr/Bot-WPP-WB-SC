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

const createLicenseResponse = (number, authorizedNumbers = DEFAULT_AUTHORIZED_NUMBERS) => {
    return {
        authorized: authorizedNumbers.includes(number)
    };
};

const readRequestBody = (request) => {
    return new Promise((resolve, reject) => {
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
};

const ensureStoreFile = (storePath) => {
    if (!fs.existsSync(storePath)) {
        fs.writeFileSync(storePath, JSON.stringify({ instances: {} }, null, 2), 'utf8');
    }
};

const readStore = (storePath) => {
    ensureStoreFile(storePath);
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
};

const writeStore = (storePath, store) => {
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
};

const buildInstanceResponse = (instance) => {
    return {
        status: instance.status,
        instanceId: instance.instanceId,
        machineId: instance.machineId,
        number: instance.number,
        operatorName: instance.operatorName,
        instanceLabel: instance.instanceLabel,
        message: instance.reason || 'Sem motivo informado',
        approvedBy: instance.approvedBy || '',
        lastHeartbeatAt: instance.lastHeartbeatAt || null
    };
};

const requireAdminKey = (request, adminKey) => {
    return request.headers['x-admin-key'] === adminKey;
};

const requireRegistrationKey = (request, registrationKey) => {
    if (!registrationKey) {
        return true;
    }

    return request.headers['x-control-key'] === registrationKey;
};

const createMockLicenseServer = (options = {}) => {
    const port = options.port || DEFAULT_PORT;
    const authorizedNumbers = options.authorizedNumbers || DEFAULT_AUTHORIZED_NUMBERS;
    const adminKey = options.adminKey || DEFAULT_CONTROL_ADMIN_KEY;
    const registrationKey = options.registrationKey || DEFAULT_CONTROL_REGISTRATION_KEY;
    const storePath = options.storePath || DEFAULT_CONTROL_STORE_PATH;
    const defaultControlState = options.defaultControlState || DEFAULT_CONTROL_STATE;

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

        if (request.method === 'POST' && requestUrl.pathname === '/control/register') {
            if (!requireRegistrationKey(request, registrationKey)) {
                sendJson(401, { status: 'revoked', message: 'Chave de registro invalida' });
                return;
            }

            const body = await readRequestBody(request);
            const now = new Date().toISOString();
            const store = readStore(storePath);
            const current = store.instances[body.instanceId] || {};
            const status = current.status || defaultControlState;
            const instance = {
                ...current,
                instanceId: body.instanceId,
                machineId: body.machineId,
                number: body.number,
                operatorName: body.operatorName,
                instanceLabel: body.instanceLabel,
                hostname: body.hostname,
                platform: body.platform,
                arch: body.arch,
                nodeVersion: body.nodeVersion,
                appVersion: body.appVersion,
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

        if (request.method === 'POST' && requestUrl.pathname === '/control/heartbeat') {
            if (!requireRegistrationKey(request, registrationKey)) {
                sendJson(401, { status: 'revoked', message: 'Chave de registro invalida' });
                return;
            }

            const body = await readRequestBody(request);
            const now = new Date().toISOString();
            const store = readStore(storePath);
            const current = store.instances[body.instanceId] || {
                instanceId: body.instanceId,
                machineId: body.machineId,
                number: body.number,
                operatorName: body.operatorName,
                instanceLabel: body.instanceLabel,
                status: defaultControlState,
                reason: defaultControlState === 'authorized' ? 'Instancia autorizada' : 'Instancia aguardando aprovacao',
                approvedBy: ''
            };
            const instance = {
                ...current,
                machineId: body.machineId,
                number: body.number,
                operatorName: body.operatorName,
                instanceLabel: body.instanceLabel,
                hostname: body.hostname,
                platform: body.platform,
                arch: body.arch,
                nodeVersion: body.nodeVersion,
                appVersion: body.appVersion,
                registeredAt: current.registeredAt || now,
                lastHeartbeatAt: now
            };

            store.instances[body.instanceId] = instance;
            writeStore(storePath, store);
            sendJson(200, buildInstanceResponse(instance));
            return;
        }

        if (request.method === 'GET' && requestUrl.pathname === '/control/instances') {
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
                    number: instance.number,
                    operatorName: instance.operatorName,
                    instanceLabel: instance.instanceLabel,
                    status: instance.status,
                    reason: instance.reason,
                    approvedBy: instance.approvedBy || '',
                    registeredAt: instance.registeredAt || null,
                    lastHeartbeatAt: instance.lastHeartbeatAt || null
                }))
            });
            return;
        }

        const approveMatch = requestUrl.pathname.match(/^\/control\/instances\/([^/]+)\/approve$/);

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

        const revokeMatch = requestUrl.pathname.match(/^\/control\/instances\/([^/]+)\/revoke$/);

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
        process.stdout.write(`Controle: http://127.0.0.1:${DEFAULT_PORT}/control/register\n`);
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
