module.exports = {
    name: 'ping',
    description: 'Responde com pong para validar se o bot esta ativo.',

    async execute(msg, args, context) {
        void msg;
        void args;

        await context.replyService.sendText(context, 'pong');
    }
};
