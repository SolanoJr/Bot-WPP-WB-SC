const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const { executeCommand } = require('./services/commandExecutor');
const logger = require('./services/loggerService');
const { handleModeration } = require('./services/moderationService');
const replyService = require('./services/replyService');
const {
    checkLicense,
    createLicenseRevalidator,
    getAuthStatus,
    getClientNumber
} = require('./services/authService');
const { isAdmin } = require('./utils/isAdmin');
const { checkRateLimit } = require('./utils/rateLimiter');
const { isValidCommand } = require('./utils/validator');

const COMMAND_PREFIX = '!';
const DEFAULT_COMMANDS_DIR = path.join(__dirname, 'commands');

const createCommandRegistry = () => new Map();

const normalizeCommand = (command, commandPath) => {
    if (!command || typeof command.name !== 'string' || typeof command.execute !== 'function') {
        logger.error(`Comando ignorado em ${commandPath}: name deve ser string e execute deve ser funcao.`);
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
            if (entry.name.toLowerCase() === 'admin') {
                continue;
            }

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
            logger.error(`Erro ao limpar cache do comando ${entryPath}.`, error);
            continue;
        }

        let importedCommand;

        try {
            importedCommand = require(entryPath);
        } catch (error) {
            logger.error(`Erro ao carregar comando ${entryPath}.`, error);
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

const buildCommandContext = ({ client, message, args, commands, startedAt }) => {
    return {
        client,
        message,
        args,
        commands,
        authStatus: getAuthStatus(),
        isAdmin: isAdmin(message),
        replyService,
        startedAt,
        timestamp: new Date().toISOString(),
        uptimeMs: Date.now() - startedAt
    };
};

const createMessageHandler = ({ client, commands, startedAt }) => {
    return async (msg) => {
        if (msg.fromMe) {
            return;
        }

        const text = String(msg.body || '').trim();
        const moderationResult = await handleModeration(client, msg);

        if (moderationResult.actionTaken) {
            return;
        }

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
            commands,
            startedAt
        });
        const rateLimitResult = checkRateLimit(msg, {
            isAdmin: context.isAdmin
        });

        if (!rateLimitResult.allowed) {
            logger.warn(`Rate limit atingido para ${msg.from}. Aguarde ${rateLimitResult.remainingSeconds}s.`);
            await context.replyService.sendText(
                context,
                `aguarde ${rateLimitResult.remainingSeconds} segundos para usar outro comando`
            );
            return;
        }

        await executeCommand(command, context);
    };
};

const handleUnauthorizedClient = (reason) => {
    logger.warn(reason);
    process.exit(1);
};

const validateClientLicense = async (client) => {
    const authorized = await checkLicense(client);

    if (!authorized) {
        handleUnauthorizedClient('Numero nao autorizado');
        return false;
    }

    const status = getAuthStatus();
    logger.info(`Licenca valida para ${getClientNumber(client)}. Origem: ${status.origin}.`);
    return true;
};

const createReadyHandler = ({ client, commands }) => {
    return async () => {
        logger.info(`Bot conectado. Numero: ${getClientNumber(client)}.`);
        logger.info('Bot online');

        const authorized = await validateClientLicense(client);

        if (!authorized) {
            return;
        }

        createLicenseRevalidator(client, {
            onUnauthorized: () => logger.warn('Revalidacao periodica detectou numero sem autorizacao. Bot mantido online por configuracao.'),
            onError: () => logger.warn('Revalidacao periodica falhou. Bot mantido online por configuracao.'),
            logger
        }).start();

        logger.info(`Comandos carregados: ${commands.size}.`);
    };
};

const startBot = () => {
    const commands = loadCommands();
    const startedAt = Date.now();

    const client = new Client({
        authStrategy: new LocalAuth()
    });

    client.on('qr', (qr) => {
        logger.info('QR gerado');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', createReadyHandler({ client, commands }));
    client.on('message_create', createMessageHandler({ client, commands, startedAt }));

    client.initialize();
};

module.exports = {
    buildCommandContext,
    COMMAND_PREFIX,
    createMessageHandler,
    createReadyHandler,
    DEFAULT_COMMANDS_DIR,
    createCommandRegistry,
    handleUnauthorizedClient,
    loadCommands,
    normalizeCommand,
    parseCommandInput,
    parseCommandName,
    startBot,
    validateClientLicense
};
