const axios = require('axios');

module.exports = {
    name: 'bemvindo',
    description: 'Mensagem de boas-vindas do grupo (configurada via banco).',

    async execute(msg, client, args) {
        void args;

        const chat = await msg.getChat();
        
        // Verifica se está num grupo
        if (!chat.isGroup) {
            await msg.reply('❌ Este comando só pode ser usado em grupos.');
            return;
        }

        const groupId = chat.id._serialized;
        const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';

        try {
            const response = await axios.get(`${RELAY_URL}/groups/${encodeURIComponent(groupId)}/config`, {
                headers: { 'x-api-key': process.env.API_KEY || '' }
            });
            const data = response.data;

            const defaultResponse = [
                '👋 **BEM-VINDO AO GRUPO!**',
                '',
                '🤖 **Comandos Disponíveis:**',
                '• !help - Lista todos os comandos',
                '• !ondeestou - Verifica sua localização',
                '• !ping - Testar conexão'
            ].join('\n');

            if (data.success && data.welcomeMessage) {
                await msg.reply(data.welcomeMessage);
            } else {
                await msg.reply(defaultResponse);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar bemvindo:', error.message);
            // Fallback total para garantir que o bot responda
            const defaultResponse = [
                '👋 **BEM-VINDO AO GRUPO!**',
                '',
                '🤖 **Comandos Disponíveis:**',
                '• !help - Lista todos os comandos',
                '• !ondeestou - Verifica sua localização',
                '• !ping - Testar conexão'
            ].join('\n');
            await msg.reply(defaultResponse);
        }
    }
};
