module.exports = {
    name: 'welcome',
    description: 'Exemplo de comando simples para onboarding.',

    async execute(msg, args, context) {
        void msg;
        void args;

        await context.replyService.sendText(context, 'Bem-vindo! Esse é seu primeiro comando.');
    }
};
