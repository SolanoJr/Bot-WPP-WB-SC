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
            const response = await axios.post(`${backendUrl}/location/request/${participantNumber}`, {
                chatId,
                messageId: context.message?.id?.id || 'unknown'
            }, {
                httpsAgent: httpsAgent
            });
            
            if (response.data.success) {
                const token = response.data.token;
                
                // Criar link para página externa (HTTPS válido)
                const locationUrl = `${LOCATION_PAGE_URL}?token=${token}&chatId=${chatId}&relay=${encodeURIComponent(RELAY_URL)}`;
                
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

    // Polling por resposta de localização com retry inteligente
    async startLocationPolling(context, chatId, token) {
        const maxAttempts = 60; // 10 minutos (60 * 10 segundos)
        let attempts = 0;
        let consecutiveSuccess = 0; // Para retry inteligente
        let lastResponseTime = 0;
        
        // Rate-limit real com variável estática (global para todas as instâncias)
        if (!this.constructor._lastPollingErrorLog) {
            this.constructor._lastPollingErrorLog = 0;
        }
        
        // Mapear chatId para chave estável (lid -> c.us se necessário)
        const stableChatId = chatId.includes('@lid') ? 
            context.message?.from || chatId : 
            chatId;
        
        console.log(`🔄 Iniciando polling inteligente:`, {
            originalChatId: chatId?.substring(0, 20) + '...',
            stableChatId: stableChatId?.substring(0, 20) + '...',
            token: token?.substring(0, 10) + '...',
            relay: RELAY_URL
        });
        
        const pollInterval = setInterval(async () => {
            attempts++;
            const startTime = Date.now();
            
            try {
                // Retry inteligente: se teve sucesso rápido, reduzir intervalo
                const adaptiveInterval = consecutiveSuccess >= 3 ? 5000 : 10000;
                
                console.log(`🔍 Polling attempt ${attempts}/${maxAttempts} para ${stableChatId?.substring(0, 20)}... (intervalo: ${adaptiveInterval}ms)`);
                
                // Verificar no relay com timeout aumentado e retry
                const response = await this.pollWithRetry(`${RELAY_URL}/pending/${chatId}`, 2, 5000);
                
                const duration = Date.now() - startTime;
                lastResponseTime = Date.now();
                
                console.log(`📊 Polling response (${duration}ms):`, {
                    success: response.data.success,
                    hasResponse: !!response.data.response,
                    responseLength: response.data.response?.length || 0,
                    debug: response.data.debug,
                    attempts
                });
                
                if (response.data.success && response.data.response) {
                    console.log(`✅ Encontrei resposta para ${stableChatId?.substring(0, 20)}..., enviando...`);
                    
                    try {
                        // Enviar resposta para o WhatsApp com logs detalhados
                        await context.replyService.sendText(context, response.data.response);
                        console.log(`✅ Resposta enviada com sucesso para ${stableChatId?.substring(0, 20)}...`);
                        
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
                        
                        // Retry inteligente: se falhar no envio, continuar polling
                        if (attempts < maxAttempts) {
                            console.log(`🔄 Falha no envio, continuando polling...`);
                            return;
                        }
                    }
                }
                
                // Retry inteligente: incrementar success consecutivo se resposta rápida
                if (duration < 3000) {
                    consecutiveSuccess++;
                } else {
                    consecutiveSuccess = 0;
                }
                
                // Verificar timeout
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    console.log(`⏰ Polling timeout para ${stableChatId?.substring(0, 20)}... após ${maxAttempts} tentativas`);
                    
                    // Enviar mensagem de timeout com debug
                    const timeoutMessage = [
                        '⏰ **TEMPO ESGOTADO**',
                        '',
                        'O link de localização expirou.',
                        'Por favor, solicite um novo link com !ondeestou',
                        '',
                        `🤖 **Status:** ${attempts} tentativas em ${Math.round((Date.now() - lastResponseTime) / 1000)}s`
                    ].join('\n');
                    
                    await context.replyService.sendText(context, timeoutMessage);
                }
                
            } catch (error) {
                const duration = Date.now() - startTime;
                
                // Rate-limit real para logs de erro (1x por minuto global)
                const now = Date.now();
                const lastLogTime = this.constructor._lastPollingErrorLog;
                const logInterval = 60000; // 1 minuto
                
                if (now - lastLogTime > logInterval) {
                    console.error(`❌ Erro no polling (${duration}ms):`, {
                        chatId: stableChatId?.substring(0, 20) + '...',
                        attempt: `${attempts}/${maxAttempts}`,
                        error: error.message,
                        code: error.code,
                        relay: RELAY_URL,
                        consecutiveSuccess
                    });
                    this.constructor._lastPollingErrorLog = now;
                    
                    // Reset consecutive success em erro
                    consecutiveSuccess = 0;
                }
                
                // Continuar polling em caso de erro de rede
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    console.log(`🛑 Polling finalizado para ${stableChatId?.substring(0, 20)}... após max attempts`);
                }
            }
        }, 10000); // Base interval, ajustado dinamicamente
    }
    
    // Helper para retry com backoff
    async pollWithRetry(url, maxRetries = 2, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await axios.get(url, { timeout: 15000 });
                return response;
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Backoff exponencial
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`🔄 Retry ${attempt}/${maxRetries} em ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
};
