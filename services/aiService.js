const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Envia uma pergunta para a IA do Gemini
 * @param {string} prompt - Pergunta do usuário
 * @returns {Promise<string>} - Resposta da IA
 */
async function askAI(prompt) {
    if (!GEMINI_API_KEY) {
        return "⚠️ Erro: GEMINI_API_KEY não configurada. Configure a chave no .env para usar a IA.";
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        
        const systemPrompt = "Você é um assistente estratégico, direto e inteligente. Evite respostas infantis. ";
        const fullPrompt = systemPrompt + prompt;

        const response = await axios.post(url, {
            contents: [{
                parts: [{ text: fullPrompt }]
            }]
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        if (response.data && response.data.candidates && response.data.candidates[0].content) {
            return response.data.candidates[0].content.parts[0].text;
        }

        return "🤖 A IA não soube responder no momento.";
    } catch (error) {
        if (error.response) {
            console.error('❌ Erro na API do Gemini (Resposta Completa):', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('❌ Erro na API do Gemini:', error.message);
        }
        return "⚠️ Desculpe, ocorreu um erro ao processar sua pergunta na IA.";
    }
}

/**
 * Gera uma resposta sarcástica baseada no contexto
 * @returns {string}
 */
function getSarcasticResponse() {
    const responses = [
        "Tenho nada a ver com isso.",
        "Eu sou apenas um bot, por que me envolve nisso?",
        "Sei de nada, sou inocente.",
        "Não fui eu, foi o código.",
        "Isso soa como um problema de humano, não meu."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

module.exports = {
    askAI,
    getSarcasticResponse
};
