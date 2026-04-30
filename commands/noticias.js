const { askAI } = require('../services/aiService');

module.exports = {
    name: 'noticias',
    description: 'Busca as 3 principais notícias de tecnologia do dia',
    async execute(msg, client, args) {
        await msg.reply('📰 _Buscando notícias relevantes via IA..._');
        
        const prompt = "Resuma as 3 notícias mais importantes de tecnologia, ciência ou concursos do dia de hoje (29 de abril de 2026). Seja conciso e use um tom profissional. Formate como uma lista numerada.";
        const response = await askAI(prompt);
        
        await msg.reply(`🌍 **TOP NOTÍCIAS DO DIA**\n\n${response}`);
    }
};
