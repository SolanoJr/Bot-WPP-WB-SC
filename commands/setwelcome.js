const axios = require('axios');
const { isMaster } = require('../services/permissions');

module.exports = {
    name: 'setwelcome',
    description: 'Configura a mensagem de boas-vindas do grupo (Apenas Admins).',

    async execute(msg, client, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            await msg.reply('❌ Este comando só pode ser usado em grupos.');
            return;
        }

        // Verificar se é MASTER ou ADMIN do grupo
        const authorId = msg.author || msg.from;
        const isUserMaster = isMaster(authorId);
        
        let isGroupAdmin = false;
        if (!isUserMaster) {
            const contact = await msg.getContact();
            const members = chat.participants;
            const member = members.find(m => m.id._serialized === authorId);
            isGroupAdmin = member && (member.isAdmin || member.isSuperAdmin);
        }

        if (!isUserMaster && !isGroupAdmin) {
            await msg.reply('❌ Apenas administradores do grupo ou o MASTER do bot podem usar este comando.');
            return;
        }

        if (args.length === 0) {
            await msg.reply('❌ Por favor, digite a nova mensagem. Exemplo: `!setwelcome Bem-vindos ao nosso grupo!`');
            return;
        }

        const newWelcome = args.join(' ');
        const groupId = chat.id._serialized;
        const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';

        try {
            const response = await axios.post(`${RELAY_URL}/groups/${encodeURIComponent(groupId)}/config`, {
                welcomeMessage: newWelcome,
                name: chat.name
            }, {
                headers: { 'x-api-key': process.env.API_KEY || '' }
            });

            if (response.data.success) {
                await msg.reply('✅ Mensagem de boas-vindas atualizada com sucesso!');
            } else {
                throw new Error('Falha na resposta do Relay');
            }
        } catch (error) {
            console.error('❌ Erro ao definir welcome:', error.message);
            await msg.reply('⚠️ Ocorreu um erro ao salvar a configuração. Tente novamente mais tarde.');
        }
    }
};
