import { ICommand } from './types';

export const banCommand: ICommand = {
    name: 'ban',
    description: 'Bane um usuário do grupo (marca a mensagem).',
    
    async execute(msg, client, args) {
        const { isGroup, participants } = await msg.getChat();
        
        if (!isGroup) {
            await msg.reply('❌ Este comando só funciona em grupos.');
            return;
        }
        
        // Verificar se quem mandou é admin
        const me = await client.getNumber();
        const myNumber = me.split('@')[0];
        const participant = participants.find(p => p.id._serialized === msg.author);
        const isAdmin = participant?.isAdmin || participant?.isOwner;
        
        if (!isAdmin) {
            await msg.reply('❌ Você precisa ser administrador para usar este comando.');
            return;
        }
        
        // Verificar se mencionou alguém
        const mentioned = msg.mentionedIds;
        if (!mentioned || mentioned.length === 0) {
            await msg.reply('❌ Marque o usuário a ser banido.');
            return;
        }
        
        const userToBan = mentioned[0];
        await client.ban(userToBan);
        await msg.reply(`✅ Usuário banido com sucesso.`);
    }
};