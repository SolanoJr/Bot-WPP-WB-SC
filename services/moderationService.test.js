const { analyzeMessage, handleModeration } = require('./moderationService');
const logger = require('./loggerService');

describe('moderationService', () => {
    afterEach(() => {
        delete process.env.ADMIN_NUMBERS;
        jest.restoreAllMocks();
    });

    test('detecta link suspeito', () => {
        expect(
            analyzeMessage({
                body: 'entra aqui https://site-suspeito.com',
                _data: { isNewMsg: true }
            })
        ).toEqual({
            isSpam: true,
            reason: 'link enviado na primeira mensagem'
        });
    });

    test('detecta palavra-chave suspeita', () => {
        expect(
            analyzeMessage({
                body: 'ganhar dinheiro com lucro fácil'
            })
        ).toEqual({
            isSpam: true,
            reason: 'palavra-chave suspeita'
        });
    });

    test('ignora mensagem normal', () => {
        expect(
            analyzeMessage({
                body: 'bom dia grupo'
            })
        ).toEqual({
            isSpam: false,
            reason: ''
        });
    });

    test('executa acao automatica quando detectar spam', async () => {
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
        const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
        const client = {
            blockContact: jest.fn().mockResolvedValue(undefined),
            info: {
                wid: {
                    _serialized: '5511000000000@c.us'
                }
            }
        };
        const message = {
            body: 'bet agora https://suspeito.com',
            from: 'grupo@g.us',
            author: '5511777777777@c.us',
            fromMe: false,
            delete: jest.fn().mockResolvedValue(undefined),
            getChat: jest.fn().mockResolvedValue({
                isGroup: true,
                participants: [
                    { id: { _serialized: '5511777777777@c.us' }, isAdmin: false },
                    { id: { _serialized: '5511000000000@c.us' }, isAdmin: true }
                ],
                removeParticipants: jest.fn().mockResolvedValue(undefined)
            })
        };

        const result = await handleModeration(client, message);

        expect(result).toEqual({
            actionTaken: true,
            reason: 'link suspeito com palavra-chave proibida'
        });
        expect(message.delete).toHaveBeenCalledWith(true);
        expect(client.blockContact).toHaveBeenCalledWith('5511777777777@c.us');
        expect(warnSpy).toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalled();
    });
});
