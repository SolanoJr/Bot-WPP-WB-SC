const axios = require('axios');
require('dotenv').config();

async function testLen() {
    const RELAY_URL = 'https://bot-wpp-relay.onrender.com';
    const WARRIOR_AUTH_KEY = process.env.WARRIOR_AUTH_KEY || 'solano_wb_gps_26';

    console.log('🔍 [TEST] Iniciando teste de comprimento de chave (Warrior Mode)...');
    console.log(`🔗 Destino: ${RELAY_URL}/health`);
    console.log(`🔑 Chave Local (Len): ${WARRIOR_AUTH_KEY.length}`);

    try {
        // Fazendo um GET /health com a chave para disparar o middleware checkApiKey
        // Note: GET /health no Relay não usa checkApiKey atualmente, 
        // mas o /pending/:chatId sim.
        
        console.log('📡 Chamando /pending/test_auth...');
        const response = await axios.get(`${RELAY_URL}/pending/test_auth`, {
            headers: { 'x-api-key': API_KEY },
            validateStatus: () => true // Permite capturar 401
        });

        console.log('📊 Resposta do Relay:');
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.expected_len) {
            console.log(`✅ Resultado Final:`);
            console.log(`   - Local (Enviado): ${response.data.received_len}`);
            console.log(`   - Remoto (Render): ${response.data.expected_len}`);
            
            if (response.data.received_len === response.data.expected_len) {
                console.log('🎉 OS COMPRIMENTOS COINCIDEM!');
            } else {
                console.log('⚠️ DISCREPÂNCIA DETECTADA!');
            }
        } else if (response.status === 204 || response.status === 200) {
            console.log('🎉 AUTENTICAÇÃO PASSOU (Chave Correta)!');
        } else {
            console.log('❌ Não foi possível extrair os comprimentos. Verifique se o deploy do Relay terminou.');
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

testLen();
