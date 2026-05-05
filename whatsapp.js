const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// 🚯 USAR SINGLETON GLOBAL - ÚNICO PONTO DE CRIAÇÃO DO CLIENT
const whatsappSingleton = require('./services/whatsappSingleton');
const { isMaster } = require('./services/permissions');

// Obter instância única de forma assíncrona
let client;

const COMMAND_PREFIX = '!';
const commands = new Map();
const WARRIOR_AUTH_KEY_LENGTH = 16;

const getWarriorAuthKeyOrExit = () => {
    const key = String(process.env.WARRIOR_AUTH_KEY || '').trim();

    if (key.length !== WARRIOR_AUTH_KEY_LENGTH) {
        console.error(`[BOT-CONFIG] WARRIOR_AUTH_KEY invalida: esperado exatamente ${WARRIOR_AUTH_KEY_LENGTH} caracteres, recebido ${key.length}.`);
        console.error('[BOT-CONFIG] Corrija a WARRIOR_AUTH_KEY no ambiente/.env antes de iniciar o Bot.');
        process.exit(1);
    }

    return key;
};

// 🔍 PREFLIGHT CHECK - Testa conexões críticas antes de iniciar
const preFlightCheck = async () => {
    console.log('🔍 [PREFLIGHT] Iniciando verificações críticas...');
    const warriorAuthKey = getWarriorAuthKeyOrExit();

    try {
        // 1. Testar conexão e AUTENTICAÇÃO com Relay
        const RELAY_URL = 'https://bot-wpp-relay.onrender.com'; // Forçado URL pública
        console.log(`🌐 [PREFLIGHT] Testando conexão e AUTH com Relay: ${RELAY_URL}`);
        
        // Debug de WARRIOR_AUTH_KEY solicitado
        const currentKey = warriorAuthKey;
        const keyParts = currentKey.length >= 8 
            ? `${currentKey.substring(0, 4)}...${currentKey.substring(currentKey.length - 4)}`
            : (currentKey ? 'CHAVE_PRESENTE_MAS_CURTA' : 'CHAVE_AUSENTE');
        console.log(`🔐 [PREFLIGHT] Debug de Chave Local: [${keyParts}] (Len: ${currentKey.length})`);
        
        // Teste de Health
        const healthResponse = await axios.get(`${RELAY_URL}/health`, {
            timeout: 10000,
            headers: { 'Accept': 'application/json' }
        });
        
        if (healthResponse.status !== 200) {
            throw new Error(`Relay Health retornou status ${healthResponse.status}`);
        }
        
        // Teste de Autenticação Real
        try {
            await axios.get(`${RELAY_URL}/pending/auth_preflight_test`, {
                timeout: 5000,
                headers: { 
                    'Accept': 'application/json',
                    'x-api-key': warriorAuthKey
                }
            });
            console.log('✅ [PREFLIGHT] Autenticação com Relay: OK');
        } catch (authError) {
            if (authError.response && authError.response.status === 401) {
                console.error('⚠️  [PREFLIGHT] ERRO DE AUTENTICAÇÃO (401)!');
                console.error('🛑 A WARRIOR_AUTH_KEY do Bot não coincide com a do Render.');
                process.exit(1);
            } else if (authError.response && (authError.response.status === 204 || authError.response.status === 404)) {
                console.log('✅ [PREFLIGHT] Autenticação com Relay: OK (Key validada)');
            } else {
                console.warn(`⚠️  [PREFLIGHT] Falha ao validar Auth: ${authError.message}`);
            }
        }
        
        console.log('✅ [PREFLIGHT] Relay Health OK - Status:', healthResponse.data.status);
        
        // 2. Verificar variáveis de ambiente críticas
        const requiredVars = ['MASTER_USER', 'GEMINI_API_KEY'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.warn(`⚠️  [PREFLIGHT] Variáveis críticas ausentes: ${missingVars.join(', ')}`);
        } else {
            console.log('✅ [PREFLIGHT] Variáveis de ambiente OK');
        }
        
        // 3. Verificar sistema de arquivos
        const authPath = path.join(__dirname, '.wwebjs_auth');
        if (!fs.existsSync(authPath)) {
            console.log('📁 [PREFLIGHT] Criando pasta de autenticação...');
            fs.mkdirSync(authPath, { recursive: true });
        }
        
        console.log('✅ [PREFLIGHT] Sistema de arquivos OK');
        
        // 4. Verificar MASTER_USER
        console.log(`✅ [PREFLIGHT] MASTER configurado: ${process.env.MASTER_USER}`);
        
        console.log('🎉 [PREFLIGHT] Todas as verificações passaram!');
        return true;
        
    } catch (error) {
        console.error('❌ [PREFLIGHT] Falha crítica:', error.message);
        console.error('🛑 [PREFLIGHT] O bot NÃO será iniciado devido a falhas críticas.');
        process.exit(1);
    }
};

