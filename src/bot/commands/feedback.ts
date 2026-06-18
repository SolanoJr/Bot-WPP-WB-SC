import { ICommand } from './types';
import { getDb } from '../../services/databaseService';

export const feedbackCommand: ICommand = {
  name: 'feedback',
  description: 'Envia um feedback ou sugestão para o desenvolvedor.',
  async execute(msg, client, args) {
    const feedbackText = args.join(' ');

    if (!feedbackText) {
      await msg.reply('⚠️ Por favor, digite seu feedback após o comando.\nExemplo: $feedback Adicione mais jogos!');
      return;
    }

    try {
      const db = await getDb();
      await db.run(
        'INSERT INTO feedbacks (user_id, message) VALUES (?, ?)',
        [msg.author || msg.from || 'unknown', feedbackText]
      );
      await msg.reply('✅ Seu feedback foi enviado com sucesso! Obrigado por ajudar a melhorar o bot. ❤️');
    } catch (e) {
      console.error('Erro ao salvar feedback:', e);
      await msg.reply('⚠️ Ocorreu um erro ao salvar seu feedback. Tente novamente mais tarde.');
    }
  },
};