const axios = require('axios');
const { isMaster } = require('../services/permissions');

module.exports = {
    name: 'antispam',
    description: 'Ativa ou desativa a proteção antispam (Links/Banimentos).',

    async execute(msg, client, args) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            await msg.reply('❌ Este comando só pode ser usado em grupos.');
            return;
        }

        // Verificar permissão (Master ou Admin do grupo)
        const { cleanId } = require('../services/permissions');
        const authorId = msg.author || msg.from;
        const isUserMaster = isMaster(authorId);
        
        let isGroupAdmin = false;
        if (!isUserMaster) {
            // Forçar atualização do chat para garantir lista de membros fresca
            const freshChat = await client.getChatById(chat.id._serialized);
            const authorClean = cleanId(authorId);
            
            const member = freshChat.participants.find(m => cleanId(m.id._serialized) === authorClean);
            isGroupAdmin = member && (member.isAdmin || member.isSuperAdmin);
            
            console.log(`🛡️ [ADMIN-CHECK] Usuário ${authorClean} é Admin? ${isGroupAdmin ? 'SIM' : 'NÃO'}`);
        }

        if (!isUserMaster && !isGroupAdmin) {
            console.log(`🚫 [AUTH-FAIL] !antispam negado para ${authorId}`);
            await msg.reply('❌ Apenas administradores do grupo ou o MASTER do bot podem usar este comando.');
            return;
        }

        if (args.length === 0 || !['on', 'off'].includes(args[0].toLowerCase())) {
            await msg.reply('❓ Use: `!antispam on` ou `!antispam off`');
            return;
        }

        const status = args[0].toLowerCase() === 'on' ? 1 : 0;
        const groupId = chat.id._serialized;
        const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';

        try {
            await axios.post(`${RELAY_URL}/groups/${encodeURIComponent(groupId)}/config`, {
                antispamActive: status,
                name: chat.name
            }, {
                headers: { 'x-api-key': process.env.API_KEY || '' }
            });

            await msg.reply(`✅ Antispam ${status === 1 ? 'ATIVADO' : 'DESATIVADO'} para este grupo.`);
            
            // Alerta se o bot não for admin
            const botMember = chat.participants.find(p => p.id.user === client.info.wid.user);
            if (status === 1 && (!botMember || !botMember.isAdmin)) {
                await msg.reply('⚠️ **Atenção:** O bot precisa ser **ADMINISTRADOR** do grupo para apagar links e banir membros.');
            }
        } catch (error) {
            console.error('❌ Erro no !antispam:', error.message);
            await msg.reply('⚠️ Falha ao salvar configuração no banco de dados.');
        }
    }
};
