const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

function resolveBundledChromePath() {
    const cacheRoot = path.join(process.env.HOME || '', '.cache/puppeteer/chrome');
    if (!fs.existsSync(cacheRoot)) {
        return '/usr/bin/google-chrome-stable';
    }

    const versions = fs.readdirSync(cacheRoot).sort().reverse();
    for (const version of versions) {
        const candidate = path.join(cacheRoot, version, 'chrome-linux64', 'chrome');
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return '/usr/bin/google-chrome-stable';
}

const clientId = process.argv[2] || 'bot-wpp-session';

const client = new Client({
    authStrategy: new LocalAuth({ clientId }),
    puppeteer: {
        headless: true,
        executablePath: resolveBundledChromePath(),
        timeout: 120000,
        pipe: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    },
});

client.on('ready', () => {
    console.log('READY_OK', clientId);
    process.exit(0);
});

client.on('qr', () => console.log('QR_OK', clientId));
client.on('authenticated', () => console.log('AUTH_OK', clientId));

client.initialize().catch((error) => {
    console.error('INIT_FAIL', clientId, error.message);
    process.exit(1);
});
