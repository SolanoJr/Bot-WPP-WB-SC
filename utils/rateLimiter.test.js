const { checkRateLimit, resetRateLimiter } = require('./rateLimiter');

describe('rateLimiter', () => {
    afterEach(() => {
        resetRateLimiter();
    });

    test('deve permitir primeiro comando do usuario comum e bloquear o seguinte', () => {
        const message = { from: '5511777777777@c.us' };

        const firstAttempt = checkRateLimit(message, { now: 1000 });
        const secondAttempt = checkRateLimit(message, { now: 2000 });

        expect(firstAttempt).toEqual({
            allowed: true,
            remainingSeconds: 0
        });
        expect(secondAttempt.allowed).toBe(false);
        expect(secondAttempt.remainingSeconds).toBe(14);
    });

    test('deve ignorar rate limit para admin', () => {
        const message = { from: '5511999999999@c.us' };

        const result = checkRateLimit(message, {
            isAdmin: true,
            now: 1000
        });

        expect(result).toEqual({
            allowed: true,
            remainingSeconds: 0
        });
    });
});
