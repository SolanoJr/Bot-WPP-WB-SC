const feedbackService = require('../services/backendTelemetryService');

module.exports = {
    name: 'feedback',
    description: 'Envia feedback para o backend operacional.',

    async execute(msg, args, context) {
        void msg;

        const feedbackMessage = args.join(' ').trim();

        if (!feedbackMessage) {
            await context.replyService.sendText(context, 'use !feedback <mensagem>');
            return;
        }

        const result = await feedbackService.sendFeedback(context, feedbackMessage);

        if (!result.sent) {
            await context.replyService.sendError(context, 'Nao foi possivel enviar o feedback');
            return;
        }

        await context.replyService.sendText(context, 'feedback enviado com sucesso');
    }
};
