const axios = require('axios');

module.exports = {
    name: 'test_link',
    description: 'Testa a conexão e autenticação com o Relay no Render',

    async execute(msg, client, args) {
        const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';
        const API_KEY = process.env.API_KEY || '';

        await msg.reply('📡 Testando conexão com o Relay... Aguarde.');

        try {
            console.log(`🔗 [TEST_LINK] Pingando Relay em: ${RELAY_URL}/health`);
            
            // 1. Testar Saúde (Health)
            const healthRes = await axios.get(`${RELAY_URL}/health`, { timeout: 10000 });
            
            // 2. Testar Autenticação (tentando buscar um ID inexistente mas válido)
            const authTestUrl = `${RELAY_URL}/pending/test_auth_check`;
            let authStatus = 'Pendente';
            
            try {
                await axios.get(authTestUrl, {
                    headers: { 'x-api-key': API_KEY },
                    timeout: 5000
                });
                authStatus = '✅ Autenticado';
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    authStatus = '❌ Erro de Autenticação (401 - Chave Inválida)';
                } else {
                    authStatus = `⚠️ Erro na Auth: ${err.message}`;
                }
            }

            const response = [
                '🌐 **Status da Conexão Relay**',
                '',
                `📡 **Status:** ${healthRes.status === 200 ? '✅ Online' : '⚠️ Instável'}`,
                `🔐 **Autenticação:** ${authStatus}`,
                `⏱️ **Uptime Relay:** ${healthRes.data.uptime ? Math.round(healthRes.data.uptime) + 's' : 'N/A'}`,
                `📍 **Backend:** ${healthRes.data.backend || 'N/A'}`,
                '',
                'Se a autenticação falhou, verifique se a API_KEY no .env do Bot é igual à do Render.'
            ].join('\n');

            await msg.reply(response);

        } catch (error) {
            console.error('❌ [TEST_LINK] Falha crítica:', error.message);
            await msg.reply(`❌ Falha na conexão: ${error.message}\nVerifique se o Relay no Render está online.`);
        }
    }
};
