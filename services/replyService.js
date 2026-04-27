const sendText = async (context, text) => {
    if (!context?.message || typeof context.message.reply !== 'function') {
        throw new Error('Contexto de resposta invalido.');
    }

    const startTime = Date.now();
    const chatId = context.message.from;
    const textPreview = text.substring(0, 50) + (text.length > 50 ? '...' : '');
    
    console.log(`📤 Enviando mensagem para ${chatId?.substring(0, 20)}...: "${textPreview}"`);
    
    try {
        const result = await context.message.reply(text);
        const duration = Date.now() - startTime;
        
        console.log(`✅ Mensagem enviada com sucesso para ${chatId?.substring(0, 20)}... (${duration}ms):`, {
            messageId: result.id?.id || 'unknown',
            fromMe: result.fromMe || false,
            remote: result.remote || 'unknown'
        });
        
        return result;
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Erro ao enviar mensagem para ${chatId?.substring(0, 20)}... (${duration}ms):`, {
            error: error.message,
            code: error.code,
            textPreview
        });
        
        throw error;
    }
};

const sendError = async (context, text = 'Erro ao executar comando') => {
    return sendText(context, text);
};

module.exports = {
    sendError,
    sendText
};
