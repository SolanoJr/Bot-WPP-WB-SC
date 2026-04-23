const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createMockLicenseServer } = require('./mock-license-api');

describe('mock license api', () => {
    let mockServer;
    let storePath;

    afterEach(async () => {
        if (mockServer) {
            await mockServer.stop();
            mockServer = null;
        }

        if (storePath && fs.existsSync(storePath)) {
            fs.rmSync(storePath, { force: true });
            storePath = null;
        }
    });

    test('deve responder authorized true para numero permitido', async () => {
        mockServer = createMockLicenseServer({
            port: 4021,
            authorizedNumbers: ['5511999999999@c.us']
        });

        await mockServer.start();

        const response = await axios.get('http://127.0.0.1:4021/licenca', {
            params: { numero: '5511999999999@c.us' },
            timeout: 5000
        });

        expect(response.data).toEqual({ authorized: true });
    });

    test('deve responder authorized false para numero nao permitido', async () => {
        mockServer = createMockLicenseServer({
            port: 4022,
            authorizedNumbers: ['5511888888888@c.us']
        });

        await mockServer.start();

        const response = await axios.get('http://127.0.0.1:4022/licenca', {
            params: { numero: '5511999999999@c.us' },
            timeout: 5000
        });

        expect(response.data).toEqual({ authorized: false });
    });

    test('deve registrar, aprovar e listar instancia no mock de controle', async () => {
        storePath = path.join(os.tmpdir(), `mock-control-${Date.now()}.json`);
        mockServer = createMockLicenseServer({
            port: 4023,
            storePath,
            registrationKey: 'segredo',
            adminKey: 'admin-local',
            defaultControlState: 'pending'
        });

        await mockServer.start();

        const registerResponse = await axios.post(
            'http://127.0.0.1:4023/instances/register',
            {
                instanceId: 'inst-1',
                machineId: 'mach-1',
                whatsappNumber: '5511999999999@c.us',
                operatorName: 'caio',
                instanceName: 'notebook-caio'
            },
            {
                headers: { 'x-control-key': 'segredo' },
                timeout: 5000
            }
        );

        expect(registerResponse.data.status).toBe('pending');

        const approveResponse = await axios.post(
            'http://127.0.0.1:4023/instances/inst-1/approve',
            {
                approvedBy: 'solano',
                reason: 'Liberado para desenvolvimento'
            },
            {
                headers: { 'x-admin-key': 'admin-local' },
                timeout: 5000
            }
        );

        expect(approveResponse.data.status).toBe('authorized');

        const listResponse = await axios.get('http://127.0.0.1:4023/instances', {
            headers: { 'x-admin-key': 'admin-local' },
            timeout: 5000
        });

        expect(listResponse.data.instances).toEqual([
            expect.objectContaining({
                instanceId: 'inst-1',
                operatorName: 'caio',
                status: 'authorized',
                approvedBy: 'solano'
            })
        ]);
    });

    test('deve registrar uso e feedback no mock operacional', async () => {
        storePath = path.join(os.tmpdir(), `mock-control-${Date.now()}-ops.json`);
        mockServer = createMockLicenseServer({
            port: 4024,
            storePath,
            adminKey: 'admin-local'
        });

        await mockServer.start();

        await axios.post('http://127.0.0.1:4024/usage', {
            instanceId: 'inst-1',
            whatsappNumber: '5511999999999@c.us',
            commandName: 'ping',
            args: ['123'],
            groupId: 'grupo@g.us',
            userId: '5511000000000@c.us'
        });

        await axios.post('http://127.0.0.1:4024/feedback', {
            instanceId: 'inst-1',
            whatsappNumber: '5511999999999@c.us',
            userId: '5511000000000@c.us',
            groupId: 'grupo@g.us',
            message: 'teste'
        });

        const summaryResponse = await axios.get('http://127.0.0.1:4024/usage/summary', {
            headers: { 'x-admin-key': 'admin-local' },
            timeout: 5000
        });

        expect(summaryResponse.data.topCommands).toEqual([
            expect.objectContaining({
                commandName: 'ping',
                count: 1
            })
        ]);

        const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        expect(store.feedback).toEqual([
            expect.objectContaining({
                message: 'teste'
            })
        ]);
    });
});
