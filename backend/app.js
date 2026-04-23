require('dotenv').config({ quiet: true });

const express = require('express');
const { createSchema, resolveDbPath } = require('./database/init');
const logger = require('../services/loggerService');

createSchema();

const { registerInstanceRoutes } = require('./routes/instanceRoutes');
const { registerUsageRoutes } = require('./routes/usageRoutes');
const { registerFeedbackRoutes } = require('./routes/feedbackRoutes');

const createApp = () => {
    const app = express();

    app.use(express.json());

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

    app.use((req, res) => {
        return res.status(404).json({
            error: 'not_found',
            message: 'Rota nao encontrada'
        });
    });

    app.use((error, req, res, next) => {
        void next;

        const statusCode = Number(error?.statusCode || error?.status || 500);
        const message = error?.message || 'Erro interno do servidor';

        logger.error(`Erro na API ${req.method} ${req.originalUrl}: ${message}`, error);

        return res.status(statusCode).json({
            error: statusCode >= 500 ? 'internal_error' : 'request_error',
            message
        });
    });

    return app;
};

const startServer = () => {
    const port = Number(process.env.PORT || 4010);
    const app = createApp();

    app.listen(port, () => {
        logger.info(`Backend iniciado na porta ${port}. Banco: ${resolveDbPath()}.`);
    });

    return app;
};

if (require.main === module) {
    startServer();
}

module.exports = {
    createApp,
    startServer
};