// Carregamento dinâmico
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const module = require(`./commands/${file}`);
            // Suportar exportação de array de comandos ou objeto único
            const commandList = Array.isArray(module) ? module : [module];
            
            for (const command of commandList) {
                if (command.name) {
                    commands.set(command.name, command);
                    console.log(`[LOAD] ${command.name} carregado.`);
                }
            }
        } catch (err) {
            console.error(`[ERR] ${file}:`, err.message);
        }
    }
}

const { processMessage } = require('./services/messageHandler');

// ✅ Eventos já configurados no singleton - não duplicar

// Inicializar client e configurar eventos
const initializeClient = async () => {
    try {
        client = await whatsappSingleton.getClient();
        console.log(`🚯 [WHATSAPP] Usando singleton global: ${whatsappSingleton.getStatus().instanceId}`);
        
        // Configurar eventos de mensagem APÓS client estar disponível
        client.on('message', async (msg) => {
            // HANDLER CENTRALIZADO E MODULAR
            await processMessage(msg, client, commands);
        });
        
        // Configurar telemetria ao iniciar
        client.on('ready', async () => {
            try {
                const botNumber = client.info?.wid?.user || 'unknown';
                const botName = client.info?.pushname || 'Bot WPP';
                let version = '1.0.0';
                try {
                    version = require('./package.json').version || '1.0.0';
                } catch(e) {}
                
                const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';
                
                    await axios.post(`${RELAY_URL}/telemetry`, {
                        botNumber,
                        botName,
                        version
                    }, { 
                        timeout: 10000,
                        headers: { 'x-api-key': getWarriorAuthKeyOrExit() }
                    });
                } catch (error) {
                    console.log(`⚠️ [TELEMETRY] Erro ao enviar dados ao Relay: ${error.message}`);
                }
            });

            // 🔗 TELEMETRIA DE ENTRADA EM GRUPO
            client.on('group_join', async (notification) => {
                try {
                    // Se o próprio bot entrou
                    if (notification.recipientIds.includes(client.info.wid._serialized)) {
                        const chat = await client.getChatById(notification.chatId);
                        const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';
                        
                        console.log(`🆕 [GROUP] Bot entrou no grupo: ${chat.name}`);
                        
                        await axios.post(`${RELAY_URL}/groups/${encodeURIComponent(chat.id._serialized)}/config`, {
                            name: chat.name,
                            isActive: 1
                        }, {
                            headers: { 'x-api-key': getWarriorAuthKeyOrExit() }
                        });
                    }
                } catch (error) {
                    console.error('❌ Erro na telemetria de grupo:', error.message);
                }
            });

        // 🔄 KEEP-ALIVE AVANÇADO (Ping a cada 12 horas)
        setInterval(async () => {
            try {
                const RELAY_URL = process.env.RELAY_URL || 'https://bot-wpp-relay.onrender.com';
                console.log('💓 [KEEP-ALIVE] Enviando ping para o Relay...');
                await axios.get(`${RELAY_URL}/health`).catch(() => {});
            } catch (e) {
                console.error('❌ [KEEP-ALIVE] Falha no ping:', e.message);
            }
        }, 12 * 60 * 60 * 1000); // 12 horas

        // Inicializar o client
        client.initialize();
        
    } catch (error) {
        console.error('❌ [WHATSAPP] Erro ao obter client do singleton:', error.message);
        process.exit(1);
    }
};

