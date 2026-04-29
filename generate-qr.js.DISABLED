const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth(),
    webVersion: '2.3000.1015901620',
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015901620.html'
    },
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('QR Code recebido!');
    console.log('Escaneie o QR code abaixo com seu WhatsApp Business:');
    console.log('\n' + '='.repeat(50));
    qrcode.generate(qr, { small: true });
    console.log('='.repeat(50) + '\n');
    
    // Salvar o QR code em um arquivo de texto para possível uso posterior
    fs.writeFileSync('last-qr.txt', qr);
    console.log('QR code também salvo em last-qr.txt para referência');
});

client.on('ready', () => {
    console.log('Bot conectado com sucesso!');
});

client.on('authenticated', () => {
    console.log('Autenticado!');
});

client.on('auth_failure', msg => {
    console.error('Falha na autenticação:', msg);
});

client.initialize().catch(console.error);
