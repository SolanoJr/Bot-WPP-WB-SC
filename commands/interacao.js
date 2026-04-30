const { askAI } = require('../services/aiService');

module.exports = [
    {
        name: 'cantada',
        description: 'Gera uma cantada inteligente e madura',
        async execute(msg, client, args) {
            const prompt = "Gere uma cantada inteligente, madura e respeitosa, sem ser infantil. Apenas o texto da cantada.";
            const response = await askAI(prompt);
            await msg.reply(`😏 **CONQUISTA:**\n\n${response}`);
        }
    },
    {
        name: 'conselho',
        description: 'Dá um conselho de vida inteligente',
        async execute(msg, client, args) {
            const prompt = "Dê um conselho de vida inteligente, profundo e maduro para uma situação cotidiana. Apenas o texto do conselho.";
            const response = await askAI(prompt);
            await msg.reply(`🧠 **SABEDORIA:**\n\n${response}`);
        }
    },
    {
        name: 'fakechat',
        description: 'Gera um diálogo simulado inteligente',
        async execute(msg, client, args) {
            const prompt = "Gere um diálogo curto (3-4 falas) inteligente e sarcástico entre duas pessoas sobre tecnologia ou vida moderna.";
            const response = await askAI(prompt);
            await msg.reply(`💬 **SIMULAÇÃO:**\n\n${response}`);
        }
    }
];
