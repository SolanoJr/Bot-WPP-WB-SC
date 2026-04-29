const { isMaster } = require('../services/permissions');

module.exports = {
    name: 'grupos',
    description: 'Lista todos os grupos em que o bot está presente (Apenas MASTER).',

    async execute(msg, client, args) {
        const authorId = msg.author || msg.from;

        if (!isMaster(authorId)) {
            await msg.reply('❌ Comando restrito ao MASTER do bot.');
            return;
        }

        try {
            const chats = await client.getChats();
            const groups = chats.filter(chat => chat.isGroup);

            if (groups.length === 0) {
                await msg.reply('❌ O bot não está em nenhum grupo no momento.');
                return;
            }

            let response = `📋 **LISTA DE GRUPOS (${groups.length})**\n\n`;

            for (const group of groups) {
                // Verificar se o bot é admin (com cleanId)
                const { cleanId } = require('../services/permissions');
                const botIdClean = cleanId(client.info.wid._serialized);
                
                const botMember = group.participants.find(p => cleanId(p.id._serialized) === botIdClean);
                const isBotAdmin = botMember && (botMember.isAdmin || botMember.isSuperAdmin);
                
                response += `👥 **${group.name}**\n`;
                response += `🆔 \`${group.id._serialized}\`\n`;
                response += `🛡️ Admin: ${isBotAdmin ? '✅ Sim' : '❌ Não'}\n`;
                response += `👤 Membros: ${group.participants.length}\n`;
                response += `--------------------------\n`;

                // Limitar tamanho da mensagem se houver muitos grupos
                if (response.length > 3500) {
                    await msg.reply(response);
                    response = '';
                }
            }

            if (response) {
                await msg.reply(response);
            }
        } catch (error) {
            console.error('❌ Erro no !grupos:', error.message);
            await msg.reply('⚠️ Erro ao listar grupos.');
        }
    }
};
