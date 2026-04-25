const axios = require('axios');

module.exports = {
    name: 'ondeestou',
    description: 'Obtém sua localização precisa via GPS do navegador.',

    async execute(msg, args, context) {
        void msg;
        void args;

        const chatId = context.message?.from || context.message?.to || 'chat-desconhecido';
        const isGroup = chatId.includes('@g.us');
        const groupName = context.message?.chat?.name || 'Grupo sem nome';
        const participantNumber = context.message?.from || 'Número não identificado';
        
        try {
            // Obter URL do backend
            const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:4010';
            
            // Solicitar token de localização
            const response = await axios.post(`${backendUrl}/location/request/${participantNumber}`, {
                chatId,
                messageId: context.message?.id?.id || 'unknown'
            });
            
            if (response.data.success) {
                const locationUrl = response.data.locationUrl;
                
                const message = [
                    '📍 **LOCALIZAÇÃO PRECISA**',
                    '',
                    'Para obter sua localização exata:',
                    '',
                    `1️⃣ **Clique no link abaixo:**`,
                    `${locationUrl}`,
                    '',
                    '2️⃣ **Permitir o acesso ao GPS** quando solicitado',
                    '',
                    '3️⃣ **Aguarde o envio automático**',
                    '',
                    `⏰ **Link válido por:** 10 minutos`,
                    '',
                    `📱 **Seu número:** ${participantNumber}`,
                    `👥 **Grupo:** ${isGroup ? groupName : 'Conversa Privada'}`,
                    '',
                    `🤖 **Status:** Aguardando localização...`
                ].filter(Boolean).join('\n');

                await context.replyService.sendText(context, message);
                
                // Opcional: registrar solicitação no backend
                try {
                    if (context.backendService) {
                        await context.backendService.registerLocationRequest({
                            chatId,
                            participantNumber,
                            token: response.data.token,
                            timestamp: context.timestamp
                        });
                    }
                } catch (error) {
                    // Silencioso
                }
                
            } else {
                throw new Error('Falha ao gerar link de localização');
            }
            
        } catch (error) {
            console.error('Erro ao solicitar localização:', error);
            
            // Fallback para informações básicas
            const fallbackMessage = [
                '📍 **INFORMAÇÕES BÁSICAS**',
                '',
                `📱 **Chat ID:** ${chatId}`,
                `👥 **Tipo:** ${isGroup ? 'Grupo' : 'Conversa Privada'}`,
                isGroup ? `📝 **Nome do Grupo:** ${groupName}` : '',
                `🔢 **Seu Número:** ${participantNumber}`,
                '',
                `⏰ **Horário:** ${new Date(context.timestamp).toLocaleString('pt-BR')}`,
                '',
                `❌ **Serviço de localização indisponível**`,
                `🔄 **Tente novamente em alguns minutos**`,
                '',
                `🤖 **Status do Bot:** Online`
            ].filter(Boolean).join('\n');

            await context.replyService.sendText(context, fallbackMessage);
        }
    }
};
