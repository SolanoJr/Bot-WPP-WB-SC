module.exports = {
    name: 'ondeestou',
    description: 'Envia link para localização em tempo real',

    async execute(msg, client, args) {
        void args;
        
        const INTERFACE_URL = 'https://bot-wpp-wb-sc.pages.dev';
        const token = `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const chatId = msg.from;
        
        // 🔄 REGISTRAR CHATID PENDENTE PARA POLLING
        // Isso permite que o sistema saiba quais chatIds verificar
        if (global.pendingChatIds) {
            global.pendingChatIds.add(chatId);
            console.log(`📝 [ONDEESTOU] ChatId ${chatId} adicionado ao polling`);
        }
        
        const response = [
            '📍 **Solicitação de Localização**',
            '',
            'Para enviar sua localização em tempo real, clique no link abaixo:',
            '',
            `🔗 ${INTERFACE_URL}?token=${token}&chatId=${encodeURIComponent(chatId)}&warriorKey=${process.env.WARRIOR_AUTH_KEY || 'solano_wb_gps_26'}&relay=https://bot-wpp-relay.onrender.com`,
            '',
            'O link expira assim que a localização for recebida.'
        ].join('\n');

        await msg.reply(response);
    }
};
