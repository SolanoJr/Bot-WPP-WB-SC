const sendText = async (context, text) => {
    if (!context?.message || typeof context.message.reply !== 'function') {
        throw new Error('Contexto de resposta invalido.');
    }

    return context.message.reply(text);
};

const sendError = async (context, text = 'Erro ao executar comando') => {
    return sendText(context, text);
};

module.exports = {
    sendError,
    sendText
};
