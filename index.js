const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // volta pro modo invisível
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', qr => {
    console.log('QR gerado');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot online');
});

client.on('auth_failure', msg => {
    console.error('AUTH FAIL:', msg);
});

client.on('disconnected', reason => {
    console.log('DISCONNECTED:', reason);
});

client.on('message_create', msg => {
    if (msg.fromMe) return;

    console.log('Recebi:', msg.body);

    if (msg.body.toLowerCase().trim() === '!ping') {
        msg.reply('pong');
    }
    if (msg.body.toLowerCase().trim() === 'qm é seu boss?') {
        msg.reply('é vc solano');
    }
    if (msg.body.toLowerCase().trim() === 'o caio é o q?') {
        msg.reply('gayzao(wesley tmb)');
    }
});

client.on('loading_screen', (percent, message) => {
    console.log('Loading:', percent, message);
});

client.initialize();