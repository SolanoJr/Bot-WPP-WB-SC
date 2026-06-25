import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { processMessage } from '../services/messageHandler';
import { loadCommands } from '../bot/commands/index';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const telegramGroupId = process.env.TELEGRAM_GROUP_ID;

if (!token) {
    console.error('❌ [TELEGRAM] TELEGRAM_BOT_TOKEN não configurado no .env');
}

const commands = loadCommands();

export const startTelegramBot = () => {
    if (!token) return;

    const bot = new TelegramBot(token, { polling: true });

    console.log('🚀 [TELEGRAM] Bot iniciado e aguardando mensagens...');

    bot.on('message', async (msg) => {
        if (!msg.text) return;

        console.log(`\n--- NOVA MENSAGEM TELEGRAM ---`);
        console.log(`De: ${msg.from?.first_name} (${msg.from?.id})`);
        console.log(`Conteúdo: ${msg.text}`);

        // Simular interface de mensagem do WWebJS para reutilizar o processMessage
        const simulatedMsg = {
            body: msg.text,
            from: msg.chat.id.toString(),
            author: msg.from?.id.toString(),
            reply: async (text: string) => {
                await bot.sendMessage(msg.chat.id, text, { reply_to_message_id: msg.message_id });
            },
            getChat: async () => ({
                isGroup: msg.chat.type === 'group' || msg.chat.type === 'supergroup',
                id: { _serialized: msg.chat.id.toString() }
            })
        };

        // Só processa se começar com o prefixo $ (ou se quiser outro prefixo pro Telegram)
        if (msg.text.startsWith('$')) {
            await processMessage(simulatedMsg, bot, commands);
        }
    });

    return bot;
};

/**
 * Função para encaminhar mensagens do WhatsApp para o Telegram
 */
export const sendToTelegram = async (text: string) => {
    if (!token || !telegramGroupId) return;
    const bot = new TelegramBot(token);
    try {
        await bot.sendMessage(telegramGroupId, text);
        console.log('✅ [TELEGRAM] Mensagem encaminhada com sucesso.');
    } catch (error: any) {
        console.error('❌ [TELEGRAM] Erro ao enviar mensagem:', error.message);
    }
};
