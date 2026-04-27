const axios = require('axios');
const https = require('https');

// Configuração do agente HTTPS para Tailscale
const tailscaleAgent = new https.Agent({
    rejectUnauthorized: false
});

const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';

module.exports = {
    name: 'testrelay',
    description: 'Testa comunicação com o Relay',
    async execute(context, args) {
        const startTime = Date.now();
        
        try {
            console.log(`🧪 Iniciando teste do Relay: ${RELAY_URL}`);
            
            // Teste 1: Ping
            console.log(`🏓 Teste 1: Ping no Relay...`);
            const pingStart = Date.now();
            
            try {
                const pingResponse = await axios.get(`${RELAY_URL}/ping`, {
                    timeout: 5000,
                    headers: { 'Connection': 'keep-alive' }
                });
                
                const pingDuration = Date.now() - pingStart;
                console.log(`✅ Ping successful (${pingDuration}ms):`, pingResponse.data);
                
            } catch (pingError) {
                const pingDuration = Date.now() - pingStart;
                console.error(`❌ Ping failed (${pingDuration}ms):`, {
                    error: pingError.message,
                    code: pingError.code,
                    statusCode: pingError.response?.status || 'N/A'
                });
            }
            
            // Teste 2: POST fake location
            console.log(`📍 Teste 2: POST location fake...`);
            const postStart = Date.now();
            
            try {
                const fakeLocation = {
                    token: 'test-token-' + Date.now(),
                    chatId: 'test-chat-id',
                    location: {
                        latitude: -23.5505,
                        longitude: -46.6333,
                        accuracy: 10
                    },
                    userAgent: 'test-bot',
                    timestamp: new Date().toISOString()
                };
                
                const postResponse = await axios.post(`${RELAY_URL}/location`, fakeLocation, {
                    timeout: 10000,
                    headers: { 'Connection': 'keep-alive' }
                });
                
                const postDuration = Date.now() - postStart;
                console.log(`✅ POST successful (${postDuration}ms):`, postResponse.data);
                
            } catch (postError) {
                const postDuration = Date.now() - postStart;
                console.error(`❌ POST failed (${postDuration}ms):`, {
                    error: postError.message,
                    code: postError.code,
                    statusCode: postError.response?.status || 'N/A'
                });
            }
            
            // Teste 3: GET pending
            console.log(`🔍 Teste 3: GET pending...`);
            const getStart = Date.now();
            
            try {
                const getResponse = await axios.get(`${RELAY_URL}/pending/test-chat-id`, {
                    timeout: 10000,
                    headers: { 'Connection': 'keep-alive' }
                });
                
                const getDuration = Date.now() - getStart;
                console.log(`✅ GET successful (${getDuration}ms):`, getResponse.data);
                
            } catch (getError) {
                const getDuration = Date.now() - getStart;
                console.error(`❌ GET failed (${getDuration}ms):`, {
                    error: getError.message,
                    code: getError.code,
                    statusCode: getError.response?.status || 'N/A'
                });
            }
            
            const totalDuration = Date.now() - startTime;
            
            const testMessage = [
                '🧪 **TESTE DO RELAY CONCLUÍDO**',
                '',
                `🔗 Relay: ${RELAY_URL}`,
                `⏱️ Duração total: ${totalDuration}ms`,
                '',
                '📋 Verifique os logs do PM2 para detalhes completos',
                '',
                '🤖 **Status:** Teste finalizado'
            ].join('\n');
            
            // Usar client.sendMessage direto
            if (context.message && context.message.from) {
                await globalClient.sendMessage(context.message.from, testMessage);
            } else {
                await context.replyService.sendText(context, testMessage);
            }
            
        } catch (error) {
            console.error('❌ Erro geral no teste do Relay:', error);
            
            const errorMessage = [
                '❌ **ERRO NO TESTE**',
                '',
                'Não foi possível completar o teste do Relay.',
                'Verifique os logs para detalhes.',
                '',
                `🤖 **Erro:** ${error.message}`
            ].join('\n');
            
            // Usar client.sendMessage direto
            if (context.message && context.message.from) {
                await globalClient.sendMessage(context.message.from, errorMessage);
            } else {
                console.error('❌ Contexto inválido no testrelay:', context);
            }
        }
    }
};
