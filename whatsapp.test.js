const fs = require('fs');
const os = require('os');
const path = require('path');
const { executeCommand } = require('./services/commandExecutor');
const authService = require('./services/authService');
const controlService = require('./services/controlService');
const backendTelemetryService = require('./services/backendTelemetryService');
const logger = require('./services/loggerService');
const replyService = require('./services/replyService');
const usageService = require('./services/usageService');
const { resetRateLimiter } = require('./utils/rateLimiter');
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
        authService.resetAuthStatus();
        controlService.resetControlStatus();
        usageService.resetUsage();
        resetRateLimiter();
        delete process.env.ADMIN_NUMBERS;
        jest.restoreAllMocks();
    });

    test('deve carregar automaticamente os arquivos validos da pasta commands', () => {
        const commands = loadCommands(commandsDir);

        expect(commands.has('ping')).toBe(true);
        expect(commands.has('test')).toBe(true);
        expect(commands.has('info')).toBe(true);
        expect(commands.has('help')).toBe(true);
        expect(commands.has('status')).toBe(true);
        expect(commands.has('admin')).toBe(true);
        expect(commands.has('feedback')).toBe(true);
        expect(commands.has('welcome')).toBe(true);
        expect(commands.get('status')).toEqual(expect.objectContaining({
            name: 'status',
            description: expect.any(String),
            execute: expect.any(Function)
        }));
    });

    test('deve ignorar comando invalido e logar erro sem derrubar o bot', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-wpp-commands-'));
        const invalidCommandPath = path.join(tempDir, 'invalid.js');
        const validCommandPath = path.join(tempDir, 'ok.js');
        const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

        fs.writeFileSync(invalidCommandPath, 'module.exports = { description: "sem execute" };', 'utf8');
        fs.writeFileSync(
            validCommandPath,
            "module.exports = { name: 'ok', description: 'valido', async execute() {} };",
            'utf8'
        );

        const commands = loadCommands(tempDir);

        expect(commands.has('ok')).toBe(true);
        expect(commands.has('invalid')).toBe(false);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Comando ignorado em'));

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
    afterEach(() => {
        authService.resetAuthStatus();
        controlService.resetControlStatus();
        usageService.resetUsage();
        resetRateLimiter();
        delete process.env.ADMIN_NUMBERS;
        jest.restoreAllMocks();
    });

    test('deve retornar resultado padronizado em sucesso', async () => {
        const command = {
            name: 'fake',
            execute: jest.fn().mockResolvedValue('ok')
        };
        const context = {
            args: ['1'],
            message: { reply: jest.fn() }
        };
        const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

        const result = await executeCommand(command, context);

        expect(result).toEqual({
            success: true,
            commandName: 'fake',
            value: 'ok',
            error: null
        });
        expect(command.execute).toHaveBeenCalledWith(context.message, context.args, context);
        expect(infoSpy).toHaveBeenCalled();
    });

    test('deve retornar resultado padronizado em falha e responder erro', async () => {
        const reply = jest.fn().mockResolvedValue(undefined);
        const command = {
            name: 'broken',
            execute: jest.fn().mockRejectedValue(new Error('falhou'))
        };
        const context = {
            args: [],
            message: { reply }
        };
        const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

        const result = await executeCommand(command, context);

        expect(result.success).toBe(false);
        expect(result.commandName).toBe('broken');
        expect(result.error).toBeInstanceOf(Error);
        expect(reply).toHaveBeenCalledWith('Erro ao executar comando');
        expect(errorSpy).toHaveBeenCalled();
    });
});

