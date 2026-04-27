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
                
                // Iniciar polling por resposta (método robusto)
                this.startLocationPolling(context, chatId, token);
                
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

    // Polling por resposta de localização
    async startLocationPolling(context, chatId, token) {
        const maxAttempts = 60; // 10 minutos (60 * 10 segundos)
        let attempts = 0;
        
        const pollInterval = setInterval(async () => {
            attempts++;
            
            try {
                // Verificar no relay (timeout aumentado para 15s)
                const response = await axios.get(`${RELAY_URL}/pending/${chatId}`, {
                    timeout: 15000
                });
                
                if (response.data.success && response.data.response) {
                    // Enviar resposta para o WhatsApp
                    await context.replyService.sendText(context, response.data.response);
                    
                    // Registrar sucesso
                    await telemetryService.registerUsage({
                        commandName: 'ondeestou_response',
                        instanceId: 'main',
                        groupId: chatId.includes('@g.us') ? chatId : null,
                        userId: context.message?.from,
                        success: true,
                        latency: 0
                    });
                    
                    clearInterval(pollInterval);
                    return;
                }
                
                // Verificar timeout
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    
                    // Enviar mensagem de timeout
                    const timeoutMessage = [
                        '⏰ **TEMPO ESGOTADO**',
                        '',
                        'O link de localização expirou.',
                        'Por favor, solicite um novo link com !ondeestou',
                        '',
                        '🤖 **Status:** Link expirado após 10 minutos'
                    ].join('\n');
                    
                    await context.replyService.sendText(context, timeoutMessage);
                }
                
            } catch (error) {
                // Rate-limit para logs de erro (1x por minuto)
                const now = Date.now();
                const lastLogTime = this._lastPollingErrorLog || 0;
                const logInterval = 60000; // 1 minuto
                
                if (now - lastLogTime > logInterval) {
                    console.error('Erro no polling de localização:', error.message);
                    this._lastPollingErrorLog = now;
                    
                    // Se for timeout, continuar tentando
                    if (error.code === 'ECONNABORTED') {
                        console.log(`Timeout no polling (${attempts}/${maxAttempts}) - continuando...`);
                    }
                    // Se for erro de rede, continuar tentando
                    else if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
                        console.log(`Erro de rede no polling (${attempts}/${maxAttempts}) - continuando...`);
                    }
                    // Se for outro erro, logar completo
                    else {
                        console.error('Erro crítico no polling:', error);
                    }
                }
                
                // Continuar polling em caso de erro de rede
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                }
            }
        }, 10000); // Verificar a cada 10 segundos
    }
};
