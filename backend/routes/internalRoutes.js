const express = require('express');
const router = express.Router();

// Endpoint interno para envio de mensagens WhatsApp
router.post('/send-message', async (req, res) => {
    const { chatId, message } = req.body;
    
    console.log('INTERNAL SEND MESSAGE:', { chatId, messageLength: message.length });
    
    try {
        // Salvar mensagem para o bot WhatsApp ler
        const fs = require('fs');
        const path = require('path');
        
        const messageData = {
            chatId,
            message,
            timestamp: Date.now()
        };
        
        const messageFile = path.join(__dirname, '../../.pending-messages.json');
        
        // Ler mensagens pendentes
        let pendingMessages = [];
        if (fs.existsSync(messageFile)) {
            try {
                pendingMessages = JSON.parse(fs.readFileSync(messageFile, 'utf8'));
            } catch (e) {
                pendingMessages = [];
            }
        }
        
        // Adicionar nova mensagem
        pendingMessages.push(messageData);
        
        // Salvar arquivo
        fs.writeFileSync(messageFile, JSON.stringify(pendingMessages, null, 2));
        
        console.log('MENSAGEM SALVA PARA BOT:', chatId);
        
        // Notificar PM2 para processar
        const { exec } = require('child_process');
        exec('pm2 restart bot-wpp', (error) => {
            if (error) {
                console.error('ERRO AO RESTART BOT:', error);
            }
        });
        
        res.json({
            success: true,
            message: 'Message queued for WhatsApp delivery'
        });
        
    } catch (error) {
        console.error('ERROR SENDING TO WHATSAPP:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message'
        });
    }
});

module.exports = {
    registerInternalRoutes: (app) => {
        app.use('/internal', router);
    }
};
