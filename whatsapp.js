const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 🚯 USAR SINGLETON GLOBAL - ÚNICO PONTO DE CRIAÇÃO DO CLIENT
const whatsappSingleton = require('./services/whatsappSingleton');

// Obter instância única de forma assíncrona
let client;

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

// ✅ Eventos já configurados no singleton - não duplicar

// Inicializar client e configurar eventos
const initializeClient = async () => {
    try {
        client = await whatsappSingleton.getClient();
        console.log(`🚯 [WHATSAPP] Usando singleton global: ${whatsappSingleton.getStatus().instanceId}`);
        
        // Configurar eventos de mensagem APÓS client estar disponível
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
    const POLLING_INTERVAL = 8000; // 8 segundos
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
                    console.log(`🔍 [POLLING] Verificando chatId: ${chatId}`);
                    
                    const response = await axios.get(checkUrl, {
                        timeout: 3000,
                        headers: { 'Accept': 'application/json' }
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
            
            // Tentar diferentes nomes de coordenadas
            const lat = loc.lat || loc.latitude || loc.coords?.lat;
            const lon = loc.lng || loc.lon || loc.longitude || loc.coords?.lng || loc.coords?.lon;
            
            const timestamp = location.timestamp;
            
            console.log(`📍 [POLLING] Coordenadas extraídas - Lat: ${lat}, Lon: ${lon}`);

            // 🔒 FALLBACK: Verificar se coordenadas são válidas
            if (!lat || !lon || lat === 'undefined' || lon === 'undefined') {
                console.error(`❌ [POLLING] Coordenadas inválidas - Lat: ${lat}, Lon: ${lon}`);
                console.error(`❌ [POLLING] Dados completos recebidos:`, JSON.stringify(location, null, 2));
                return; // Não enviar mensagem com link quebrado
            }

            // Formatar mensagem
            const response = [
                '✅ **Localização recebida!**',
                '',
                `📅 Data/Hora: ${new Date(timestamp).toLocaleString('pt-BR')}`,
                '',
                `🌍 **Google Maps:**`,
                `🔗 https://www.google.com/maps?q=${lat},${lon}`,
                '',
                `📍 **Coordenadas:**`,
                `Latitude: ${lat}`,
                `Longitude: ${lon}`
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

// Inicializar client assincronamente
initializeClient();

// Iniciar polling quando client estiver pronto
setTimeout(() => {
    startLocationPolling();
}, 15000); // Aguardar 15s para garantir que client está pronto
