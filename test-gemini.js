const axios = require('axios');
require('dotenv').config();

async function test() {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error('❌ Erro: GEMINI_API_KEY não encontrada no .env');
        process.exit(1);
    }

    console.log('Chave encontrada. Testando conexão com a API...');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const response = await axios.post(url, {
            contents: [{
                parts: [{ text: "Responda apenas 'OK' se você estiver funcionando." }]
            }]
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        if (response.data && response.data.candidates) {
            console.log('✅ SUCESSO! Resposta da IA:', response.data.candidates[0].content.parts[0].text);
        } else {
            console.log('⚠️ Resposta recebida, mas formato inesperado:', JSON.stringify(response.data, null, 2));
        }
    } catch (error) {
        if (error.response) {
            console.error('❌ ERRO NA API (Status):', error.response.status);
            console.error('❌ DETALHES:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('❌ ERRO DE CONEXÃO:', error.message);
        }
    }
}

test();
