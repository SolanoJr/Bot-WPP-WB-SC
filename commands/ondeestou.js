module.exports = {
    name: 'ondeestou',
    description: 'Envia link para localização em tempo real',

    async execute(msg, client, args) {
        void args;
        
        const token = `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const chatId = msg.from;
        
        const response = [
            '📍 **Solicitação de Localização**',
            '',
            'Para enviar sua localização em tempo real, clique no link abaixo:',
            '',
            `🔗 https://bot-wpp-wb-sc.pages.dev?token=${token}&chatId=${chatId}&relay=https://bot-wpp-relay.onrender.com`,
            '',
            'O link expira assim que a localização for recebida.'
        ].join('\n');

        await msg.reply(response);
    }
};
