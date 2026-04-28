const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'bot-wpp-session'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ],
    },
    restartOnAuthFail: true
});

const COMMAND_PREFIX = '!';
const commands = new Map();

// Carregamento dinâmico
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const command = require(`./commands/${file}`);
            if (command.name) {
                commands.set(command.name, command);
                console.log(`[LOAD] ${command.name} carregado.`);
            }
        } catch (err) {
            console.error(`[ERR] ${file}:`, err.message);
        }
    }
}

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('🚀 Bot Online!'));

client.on('message', async (msg) => {
    if (!msg.body.startsWith(COMMAND_PREFIX)) return;

    const args = msg.body.slice(COMMAND_PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commands.get(commandName);

    if (command) {
        try {
            // AJUSTE DE COMPATIBILIDADE:
            // Passamos msg como primeiro e client como segundo (padrão comum)
            await command.execute(msg, client, args);
        } catch (error) {
            console.error(`Erro em ${commandName}:`, error.message);
        }
    }
});

client.initialize();
