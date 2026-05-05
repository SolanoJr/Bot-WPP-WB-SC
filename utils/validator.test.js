import { test, expect } from 'vitest';
import validator from './validator';

const { isValidCommand } = validator;

test('deve validar comando com !', () => {
    expect(isValidCommand('!ping')).toBe(true);
});

test('deve rejeitar texto normal', () => {
    expect(isValidCommand('oi')).toBe(false);
});
