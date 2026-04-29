const axios = require('axios');

module.exports = {
    name: 'feedback',
    description: 'Envie um feedback ou sugestão para o administrador do bot.',

    async execute(msg, client, args) {
        if (args.length === 0) {
            await msg.reply('❌ Por favor, digite sua mensagem. Exemplo: `!feedback Gostei muito do bot!`');
            return;
        }

        const feedbackMessage = args.join(' ');
        const chatId = msg.from;
        
        const chat = await msg.getChat();
        const data = {
            isGroup: chat.isGroup,
            groupName: chat.isGroup ? chat.name : null,
            sender: msg.author || msg.from,
        };

        const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';

        try {
            const response = await axios.post(`${RELAY_URL}/feedback`, {
                chatId,
                message: feedbackMessage,
                data
            }, {
                headers: { 'x-api-key': process.env.API_KEY || '' }
            });

            if (response.data.success) {
                await msg.reply('✅ Muito obrigado! Seu feedback foi enviado com sucesso e registrado.');
            } else {
                throw new Error('Falha na resposta do servidor.');
            }
        } catch (error) {
            if (error.response) {
                console.error(`❌ Erro HTTP ${error.response.status} ao enviar feedback:`, error.response.data);
            } else {
                console.error('❌ Erro ao enviar feedback:', error.message);
            }
            await msg.reply('⚠️ Ocorreu um erro ao enviar seu feedback. Tente novamente mais tarde.');
        }
    }
};
