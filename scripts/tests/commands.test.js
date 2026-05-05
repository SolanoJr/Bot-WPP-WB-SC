import { createRequire } from 'node:module';
import { describe, beforeEach, it, expect, vi } from 'vitest';

const require = createRequire(import.meta.url);
const aiService = require('../../services/aiService');
vi.spyOn(aiService, 'askAI');

const pergunta = require('../../commands/pergunta');
const ondeestou = require('../../commands/ondeestou');

describe('Suite de Testes de Integracao - WarriorBlack Commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Comando !pergunta', () => {
        it('deve processar e responder uma pergunta via Gemini IA', async () => {
            const mockMsg = {
                reply: vi.fn().mockResolvedValue(true)
            };
            const mockArgs = ['Quem', 'e', 'o', 'WarriorBlack?'];

            aiService.askAI.mockResolvedValue('WarriorBlack e um bot de elite.');

            await pergunta.execute(mockMsg, {}, mockArgs);

            expect(mockMsg.reply).toHaveBeenCalledWith(expect.stringContaining('Processando'));
            expect(aiService.askAI).toHaveBeenCalledWith('Quem e o WarriorBlack?');
            expect(mockMsg.reply).toHaveBeenCalledWith('WarriorBlack e um bot de elite.');
        });

        it('deve avisar se a pergunta estiver vazia', async () => {
            const mockMsg = {
                reply: vi.fn().mockResolvedValue(true)
            };

            await pergunta.execute(mockMsg, {}, []);

            expect(mockMsg.reply).toHaveBeenCalledWith(expect.stringContaining('Por favor, digite sua pergunta'));
        });
    });

    describe('Comando !ondeestou', () => {
        it('deve gerar um link de localizacao valido com os parametros necessarios', async () => {
            const mockMsg = {
                from: '558581344211@c.us',
                reply: vi.fn().mockResolvedValue(true)
            };

            process.env.WARRIOR_AUTH_KEY = 'solano_wb_gps_26';

            await ondeestou.execute(mockMsg, {}, []);

            const replyCall = mockMsg.reply.mock.calls[0][0];
            expect(replyCall).toContain('token=loc_');
            expect(replyCall).toContain('chatId=558581344211%40c.us');
            expect(replyCall).toContain('warriorKey=solano_wb_gps_26');
            expect(replyCall).toContain('relay=https://bot-wpp-relay.onrender.com');
        });
    });
});
