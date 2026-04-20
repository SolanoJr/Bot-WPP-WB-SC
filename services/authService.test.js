jest.mock('axios');

const axios = require('axios');
const dotenv = require('dotenv');
const logger = require('./loggerService');
const authService = require('./authService');

describe('auth service', () => {
    const client = {
        info: {
            wid: {
                _serialized: '5511999999999@c.us'
            }
        }
    };

    afterEach(() => {
        delete process.env.LICENSE_API_URL;
        delete process.env.LOCAL_AUTHORIZED_NUMBERS;
        delete process.env.LICENSE_REVALIDATION_INTERVAL_MS;
        authService.resetAuthStatus();
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    test('deve carregar configuracao do ambiente', () => {
        process.env.LICENSE_API_URL = 'https://env/licenca';
        process.env.LOCAL_AUTHORIZED_NUMBERS = '5511999999999@c.us,5511888888888@c.us';
        process.env.LICENSE_REVALIDATION_INTERVAL_MS = '600000';

        const config = authService.getAuthConfig();

        expect(config).toEqual({
            licenseApiUrl: 'https://env/licenca',
            authListUrl: 'https://env/licenca',
            localAuthorizedNumbers: ['5511999999999@c.us', '5511888888888@c.us'],
            revalidationIntervalMs: 600000
        });
    });

    test('deve inicializar suporte a .env', () => {
        expect(dotenv.config).toBeDefined();
    });

    test('deve autorizar numero quando a API responder authorized true', async () => {
        process.env.LICENSE_API_URL = 'https://mock/licenca';
        jest.spyOn(logger, 'info').mockImplementation(() => {});
        axios.get.mockResolvedValueOnce({
            data: { authorized: true }
        });

        const authorized = await authService.checkLicense(client);

        expect(authorized).toBe(true);
        expect(axios.get).toHaveBeenCalledWith('https://mock/licenca', {
            params: { numero: '5511999999999@c.us' },
            timeout: 5000
        });
    });

    test('deve expor o ultimo status de autorizacao', async () => {
        process.env.LICENSE_API_URL = 'https://mock/licenca';
        jest.spyOn(logger, 'info').mockImplementation(() => {});
        axios.get.mockResolvedValueOnce({
            data: { authorized: true }
        });

        await authService.checkLicense(client);
        const status = authService.getAuthStatus();

        expect(status).toEqual({
            authorized: true,
            origin: 'remoto',
            number: '5511999999999@c.us',
            reason: 'Autorizado pela API remota',
            checkedAt: expect.any(String)
        });
    });

    test('deve negar numero quando a API responder authorized false', async () => {
        process.env.LICENSE_API_URL = 'https://mock/licenca';
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        axios.get.mockResolvedValueOnce({
            data: { authorized: false }
        });

        const authorized = await authService.checkLicense(client);

        expect(authorized).toBe(false);
    });

    test('deve usar fallback local configurado no ambiente quando a API falhar', async () => {
        process.env.LOCAL_AUTHORIZED_NUMBERS = '5511999999999@c.us';
        process.env.LICENSE_API_URL = 'https://mock/licenca';
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});
        axios.get.mockRejectedValueOnce(new Error('timeout'));

        const authorized = await authService.checkLicense(client);

        expect(authorized).toBe(true);
    });

    test('deve bloquear por seguranca quando a API falhar e o fallback nao autorizar', async () => {
        process.env.LICENSE_API_URL = 'https://mock/licenca';
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});
        axios.get.mockRejectedValueOnce(new Error('timeout'));

        const authorized = await authService.checkLicense(client, {
            fallbackNumbers: []
        });

        expect(authorized).toBe(false);
    });
});