describe('fluxo de mensagem do WhatsApp', () => {
    afterEach(() => {
        authService.resetAuthStatus();
        controlService.resetControlStatus();
        usageService.resetUsage();
        resetRateLimiter();
        delete process.env.ADMIN_NUMBERS;
        jest.restoreAllMocks();
    });

    test('deve executar o comando correto e responder ao receber !test', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client' };
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
        expect(usageService.getCommandUsage()).toEqual({ test: 1 });
    });

    test('deve executar o comando status', async () => {
        const commands = loadCommands(commandsDir);
        authService.setAuthStatus({
            authorized: true,
            origin: 'fallback',
            number: '5511666666666@c.us',
            reason: 'Autorizado pelo fallback local'
        });
        controlService.setControlStatus({
            enabled: true,
            state: 'authorized',
            instanceId: 'inst-1',
            machineId: 'mach-1',
            number: '5511666666666@c.us',
            operatorName: 'solano',
            instanceLabel: 'pc-principal',
            reason: 'Instancia autorizada',
            approvedBy: 'solano'
        });
        const client = {
            id: 'fake-client',
            info: {
                wid: {
                    _serialized: '5511666666666@c.us'
                }
            }
        };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!status',
            fromMe: false,
            from: '5511666666666@c.us',
            reply
        };
        const startedAt = Date.now() - 12000;
        const handler = createMessageHandler({ client, commands, startedAt });

        await handler(msg);

        expect(reply.mock.calls[0][0]).toContain('Bot online');
        expect(reply.mock.calls[0][0]).toContain('numero do bot conectado: 5511666666666@c.us');
        expect(reply.mock.calls[0][0]).toContain('status de autorizacao: autorizado');
        expect(reply.mock.calls[0][0]).toContain('origem da autorizacao: fallback');
        expect(reply.mock.calls[0][0]).toContain('controle de instancia: authorized');
        expect(reply.mock.calls[0][0]).toContain('instancia atual: inst-1');
        expect(reply.mock.calls[0][0]).toContain('operador atual: solano');
        expect(reply.mock.calls[0][0]).toContain(`quantidade de comandos carregados: ${commands.size}`);
        expect(reply.mock.calls[0][0]).toContain('admin atual: nao');
        expect(reply.mock.calls[0][0]).toContain('tempo online: 12s');
        expect(reply.mock.calls[0][0]).toMatch(/timestamp atual: .+/);
    });

    test('deve responder ao comando welcome', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client' };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!welcome',
            fromMe: false,
            from: '5511555555555@c.us',
            reply
        };
        const handler = createMessageHandler({ client, commands, startedAt: Date.now() - 1000 });

        await handler(msg);

        expect(reply).toHaveBeenCalledWith('Bem-vindo! Esse é seu primeiro comando.');
    });

    test('deve enviar feedback para o backend pelo comando feedback', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client' };
        const reply = jest.fn().mockResolvedValue(undefined);
        const telemetrySpy = jest.spyOn(backendTelemetryService, 'sendFeedback').mockResolvedValue({
            sent: true
        });
        const msg = {
            body: '!feedback gostei do fluxo',
            fromMe: false,
            from: '5511555555555@c.us',
            reply
        };
        const handler = createMessageHandler({ client, commands, startedAt: Date.now() - 1000 });

        await handler(msg);

        expect(telemetrySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                client,
                message: msg,
                args: ['gostei', 'do', 'fluxo']
            }),
            'gostei do fluxo'
        );
        expect(reply).toHaveBeenCalledWith('feedback enviado com sucesso');
    });

    test('deve permitir comando admin para numero autorizado', async () => {
        process.env.ADMIN_NUMBERS = '5511999999999@c.us';
        const commands = loadCommands(commandsDir);
        authService.setAuthStatus({
            authorized: true,
            origin: 'remoto',
            number: '5511999999999@c.us',
            reason: 'Autorizado pela API remota'
        });
        controlService.setControlStatus({
            enabled: true,
            state: 'authorized',
            instanceId: 'inst-admin',
            machineId: 'mach-admin',
            number: '5511999999999@c.us',
            operatorName: 'solano',
            instanceLabel: 'pc-admin',
            reason: 'Instancia autorizada',
            approvedBy: 'solano'
        });
        const client = {
            info: {
                wid: {
                    _serialized: '5511999999999@c.us'
                }
            }
        };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!admin auth',
            fromMe: false,
            from: '5511999999999@c.us',
            reply
        };
        const handler = createMessageHandler({ client, commands, startedAt: Date.now() - 5000 });

        await handler(msg);

        expect(reply.mock.calls[0][0]).toContain('Admin auth');
        expect(reply.mock.calls[0][0]).toContain('status: autorizado');
        expect(reply.mock.calls[0][0]).toContain('controle: authorized');
    });

    test('deve responder ao admin usage com estatisticas', async () => {
        process.env.ADMIN_NUMBERS = '5511999999999@c.us';
        const commands = loadCommands(commandsDir);
        usageService.registerUsage('ping', '5511777777777@c.us');
        usageService.registerUsage('ping', '5511777777777@c.us');
        usageService.registerUsage('help', '5511888888888@c.us');
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!admin usage',
            fromMe: false,
            from: '5511999999999@c.us',
            reply
        };
        const handler = createMessageHandler({
            client: { id: 'fake-client' },
            commands,
            startedAt: Date.now() - 5000
        });

        await handler(msg);

        expect(reply.mock.calls[0][0]).toContain('Admin usage');
        expect(reply.mock.calls[0][0]).toContain('- ping: 2');
        expect(reply.mock.calls[0][0]).toContain('- 5511777777777@c.us: 2');
    });

    test('deve negar comando admin para numero nao autorizado', async () => {
        process.env.ADMIN_NUMBERS = '5511999999999@c.us';
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client' };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!admin status',
            fromMe: false,
            from: '5511444444444@c.us',
            reply
        };
        const handler = createMessageHandler({ client, commands, startedAt: Date.now() - 5000 });

        await handler(msg);

        expect(reply).toHaveBeenCalledWith('acesso negado');
    });

    test('deve aplicar rate limit para usuario comum', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client' };
        const reply = jest.fn().mockResolvedValue(undefined);
        const firstMessage = {
            body: '!welcome',
            fromMe: false,
            from: '5511333333333@c.us',
            reply
        };
        const secondMessage = {
            body: '!ping',
            fromMe: false,
            from: '5511333333333@c.us',
            reply
        };
        const handler = createMessageHandler({ client, commands, startedAt: Date.now() - 5000 });

        await handler(firstMessage);
        await handler(secondMessage);

        expect(reply.mock.calls[0][0]).toBe('Bem-vindo! Esse é seu primeiro comando.');
        expect(reply.mock.calls[1][0]).toMatch(/aguarde \d+ segundos para usar outro comando/);
    });

    test('nao deve aplicar rate limit para admin', async () => {
        process.env.ADMIN_NUMBERS = '5511999999999@c.us';
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client' };
        const reply = jest.fn().mockResolvedValue(undefined);
        const firstMessage = {
            body: '!welcome',
            fromMe: false,
            from: '5511999999999@c.us',
            reply
        };
        const secondMessage = {
            body: '!ping',
            fromMe: false,
            from: '5511999999999@c.us',
            reply
        };
        const handler = createMessageHandler({ client, commands, startedAt: Date.now() - 5000 });

        await handler(firstMessage);
        await handler(secondMessage);

        expect(reply.mock.calls[0][0]).toBe('Bem-vindo! Esse é seu primeiro comando.');
        expect(reply.mock.calls[1][0]).toBe('pong');
    });

    test('mensagem spam nao executa comando', async () => {
        const commands = loadCommands(commandsDir);
        const reply = jest.fn().mockResolvedValue(undefined);
        const deleteMessage = jest.fn().mockResolvedValue(undefined);
        const command = commands.get('ping');
        const executeSpy = jest.spyOn(command, 'execute');
        const handler = createMessageHandler({
            client: {
                blockContact: jest.fn().mockResolvedValue(undefined),
                info: {
                    wid: {
                        _serialized: '5511000000000@c.us'
                    }
                }
            },
            commands,
            startedAt: Date.now() - 5000
        });
        const msg = {
            body: '!ping https://suspeito.com bet',
            fromMe: false,
            from: 'grupo@g.us',
            author: '5511222222222@c.us',
            reply,
            delete: deleteMessage,
            getChat: jest.fn().mockResolvedValue({
                isGroup: true,
                participants: [
                    { id: { _serialized: '5511222222222@c.us' }, isAdmin: false },
                    { id: { _serialized: '5511000000000@c.us' }, isAdmin: true }
                ],
                removeParticipants: jest.fn().mockResolvedValue(undefined)
            }),
            _data: { isNewMsg: true }
        };

        await handler(msg);

        expect(executeSpy).not.toHaveBeenCalled();
        expect(deleteMessage).toHaveBeenCalledWith(true);
    });

    test('mensagem normal executa comando', async () => {
        const commands = loadCommands(commandsDir);
        const reply = jest.fn().mockResolvedValue(undefined);
        const handler = createMessageHandler({
            client: { blockContact: jest.fn(), info: { wid: { _serialized: '5511000000000@c.us' } } },
            commands,
            startedAt: Date.now() - 5000
        });
        const msg = {
            body: '!ping',
            fromMe: false,
            from: '5511222222222@c.us',
            reply,
            _data: { isNewMsg: false }
        };

        await handler(msg);

        expect(reply).toHaveBeenCalledWith('pong');
    });

    test('deve executar o comando info usando context e replyService', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client' };
        const reply = jest.fn().mockResolvedValue(undefined);
        const msg = {
            body: '!info a b',
            fromMe: false,
            from: '5511888888888@c.us',
            reply
        };
        const handler = createMessageHandler({ client, commands });

        await handler(msg);

        expect(reply).toHaveBeenCalledWith(expect.stringContaining('id do chat: 5511888888888@c.us'));
        expect(reply).toHaveBeenCalledWith(expect.stringContaining('numero de argumentos recebidos: 2'));
        expect(reply.mock.calls[0][0]).toMatch(/horario atual: .+/);
    });

    test('deve listar comandos validos em ordem alfabetica no help', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client' };
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
                '- !admin: Executa comandos administrativos.',
                '- !feedback: Envia feedback para o backend operacional.',
                '- !help: Lista os comandos disponiveis.',
                '- !info: Mostra dados do contexto atual da mensagem.',
                '- !ondeestou: Gera um link para capturar localizacao via navegador.',
                '- !ping: Responde com pong para validar se o bot esta ativo.',
                '- !status: Mostra o estado atual do bot.',
                '- !test: Confirma que o comando de teste esta funcionando.',
                '- !welcome: Exemplo de comando simples para onboarding.'
            ].join('\n')
        );
    });

    test('deve ignorar comando inexistente sem quebrar', async () => {
        const commands = loadCommands(commandsDir);
        const client = { id: 'fake-client' };
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
        const client = { id: 'fake-client' };
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
        const client = { id: 'fake-client' };
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
        const client = { id: 'fake-client' };
        const msg = {
            body: '!explode',
            fromMe: false,
            reply
        };
        const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
        const handler = createMessageHandler({ client, commands });

        await expect(handler(msg)).resolves.toBeUndefined();
        expect(failingCommand.execute).toHaveBeenCalledTimes(1);
        expect(reply).toHaveBeenCalledWith('Erro ao executar comando');
        expect(errorSpy).toHaveBeenCalled();
    });

    test('deve montar um context consistente para os comandos', () => {
        const client = { id: 'fake-client' };
        const commands = loadCommands(commandsDir);
        const startedAt = Date.now() - 5000;
        const message = { body: '!ping 123', fromMe: false };
        const context = buildCommandContext({
            client,
            message,
            args: ['123'],
            commands,
            startedAt
        });

        expect(context).toEqual(expect.objectContaining({
            client,
            message,
            args: ['123'],
            commands,
            authStatus: expect.any(Object),
            controlStatus: expect.any(Object),
            isAdmin: false,
            replyService,
            startedAt,
            timestamp: expect.any(String),
            uptimeMs: expect.any(Number)
        }));
    });
});
