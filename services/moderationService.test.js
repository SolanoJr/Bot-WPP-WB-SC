const moderationService = require('./moderationService');

describe('moderationService', () => {
    beforeEach(() => {
        moderationService.resetModerationState();
    });

    test('detecta link suspeito', () => {
        const analysis = moderationService.analyzeMessage({
            body: 'acesse http://site-suspeito.com',
            from: '5511000000000@c.us'
        });

        expect(analysis.isSpam).toBe(true);
        expect(analysis.reason).toContain('link');
    });

    test('detecta palavra-chave suspeita', () => {
        const analysis = moderationService.analyzeMessage({
            body: 'tem cassino e lucro fácil aqui',
            from: '5511000000000@c.us'
        });

        expect(analysis.isSpam).toBe(true);
        expect(analysis.reason).toContain('palavra-chave');
    });

    test('ignora mensagem normal', () => {
        const analysis = moderationService.analyzeMessage({
            body: 'bom dia pessoal',
            from: '5511000000000@c.us'
        });

        expect(analysis).toEqual({
            isSpam: false,
            reason: ''
        });
    });
});
