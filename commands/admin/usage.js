const usageService = require('../../services/usageService');

const formatUsageList = (usageEntries) => {
    if (usageEntries.length === 0) {
        return ['- nenhum registro'];
    }

    return usageEntries.map(([name, count]) => `- ${name}: ${count}`);
};

module.exports = {
    async execute(context) {
        const commandUsage = Object.entries(usageService.getCommandUsage()).sort((a, b) => b[1] - a[1]);
        const topUsers = usageService.getTopUsers(5);

        const response = [
            'Admin usage',
            'Comandos:',
            ...formatUsageList(commandUsage),
            'Top usuarios:',
            ...(topUsers.length === 0
                ? ['- nenhum registro']
                : topUsers.map((item) => `- ${item.userId}: ${item.count}`))
        ].join('\n');

        await context.replyService.sendText(context, response);
    }
};
