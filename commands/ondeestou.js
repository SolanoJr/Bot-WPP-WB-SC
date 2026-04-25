module.exports = {
    name: 'ondeestou',
    description: 'Verifica sua localização e informações do grupo.',

    async execute(msg, args, context) {
        void msg;
        void args;

        const chatId = context.message?.from || context.message?.to || 'chat-desconhecido';
        const isGroup = chatId.includes('@g.us');
        const groupName = context.message?.chat?.name || 'Grupo sem nome';
        const participantNumber = context.message?.from || 'Número não identificado';
        
        const response = [
            '📍 **SUA LOCALIZAÇÃO**',
            '',
            `📱 **Chat ID:** ${chatId}`,
            `👥 **Tipo:** ${isGroup ? 'Grupo' : 'Conversa Privada'}`,
            isGroup ? `📝 **Nome do Grupo:** ${groupName}` : '',
            `🔢 **Seu Número:** ${participantNumber}`,
            '',
            `⏰ **Horário:** ${new Date(context.timestamp).toLocaleString('pt-BR')}`,
            '',
            `🤖 **Status do Bot:** Online`
        ].filter(Boolean).join('\n');

        await context.replyService.sendText(context, response);
    }
};
