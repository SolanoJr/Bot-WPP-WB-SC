const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot-wpp-session' }),
    puppeteer: { headless: true }
});

client.on('ready', async () => {
    console.log('🤖 Bot pronto para enviar mensagem');
    try {
        const result = await client.sendMessage('5511999999999@c.us', '🧪 Teste automatizado - ' + new Date().toISOString());
        console.log('✅ Mensagem enviada com sucesso:', result.id?.id);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao enviar:', error.message);
        process.exit(1);
    }
});

client.on('auth_failure', (msg) => {
    console.log('❌ Falha na autenticação:', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('📱 Desconectado:', reason);
    process.exit(1);
});

client.initialize();
