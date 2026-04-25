const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const { executeCommand } = require('./services/commandExecutor');
const moderationService = require('./services/moderationService');
const replyService = require('./services/replyService');
const { isValidCommand } = require('./utils/validator');

const COMMAND_PREFIX = '!';
const DEFAULT_COMMANDS_DIR = path.join(__dirname, 'commands');

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

    client.on('qr', (qr) => {
        console.log('QR gerado');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('Bot online');
    });

    client.on('message_create', createMessageHandler({ client, commands }));

    client.initialize();
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
    startBot
};
