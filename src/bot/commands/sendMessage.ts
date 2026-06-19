import { ICommand } from './types';
import logger from '../../services/loggerService';

/**
 * Command: $sendmsg <numero> <mensagem>
 * Envia uma mensagem direta para o número informado.
 * Exemplo de uso: $sendmsg 88998314322 oi
 */
export const sendMessageCommand: ICommand = {
  name: 'sendmsg',
  description: 'Envia uma mensagem para um número especificado.',
  async execute(msg, client, args) {
    const [rawNumber, ...messageParts] = args;
    if (!rawNumber || messageParts.length === 0) {
      await msg.reply('Uso: $sendmsg <numero> <mensagem>');
      return;
    }

    // Remove caracteres não numéricos e garante o formato do chatId do WhatsApp
    const number = rawNumber.replace(/[^0-9]/g, '');
    const message = messageParts.join(' ');
    const chatId = `${number}@c.us`;

    try {
      await client.sendMessage(chatId, message);
      await msg.reply(`✅ Mensagem enviada para ${rawNumber}`);
      logger.info(`Mensagem enviada para ${rawNumber}: ${message}`);
    } catch (e) {
      logger.error(`Erro ao enviar mensagem para ${rawNumber}: ${e}`);
      await msg.reply('⚠️ Falha ao enviar a mensagem.');
    }
  },
};
