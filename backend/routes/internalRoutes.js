const express = require('express');
const router = express.Router();
const whatsappService = require('../../services/whatsappService');

// Endpoint interno para envio de mensagens WhatsApp
router.post('/send-message', async (req, res) => {
    const { chatId, message } = req.body;
    
    console.log('INTERNAL SEND MESSAGE:', { chatId, messageLength: message.length });
    
    try {
        const client = whatsappService.getClient();
        
        if (client && client.sendMessage) {
            await client.sendMessage(chatId, message);
            console.log('MESSAGE SENT TO WHATSAPP:', chatId);
            
            res.json({
                success: true,
                message: 'Message sent to WhatsApp'
            });
        } else {
            console.error('WhatsApp client not available');
            res.status(500).json({
                success: false,
                message: 'WhatsApp client not available'
            });
        }
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
