import { ICommand } from './types';

export const gttsCommand: ICommand = {
    name: 'gtts',
    description: 'Texto‑para‑voz (placeholder).',
    async execute(msg, client, args) {
        await msg.reply('🗣️ Conversão TTS ainda não implementada. Em breve!');
    }
};