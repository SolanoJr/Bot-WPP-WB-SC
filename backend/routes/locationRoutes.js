const express = require('express');
const router = express.Router();
const whatsappService = require('../../services/whatsappService');

// Armazenamento temporário de solicitações de localização
const locationRequests = new Map();

// Armazenamento de respostas pendentes para WhatsApp
const pendingResponses = new Map();

// Rota para solicitar localização
router.post('/request/:userId', (req, res) => {
    const { userId } = req.params;
    
    console.log('Dados recebidos:', { body: req.body, params: req.params });
    
    const chatId = req.body?.chatId || 'unknown';
    const messageId = req.body?.messageId || 'unknown';
    
    // Gerar token único para esta solicitação
    const token = `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Armazenar solicitação
    locationRequests.set(token, {
        userId,
        chatId,
        messageId,
        timestamp: Date.now()
    });
    
    // Limpar solicitações antigas (mais de 10 minutos)
    const now = Date.now();
    for (const [key, value] of locationRequests.entries()) {
        if (now - value.timestamp > 600000) { // 10 minutos
            locationRequests.delete(key);
        }
    }
    
    // Retornar URL para o usuário - FORÇAR Cloudflare Pages
    const locationUrl = `https://bot-wpp-wb-sc.pages.dev/location_direct.html?token=${token}&chatId=${chatId}`;
    
    res.json({
        success: true,
        locationUrl,
        token,
        expires: new Date(Date.now() + 600000).toISOString() // 10 minutos
    });
});

// Rota para receber localização do frontend
router.post('/submit/:token', async (req, res) => {
    const { token } = req.params;
    const { latitude, longitude, accuracy } = req.body;
    
    const request = locationRequests.get(token);
    
    if (!request) {
        return res.status(400).json({
            success: false,
            message: 'Solicitação de localização expirada ou inválida'
        });
    }
    
    // Salvar localização (poderia ir para banco de dados)
    const locationData = {
        ...request,
        location: {
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString()
        }
    };
    
    // Aqui você poderia:
    // 1. Salvar no banco de dados
    // 2. Enviar notificação para o WhatsApp
    // 3. Processar de alguma forma
    
    console.log('Localização recebida:', locationData);
    
    // Gerar link do Google Maps
    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    
    // Criar mensagem de resposta para o WhatsApp
    const whatsappResponse = [
        '📍 **LOCALIZAÇÃO RECEBIDA COM SUCESSO!**',
        '',
        '🌍 **Suas Coordenadas:**',
        `📍 **Latitude:** ${latitude}`,
        `📍 **Longitude:** ${longitude}`,
        `🎯 **Precisão:** ±${accuracy} metros`,
        '',
        `🗺️ **Ver no Maps:** ${mapsLink}`,
        '',
        `⏰ **Data/Hora:** ${new Date().toLocaleString('pt-BR')}`,
        '',
        `🤖 **Status do Bot:** Localização processada com sucesso!`
    ].join('\n');
    
    // Armazenar resposta para ser consumida pelo bot-wpp
    pendingResponses.set(request.chatId, {
        response: whatsappResponse,
        timestamp: Date.now()
    });
    
    console.log('Resposta armazenada para WhatsApp:', request.chatId);
    
    // Remover solicitação usada
    locationRequests.delete(token);
    
    res.json({
        success: true,
        message: 'Localização recebida com sucesso'
    });
});

// Rota para verificar status da solicitação
router.get('/status/:token', (req, res) => {
    const { token } = req.params;
    const request = locationRequests.get(token);
    
    if (!request) {
        return res.json({
            success: false,
            message: 'Solicitação não encontrada ou expirada'
        });
    }
    
    const remainingTime = 600000 - (Date.now() - request.timestamp);
    
    res.json({
        success: true,
        remainingTime: Math.max(0, remainingTime),
        expires: new Date(request.timestamp + 600000).toISOString()
    });
});

// Rota para obter respostas pendentes para WhatsApp
router.get('/pending-responses/:chatId', (req, res) => {
    const { chatId } = req.params;
    const response = pendingResponses.get(chatId);
    
    if (!response) {
        return res.json({
            success: false,
            message: 'Nenhuma resposta pendente'
        });
    }
    
    // Remover resposta após consumir
    pendingResponses.delete(chatId);
    
    res.json({
        success: true,
        response: response.response,
        timestamp: response.timestamp
    });
});

// Rota para envio direto de localização (jeito simples como backscan)
router.post('/send-direct', async (req, res) => {
    const { chatId, message, location } = req.body;
    
    console.log('LOCALIZAÇÃO RECEBIDA:', { 
        chatId, 
        location,
        messageLength: message.length,
        timestamp: new Date().toISOString()
    });
    
    try {
        // Enviar mensagem diretamente para o WhatsApp usando o serviço
        const whatsappService = require('../../services/whatsappService');
        const client = whatsappService.getClient();
        
        if (client && client.sendMessage) {
            await client.sendMessage(chatId, message);
            console.log('MENSAGEM ENVIADA PARA WHATSAPP:', chatId);
            
            res.json({
                success: true,
                message: 'Localização enviada com sucesso para o WhatsApp'
            });
        } else {
            console.error('Cliente WhatsApp não disponível');
            
            // Fallback: armazenar para polling
            pendingResponses.set(chatId, {
                response: message,
                timestamp: Date.now()
            });
            
            res.json({
                success: true,
                message: 'Localização recebida e armazenada para envio'
            });
        }
        
    } catch (error) {
        console.error('ERRO AO ENVIAR PARA WHATSAPP:', error);
        
        // Fallback: armazenar para polling
        pendingResponses.set(chatId, {
            response: message,
            timestamp: Date.now()
        });
        
        res.json({
            success: true,
            message: 'Localização recebida (backup ativo)'
        });
    }
});

module.exports = {
    registerLocationRoutes: (app) => {
        app.use('/location', router);
    }
};
