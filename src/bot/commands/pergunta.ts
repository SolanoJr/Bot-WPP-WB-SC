import { ICommand } from './types';
// Adjusted path to correctly locate aiService.js which resides in the top-level 'services' directory.
const { askAI } = require('../../../services/aiService');
// Corrected path to databaseService located under src/services.
const { getDb } = require('../../services/databaseService');
import logger from '../../services/loggerService';

export const perguntaCommand: ICommand = {
  name: 'pergunta',
  description: 'Faz uma pergunta inteligente para a IA do bot.',
  async execute(msg, client, args) {
    const prompt = args.join(' ');

    if (!prompt) {
      await msg.reply('⚠️ Por favor, digite sua pergunta após o comando.\nExemplo: $pergunta Qual a capital da França?');
      return;
    }

    const userId = msg.author || msg.from || 'unknown';
    const groupId = msg.from;

    try {
      // Log de uso no banco de dados
      const db = await getDb();
      await db.run(
        'INSERT INTO command_logs (command_name, user_id, group_id) VALUES (?, ?, ?)',
        ['pergunta', userId, groupId]
      );

      logger.info(`IA Question: [${userId}] ${prompt}`);

      // Chamada para a IA
      const response = await askAI(prompt, userId);
      await msg.reply(response);

    } catch (e) {
      logger.error(`Erro no comando $pergunta: ${e}`);
      await msg.reply('⚠️ Desculpe, tive um problema ao processar sua pergunta.');
    }
  },
};