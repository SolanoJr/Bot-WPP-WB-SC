import { ICommand } from './types';
import logger from '../../services/loggerService';
import { isMaster } from '../../../services/permissions';

/**
 * Command: $sendmsg <numero> <mensagem>
 * Envia uma mensagem direta para o número informado.
 * Exemplo de uso: $sendmsg 88998314322 oi
 */
export const sendMessageCommand: ICommand = {
  name: 'sendmsg',
  description: 'Envia uma mensagem para um número especificado.',
  async execute(msg, client, args) {
    const authorId = msg.author || msg.from;
    
    // Verificar se é MASTER
    if (!isMaster(authorId)) {
      await msg.reply('❌ Apenas o MASTER do bot pode usar este comando.');
      return;
    }

    const [rawNumber, ...messageParts] = args;
    if (!rawNumber || messageParts.length === 0) {
      await msg.reply('Uso: $sendmsg <numero> <mensagem>');
      return;
    }

    // Remove caracteres não numéricos e garante o formato do chatId do WhatsApp
    let number = rawNumber.replace(/[^0-9]/g, '');
    // Adicionar código do país Brasil se não tiver
    if (number.length === 11) {
      number = '55' + number;
    }
    const message = messageParts.join(' ');
    const chatId = `${number}@c.us`;

    try {
      await client.sendMessage(chatId, message);
      await msg.reply(`✅ Mensagem enviada para ${rawNumber}`);
      logger.info(`Mensagem enviada para ${rawNumber}: ${message}`);
    } catch (e) {
      logger.error(`Erro ao enviar mensagem para ${rawNumber}: ${e}`);
      await msg.reply('⚠️ Falha ao enviar a mensagem. Verifique se o número está correto e se o bot tem permissão para enviar mensagens para este contato.');
    }
  },
};
