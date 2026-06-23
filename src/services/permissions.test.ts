import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isMaster } from './permissions';

// Mock do process.env
vi.mock('dotenv', () => ({
    config: vi.fn()
}));

describe('Permissions Service', () => {
    beforeEach(() => {
        process.env.MASTER_USER = '5588998314322';
    });

    it('deve reconhecer o Master corretamente com @c.us', () => {
        expect(isMaster('5588998314322@c.us')).toBe(true);
    });

    it('deve reconhecer o Master corretamente com @lid', () => {
        expect(isMaster('5588998314322@lid')).toBe(true);
    });

    it('deve reconhecer o Master apenas com números', () => {
        expect(isMaster('5588998314322')).toBe(true);
    });

    it('deve negar permissão para outros usuários', () => {
        expect(isMaster('123456789@c.us')).toBe(false);
    });

    it('deve retornar false se o ID for inválido', () => {
        expect(isMaster('')).toBe(false);
        expect(isMaster(undefined as any)).toBe(false);
    });
});
