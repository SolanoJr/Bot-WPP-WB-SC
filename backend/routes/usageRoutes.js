const usageService = require('../services/usageService');
const { requireAdminKey } = require('./instanceRoutes');

const registerUsageRoutes = (app) => {
    app.post('/usage', async (req, res, next) => {
        try {
            const result = await usageService.registerUsage(req.body);
            return res.status(201).json(result);
        } catch (error) {
            return next(error);
        }
    });

    app.get('/usage/summary', requireAdminKey, async (req, res, next) => {
        try {
            const limit = Number(req.query.limit || 5);
            const result = await usageService.getUsageSummary({ limit });
            return res.status(200).json(result);
        } catch (error) {
            return next(error);
        }
    });
};

module.exports = {
    registerUsageRoutes
};