// 🔄 POLLING DO RELAY PARA LOCALIZAÇÕES PENDENTES
const startLocationPolling = () => {
    const RELAY_URL = 'https://bot-wpp-relay.onrender.com';
    const POLLING_INTERVAL = 15000; // 15 segundos (equilíbrio)
    const processedLocations = new Set(); // Evitar duplicação
    const pendingChatIds = new Set(); // Rastrear chatIds que esperam localização

    const checkPendingLocations = async () => {
        try {
            if (!client || !client.info) {
                return; // Client não está pronto
            }

            console.log(`🔍 [POLLING] Verificando localizações pendentes... (${pendingChatIds.size} chatIds)`);
            
            // Verificar cada chatId que está aguardando localização
            for (const chatId of pendingChatIds) {
                try {
                    const checkUrl = `${RELAY_URL}/pending/${encodeURIComponent(chatId)}`;
                    console.log(`🔍 [POLLING] Verificando localização para o ChatId: ${chatId}`);
                    
                    const response = await axios.get(checkUrl, {
                        timeout: 5000,
                        headers: { 
                            'Accept': 'application/json',
                            'x-api-key': getWarriorAuthKeyOrExit()
                        }
                    });

                    if (response.status === 204) {
                        continue; // Nenhuma localização para este chatId
                    }

                    const location = response.data;
                    
                    // 🔍 DEBUG: Mostrar estrutura real dos dados
                    console.log('📦 [DEBUG] Dados brutos do Relay:', JSON.stringify(location, null, 2));
                    
                    if (location && location.location) {
                        const locationId = `${location.chatId}_${location.timestamp}`;
                        
                        // Evitar processar a mesma localização múltiplas vezes
                        if (processedLocations.has(locationId)) {
                            continue;
                        }

                        processedLocations.add(locationId);

                        // Enviar resposta para o WhatsApp
                        await sendLocationResponse(location);
                        
                        // Remover chatId da lista de pendentes
                        pendingChatIds.delete(chatId);
                        console.log(`✅ [POLLING] ChatId ${chatId} removido dos pendentes`);
                    }

                } catch (error) {
                    if (error.response && error.response.status === 204) {
                        // Normal - sem localização para este chatId
                    } else {
                        console.log(`⚠️  [POLLING] Erro ao verificar ${chatId}: ${error.message}`);
                    }
                }
            }

        } catch (error) {
            console.log(`⚠️  [POLLING] Erro geral: ${error.message}`);
        }
    };

    const sendLocationResponse = async (location) => {
        try {
            const chatId = location.chatId;
            const loc = location.location; // Localização está aninhada
            
            // 🔍 DEBUG: Verificar estrutura da localização
            console.log('📦 [DEBUG] Estrutura de location:', JSON.stringify(loc, null, 2));
            
            // Tentar diferentes nomes de coordenadas e garantir que sejam Floats
            const rawLat = loc.lat || loc.latitude || loc.coords?.lat;
            const rawLon = loc.lng || loc.lon || loc.longitude || loc.coords?.lng || loc.coords?.lon;
            
            const lat = parseFloat(rawLat);
            const lon = parseFloat(rawLon);
            
            const timestamp = location.timestamp;
            
            console.log(`📍 [POLLING] Coordenadas extraídas (Float) - Lat: ${lat}, Lon: ${lon}`);

            // 🔒 FALLBACK: Verificar se coordenadas são válidas
            if (!lat || !lon || lat === 'undefined' || lon === 'undefined') {
                console.error(`❌ [POLLING] Coordenadas inválidas - Lat: ${lat}, Lon: ${lon}`);
                console.error(`❌ [POLLING] Dados completos recebidos:`, JSON.stringify(location, null, 2));
                return; // Não enviar mensagem com link quebrado
            }

            // Obter informações do contato e chat
            let contactInfo = '';
            let chatInfo = '';
            
            try {
                if (location.contactName) {
                    contactInfo = `👤 **Usuário:** ${location.contactName}\n`;
                }
                if (location.isGroup && location.groupName) {
                    chatInfo = `🏢 **Grupo:** ${location.groupName}\n`;
                } else if (!location.isGroup) {
                    chatInfo = `💬 **Chat:** Privado\n`;
                }
            } catch (error) {
                // Ignorar erros de extração de informações
            }

            // Formatar mensagem melhorada
            const response = [
                '📍 **LOCALIZAÇÃO RECEBIDA!**',
                '',
                contactInfo,
                chatInfo,
                `� **Data/Hora:** ${new Date(timestamp).toLocaleString('pt-BR')}`,
                '',
                '🗺️ **LOCALIZAÇÃO:**',
                `📍 Localização em tempo real`, // Preparado para Reverse Geocoding
                '',
                `� **Google Maps:**`,
                `🔗 https://www.google.com/maps?q=${lat},${lon}`,
                '',
                `� **Coordenadas:**`,
                `▸ Latitude: ${lat}`,
                `▸ Longitude: ${lon}`,
                '',
                `🆔 **Chat ID:** ${chatId}`
            ].join('\n');

            // Enviar mensagem
            await client.sendMessage(chatId, response);
            
            console.log(`✅ [POLLING] Localização enviada com sucesso para ${chatId}`);

        } catch (error) {
            console.error(`❌ [POLLING] Erro ao enviar localização: ${error.message}`);
        }
    };

    // Expor pendingChatIds globalmente para os comandos acessarem
    global.pendingChatIds = pendingChatIds;

    // Adicionar chatId de teste manualmente para debug
    setTimeout(() => {
        if (pendingChatIds.size === 0) {
            pendingChatIds.add('558581344211@c.us');
            console.log('🧪 [DEBUG] ChatId de teste adicionado manualmente');
        }
    }, 5000);

    // Iniciar polling
    console.log(`🔄 [POLLING] Iniciando verificação de localizações a cada ${POLLING_INTERVAL/1000}s`);
    setInterval(checkPendingLocations, POLLING_INTERVAL);
};

// Inicializar sistema com verificações críticas
const startBot = async () => {
    try {
        // 1. Executar verificações críticas
        await preFlightCheck();
        
        // 2. Inicializar client do WhatsApp
        await initializeClient();
        
        // 3. Iniciar polling quando client estiver pronto
        setTimeout(() => {
            startLocationPolling();
        }, 15000); // Aguardar 15s para garantir que client está pronto
        
    } catch (error) {
        console.error('🛑 [BOT] Falha na inicialização:', error.message);
        process.exit(1);
    }
};

// Exportar para uso no index.js
module.exports = { startBot };
