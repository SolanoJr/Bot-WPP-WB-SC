const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const { executeCommand } = require('./services/commandExecutor');
const moderationService = require('./services/moderationService');
const replyService = require('./services/replyService');
const whatsappService = require('./services/whatsappService');
const { isValidCommand } = require('./utils/validator');

const COMMAND_PREFIX = '!';
const DEFAULT_COMMANDS_DIR = path.join(__dirname, 'commands');

// Client global para envio de mensagens pendentes
let globalClient = null;

// Validar formato do chatId
const validateChatId = (chatId) => {
    // Formato esperado: 5511999998888@c.us (privado) ou 5511999998888-123456@g.us (grupo)
    const privatePattern = /^\d{12,15}@c\.us$/;
    const groupPattern = /^\d{12,15}-\d+@g\.us$/;
    return privatePattern.test(chatId) || groupPattern.test(chatId);
};

const createCommandRegistry = () => new Map();

const normalizeCommand = (command, commandPath) => {
    if (!command || typeof command.name !== 'string' || typeof command.execute !== 'function') {
        console.error(`Comando ignorado em ${commandPath}: name deve ser string e execute deve ser funcao.`);
        return null;
    }

    return {
        name: command.name.toLowerCase(),
        description: typeof command.description === 'string' ? command.description : '',
        async execute(message, args = [], context = {}) {
            return command.execute(message, args, context);
        }
    };
};

const loadCommands = (commandsPath = DEFAULT_COMMANDS_DIR) => {
    const commands = createCommandRegistry();

    if (!fs.existsSync(commandsPath)) {
        return commands;
    }

    const entries = fs.readdirSync(commandsPath, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(commandsPath, entry.name);

        if (entry.isDirectory()) {
            const nestedCommands = loadCommands(entryPath);

            for (const [name, command] of nestedCommands) {
                commands.set(name, command);
            }

            continue;
        }

        if (!entry.isFile() || path.extname(entry.name) !== '.js') {
            continue;
        }

        try {
            delete require.cache[require.resolve(entryPath)];
        } catch (error) {
            console.error(`Erro ao limpar cache do comando ${entryPath}:`, error);
            continue;
        }

        let importedCommand;

        try {
            importedCommand = require(entryPath);
        } catch (error) {
            console.error(`Erro ao carregar comando ${entryPath}:`, error);
            continue;
        }

        const command = normalizeCommand(importedCommand, entryPath);

        if (!command) {
            continue;
        }

        commands.set(command.name, command);
    }

    return commands;
};

const parseCommandInput = (text) => {
    const content = text.slice(COMMAND_PREFIX.length).trim();

    if (!content) {
        return {
            commandName: '',
            args: []
        };
    }

    const [commandName, ...args] = content.split(/\s+/);

    return {
        commandName: commandName.toLowerCase(),
        args
    };
};

const parseCommandName = (text) => {
    return parseCommandInput(text).commandName;
};

const buildCommandContext = ({ client, message, args, commands }) => {
    return {
        client,
        message,
        args,
        commands,
        replyService,
        timestamp: new Date().toISOString()
    };
};

const createMessageHandler = ({ client, commands }) => {
    return async (msg) => {
        if (msg.fromMe) {
            return;
        }

        const moderationActionTaken = await moderationService.handleModeration(client, msg);

        if (moderationActionTaken) {
            return;
        }

        const text = String(msg.body || '').trim();

        if (!isValidCommand(text)) {
            return;
        }

        const { commandName, args } = parseCommandInput(text);
        const command = commands.get(commandName);

        if (!command) {
            return;
        }

        const context = buildCommandContext({
            client,
            message: msg,
            args,
            commands
        });

        await executeCommand(command, context);
    };
};

const startBot = () => {
    const commands = loadCommands();

    const client = new Client({
        authStrategy: new LocalAuth()
    });
    
    // Atribuir client global
    globalClient = client;

    client.on('qr', (qr) => {
        console.log('QR gerado');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('🤖 Bot WhatsApp ready!');
        console.log('📱 Client State:', client.info);
        
        // Processar mensagens pendentes
        processPendingMessages();
    });

    client.on('message_create', createMessageHandler({ client, commands }));

    client.initialize();
};

// Processar mensagens pendentes do backend
const processPendingMessages = async () => {
    const fs = require('fs');
    const path = require('path');
    
    const messageFile = path.join(__dirname, '.pending-messages.json');
    
    if (!fs.existsSync(messageFile)) {
        return;
    }
    
    try {
        const pendingMessages = JSON.parse(fs.readFileSync(messageFile, 'utf8'));
        
        if (pendingMessages.length === 0) {
            return;
        }
        
        console.log(`📨 Processando ${pendingMessages.length} mensagens pendentes`);
        
        // Enviar mensagens usando client global
        for (const msg of pendingMessages) {
            try {
                console.log(`📤 Enviando para ${msg.chatId}:`, msg.message.substring(0, 50) + '...');
                console.log(`🔍 Client state:`, globalClient ? 'EXISTS' : 'NULL');
                console.log(`🔍 Client ready:`, globalClient?.info ? 'READY' : 'NOT READY');
                console.log(`🔍 ChatId format:`, msg.chatId, '->', validateChatId(msg.chatId) ? 'VALID' : 'INVALID');
                
                if (!globalClient) {
                    console.error(`❌ Client NULL para ${msg.chatId}`);
                    continue;
                }
                
                if (!globalClient.info) {
                    console.error(`❌ Client NOT READY para ${msg.chatId}`);
                    continue;
                }
                
                if (!validateChatId(msg.chatId)) {
                    console.error(`❌ ChatId INVALIDO: ${msg.chatId}`);
                    continue;
                }
                
                console.log(`⏳ Enviando mensagem real para ${msg.chatId}...`);
                const result = await globalClient.sendMessage(msg.chatId, msg.message);
                console.log(`✅ Mensagem enviada SUCESSO para ${msg.chatId}:`, result.id);
                
            } catch (error) {
                console.error(`❌ ERRO DETALHADO ao enviar para ${msg.chatId}:`);
                console.error(`   - Mensagem:`, error.message);
                console.error(`   - Stack:`, error.stack);
                console.error(`   - Código:`, error.code);
                console.error(`   - Tipo:`, error.constructor.name);
            }
        }
        
        // Limpar arquivo
        fs.unlinkSync(messageFile);
        console.log('✅ Mensagens pendentes processadas');
        
    } catch (error) {
        console.error('❌ Erro ao processar mensagens pendentes:', error);
    }
};

module.exports = {
    buildCommandContext,
    COMMAND_PREFIX,
    createMessageHandler,
    DEFAULT_COMMANDS_DIR,
    createCommandRegistry,
    loadCommands,
    normalizeCommand,
    parseCommandInput,
    parseCommandName,
    startBot,
    processPendingMessages
};
