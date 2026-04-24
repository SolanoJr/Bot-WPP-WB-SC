const backendTelemetryService = require('../services/backendTelemetryService');
const { getControlStatus, isControlEnabled } = require('../services/controlService');

module.exports = {
    name: 'ondeestou',
    description: 'Gera um link para capturar localizacao via navegador.',

    async execute(msg, args, context) {
        void msg;
        void args;

        if (!isControlEnabled()) {
            await context.replyService.sendText(context, 'comando indisponivel sem CONTROL_API_URL configurado');
            return;
        }

        const controlStatus = getControlStatus();

        if (!controlStatus.instanceId) {
            await context.replyService.sendText(context, 'instancia ainda nao registrada no backend');
            return;
        }

        try {
            const payload = {
                instanceId: controlStatus.instanceId,
                userId: context.message?.author || context.message?.from || '',
                groupId: context.message?.from || ''
            };

            const data = await backendTelemetryService.postToBackend('/location/request', payload, {
                headers: {
                    'x-control-key': process.env.CONTROL_REGISTRATION_KEY || ''
                }
            });

            if (!data?.captureUrl) {
                await context.replyService.sendError(context, 'backend nao retornou link de localizacao');
                return;
            }

            await context.replyService.sendText(
                context,
                `abra este link e permita sua localizacao:\n${data.captureUrl}\nexpira em ${Math.floor((data.expiresInMs || 0) / 1000)}s`
            );
        } catch (error) {
            await context.replyService.sendError(context, 'nao foi possivel gerar link de localizacao');
        }
    }
};
