jest.mock('axios');

const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const logger = require('./loggerService');
const controlService = require('./controlService');

const client = {
    info: {
        wid: {
            _serialized: '5511999999999@c.us'
        }
    }
};

describe('control service', () => {
    afterEach(() => {
        delete process.env.CONTROL_API_URL;
        delete process.env.CONTROL_REGISTRATION_KEY;
        delete process.env.CONTROL_HEARTBEAT_INTERVAL_MS;
        delete process.env.INSTANCE_OPERATOR_NAME;
        delete process.env.INSTANCE_LABEL;
        delete process.env.INSTANCE_STATE_PATH;
        controlService.resetControlStatus();
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    test('deve carregar configuracao do ambiente', () => {
        process.env.CONTROL_API_URL = 'https://controle/api';
        process.env.CONTROL_REGISTRATION_KEY = 'segredo';
        process.env.CONTROL_HEARTBEAT_INTERVAL_MS = '90000';
        process.env.INSTANCE_OPERATOR_NAME = 'solano';
        process.env.INSTANCE_LABEL = 'pc-principal';
        process.env.INSTANCE_STATE_PATH = 'C:/tmp/instance.json';

        const config = controlService.getControlConfig();

        expect(config).toEqual({
            controlApiUrl: 'https://controle/api',
            registrationKey: 'segredo',
            heartbeatIntervalMs: 90000,
            operatorName: 'solano',
            instanceLabel: 'pc-principal',
            instanceStatePath: 'C:/tmp/instance.json'
        });
    });

    test('deve persistir identidade da instancia no disco', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-wpp-control-'));
        const instanceStatePath = path.join(tempDir, 'instance.json');

        const firstIdentity = controlService.ensureInstanceIdentity({ instanceStatePath });
        const secondIdentity = controlService.ensureInstanceIdentity({ instanceStatePath });

        expect(firstIdentity.instanceId).toBeTruthy();
        expect(firstIdentity.machineId).toBeTruthy();
        expect(secondIdentity).toEqual(firstIdentity);

        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('deve registrar instancia autorizada no controle remoto', async () => {
        process.env.CONTROL_API_URL = 'https://controle/api';
        process.env.CONTROL_REGISTRATION_KEY = 'segredo';
        process.env.INSTANCE_OPERATOR_NAME = 'solano';
        process.env.INSTANCE_LABEL = 'pc-principal';
        jest.spyOn(logger, 'info').mockImplementation(() => {});
        axios.post.mockResolvedValueOnce({
            data: {
                status: 'authorized',
                instanceId: 'inst-1',
                machineId: 'mach-1',
                number: '5511999999999@c.us',
                operatorName: 'solano',
                instanceLabel: 'pc-principal',
                message: 'Instancia autorizada',
                approvedBy: 'owner'
            }
        });

        const status = await controlService.registerInstance(client, {
            instanceStatePath: path.join(os.tmpdir(), 'bot-wpp-control-register.json')
        });

        expect(status.state).toBe('authorized');
        expect(status.operatorName).toBe('solano');
        expect(axios.post).toHaveBeenCalledWith(
            'https://controle/api/register',
            expect.objectContaining({
                number: '5511999999999@c.us',
                operatorName: 'solano',
                instanceLabel: 'pc-principal'
            }),
            expect.objectContaining({
                headers: {
                    'x-control-key': 'segredo'
                },
                timeout: 5000
            })
        );
    });

    test('deve marcar erro quando o registro remoto falhar', async () => {
        process.env.CONTROL_API_URL = 'https://controle/api';
        jest.spyOn(logger, 'error').mockImplementation(() => {});
        axios.post.mockRejectedValueOnce(new Error('offline'));

        const status = await controlService.registerInstance(client, {
            instanceStatePath: path.join(os.tmpdir(), 'bot-wpp-control-error.json')
        });

        expect(status.state).toBe('error');
        expect(status.reason).toBe('Falha ao registrar a instancia no controle remoto');
    });

    test('deve atualizar status com heartbeat revogado', async () => {
        process.env.CONTROL_API_URL = 'https://controle/api';
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        axios.post.mockResolvedValueOnce({
            data: {
                status: 'revoked',
                instanceId: 'inst-1',
                machineId: 'mach-1',
                number: '5511999999999@c.us',
                operatorName: 'solano',
                instanceLabel: 'pc-principal',
                message: 'Acesso revogado'
            }
        });

        const status = await controlService.sendHeartbeat(client, {
            instanceStatePath: path.join(os.tmpdir(), 'bot-wpp-control-heartbeat.json'),
            operatorName: 'solano',
            instanceLabel: 'pc-principal'
        });

        expect(status.state).toBe('revoked');
        expect(status.reason).toBe('Acesso revogado');
    });
});
