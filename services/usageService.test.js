const usageService = require('./usageService');

describe('usageService', () => {
    afterEach(() => {
        usageService.resetUsage();
    });

    test('incrementa uso corretamente', () => {
        usageService.registerUsage('ping', '5511999999999@c.us');
        usageService.registerUsage('ping', '5511999999999@c.us');
        usageService.registerUsage('help', '5511888888888@c.us');

        expect(usageService.getCommandUsage()).toEqual({
            ping: 2,
            help: 1
        });
        expect(usageService.getUserUsage()).toEqual({
            '5511999999999@c.us': 2,
            '5511888888888@c.us': 1
        });
        expect(usageService.getTopUsers(1)).toEqual([
            { userId: '5511999999999@c.us', count: 2 }
        ]);
    });
});
