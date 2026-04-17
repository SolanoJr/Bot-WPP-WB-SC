const { isValidCommand } = require('./validator');

test('deve validar comando com !', () => {
    expect(isValidCommand('!ping')).toBe(true);
});

test('deve rejeitar texto normal', () => {
    expect(isValidCommand('oi')).toBe(false);
});