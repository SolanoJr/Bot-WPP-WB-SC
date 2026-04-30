const { askAI } = require('../../services/aiService');
const pergunta = require('../../commands/pergunta');
const ondeestou = require('../../commands/ondeestou');

// Mock do aiService
jest.mock('../../services/aiService');

describe('Suite de Testes de Integração - WarriorBlack Commands', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Comando $pergunta', () => {
        it('deve processar e responder uma pergunta via Gemini IA', async () => {
            const mockMsg = {
                reply: jest.fn().mockResolvedValue(true)
            };
            const mockArgs = ['Quem', 'é', 'o', 'WarriorBlack?'];
            
            // Simular resposta da IA
            askAI.mockResolvedValue('WarriorBlack é um bot de elite.');

            await pergunta.execute(mockMsg, {}, mockArgs);

            // Verificações
            expect(mockMsg.reply).toHaveBeenCalledWith(expect.stringContaining('Processando'));
            expect(askAI).toHaveBeenCalledWith('Quem é o WarriorBlack?');
            expect(mockMsg.reply).toHaveBeenCalledWith('WarriorBlack é um bot de elite.');
        });

        it('deve avisar se a pergunta estiver vazia', async () => {
            const mockMsg = {
                reply: jest.fn().mockResolvedValue(true)
            };
            const mockArgs = [];

            await pergunta.execute(mockMsg, {}, mockArgs);

            expect(mockMsg.reply).toHaveBeenCalledWith(expect.stringContaining('Por favor, digite sua pergunta'));
        });
    });

    describe('Comando $ondeestou', () => {
        it('deve gerar um link de localização válido com os parâmetros necessários', async () => {
            const mockMsg = {
                from: '558581344211@c.us',
                reply: jest.fn().mockResolvedValue(true)
            };
            
            // Mock do process.env.API_KEY
            process.env.API_KEY = 'api_bot_wpp_2026_secreta_aqui';

            await ondeestou.execute(mockMsg, {}, []);

            // Verificar se o reply contém o link e os parâmetros cruciais
            const replyCall = mockMsg.reply.mock.calls[0][0];
            expect(replyCall).toContain('Solicitação de Localização');
            expect(replyCall).toContain('token=loc_');
            expect(replyCall).toContain('chatId=558581344211%40c.us');
            expect(replyCall).toContain('apiKey=api_bot_wpp_2026_secreta_aqui');
            expect(replyCall).toContain('relay=https://bot-wpp-relay.onrender.com');
        });
    });
});
