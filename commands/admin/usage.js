const usageService = require('../../services/usageService');

const parseAdminIds = () => {
    const rawAdminIds = String(process.env.ADMIN_IDS || '').trim();

    if (!rawAdminIds) {
        return new Set();
    }

    return new Set(
        rawAdminIds
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
    );
};

const isAdmin = (message) => {
    const adminIds = parseAdminIds();
    return adminIds.has(String(message?.from || ''));
};

module.exports = {
    name: 'admin',
    description: 'Comandos administrativos. Uso: !admin usage',

    async execute(msg, args, context) {
        if (!isAdmin(msg)) {
            await context.replyService.sendError(context, 'Acesso negado. Apenas admin.');
            return;
        }

        const [subcommand] = args;

        if (subcommand !== 'usage') {
            await context.replyService.sendText(context, 'Uso: !admin usage');
            return;
        }

        const commandUsage = usageService.getCommandUsage();
        const topUsers = usageService.getTopUsers(5);

        const commandLines = Object.entries(commandUsage)
            .sort((a, b) => b[1] - a[1])
            .map(([commandName, total]) => `- !${commandName}: ${total}`);

        const userLines = topUsers
            .map(({ userId, count }) => `- ${userId}: ${count}`);

        const response = [
            'Uso de comandos:',
            ...(commandLines.length ? commandLines : ['- sem dados']),
            '',
            'Top usuarios:',
            ...(userLines.length ? userLines : ['- sem dados'])
        ].join('\n');

        await context.replyService.sendText(context, response);
    }
};
