const usageService = require('../../services/usageService');
const backendTelemetryService = require('../../services/backendTelemetryService');

const formatUsageList = (usageEntries) => {
    if (usageEntries.length === 0) {
        return ['- nenhum registro'];
    }

    return usageEntries.map(([name, count]) => `- ${name}: ${count}`);
};

module.exports = {
    async execute(context) {
        const remoteSummary = await backendTelemetryService.getUsageSummary();
        const commandUsage = remoteSummary?.topCommands
            ? remoteSummary.topCommands.map((item) => [item.commandName, item.count])
            : Object.entries(usageService.getCommandUsage()).sort((a, b) => b[1] - a[1]);
        const topUsers = remoteSummary?.topUsers
            ? remoteSummary.topUsers.map((item) => ({ userId: item.userId, count: item.count }))
            : usageService.getTopUsers(5);
        const usageByGroup = remoteSummary?.usageByGroup || [];

        const response = [
            'Admin usage',
            `origem: ${remoteSummary ? 'backend' : 'memoria local'}`,
            'Comandos:',
            ...formatUsageList(commandUsage),
            'Top usuarios:',
            ...(topUsers.length === 0
                ? ['- nenhum registro']
                : topUsers.map((item) => `- ${item.userId}: ${item.count}`)),
            'Uso por grupo:',
            ...(usageByGroup.length === 0
                ? ['- nenhum registro']
                : usageByGroup.map((item) => `- ${item.groupId || 'grupo-desconhecido'}: ${item.count}`))
        ].join('\n');

        await context.replyService.sendText(context, response);
    }
};
