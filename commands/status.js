module.exports = {
    name: 'status',
    description: 'Mostra o estado atual do bot.',

    async execute(msg, args, context) {
        void msg;
        void args;

        const number =
            context.client?.info?.wid?._serialized ||
            context.authStatus?.number ||
            'desconhecido';
        const authorizedLabel = context.authStatus?.authorized ? 'autorizado' : 'nao autorizado';
        const authorizationOrigin = context.authStatus?.origin || 'desconhecido';
        const uptimeSeconds = Math.floor((context.uptimeMs || 0) / 1000);
        const response = [
            'Bot online',
            `numero do bot conectado: ${number}`,
            `status de autorizacao: ${authorizedLabel}`,
            `origem da autorizacao: ${authorizationOrigin}`,
            `quantidade de comandos carregados: ${context.commands.size}`,
            `admin atual: ${context.isAdmin ? 'sim' : 'nao'}`,
            `tempo online: ${uptimeSeconds}s`,
            `timestamp atual: ${context.timestamp}`
        ].join('\n');

        await context.replyService.sendText(context, response);
    }
};
