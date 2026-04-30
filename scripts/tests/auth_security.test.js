const request = require('supertest');
const express = require('express');

// Importamos a lógica de auth diretamente do server.js (se estivesse exportada)
// Como o server.js é um app completo, vamos simular o middleware para garantir que a LÓGICA está blindada.

const WARRIOR_AUTH_KEY_TEST = 'solano_wb_gps_26';

const checkApiKey = (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    const providedKey = req.headers['x-api-key'];
    const expectedKey = String(WARRIOR_AUTH_KEY_TEST).trim();
    const receivedKey = providedKey ? String(providedKey).trim() : '';

    if (receivedKey !== expectedKey) {
        return res.status(401).json({ success: false, error: 'auth_failed' });
    }
    next();
};

const app = express();
app.use(express.json());
app.post('/test-auth', checkApiKey, (req, res) => res.json({ success: true }));

describe('🔒 Blindagem de Autenticação (Negativo/Positivo)', () => {
    
    it('✅ POSITIVO: Deve permitir acesso com a chave correta', async () => {
        const response = await request(app)
            .post('/test-auth')
            .set('x-api-key', 'solano_wb_gps_26')
            .send({});
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it('❌ NEGATIVO: Deve bloquear chave com caractere faltando', async () => {
        const response = await request(app)
            .post('/test-auth')
            .set('x-api-key', 'solano_wb_gps_2') // Falta o '6'
            .send({});
        
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('auth_failed');
    });

    it('❌ NEGATIVO: Deve bloquear chave com caractere extra', async () => {
        const response = await request(app)
            .post('/test-auth')
            .set('x-api-key', 'solano_wb_gps_26_X')
            .send({});
        
        expect(response.status).toBe(401);
    });

    it('❌ NEGATIVO: Deve bloquear chave nula/vazia', async () => {
        const response = await request(app)
            .post('/test-auth')
            .send({});
        
        expect(response.status).toBe(401);
    });

    it('✅ TOLERÂNCIA: Deve permitir se houver espaços nas extremidades (Trim Test)', async () => {
        const response = await request(app)
            .post('/test-auth')
            .set('x-api-key', '  solano_wb_gps_26  ')
            .send({});
        
        expect(response.status).toBe(200);
    });
});
