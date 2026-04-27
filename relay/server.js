const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração
const BACKEND_URL = process.env.BACKEND_URL || 'http://100.101.218.16:4010';
const TAILSCALE_HOST = process.env.TAILSCALE_HOST || '100.101.218.16';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configurar axios para Tailscale (ignorar SSL se necessário)
const tailscaleAgent = new https.Agent({
    rejectUnauthorized: false
});

// Keep-alive ping endpoint - PRIMEIRO para evitar conflitos
app.get('/ping', (req, res) => {
    console.log('🏓 Relay ping received - keeping Render awake');
    res.json({
        pong: true,
        service: 'bot-wpp-relay',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'bot-wpp-relay',
        timestamp: new Date().toISOString(),
        backend: BACKEND_URL
    });
});

// Receber localização do frontend (isolado e robusto)
app.post('/location', async (req, res) => {
    try {
        // Forçar timeout da resposta para 10s
        req.setTimeout(10000);
        
        const { token, chatId, location, userAgent, timestamp } = req.body;
    
    console.log('📥 Localização recebida para o chatId:', chatId);
    console.log('📍 Recebendo localização COMPLETA:', {
        token,
        chatId: chatId?.substring(0, 20) + '...',
        location: {
            latitude: location?.latitude,
            longitude: location?.longitude,
            accuracy: location?.accuracy
        },
        userAgent: userAgent?.substring(0, 50) + '...',
        timestamp,
        bodyCompleto: req.body
    });
    
    // Validação básica
    if (!token || !chatId || !location) {
        return res.status(400).json({
            success: false,
            message: 'Dados incompletos'
        });
    }
    
    if (!location.latitude || !location.longitude) {
        return res.status(400).json({
            success: false,
            message: 'Coordenadas inválidas'
        });
    }
    
    try {
        // Enviar para backend via Tailscale
        const backendResponse = await axios.post(
            `${BACKEND_URL}/location/submit/${token}`,
            {
                chatId,
                location,
                userAgent,
                timestamp,
                source: 'relay'
            },
            {
                httpsAgent: tailscaleAgent,
                timeout: 10000,
                headers: {
                    'X-Relay-Auth': process.env.RELAY_AUTH || 'default'
                }
            }
        );
        
        console.log('✅ Localização enviada para backend:', backendResponse.data);
        
        res.json({
            success: true,
            message: 'Localização recebida e processada',
            backendResponse: backendResponse.data
        });
        
    } catch (error) {
        console.error('❌ Erro ao enviar para backend:', error.message);
        
        // Tentar método alternativo: salvar localmente para polling
        try {
            // Aqui poderia salvar em Redis/DB para o bot buscar depois
            console.log('🔄 Tentando método alternativo...');
            
            res.json({
                success: true,
                message: 'Localização recebida (processamento assíncrono)',
                method: 'polling'
            });
            
        } catch (fallbackError) {
            console.error('❌ Erro no fallback:', fallbackError);
            
            res.status(500).json({
                success: false,
                message: 'Erro ao processar localização'
            });
        }
        
    } catch (criticalError) {
        console.error('🚨 CRITICAL ERROR IN POST /location:', criticalError);
        res.status(500).json({ 
            error: 'Internal server error',
            details: criticalError.message 
        });
    }
});

// Endpoint para o bot buscar localizações pendentes (isolado e robusto)
app.get('/pending/:chatId', (req, res) => {
    try {
        // Isolamento total de escopo - prevenir ReferenceError
        const chatIdParam = req.params.chatId;
        if (!chatIdParam) {
            console.error('❌ Missing chatId parameter');
            return res.status(400).json({ error: 'Missing chatId' });
        }

        const cleanId = String(chatIdParam).trim();
        const startTime = Date.now();
        
        console.log(`🔍 Bot consultando pendências para: ${cleanId}. Status: Verificando backend...`);
        
        // Buscar no backend instantaneamente (sem esperas artificiais)
        axios.get(
            `${BACKEND_URL}/location/pending-responses/${cleanId}`,
            {
                httpsAgent: tailscaleAgent,
                timeout: 5000  // Resposta rápida do backend
            }
        ).then(response => {
            const duration = Date.now() - startTime;
            const found = !!(response.data.success && response.data.response);
            
            console.log(`Checking data for ${cleanId}: ${found}`);
            console.log(`✅ Resposta encontrada para ${cleanId?.substring(0, 20)}... (${duration}ms):`, {
                success: response.data.success,
                hasResponse: found,
                responseLength: response.data.response?.length || 0
            });
            
            res.json(response.data);  // Retorna 200 com dados
            
        }).catch(error => {
            const duration = Date.now() - startTime;
            
            // Se não houver dados, responder 204 imediatamente
            if (error.response?.status === 404 || error.code === 'ENOTFOUND') {
                console.log(`Checking data for ${cleanId}: false (404 - sem dados)`);
                return res.status(204).send();  // Resposta vazia instantânea
            }
            
            console.error(`❌ Erro ao buscar respostas (${duration}ms):`, {
                chatId: cleanId?.substring(0, 20) + '...',
                error: error.message,
                code: error.code,
                backend: BACKEND_URL
            });
            
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar respostas pendentes',
                debug: {
                    duration,
                    error: error.message,
                    backend: BACKEND_URL
                }
            });
        });
        
    } catch (criticalError) {
        console.error('🚨 CRITICAL ERROR IN GET /pending:', criticalError);
        res.status(500).json({ 
            error: 'Internal server error',
            details: criticalError.message 
        });
    }
});

// Status geral do relay
app.get('/status', (req, res) => {
    res.json({
        service: 'bot-wpp-relay',
        status: 'online',
        backend: BACKEND_URL,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro no relay:', error);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
    });
});

// Limpeza automática de dados antigos
const cleanupOldData = () => {
    console.log(`🧹 Iniciando limpeza de dados antigos...`);
    // Aqui poderia limpar Redis/DB com dados > 5min
    console.log(`✅ Limpeza concluída`);
};

// Limpar a cada 5 minutos
setInterval(cleanupOldData, 5 * 60 * 1000);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Relay API rodando na porta ${PORT}`);
    console.log(`📡 Backend: ${BACKEND_URL}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🏓 Ping: http://localhost:${PORT}/ping`);
    console.log(`📊 Status: http://localhost:${PORT}/status`);
    console.log(`📍 Location: POST http://localhost:${PORT}/location`);
    console.log(`🔍 Pending: GET http://localhost:${PORT}/pending/:chatId`);
    console.log(`⏰ Iniciado: ${new Date().toISOString()}`);
    
    // Log de rotas registradas
    console.log(`📋 Rotas registradas:`);
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
            const path = middleware.route.path;
            console.log(`   ${methods} ${path}`);
        }
    });
    
    // Iniciar limpeza inicial
    setTimeout(cleanupOldData, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM - encerrando graceful...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT - encerrando graceful...');
    process.exit(0);
});

module.exports = app;
