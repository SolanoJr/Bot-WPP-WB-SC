module.exports = {
    name: 'test',
    description: 'Confirma que o comando de teste esta funcionando.',

    async execute(msg, client, args) {
        void args;

        await msg.reply('✅ Comando test funcionando!');
    }
};
