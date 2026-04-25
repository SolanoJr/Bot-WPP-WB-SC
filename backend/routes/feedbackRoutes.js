const feedbackService = require('../services/feedbackService');

const registerFeedbackRoutes = (app) => {
    app.post('/feedback', async (req, res, next) => {
        try {
            const result = await feedbackService.registerFeedback(req.body);
            return res.status(201).json(result);
        } catch (error) {
            return next(error);
        }
    });
};

module.exports = {
    registerFeedbackRoutes
};
