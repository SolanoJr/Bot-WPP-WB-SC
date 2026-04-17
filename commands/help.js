module.exports = {
    name: 'help',
    description: 'Lista os comandos disponiveis.',

    async execute(msg, args, context) {
        void msg;
        void args;

        const commands = Array.from(context.commands.values())
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
            .map((command) => `- !${command.name}: ${command.description || 'Sem descricao.'}`);

        const response = [
            'Comandos disponiveis:',
            ...commands
        ].join('\n');

        await context.replyService.sendText(context, response);
    }
};
