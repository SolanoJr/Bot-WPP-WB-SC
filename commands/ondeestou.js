const axios = require('axios');

module.exports = {
    name: 'ondeestou',
    description: 'Solicita a localização em tempo real',
    async execute(msg, client, args) {
        try {
            const chatId = msg.from;
            // Usando o seu serviço de Relay no Render
            const RELAY_URL = 'https://bot-wpp-relay.onrender.com';
            const INTERFACE_URL = 'https://bot-wpp-wb-sc.pages.dev';

            const token = `loc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const trackingLink = `${INTERFACE_URL}?token=${token}&chatId=${chatId}&relay=${RELAY_URL}`;

            await msg.reply(`📍 *Solicitação de Localização*\n\nPara enviar sua localização em tempo real, clique no link abaixo:\n\n🔗 ${trackingLink}\n\n_O link expira assim que a localização for recebida._`);
            
            console.log(`✅ Link de rastro enviado para ${chatId}`);
        } catch (error) {
            console.error('Erro no ondeestou:', error.message);
            await msg.reply('❌ Erro ao gerar link de localização.');
        }
    }
};
