const axios = require('axios');
const { isMaster } = require('../services/permissions');

module.exports = {
    name: 'stats',
    description: 'Exibe estatísticas gerais do bot (Apenas MASTER).',

    async execute(msg, client, args) {
        const authorId = msg.author || msg.from;

        if (!isMaster(authorId)) {
            await msg.reply('❌ Comando restrito ao MASTER do bot.');
            return;
        }

        const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';

        try {
            const response = await axios.get(`${RELAY_URL}/stats`, {
                headers: { 'x-api-key': process.env.API_KEY || '' }
            });

            if (response.data.success) {
                const s = response.data.stats;
                const statsMsg = [
                    '📊 **ESTATÍSTICAS DO SISTEMA**',
                    '',
                    `👥 **Grupos Ativos:** ${s.totalGroups}`,
                    `📱 **Instâncias (Clients):** ${s.totalClients}`,
                    `💬 **Feedbacks Recebidos:** ${s.totalFeedbacks}`,
                    `📍 **Localizações Processadas:** ${s.totalLocations}`,
                    '',
                    '✅ Dados buscados diretamente do SQLite.'
                ].join('\n');

                await msg.reply(statsMsg);
            } else {
                throw new Error('Falha na resposta do Relay');
            }
        } catch (error) {
            console.error('❌ Erro ao buscar stats:', error.message);
            await msg.reply('⚠️ Erro ao conectar com o banco de dados central.');
        }
    }
};
