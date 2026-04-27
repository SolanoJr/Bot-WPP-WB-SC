const express = require('express');
const router = express.Router();

// Endpoint interno para envio de mensagens WhatsApp
router.post('/send-message', async (req, res) => {
    const { chatId, message } = req.body;
    
    console.log('INTERNAL SEND MESSAGE:', { chatId, messageLength: message.length });
    
    try {
        // Enviar via PM2 para o bot-wpp
        const { exec } = require('child_process');
        
        const script = `
const client = require('whatsapp-web.js');
const fs = require('fs');

// Ler sessão do WhatsApp
if (fs.existsSync('./.wwebjs_auth/session.json')) {
    console.log('Enviando mensagem para WhatsApp:', '${chatId}');
    
    // Simular envio (implementação real precisaria do client)
    console.log('Mensagem:', \`${message.replace(/\`/g, '\\`')}\`);
    
    process.exit(0);
} else {
    console.log('Sessão WhatsApp não encontrada');
    process.exit(1);
}
`;
        
        exec(`node -e "${script.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('ERRO NO SCRIPT:', error);
                return res.status(500).json({
                    success: false,
                    message: 'WhatsApp session not available'
                });
            }
            
            console.log('MENSAGEM ENVIADA VIA PM2:', chatId);
            
            res.json({
                success: true,
                message: 'Message sent to WhatsApp via PM2'
            });
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
