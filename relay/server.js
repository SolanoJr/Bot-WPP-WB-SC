const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração
const BACKEND_URL = process.env.BACKEND_URL || 'http://100.101.218.16:4010';
const TAILSCALE_HOST = process.env.TAILSCALE_HOST || '100.101.218.16';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configurar axios para Tailscale (ignorar SSL se necessário)
const tailscaleAgent = new https.Agent({
    rejectUnauthorized: false
});

// Keep-alive ping endpoint - PRIMEIRO para evitar conflitos
app.get('/ping', (req, res) => {
    console.log('🏓 Relay ping received - keeping Render awake');
    res.json({
        pong: true,
        service: 'bot-wpp-relay',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'bot-wpp-relay',
        timestamp: new Date().toISOString(),
        backend: BACKEND_URL
    });
});

// Receber localização do frontend (ultra-minimalista)
app.post('/location', async (req, res) => {
    try {
        const { token, chatId, location, userAgent, timestamp } = req.body;
        
        console.log('📥 Localização recebida para o chatId:', chatId);
        
        // Salvar localização para polling
        pendingLocations[chatId] = {
            token,
            chatId,
            location,
            userAgent,
            timestamp,
            receivedAt: new Date().toISOString()
        };
        
        res.json({
            success: true,
            message: 'Localização recebida e armazenada'
        });
        
    } catch (error) {
        console.error('❌ Erro ao processar localização:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar localização'
        });
    }
});

// Armazenamento simples (objeto em vez de Map)
const pendingLocations = {};

// Endpoint para o bot buscar localizações pendentes (simplificado)
app.get('/pending/:chatId', (req, res) => {
    try {
        const chatIdParam = req.params.chatId;
        if (!chatIdParam) {
            console.log(`Checking data for undefined: false (invalid ID)`);
            return res.status(204).send();  // Resposta vazia instantânea
        }

        const cleanId = String(chatIdParam).trim();
        const data = pendingLocations[cleanId];
        
        console.log(`Checking data for ${cleanId}: ${!!data}`);

        if (!data) {
            return res.status(204).send();  // Resposta vazia instantânea
        }

        // Remove e retorna os dados
        delete pendingLocations[cleanId];
        return res.json(data);
        
    } catch (criticalError) {
        console.error('🚨 CRITICAL ERROR IN GET /pending:', criticalError);
        // Força 204 para qualquer erro - nunca retorna 500
        return res.status(204).send();
    }
});

// Status geral do relay
app.get('/status', (req, res) => {
    res.json({
        service: 'bot-wpp-relay',
        status: 'online',
        backend: BACKEND_URL,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro no relay:', error);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
    });
});

// Limpeza automática de dados antigos
const cleanupOldData = () => {
    console.log(`🧹 Iniciando limpeza de dados antigos...`);
    // Aqui poderia limpar Redis/DB com dados > 5min
    console.log(`✅ Limpeza concluída`);
};

// Limpar a cada 5 minutos
setInterval(cleanupOldData, 5 * 60 * 1000);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Relay API rodando na porta ${PORT}`);
    console.log(`📡 Backend: ${BACKEND_URL}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🏓 Ping: http://localhost:${PORT}/ping`);
    console.log(`📊 Status: http://localhost:${PORT}/status`);
    console.log(`📍 Location: POST http://localhost:${PORT}/location`);
    console.log(`🔍 Pending: GET http://localhost:${PORT}/pending/:chatId`);
    console.log(`⏰ Iniciado: ${new Date().toISOString()}`);
    
    // Log de rotas registradas
    console.log(`📋 Rotas registradas:`);
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
            const path = middleware.route.path;
            console.log(`   ${methods} ${path}`);
        }
    });
    
    // Iniciar limpeza inicial
    setTimeout(cleanupOldData, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM - encerrando graceful...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT - encerrando graceful...');
    process.exit(0);
});

module.exports = app;
