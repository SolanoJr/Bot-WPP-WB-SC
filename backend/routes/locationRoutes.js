const fs = require('fs');
const path = require('path');
const locationService = require('../services/locationService');

const templatePath = path.join(__dirname, '..', 'static', 'location-capture.html');

const registerLocationRoutes = (app) => {
    app.post('/location/request', async (req, res, next) => {
        try {
            locationService.requireRegistrationKey(req.headers['x-control-key']);
            const result = locationService.createLocationRequest(req.body);
            return res.status(201).json(result);
        } catch (error) {
            return next(error);
        }
    });

    app.get('/location/capture/:requestId', async (req, res, next) => {
        try {
            const { requestId } = req.params;
            const request = locationService.getLocationRequest(requestId);

            if (!request) {
                return res.status(404).send('Link invalido ou expirado.');
            }

            const html = fs.readFileSync(templatePath, 'utf8')
                .replaceAll('__REQUEST_ID__', request.requestId)
                .replaceAll('__REPORT_ENDPOINT__', '/location/report');

            return res.status(200).type('html').send(html);
        } catch (error) {
            return next(error);
        }
    });

    app.post('/location/report', async (req, res, next) => {
        try {
            const result = await locationService.registerLocation(req.body);
            return res.status(201).json(result);
        } catch (error) {
            return next(error);
        }
    });
};

module.exports = {
    registerLocationRoutes
};
