import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processMessage } from '../../src/services/messageHandler';
import * as moderationService from '../../src/services/moderationService';
import * as keywordHandler from '../../src/services/keywordHandler';

// Mock dos serviços
vi.mock('../../src/services/moderationService', () => ({
    handleModeration: vi.fn()
}));

vi.mock('../../src/services/keywordHandler', () => ({
    handleKeywords: vi.fn()
}));

describe('messageHandler', () => {
    let mockClient: any;
    let mockCommands: Map<string, any>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockClient = {};
        mockCommands = new Map();
        mockCommands.set('ping', {
            name: 'ping',
            execute: vi.fn()
        });
    });

    it('deve executar um comando legítimo ignorando a moderação', async () => {
        const msg = {
            body: '$ping',
            from: 'user123',
            reply: vi.fn()
        };

        await processMessage(msg, mockClient, mockCommands);

        // Verificações
        expect(moderationService.handleModeration).not.toHaveBeenCalled();
        expect(keywordHandler.handleKeywords).not.toHaveBeenCalled();
        expect(mockCommands.get('ping').execute).toHaveBeenCalled();
    });

    it('deve aplicar moderação para mensagens que não são comandos', async () => {
        const msg = {
            body: 'Olá bot',
            from: 'user123',
            reply: vi.fn()
        };

        // Simular que a moderação não bloqueou
        (moderationService.handleModeration as any).mockResolvedValue(false);
        (keywordHandler.handleKeywords as any).mockResolvedValue(false);

        await processMessage(msg, mockClient, mockCommands);

        expect(moderationService.handleModeration).toHaveBeenCalled();
        expect(keywordHandler.handleKeywords).toHaveBeenCalled();
        expect(mockCommands.get('ping').execute).not.toHaveBeenCalled();
    });

    it('deve interromper o fluxo se a moderação bloquear a mensagem', async () => {
        const msg = {
            body: 'link suspeito http://bet.com',
            from: 'user123',
            reply: vi.fn()
        };

        (moderationService.handleModeration as any).mockResolvedValue(true);

        await processMessage(msg, mockClient, mockCommands);

        expect(moderationService.handleModeration).toHaveBeenCalled();
        expect(keywordHandler.handleKeywords).not.toHaveBeenCalled();
        expect(mockCommands.get('ping').execute).not.toHaveBeenCalled();
    });

    it('deve tratar comandos inexistentes graciosamente', async () => {
        const msg = {
            body: '$comandoInexistente',
            from: 'user123',
            reply: vi.fn(),
            getChat: vi.fn().mockResolvedValue({ isGroup: false })
        };

        await processMessage(msg, mockClient, mockCommands);

        // Não deve crashar e não deve chamar comandos conhecidos
        expect(mockCommands.get('ping').execute).not.toHaveBeenCalled();
    });
});
