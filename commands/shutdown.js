const { isMaster } = require('../services/permissions');

module.exports = {
    name: 'shutdown',
    description: 'Desliga o bot (apenas MASTER)',

    async execute(msg, client, args) {
        void args;
        
        // Verificar se é MASTER
        if (!isMaster(msg.from)) {
            await msg.reply('🚫 **Acesso negado!**\n\nEste comando só pode ser usado pelo **MASTER** do bot.');
            return;
        }

        try {
            console.log(`🛑 [SHUTDOWN] Comando executado por: ${msg.from}`);
            
            // Enviar confirmação
            await msg.reply('🛑 **DESLIGANDO BOT...**\n\nO bot será desligado em 3 segundos.\n\n⚠️ Use `pm2 restart bot-wpp` no servidor para reiniciar.');
            
            // Aguardar um pouco para a mensagem ser enviada
            setTimeout(() => {
                console.log('🛑 [SHUTDOWN] Encerrando processo...');
                process.exit(0);
            }, 3000);
            
        } catch (error) {
            console.error('❌ [SHUTDOWN] Erro:', error.message);
            await msg.reply('❌ **Erro ao desligar bot.**\n\nVerifique o console para mais detalhes.');
        }
    }
};
