const logger = require('./loggerService');

describe('logger service', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('deve expor os metodos info warn e error', () => {
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
    });

    test('deve registrar log estruturado no info', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        logger.info('mensagem de teste');

        const payload = JSON.parse(logSpy.mock.calls[0][0]);
        expect(payload).toEqual({
            timestamp: expect.any(String),
            level: 'info',
            message: 'mensagem de teste'
        });
    });
});
