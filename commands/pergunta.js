const { askAI } = require('../services/aiService');

module.exports = {
    name: 'pergunta',
    description: 'Faça uma pergunta para a Inteligência Artificial',
    async execute(msg, client, args) {
        if (args.length === 0) {
            return msg.reply('❓ Por favor, digite sua pergunta após o comando.\nEx: !pergunta Qual a capital da França?');
        }

        const question = args.join(' ');
        await msg.reply('⏳ _Processando sua pergunta na IA..._');

        const answer = await askAI(question);
        await msg.reply(answer);
    }
};
