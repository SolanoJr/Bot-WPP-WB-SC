module.exports = {
    name: 'info',
    description: 'Mostra dados do contexto atual da mensagem.',

    async execute(msg, args, context) {
        void msg;
        void args;

        const chatId =
            context.message?.from ||
            context.message?.to ||
            context.message?.id?.remote ||
            'chat-desconhecido';

        const totalArgs = Array.isArray(context.args) ? context.args.length : 0;
        const response =
            `horario atual: ${context.timestamp}\n` +
            `id do chat: ${chatId}\n` +
            `numero de argumentos recebidos: ${totalArgs}`;

        await context.replyService.sendText(context, response);
    }
};
