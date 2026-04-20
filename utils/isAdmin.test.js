const { getAdminNumbersFromEnv, isAdmin } = require('./isAdmin');

describe('isAdmin', () => {
    afterEach(() => {
        delete process.env.ADMIN_NUMBERS;
    });

    test('deve reconhecer admin autorizado via env', () => {
        process.env.ADMIN_NUMBERS = '5511999999999@c.us,5511888888888@c.us';

        expect(getAdminNumbersFromEnv()).toEqual([
            '5511999999999@c.us',
            '5511888888888@c.us'
        ]);
        expect(isAdmin({ from: '5511999999999@c.us' })).toBe(true);
    });

    test('deve negar admin nao autorizado', () => {
        process.env.ADMIN_NUMBERS = '5511999999999@c.us';

        expect(isAdmin({ from: '5511777777777@c.us' })).toBe(false);
    });
});
