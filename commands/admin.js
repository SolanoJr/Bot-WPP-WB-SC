const usageSubcommand = require('./admin/usage');

module.exports = {
    name: 'admin',
    description: 'Executa comandos administrativos.',

    async execute(msg, args, context) {
        void msg;

        if (!context.isAdmin) {
            await context.replyService.sendText(context, 'acesso negado');
            return;
        }

        const subcommand = (args[0] || 'status').toLowerCase();

        if (subcommand === 'status') {
            const uptimeSeconds = Math.floor((context.uptimeMs || 0) / 1000);
            const number =
                context.client?.info?.wid?._serialized ||
                context.authStatus?.number ||
                'desconhecido';

            await context.replyService.sendText(
                context,
                [
                    'Admin status',
                    `numero: ${number}`,
                    `autorizacao: ${context.authStatus?.authorized ? 'autorizado' : 'nao autorizado'}`,
                    `origem: ${context.authStatus?.origin || 'desconhecido'}`,
                    `controle: ${context.controlStatus?.enabled === false ? 'desabilitado' : context.controlStatus?.state || 'desconhecido'}`,
                    `instancia: ${context.controlStatus?.instanceId || 'nao registrada'}`,
                    `operador: ${context.controlStatus?.operatorName || 'desconhecido'}`,
                    `comandos carregados: ${context.commands.size}`,
                    `tempo online: ${uptimeSeconds}s`
                ].join('\n')
            );
            return;
        }

        if (subcommand === 'auth') {
            await context.replyService.sendText(
                context,
                [
                    'Admin auth',
                    `status: ${context.authStatus?.authorized ? 'autorizado' : 'nao autorizado'}`,
                    `origem: ${context.authStatus?.origin || 'desconhecido'}`,
                    `motivo: ${context.authStatus?.reason || 'desconhecido'}`,
                    `ultimo check: ${context.authStatus?.checkedAt || 'nunca'}`,
                    `controle: ${context.controlStatus?.enabled === false ? 'desabilitado' : context.controlStatus?.state || 'desconhecido'}`,
                    `instancia: ${context.controlStatus?.instanceId || 'nao registrada'}`,
                    `motivo do controle: ${context.controlStatus?.reason || 'sem motivo'}`
                ].join('\n')
            );
            return;
        }

        if (subcommand === 'commands') {
            const commandList = Array.from(context.commands.values())
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((command) => `- !${command.name}: ${command.description || 'Sem descricao.'}`);

            await context.replyService.sendText(
                context,
                ['Admin commands', ...commandList].join('\n')
            );
            return;
        }

        if (subcommand === 'usage') {
            await usageSubcommand.execute(context);
            return;
        }

        await context.replyService.sendText(context, 'subcomando admin invalido');
    }
};
