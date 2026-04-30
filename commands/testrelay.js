const axios = require('axios');

module.exports = {
    name: 'testrelay',
    description: 'Testa a comunicação com o Relay no Render',
    async execute(msg, client, args) {
        const RELAY_URL = 'https://bot-wpp-relay.onrender.com';
        const WARRIOR_AUTH_KEY = process.env.WARRIOR_AUTH_KEY || 'solano_wb_gps_26';
        
        try {
            console.log(`🧪 Testando comunicação com: ${RELAY_URL}`);
            
            // Teste de Conexão
            await axios.get(`${RELAY_URL}/health`, {
                headers: { 'x-api-key': WARRIOR_AUTH_KEY }
            });
            console.log('✅ Servidor Cloud está respondendo.');

            // Teste de Envio (O mais importante para o seu projeto)
            await axios.post(`${RELAY_URL}/location`, {
                token: 'teste-final',
                chatId: 'solano-debug',
                location: { lat: -3.71, lng: -38.54 } // Ajustado para novo formato
            }, {
                headers: { 'x-api-key': WARRIOR_AUTH_KEY }
            });
            console.log('✅ Dados de localização aceitos pelo Relay.');

            await msg.reply('✅ COMUNICAÇÃO OK!\n\nO bot consegue enviar dados para o Render com sucesso. A infraestrutura de nuvem está ativa.');
        } catch (error) {
            console.error('❌ Erro:', error.message);
            await msg.reply(`⚠️ Falha na comunicação: ${error.message}`);
        }
    }
};
