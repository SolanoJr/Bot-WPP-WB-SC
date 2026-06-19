/**
 * Wrapper para o módulo TypeScript `src/services/databaseService.ts`.
 * O código TypeScript é compilado para JavaScript dentro de `dist/bot`.
 * Aqui simplesmente re‑exportamos a implementação já compilada,
 * garantindo que o runtime (CommonJS) encontre o módulo.
 */
module.exports = require('../dist/bot/services/databaseService');
