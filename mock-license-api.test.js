const axios = require('axios');
const { createMockLicenseServer } = require('./mock-license-api');

describe('mock license api', () => {
    let mockServer;

    afterEach(async () => {
        if (mockServer) {
            await mockServer.stop();
            mockServer = null;
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
});
