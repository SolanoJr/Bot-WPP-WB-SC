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
            
            // Iniciar polling para buscar localização
            this.startLocationPolling(msg, chatId, token, RELAY_URL);
            
        } catch (error) {
            console.error('Erro no ondeestou:', error.message);
            await msg.reply('❌ Erro ao gerar link de localização.');
        }
    },
    
    async startLocationPolling(msg, chatId, token, RELAY_URL) {
        const maxAttempts = 30; // 90 segundos (30 * 3s)
        let attempts = 0;
        let realResponses = 0;
        
        console.log(`🔄 Iniciando polling para ${chatId?.substring(0, 20)}...`);
        
        const pollRecursive = async () => {
            attempts++;
            const startTime = Date.now();
            
            console.log(`🔍 Polling attempt ${attempts}/${maxAttempts} para ${chatId?.substring(0, 20)}...`);
            
            try {
                const response = await axios.get(`${RELAY_URL}/pending/${chatId}`, {
                    timeout: 10000,
                    headers: { 'Connection': 'keep-alive' }
                });
                
                const duration = Date.now() - startTime;
                realResponses++;
                
                // Tratar status 204 como "aguardando usuário"
                if (response.status === 204) {
                    console.log(`⏳ Status 204 - Ainda aguardando usuário enviar localização...`);
                    
                    if (attempts < maxAttempts) {
                        setTimeout(pollRecursive, 3000);
                        return;
                    }
                    
                    const timeoutMessage = [
                        '⏰ **TEMPO ESGOTADO**',
                        '',
                        'O link de localização expirou.',
                        'Por favor, solicite um novo link com !ondeestou',
                        '',
                        `🤖 **Status:** ${attempts} tentativas, ${realResponses} respostas`
                    ].join('\n');
                    
                    await msg.reply(timeoutMessage);
                    return;
                }
                
                // Localização recebida!
                const location = response.data;
                console.log(`📥 Localização recebida para o chatId: ${chatId}`);
                console.log(`📍 Dados:`, location);
                
                const locationMessage = [
                    '📍 **LOCALIZAÇÃO RECEBIDA**',
                    '',
                    `**Latitude:** ${location.location?.latitude || 'N/A'}`,
                    `**Longitude:** ${location.location?.longitude || 'N/A'}`,
                    `**Precisão:** ${location.location?.accuracy || 'N/A'} metros`,
                    `**Horário:** ${new Date(location.timestamp).toLocaleString('pt-BR')}`,
                    '',
                    `🤖 **ChatId:** ${chatId?.substring(0, 20)}...`,
                    `🔗 **Token:** ${token?.substring(0, 20)}...`
                ].join('\n');
                
                await msg.reply(locationMessage);
                console.log(`✅ Localização entregue com sucesso!`);
                
            } catch (error) {
                const duration = Date.now() - startTime;
                
                if (error.code === 'ECONNABORTED') {
                    console.error(`❌ Timeout (${duration}ms): Render demorou para responder`);
                } else if (error.response?.status === 502) {
                    console.error(`⚠️ Relay instável (502) - tentando novamente...`);
                } else {
                    console.error(`❌ Erro no polling (${duration}ms):`, {
                        message: error.message,
                        code: error.code,
                        status: error.response?.status
                    });
                }
                
                if (attempts < maxAttempts) {
                    setTimeout(pollRecursive, 3000);
                    return;
                }
                
                const errorMessage = [
                    '❌ **ERRO NA COMUNICAÇÃO**',
                    '',
                    'Não foi possível receber sua localização.',
                    'Verifique sua conexão e tente novamente.',
                    '',
                    `🤖 **Status:** ${attempts} tentativas, ${realResponses} respostas`
                ].join('\n');
                
                await msg.reply(errorMessage);
            }
        };
        
        // Iniciar polling após 3 segundos (dar tempo para usuário clicar)
        setTimeout(pollRecursive, 3000);
    }
};
