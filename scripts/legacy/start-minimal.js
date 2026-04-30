/**
 * 🚀 BOT MÍNIMO FUNCIONAL
 * 
 * Versão simplificada sem dependências complexas
 * Apenas comandos básicos funcionando
 */

const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

// Configuração
const MAX_QR_COUNT = 1;
let qrCount = 0;

// Cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'bot-minimal'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ],
    },
    restartOnAuthFail: true
});

// Evento de QR Code
client.on('qr', (qr) => {
    qrCount++;
    
    console.log(`\n📱 QR Code #${qrCount}/${MAX_QR_COUNT}`);
    console.log('⚠️  Escaneie com seu WhatsApp');
    console.log('⏰ Você tem 30 segundos para escanear\n');
    
    // Gerar QR Code no terminal
    qrcode.generate(qr, { small: true });
    
    // Se atingiu o limite, para o bot
    if (qrCount >= MAX_QR_COUNT) {
        console.log('\n🛑 LIMITE DE QR CODE ATINGIDO!');
        console.log('❌ Parei o bot para evitar loop infinito');
        console.log('🔧 Para reiniciar: node start-minimal.js');
        
        setTimeout(() => {
            console.log('\n🔚 Encerrando processo...');
            process.exit(1);
        }, 30000); // 30 segundos para escanear
    }
});

// Evento de autenticação bem-sucedida
client.on('authenticated', () => {
    console.log('\n✅ Autenticado com sucesso!');
    console.log('📱 Bot está online e pronto para usar');
});

// Evento de ready
client.on('ready', () => {
    console.log('\n🎉 Bot está pronto!');
    console.log('📱 Cliente: ' + client.info.wid.user);
    console.log('🔋 Bateria: ' + client.info.battery + '%');
    console.log('📱 Plataforma: ' + client.info.platform);
    console.log('\n🚀 Bot online e aguardando comandos...');
    
    // Carregar comandos
    const COMMAND_PREFIX = '!';
    const commands = new Map();
    
    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const command = require(`./commands/${file}`);
                commands.set(command.name, command);
                console.log(`[LOAD] ${command.name} carregado.`);
            } catch (error) {
                console.error(`[ERROR] Erro ao carregar comando ${file}:`, error.message);
            }
        }
    }
    
    // Evento de mensagem
    client.on('message', async (msg) => {
        const messageBody = msg.body.trim();
        
        if (!messageBody.startsWith(COMMAND_PREFIX)) {
            return;
        }
        
        const args = messageBody.slice(COMMAND_PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        if (!commands.has(commandName)) {
            await msg.reply('❌ Comando não encontrado. Use !help para ver os comandos disponíveis.');
            return;
        }
        
        try {
            const command = commands.get(commandName);
            await command.execute(msg, client, args);
        } catch (error) {
            console.error(`[ERROR] Erro ao executar comando ${commandName}:`, error);
            await msg.reply('❌ Ocorreu um erro ao executar o comando.');
        }
    });
    
    console.log(`\n📋 ${commands.size} comandos carregados com sucesso!`);
});

// Evento de erro
client.on('auth_failure', () => {
    console.log('\n❌ Falha na autenticação!');
    console.log('🔧 Verifique se escaneou o QR Code corretamente');
});

// Evento de desconexão
client.on('disconnected', (reason) => {
    console.log('\n📴 Bot desconectado:', reason);
    console.log('🔄 Reiniciando bot...');
    setTimeout(() => {
        client.initialize();
    }, 5000);
});

// Iniciar cliente
console.log('🚀 Iniciando bot mínimo...');
console.log('🔄 Inicializando cliente WhatsApp...');

client.initialize();
