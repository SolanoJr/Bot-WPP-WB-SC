const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Cores para o console
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

// Carregar comandos
const commands = new Map();
const commandsPath = path.join(__dirname, '..', 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const command = require(`../commands/${file}`);
            if (command.name) {
                commands.set(command.name, command);
            }
        } catch (err) {
            console.error(`${colors.red}[ERR] Falha ao carregar ${file}: ${err.message}${colors.reset}`);
        }
    }
}

console.log(`${colors.cyan}--- INICIANDO PRÉ-VALIDAÇÃO DE COMANDOS (${commands.size} comandos) ---${colors.reset}\n`);

// Mock do Client
const mockClient = {
    sendMessage: async (chatId, text) => {
        console.log(`${colors.blue}[Client.sendMessage] To: ${chatId}${colors.reset}\n${text}`);
    },
    info: {
        wid: { user: '5588998314322' },
        pushname: 'Bot_Test'
    }
};

// Função para criar um mock de Message
function createMockMessage(body, isGroup = false) {
    const chatId = isGroup ? '123456789-987654321@g.us' : '558581344211@c.us';
    return {
        body: body,
        from: chatId,
        author: isGroup ? '558581344211@c.us' : undefined,
        reply: async (text) => {
            console.log(`${colors.green}[REPLY]${colors.reset}\n${text}\n`);
        },
        getChat: async () => ({
            isGroup: isGroup,
            id: { _serialized: chatId },
            name: isGroup ? 'Grupo de Testes' : 'SolanoJr'
        })
    };
}

// Simulador de fluxo
async function runTest(commandLine, isGroup = false) {
    console.log(`${colors.yellow}>> Testando: ${commandLine} (Grupo: ${isGroup})${colors.reset}`);
    
    const COMMAND_PREFIX = '!';
    if (!commandLine.startsWith(COMMAND_PREFIX)) return;

    const args = commandLine.slice(COMMAND_PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commands.get(commandName);

    const msg = createMockMessage(commandLine, isGroup);

    if (command) {
        try {
            await command.execute(msg, mockClient, args);
        } catch (error) {
            console.error(`${colors.red}[Erro na execução]: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`${colors.red}Comando '${commandName}' não encontrado localmente.${colors.reset}`);
        console.log(`(Se for um comando customizado, ele seria buscado no SQLite do Relay agora).`);
    }
    console.log(`${colors.cyan}--------------------------------------------------${colors.reset}\n`);
}

async function startValidations() {
    // 1. Testar Ping
    await runTest('!ping', false);
    
    // 2. Testar Help
    await runTest('!help', false);
    
    // 3. Testar BemVindo (Num grupo)
    await runTest('!bemvindo', true);
    
    // 4. Testar BemVindo (Privado - deve falhar)
    await runTest('!bemvindo', false);

    // 5. Testar Feedback
    await runTest('!feedback Este é um teste automatizado de feedback.', false);
    
    // 6. Testar OndeEstou
    await runTest('!ondeestou', false);
    
    console.log(`${colors.green}✅ Pré-validação finalizada.${colors.reset}`);
}

startValidations();
