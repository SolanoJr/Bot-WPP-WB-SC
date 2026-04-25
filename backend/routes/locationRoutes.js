const express = require('express');
const router = express.Router();

// Armazenamento temporário de solicitações de localização
const locationRequests = new Map();

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
    
    // Retornar URL para o usuário
    const backendUrl = process.env.BACKEND_URL || 'https://bot.seudominio.com';
    const locationUrl = `${backendUrl}/location_simple.html?token=${token}`;
    
    res.json({
        success: true,
        locationUrl,
        token,
        expires: new Date(Date.now() + 600000).toISOString() // 10 minutos
    });
});

// Rota para receber localização do frontend
router.post('/submit/:token', (req, res) => {
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

module.exports = {
    registerLocationRoutes: (app) => {
        app.use('/location', router);
    }
};
