import { ICommand } from './types';

export const climaCommand: ICommand = {
    name: 'clima',
    description: 'Consulta o clima (placeholder).',
    async execute(msg, client, args) {
        await msg.reply('🌤️ Consulta de clima ainda não implementada. Em breve!');
    }
};