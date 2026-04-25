const { Client } = require('whatsapp-web.js');

// Cache para instância do cliente
let whatsappClient = null;

// Inicializar serviço WhatsApp
const initializeWhatsApp = (client) => {
    whatsappClient = client;
    console.log('Serviço WhatsApp inicializado');
};

// Enviar mensagem para WhatsApp
const sendMessage = async (chatId, message) => {
    if (!whatsappClient) {
        console.error('Cliente WhatsApp não inicializado');
        return false;
    }

    try {
        const chat = await whatsappClient.getChatById(chatId);
        await chat.sendMessage(message);
        console.log(`Mensagem enviada para ${chatId}:`, message.substring(0, 50) + '...');
        return true;
    } catch (error) {
        console.error('Erro ao enviar mensagem WhatsApp:', error);
        return false;
    }
};

// Enviar resposta de localização
const sendLocationResponse = async (chatId, locationData) => {
    const { latitude, longitude, accuracy } = locationData;
    
    const message = [
        '📍 **LOCALIZAÇÃO RECEBIDA COM SUCESSO!**',
        '',
        '🌍 **Suas Coordenadas:**',
        `📍 **Latitude:** ${latitude}`,
        `📍 **Longitude:** ${longitude}`,
        `🎯 **Precisão:** ±${accuracy} metros`,
        '',
        `🗺️ **Ver no Maps:** https://www.google.com/maps?q=${latitude},${longitude}`,
        '',
        `⏰ **Data/Hora:** ${new Date().toLocaleString('pt-BR')}`,
        '',
        `🤖 **Status do Bot:** Localização processada com sucesso!`
    ].join('\n');

    return await sendMessage(chatId, message);
};

module.exports = {
    initializeWhatsApp,
    sendMessage,
    sendLocationResponse
};
