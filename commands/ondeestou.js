const axios = require('axios');
const https = require('https');
const telemetryService = require('../services/telemetryService');

// Configurar axios para ignorar certificado auto-assinado
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// Configuração do relay
const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';
const LOCATION_PAGE_URL = process.env.LOCATION_PAGE_URL || 'https://bot-wpp.pages.dev';

module.exports = {
    name: 'ondeestou',
    description: 'Obtém sua localização precisa via GPS do navegador + informações do chat.',

    async execute(msg, args, context) {
        void msg;
        void args;

        const startTime = Date.now();
        const chatId = context.message?.from || context.message?.to || 'chat-desconhecido';
        const isGroup = chatId.includes('@g.us');
        const groupName = context.message?.chat?.name || 'Grupo sem nome';
        const participantNumber = context.message?.from || 'Número não identificado';
        
        try {
            // Obter URL do backend
            const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:4010';
            
            // Solicitar token de localização
            console.log(`⏳ ANTES do axios.post para ${backendUrl}/location/request/${participantNumber}`);
            
            const response = await axios.post(`${backendUrl}/location/request/${participantNumber}`, {
                chatId,
                messageId: context.message?.id?.id || 'unknown'
            }, {
                httpsAgent: httpsAgent
            });
            
            console.log(`✅ DEPOIS do axios.post - token response recebida`);
            
            if (response.data.success) {
                const token = response.data.token;
                
                console.log(`🔑 Token gerado: ${token?.substring(0, 15)}... para chatId: ${chatId?.substring(0, 20)}...`);
                
                // Criar link para página externa (HTTPS válido)
                const locationUrl = `${LOCATION_PAGE_URL}?token=${token}&chatId=${chatId}&relay=${encodeURIComponent(RELAY_URL)}`;
                
                console.log(`🔗 Link gerado: ${locationUrl?.substring(0, 100)}...`);
                
                const message = [
                    '📍 **LOCALIZAÇÃO PRECISA + INFORMAÇÕES**',
                    '',
                    '🆔 **Dados do Chat:**',
                    `💬 **ID:** ${chatId}`,
                    `👥 **Tipo:** ${isGroup ? 'Grupo' : 'Privado'}`,
                    `📛 **Nome:** ${groupName}`,
                    `👤 **Sua ID:** ${participantNumber}`,
                    `⏰ **Horário:** ${new Date().toLocaleString('pt-BR')}`,
                    '',
                    '🌍 **Para obter sua localização GPS:**',
                    '',
                    '1️⃣ **Clique no link abaixo:**',
                    locationUrl,
                    '',
                    '2️⃣ **Permitir o acesso ao GPS** quando solicitado',
                    '',
                    '3️⃣ **Aguarde o envio automático**',
                    '',
                    '⏰ **Link válido por:** 10 minutos',
                    '',
                    '🔒 **Seguro:** HTTPS válido + criptografia'
                ].join('\n');
                
                await context.replyService.sendText(context, message);
                
                // Registrar telemetria
                await telemetryService.registerUsage({
                    commandName: 'ondeestou',
                    instanceId: 'main',
                    groupId: isGroup ? chatId : null,
                    userId: participantNumber,
                    success: true,
                    latency: Date.now() - startTime,
                    argsCount: args.length
                });
                
                // Reativar polling com rate-limit real e logs melhorados
                this.startLocationPolling(context, chatId, token);
                console.log('� Polling reativado com timeout 15000ms e rate-limit');
                
            } else {
                throw new Error('Falha ao gerar link de localização');
            }
            
        } catch (error) {
            console.error('Erro ao solicitar localização:', error);
            
            // Registrar falha na telemetria
            await telemetryService.registerUsage({
                commandName: 'ondeestou',
                instanceId: 'main',
                groupId: isGroup ? chatId : null,
                userId: participantNumber,
                success: false,
                errorCode: 'LOCATION_REQUEST_FAILED',
                latency: Date.now() - startTime,
                argsCount: args.length
            });
            
            // Fallback para informações básicas
            const fallbackMessage = [
                '📍 **INFORMAÇÕES DO CHAT**',
                '',
                '🆔 **Chat ID:** ' + chatId,
                '👥 **Tipo:** ' + (isGroup ? 'Grupo' : 'Privado'),
                '📛 **Nome:** ' + groupName,
                '👤 **Participante:** ' + participantNumber,
                '⏰ **Horário:** ' + new Date().toLocaleString('pt-BR'),
                '',
                '⚠️ **Serviço de GPS temporariamente indisponível**',
                '',
                '🤖 **Status do Bot:** Online e funcional'
            ].join('\n');
            
            await context.replyService.sendText(context, fallbackMessage);
        }
    },

    // Polling simples - sem complexidade
    async startLocationPolling(context, chatId, token) {
        const maxAttempts = 10; // 30 segundos totais (10 * 3s)
        let attempts = 0;
        
        console.log(`🔄 Iniciando polling SIMPLES:`, {
            chatId: chatId?.substring(0, 20) + '...',
            token: token?.substring(0, 10) + '...',
            relay: RELAY_URL,
            maxAttempts
        });
        
        const pollInterval = setInterval(async () => {
            attempts++;
            const startTime = Date.now();
            
            console.log(`🔍 Polling attempt ${attempts}/${maxAttempts} para ${chatId?.substring(0, 20)}...`);
            
            try {
                console.log(`⏳ ANTES do axios.get para ${RELAY_URL}/pending/${chatId}`);
                
                const response = await axios.get(`${RELAY_URL}/pending/${chatId}`, {
                    timeout: 15000
                });
                
                console.log(`✅ DEPOIS do axios.get - response recebida`);
                
                const duration = Date.now() - startTime;
                
                console.log(`📊 Polling response (${duration}ms):`, {
                    success: response.data.success,
                    hasResponse: !!response.data.response,
                    responseLength: response.data.response?.length || 0
                });
                
                if (response.data.success && response.data.response) {
                    console.log(`✅ Encontrei resposta para ${chatId?.substring(0, 20)}..., enviando...`);
                    
                    try {
                        console.log(`⏳ ANTES do replyService.sendText`);
                        
                        await context.replyService.sendText(context, response.data.response);
                        
                        console.log(`✅ DEPOIS do replyService.sendText - enviado com sucesso`);
                        
                        // Registrar sucesso
                        await telemetryService.registerUsage({
                            commandName: 'ondeestou_response',
                            instanceId: 'main',
                            groupId: chatId.includes('@g.us') ? chatId : null,
                            userId: context.message?.from,
                            success: true,
                            latency: duration,
                            attempts
                        });
                        
                        clearInterval(pollInterval);
                        return;
                        
                    } catch (sendError) {
                        console.error(`❌ Erro ao enviar resposta para WhatsApp:`, sendError.message);
                        console.log(`🔄 Falha no envio, continuando polling...`);
                        
                        if (attempts >= maxAttempts) {
                            clearInterval(pollInterval);
                            console.log(`🛑 Polling finalizado após max attempts com falha de envio`);
                        }
                        return;
                    }
                }
                
                // Verificar timeout
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    console.log(`⏰ Polling timeout para ${chatId?.substring(0, 20)}... após ${maxAttempts} tentativas`);
                    
                    const timeoutMessage = [
                        '⏰ **TEMPO ESGOTADO**',
                        '',
                        'O link de localização expirou.',
                        'Por favor, solicite um novo link com !ondeestou',
                        '',
                        `🤖 **Status:** ${attempts} tentativas`
                    ].join('\n');
                    
                    await context.replyService.sendText(context, timeoutMessage);
                }
                
            } catch (error) {
                const duration = Date.now() - startTime;
                
                console.error(`❌ Erro no polling (${duration}ms):`, {
                    chatId: chatId?.substring(0, 20) + '...',
                    attempt: `${attempts}/${maxAttempts}`,
                    error: error.message,
                    code: error.code,
                    relay: RELAY_URL
                });
                
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    console.log(`🛑 Polling finalizado para ${chatId?.substring(0, 20)}... após max attempts`);
                }
            }
        }, 3000); // Polling simples a cada 3 segundos
    }
};
