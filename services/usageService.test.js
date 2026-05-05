import { describe, beforeEach, test, expect } from 'vitest';
import usageService from './usageService';

describe('usageService', () => {
    beforeEach(() => {
        usageService.resetUsage();
    });

    test('incrementa uso de comando e usuario corretamente', () => {
        usageService.registerUsage('ping', 'user-1');
        usageService.registerUsage('ping', 'user-1');
        usageService.registerUsage('info', 'user-2');

        expect(usageService.getCommandUsage()).toEqual({
            ping: 2,
            info: 1
        });
        expect(usageService.getUserUsage()).toEqual({
            'user-1': 2,
            'user-2': 1
        });
    });

    test('retorna top usuarios com limite', () => {
        usageService.registerUsage('test', 'user-1');
        usageService.registerUsage('test', 'user-1');
        usageService.registerUsage('test', 'user-2');

        expect(usageService.getTopUsers(1)).toEqual([
            { userId: 'user-1', count: 2 }
        ]);
    });
});
