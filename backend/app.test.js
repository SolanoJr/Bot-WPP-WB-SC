const http = require('http');
const os = require('os');
const path = require('path');

const startTestServer = async () => {
    jest.resetModules();
    const { createApp } = require('./app');
    const app = createApp();
    const server = http.createServer(app);

    await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    return {
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
    };
};

describe('backend app', () => {
    let server;
    let baseUrl;
    let dbPath;

    beforeEach(async () => {
        dbPath = path.join(os.tmpdir(), `bot-wpp-backend-${Date.now()}-${Math.random()}.sqlite`);
        process.env.DB_PATH = dbPath;
        process.env.ADMIN_API_KEY = 'admin-secret';
        process.env.CONTROL_REGISTRATION_KEY = 'control-secret';
        process.env.LOCATION_CAPTURE_BASE_URL = 'http://127.0.0.1:4010';

        const started = await startTestServer();
        server = started.server;
        baseUrl = started.baseUrl;
    });

    afterEach(async () => {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
            server = null;
        }

        delete process.env.DB_PATH;
        delete process.env.ADMIN_API_KEY;
        delete process.env.CONTROL_REGISTRATION_KEY;
        delete process.env.LOCATION_CAPTURE_BASE_URL;
    });

    test('deve registrar, aprovar, registrar uso e feedback e consultar resumo', async () => {
        const registerResponse = await fetch(`${baseUrl}/instances/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                instanceId: 'inst-1',
                machineId: 'mach-1',
                whatsappNumber: '5511999999999@c.us',
                operatorName: 'solano',
                instanceName: 'pc-principal'
            })
        });
        const registered = await registerResponse.json();

        expect(registerResponse.status).toBe(200);
        expect(registered.status).toBe('pending');

        const approveResponse = await fetch(`${baseUrl}/instances/inst-1/approve`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-admin-key': 'admin-secret'
            },
            body: JSON.stringify({
                approvedBy: 'owner',
                reason: 'Liberado'
            })
        });
        const approved = await approveResponse.json();

        expect(approveResponse.status).toBe(200);
        expect(approved.status).toBe('authorized');
        expect(approved.approvedBy).toBe('owner');

        const usageResponse = await fetch(`${baseUrl}/usage`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                instanceId: 'inst-1',
                whatsappNumber: '5511999999999@c.us',
                commandName: 'ping',
                args: ['123'],
                groupId: 'grupo@g.us',
                userId: '5511000000000@c.us'
            })
        });

        expect(usageResponse.status).toBe(201);

        const feedbackResponse = await fetch(`${baseUrl}/feedback`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                instanceId: 'inst-1',
                whatsappNumber: '5511999999999@c.us',
                userId: '5511000000000@c.us',
                groupId: 'grupo@g.us',
                message: 'Fluxo funcionando'
            })
        });

        expect(feedbackResponse.status).toBe(201);

        const summaryResponse = await fetch(`${baseUrl}/usage/summary`, {
            headers: {
                'x-admin-key': 'admin-secret'
            }
        });
        const summary = await summaryResponse.json();

        expect(summaryResponse.status).toBe(200);
        expect(summary.topCommands).toEqual([
            expect.objectContaining({ commandName: 'ping', count: 1 })
        ]);
        expect(summary.topUsers).toEqual([
            expect.objectContaining({ userId: '5511000000000@c.us', count: 1 })
        ]);
        expect(summary.usageByGroup).toEqual([
            expect.objectContaining({ groupId: 'grupo@g.us', count: 1 })
        ]);
    });

    test('deve criar solicitacao de localizacao e aceitar reporte', async () => {
        const requestResponse = await fetch(`${baseUrl}/location/request`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-control-key': 'control-secret'
            },
            body: JSON.stringify({
                instanceId: 'inst-1',
                userId: '5511000000000@c.us',
                groupId: 'grupo@g.us'
            })
        });
        const requestData = await requestResponse.json();

        expect(requestResponse.status).toBe(201);
        expect(requestData.captureUrl).toContain('/location/capture/');

        const captureResponse = await fetch(`${baseUrl}/location/capture/${requestData.requestId}`);
        const captureHtml = await captureResponse.text();

        expect(captureResponse.status).toBe(200);
        expect(captureHtml).toContain(requestData.requestId);

        const reportResponse = await fetch(`${baseUrl}/location/report`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                requestId: requestData.requestId,
                latitude: -23.55,
                longitude: -46.63
            })
        });
        const reportData = await reportResponse.json();

        expect(reportResponse.status).toBe(201);
        expect(reportData.ok).toBe(true);
        expect(reportData.mapsUrl).toContain('-23.55,-46.63');
    });
});
