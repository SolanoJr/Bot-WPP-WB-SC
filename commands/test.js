module.exports = {
    name: 'test',
    description: 'Confirma que o comando de teste esta funcionando.',

    async execute(msg, args, context) {
        void msg;
        void args;

        await context.replyService.sendText(context, 'comando test funcionando');
    }
};
