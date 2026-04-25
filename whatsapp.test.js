const fs = require('fs');
const os = require('os');
const path = require('path');
const { executeCommand } = require('./services/commandExecutor');
const usageService = require('./services/usageService');
const moderationService = require('./services/moderationService');
const replyService = require('./services/replyService');
const {
    buildCommandContext,
    createMessageHandler,
    loadCommands,
    parseCommandInput,
    parseCommandName
} = require('./whatsapp');

const commandsDir = path.join(__dirname, 'commands');

describe('loader de comandos', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('deve carregar automaticamente os arquivos validos da pasta commands', () => {
        const commands = loadCommands(commandsDir);
        const ping = commands.get('ping');
        const testCommand = commands.get('test');
        const info = commands.get('info');
        const help = commands.get('help');
        const admin = commands.get('admin');

        expect(commands.has('ping')).toBe(true);
        expect(commands.has('test')).toBe(true);
        expect(commands.has('info')).toBe(true);
        expect(commands.has('help')).toBe(true);
        expect(commands.has('admin')).toBe(true);
        expect(ping).toEqual(expect.objectContaining({
            name: 'ping',
            description: expect.any(String),
            execute: expect.any(Function)
        }));
        expect(testCommand).toEqual(expect.objectContaining({
            name: 'test',
            description: expect.any(String),
            execute: expect.any(Function)
        }));
        expect(info).toEqual(expect.objectContaining({
            name: 'info',
            description: expect.any(String),
            execute: expect.any(Function)
        }));
        expect(help).toEqual(expect.objectContaining({
            name: 'help',
            description: expect.any(String),
            execute: expect.any(Function)
        }));
        expect(admin).toEqual(expect.objectContaining({
            name: 'admin',
            description: expect.any(String),
            execute: expect.any(Function)
        }));
    });

    test('deve ignorar comando invalido e logar erro sem derrubar o bot', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-wpp-commands-'));
        const invalidCommandPath = path.join(tempDir, 'invalid.js');
        const validCommandPath = path.join(tempDir, 'ok.js');
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        fs.writeFileSync(invalidCommandPath, 'module.exports = { description: "sem execute" };', 'utf8');
        fs.writeFileSync(
            validCommandPath,
            "module.exports = { name: 'ok', description: 'valido', async execute() {} };",
            'utf8'
        );

        const commands = loadCommands(tempDir);

        expect(commands.has('ok')).toBe(true);
        expect(commands.has('invalid')).toBe(false);
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Comando ignorado em')
        );

        fs.rmSync(tempDir, { recursive: true, force: true });
    });
});

describe('parser de comandos', () => {
    test('deve extrair corretamente o nome do comando', () => {
        expect(parseCommandName('!test')).toBe('test');
        expect(parseCommandName('!ping agora')).toBe('ping');
    });

    test('deve extrair argumentos do comando', () => {
        expect(parseCommandInput('!ping 123 abc')).toEqual({
            commandName: 'ping',
            args: ['123', 'abc']
        });
    });
});

describe('reply service', () => {
    test('deve enviar texto usando o contexto', async () => {
        const reply = jest.fn().mockResolvedValue(undefined);
        const context = {
            message: {
                reply
            }
        };

        await replyService.sendText(context, 'oi');

        expect(reply).toHaveBeenCalledWith('oi');
    });

    test('deve enviar erro usando o mesmo canal de resposta', async () => {
        const reply = jest.fn().mockResolvedValue(undefined);
        const context = {
            message: {
                reply
            }
        };

        await replyService.sendError(context, 'Erro customizado');

        expect(reply).toHaveBeenCalledWith('Erro customizado');
    });
});

