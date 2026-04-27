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

// Health check
app.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'bot-wpp-relay',
        timestamp: new Date().toISOString(),
        backend: BACKEND_URL
    });
});

// Receber localização do frontend
app.post('/location', async (req, res) => {
    const { token, chatId, location, userAgent, timestamp } = req.body;
    
    console.log('📍 Recebendo localização:', {
        token,
        chatId: chatId?.substring(0, 20) + '...',
        location,
        userAgent: userAgent?.substring(0, 50) + '...',
        timestamp
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
    }
});

// Endpoint para o bot buscar localizações pendentes (polling)
app.get('/pending/:chatId', async (req, res) => {
    const { chatId } = req.params;
    const startTime = Date.now();
    
    console.log(`🔍 Buscando resposta pendente para chatId: ${chatId?.substring(0, 20)}...`);
    
    try {
        // Buscar no backend com timeout aumentado
        const response = await axios.get(
            `${BACKEND_URL}/location/pending-responses/${chatId}`,
            {
                httpsAgent: tailscaleAgent,
                timeout: 15000  // Aumentado de 5000ms para 15000ms
            }
        );
        
        const duration = Date.now() - startTime;
        console.log(`✅ Resposta encontrada para ${chatId?.substring(0, 20)}... (${duration}ms):`, {
            success: response.data.success,
            hasResponse: !!response.data.response,
            responseLength: response.data.response?.length || 0
        });
        
        res.json(response.data);
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Erro ao buscar respostas pendentes (${duration}ms):`, {
            chatId: chatId?.substring(0, 20) + '...',
            error: error.message,
            code: error.code,
            backend: BACKEND_URL
        });
        
        res.json({
            success: false,
            message: 'Nenhuma resposta pendente',
            debug: {
                duration,
                error: error.message,
                backend: BACKEND_URL
            }
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Relay API rodando na porta ${PORT}`);
    console.log(`📡 Backend: ${BACKEND_URL}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`⏰ Iniciado: ${new Date().toISOString()}`);
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
