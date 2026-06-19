/**
 * Script rápido para enviar a mensagem "Oi" ao número pessoal especificado.
 * Utiliza o singleton do WhatsApp já presente no projeto.
 *
 * Uso: `node scripts/send_hello.js`
 */

const whatsappSingleton = require('../services/whatsappSingleton');

async function main() {
  try {
    const client = await whatsappSingleton.getClient();

    // Espera o cliente ficar pronto antes de enviar a mensagem
    client.once('ready', async () => {
      const number = '88998314322'; // número pessoal
      const chatId = `${number}@c.us`;
      try {
        await client.sendMessage(chatId, 'Oi');
        console.log(`✅ Mensagem "Oi" enviada para ${number}`);
      } catch (err) {
        console.error('⚠️ Erro ao enviar mensagem:', err);
      } finally {
        // Encerra o processo após o envio
        process.exit(0);
      }
    });

    // Inicia a sessão do WhatsApp (se ainda não estiver inicializada)
    client.initialize();
  } catch (e) {
    console.error('❌ Falha ao obter cliente WhatsApp:', e.message);
    process.exit(1);
  }
}

main();
