const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const { createSchema, resolveDbPath } = require('./database/init');
const logger = require('../services/loggerService');

createSchema();

const { registerInstanceRoutes } = require('./routes/instanceRoutes');
const { registerUsageRoutes } = require('./routes/usageRoutes');
const { registerFeedbackRoutes } = require('./routes/feedbackRoutes');
const { registerLocationRoutes } = require('./routes/locationRoutes');

const createApp = () => {
    const app = express();

    app.use(express.json());

    // Servir arquivos estáticos da pasta public
    app.use(express.static(path.join(__dirname, '../public')));

    app.get('/health', (req, res) => {
        return res.status(200).json({
            ok: true,
            databasePath: resolveDbPath(),
            timestamp: new Date().toISOString()
        });
    });

    registerInstanceRoutes(app);
    registerUsageRoutes(app);
    registerFeedbackRoutes(app);
    registerLocationRoutes(app);

    app.use((req, res) => {
        return res.status(404).json({
            error: 'not_found',
            message: 'Rota nao encontrada'
        });
    });

    app.use((error, req, res, next) => {
        void next;
        console.error(error);
        return res.status(500).json({
            error: 'internal_error',
            message: 'Erro interno do servidor'
        });
    });

    return app;
};

const startServer = () => {
    const port = Number(process.env.HTTPS_PORT || 443);
    const app = createApp();
    
    // Opções SSL
    const sslOptions = {
        key: fs.readFileSync(path.join(__dirname, '../ssl/private.key')),
        cert: fs.readFileSync(path.join(__dirname, '../ssl/certificate.crt'))
    };
    
    // Criar servidor HTTPS
    const server = https.createServer(sslOptions, app);
    
    server.listen(port, () => {
        logger.info(`Backend HTTPS iniciado na porta ${port}. Banco: ${resolveDbPath()}.`);
        console.log(`🔒 Servidor HTTPS rodando na porta ${port}`);
        console.log(`📍 Acesse: https://100.101.218.16:${port}/health`);
    });
    
    return server;
};

if (require.main === module) {
    startServer();
}

module.exports = { createApp, startServer };