describe('executor de comandos', () => {
    beforeEach(() => {
        usageService.resetUsage();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('deve retornar resultado padronizado em sucesso', async () => {
        const command = {
            name: 'fake',
            execute: jest.fn().mockResolvedValue('ok')
        };
        const context = {
            args: ['1'],
            message: { reply: jest.fn(), from: '5511000000000@c.us' }
        };
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const result = await executeCommand(command, context);

        expect(result).toEqual({
            success: true,
            commandName: 'fake',
            value: 'ok',
            error: null
        });
        expect(command.execute).toHaveBeenCalledWith(context.message, context.args, context);
        expect(logSpy).toHaveBeenCalled();
        expect(usageService.getCommandUsage()).toEqual({ fake: 1 });
    });

    test('deve retornar resultado padronizado em falha e responder erro', async () => {
        const reply = jest.fn().mockResolvedValue(undefined);
        const command = {
            name: 'broken',
            execute: jest.fn().mockRejectedValue(new Error('falhou'))
        };
        const context = {
            args: [],
            message: { reply, from: '5511999999999@c.us' }
        };
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await executeCommand(command, context);

        expect(result.success).toBe(false);
        expect(result.commandName).toBe('broken');
        expect(result.error).toBeInstanceOf(Error);
        expect(reply).toHaveBeenCalledWith('Erro ao executar comando');
        expect(errorSpy).toHaveBeenCalled();
        expect(usageService.getCommandUsage()).toEqual({});
    });
});

describe('fluxo de mensagem do WhatsApp', () => {
    beforeEach(() => {
        moderationService.resetModerationState();
        usageService.resetUsage();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete process.env.ADMIN_IDS;
    });

    test('deve executar o comando correto e responder ao receber !test', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client', blockContact: jest.fn() };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!test',
            fromMe: false,
            from: '5511999999999@c.us',
            reply
        };

        const command = commands.get('test');
        const executeSpy = jest.spyOn(command, 'execute');
        const handler = createMessageHandler({ client, commands });

        await handler(msg);

        expect(executeSpy).toHaveBeenCalledTimes(1);
        expect(executeSpy).toHaveBeenCalledWith(
            msg,
            [],
            expect.objectContaining({
                client,
                message: msg,
                args: [],
                commands,
                replyService,
                timestamp: expect.any(String)
            })
        );
        expect(reply).toHaveBeenCalledWith('comando test funcionando');
    });

    test('deve executar o comando info usando context e replyService', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client', blockContact: jest.fn() };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!info a b',
            fromMe: false,
            from: '5511888888888@c.us',
            reply
        };
        const handler = createMessageHandler({ client, commands });

        await handler(msg);

        expect(reply).toHaveBeenCalledWith(
            expect.stringContaining('id do chat: 5511888888888@c.us')
        );
        expect(reply).toHaveBeenCalledWith(
            expect.stringContaining('numero de argumentos recebidos: 2')
        );
        expect(reply.mock.calls[0][0]).toMatch(/horario atual: .+/);
    });

    test('deve listar comandos validos em ordem alfabetica no help', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client', blockContact: jest.fn() };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!help',
            fromMe: false,
            from: '5511777777777@c.us',
            reply
        };
        const handler = createMessageHandler({ client, commands });

        await handler(msg);

        expect(reply).toHaveBeenCalledWith(
            [
                'Comandos disponiveis:',
                '- !admin: Comandos administrativos. Uso: !admin usage',
                '- !help: Lista os comandos disponiveis.',
                '- !info: Mostra dados do contexto atual da mensagem.',
                '- !ping: Responde com pong para validar se o bot esta ativo.',
                '- !test: Confirma que o comando de teste esta funcionando.'
            ].join('\n')
        );
    });

    test('deve ignorar comando inexistente sem quebrar', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client', blockContact: jest.fn() };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!abc',
            fromMe: false,
            reply
        };
        const handler = createMessageHandler({ client, commands });

        await expect(handler(msg)).resolves.toBeUndefined();
        expect(reply).not.toHaveBeenCalled();
    });

    test('deve ignorar mensagem com apenas prefixo sem quebrar', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client', blockContact: jest.fn() };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!',
            fromMe: false,
            reply
        };
        const handler = createMessageHandler({ client, commands });

        await expect(handler(msg)).resolves.toBeUndefined();
        expect(reply).not.toHaveBeenCalled();
    });

    test('deve ignorar mensagem enviada pelo proprio bot', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client', blockContact: jest.fn() };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!test',
            fromMe: true,
            reply
        };
        const command = commands.get('test');
        const executeSpy = jest.spyOn(command, 'execute');
        const handler = createMessageHandler({ client, commands });

        await expect(handler(msg)).resolves.toBeUndefined();
        expect(executeSpy).not.toHaveBeenCalled();
        expect(reply).not.toHaveBeenCalled();
    });

    test('deve responder com erro quando um comando falhar', async () => {
        const reply = jest.fn().mockResolvedValue(undefined);
        const failingCommand = {
            name: 'explode',
            description: 'Falha de proposito',
            execute: jest.fn().mockRejectedValue(new Error('falhou'))
        };
        const commands = new Map([['explode', failingCommand]]);
        const client = { id: 'fake-client', blockContact: jest.fn() };
        const msg = {
            body: '!explode',
            fromMe: false,
            reply
        };
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const handler = createMessageHandler({ client, commands });

        await expect(handler(msg)).resolves.toBeUndefined();
        expect(failingCommand.execute).toHaveBeenCalledTimes(1);
        expect(reply).toHaveBeenCalledWith('Erro ao executar comando');
        expect(errorSpy).toHaveBeenCalled();
    });

    test('mensagem spam nao deve executar comando', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client', blockContact: jest.fn().mockResolvedValue(undefined) };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!test http://spam.com',
            fromMe: false,
            from: '5511777000000@g.us',
            author: '5511666000000@c.us',
            delete: jest.fn().mockResolvedValue(undefined),
            getChat: jest.fn().mockResolvedValue({ isGroup: false }),
            reply
        };
        const command = commands.get('test');
        const executeSpy = jest.spyOn(command, 'execute');
        const handler = createMessageHandler({ client, commands });

        await handler(msg);

        expect(msg.delete).toHaveBeenCalledWith(true);
        expect(client.blockContact).toHaveBeenCalledWith('5511666000000@c.us');
        expect(executeSpy).not.toHaveBeenCalled();
        expect(reply).not.toHaveBeenCalled();
    });

    test('mensagem normal deve executar comando', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client', blockContact: jest.fn().mockResolvedValue(undefined) };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!ping',
            fromMe: false,
            from: '5511777123123@c.us',
            reply
        };

        const handler = createMessageHandler({ client, commands });

        await handler(msg);

        expect(reply).toHaveBeenCalledWith('pong');
    });

    test('comando admin usage deve responder somente para admin', async () => {
        process.env.ADMIN_IDS = '5511000000000@c.us';
        usageService.registerUsage('test', '5511000000000@c.us');
        usageService.registerUsage('ping', '5511888888888@c.us');
        usageService.registerUsage('test', '5511000000000@c.us');

        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client', blockContact: jest.fn() };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!admin usage',
            fromMe: false,
            from: '5511000000000@c.us',
            reply
        };

        const handler = createMessageHandler({ client, commands });
        await handler(msg);

        expect(reply).toHaveBeenCalledWith(
            expect.stringContaining('Uso de comandos:')
        );
        expect(reply).toHaveBeenCalledWith(
            expect.stringContaining('Top usuarios:')
        );
    });

    test('deve montar um context consistente para os comandos', () => {
        const client = { id: 'fake-client' };
        const commands = loadCommands(commandsDir);
        const message = { body: '!ping 123', fromMe: false };
        const context = buildCommandContext({
            client,
            message,
            args: ['123'],
            commands
        });

        expect(context).toEqual({
            client,
            message,
            args: ['123'],
            commands,
            replyService,
            timestamp: expect.any(String)
        });
    });
});
