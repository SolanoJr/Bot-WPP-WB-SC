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

    // Polling com setTimeout recursivo - sem acúmulo
    async startLocationPolling(context, chatId, token) {
        const maxAttempts = 10; // 10 tentativas reais
        let attempts = 0;
        let realResponses = 0; // Contador de respostas reais do servidor
        
        console.log(`🔄 Iniciando polling RECURSIVO:`, {
            chatId: chatId?.substring(0, 20) + '...',
            token: token?.substring(0, 10) + '...',
            relay: RELAY_URL,
            maxAttempts
        });
        
        // Keep-alive: ping no relay antes de começar
        try {
            console.log(`🏓 Keep-alive ping no relay: ${RELAY_URL}/ping`);
            await axios.get(`${RELAY_URL}/ping`, { timeout: 3000 });
            console.log(`✅ Relay ping successful`);
        } catch (pingError) {
            console.error(`❌ Relay ping failed:`, pingError.message);
        }
        
        // Função recursiva de polling
        const pollRecursive = async () => {
            attempts++;
            const startTime = Date.now();
            
            console.log(`🔍 Polling attempt ${attempts}/${maxAttempts} para ${chatId?.substring(0, 20)}...`);
            
            try {
                console.log(`⏳ ANTES do axios.get para ${RELAY_URL}/pending/${chatId}`);
                
                const response = await axios.get(`${RELAY_URL}/pending/${chatId}`, {
                    timeout: 5000  // Baixado de 15s para 5s
                });
                
                console.log(`✅ DEPOIS do axios.get - response recebida`);
                
                const duration = Date.now() - startTime;
                realResponses++; // Conta resposta real do servidor
                
                console.log(`📊 Polling response (${duration}ms):`, {
                    success: response.data.success,
                    hasResponse: !!response.data.response,
                    responseLength: response.data.response?.length || 0,
                    realResponses,
                    attempts
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
                        
                        return; // Finaliza polling
                        
                    } catch (sendError) {
                        console.error(`❌ Erro ao enviar resposta para WhatsApp:`, sendError.message);
                        
                        if (attempts < maxAttempts) {
                            console.log(`🔄 Falha no envio, tentando novamente em 3s...`);
                            setTimeout(pollRecursive, 3000);
                            return;
                        }
                        
                        // Última tentativa falhou
                        await context.replyService.sendText(context, 'Falha ao enviar localização. Tente novamente.');
                        return;
                    }
                }
                
                // Continuar polling se não encontrou resposta
                if (attempts < maxAttempts) {
                    setTimeout(pollRecursive, 3000);
                } else {
                    // Verificar se teve respostas reais mas não encontrou localização
                    if (realResponses >= 10) {
                        const busyMessage = [
                            '⚠️ **SERVIDOR OCUPADO**',
                            '',
                            'Servidor de localização está ocupado no momento.',
                            'Tente novamente em alguns instantes.',
                            '',
                            `🤖 **Status:** ${realResponses} respostas recebidas, sem localização encontrada`
                        ].join('\n');
                        
                        await context.replyService.sendText(context, busyMessage);
                    } else {
                        // Timeout normal
                        const timeoutMessage = [
                            '⏰ **TEMPO ESGOTADO**',
                            '',
                            'O link de localização expirou.',
                            'Por favor, solicite um novo link com !ondeestou',
                            '',
                            `🤖 **Status:** ${attempts} tentativas, ${realResponses} respostas`
                        ].join('\n');
                        
                        await context.replyService.sendText(context, timeoutMessage);
                    }
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
                
                // Continuar polling se houver erro de rede
                if (attempts < maxAttempts) {
                    console.log(`🔄 Erro de rede, tentando novamente em 3s...`);
                    setTimeout(pollRecursive, 3000);
                } else {
                    // Fallback após esgotar tentativas
                    const fallbackMessage = [
                        '⚠️ **FALHA DE CONEXÃO**',
                        '',
                        'Não foi possível conectar ao servidor de localização.',
                        'Verifique sua conexão e tente novamente.',
                        '',
                        `🤖 **Status:** ${attempts} tentativas sem resposta`
                    ].join('\n');
                    
                    await context.replyService.sendText(context, fallbackMessage);
                }
            }
        };
        
        // Iniciar polling recursivo
        setTimeout(pollRecursive, 1000); // Pequeno delay antes da primeira tentativa
    }
};
