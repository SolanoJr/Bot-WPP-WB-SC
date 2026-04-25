const instanceService = require('../services/instanceService');

const requireAdminKey = (req, res, next) => {
    const expectedKey = String(process.env.ADMIN_API_KEY || '').trim();
    const providedKey = String(req.headers['x-admin-key'] || '').trim();

    if (!expectedKey || providedKey !== expectedKey) {
        return res.status(401).json({
            error: 'unauthorized',
            message: 'Admin key invalida'
        });
    }

    return next();
};

const registerInstanceRoutes = (app) => {
    app.post('/instances/register', async (req, res, next) => {
        try {
            const result = await instanceService.registerInstance(req.body);
            return res.status(200).json(result);
        } catch (error) {
            return next(error);
        }
    });

    app.post('/instances/heartbeat', async (req, res, next) => {
        try {
            const result = await instanceService.registerHeartbeat(req.body);
            return res.status(200).json(result);
        } catch (error) {
            return next(error);
        }
    });

    app.get('/instances', requireAdminKey, async (req, res, next) => {
        try {
            const result = await instanceService.listInstances();
            return res.status(200).json({ instances: result });
        } catch (error) {
            return next(error);
        }
    });

    app.post('/instances/:id/approve', requireAdminKey, async (req, res, next) => {
        try {
            const result = await instanceService.approveInstance(req.params.id, req.body);
            return res.status(200).json(result);
        } catch (error) {
            return next(error);
        }
    });

    app.post('/instances/:id/revoke', requireAdminKey, async (req, res, next) => {
        try {
            const result = await instanceService.revokeInstance(req.params.id, req.body);
            return res.status(200).json(result);
        } catch (error) {
            return next(error);
        }
    });
};

module.exports = {
    registerInstanceRoutes,
    requireAdminKey
};
