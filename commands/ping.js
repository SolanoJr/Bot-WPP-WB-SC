module.exports = {
    name: 'ping',
    description: 'Verifica se o bot está online',
    async execute(msg, client, args) {
        // Ajustado para usar msg.reply que é o padrão do whatsapp-web.js
        await msg.reply('pong 🏓');
    }
};
