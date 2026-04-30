const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração
const WARRIOR_AUTH_KEY = process.env.WARRIOR_AUTH_KEY || 'solano_wb_gps_26';

// 🧠 IN-MEMORY STORAGE (Solução Anti-GLIBC/Render)
// Como o Relay é um proxy/buffer, usamos memória para evitar dependências nativas
const store = {
    locations: [],
    clients: new Map(),
    feedbacks: [],
    telemetry: [],
    groups: new Map()
};

// Log de Inicialização Crucial
console.log(`🔐 [STARTUP] Warrior Mode (Pure JS - No SQLite):`);
console.log(`   - Auth Key Prefix: ${WARRIOR_AUTH_KEY.substring(0, 4)}...`);
console.log(`   - Auth Key Length: ${WARRIOR_AUTH_KEY.length}`);
console.log(`   - Node Version: ${process.version}`);

// Middleware de Autenticação
const checkApiKey = (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    const providedKey = req.headers['x-api-key'];
    const expectedKey = String(WARRIOR_AUTH_KEY).trim();
    const receivedKey = providedKey ? String(providedKey).trim() : '';
    
    if (receivedKey !== expectedKey) {
        console.warn(`🔒 [SECURITY] Acesso negado em ${req.path}`);
        return res.status(401).json({ 
            success: false, 
            error: 'auth_failed',
            received_len: receivedKey.length,
            expected_len: expectedKey.length
        });
    }
    next();
};

// CORS
const allowedOrigins = ['https://bot-wpp-wb-sc.pages.dev', 'http://localhost:3000', 'https://bot-wpp-relay.onrender.com'];

// Middleware Manual de Pre-flight (Garante 204 imediato para CORS)
app.use((req, res, next) => {
    // Configurar headers de CORS manualmente para máxima compatibilidade
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        res.header('Access-Control-Allow-Origin', 'https://bot-wpp-wb-sc.pages.dev');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization, Cache-Control, Pragma, Expires');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(cors()); // Fallback para o pacote cors padrão

app.use(express.json({ limit: '1mb' }));

// --- ROTAS ---

// Rota Secreta de Debug
app.get('/debug-env-check', (req, res) => {
    res.json({
        ok: true,
        len: WARRIOR_AUTH_KEY.length,
        prefix: WARRIOR_AUTH_KEY.substring(0, 4),
        storage_stats: {
            locations: store.locations.length,
            clients: store.clients.size
        },
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'warrior-relay-mem', timestamp: new Date().toISOString() });
});

// Receber localização do frontend
app.post('/location', checkApiKey, (req, res) => {
    try {
        const { token, chatId, location, userAgent, timestamp } = req.body;
        const lat = location?.lat || location?.latitude;
        const lng = location?.lng || location?.longitude;

        if (!lat || !lng || !chatId) {
            return res.status(400).json({ success: false, error: 'invalid_payload' });
        }

        const cleanChatId = String(chatId).trim();
        const newLocation = {
            id: Date.now(),
            token,
            chatId: cleanChatId,
            lat,
            lng,
            timestamp: timestamp || new Date().toISOString(),
            userAgent,
            receivedAt: new Date().toISOString(),
            processed: false
        };

        store.locations.push(newLocation);
        
        // Atualizar cliente na memória
        const client = store.clients.get(cleanChatId) || { totalLocations: 0 };
        client.lastSeen = new Date().toISOString();
        client.totalLocations++;
        store.clients.set(cleanChatId, client);

        console.log(`✅ [RELAY] Localização armazenada para: ${cleanChatId}`);
        res.json({ success: true, locationId: newLocation.id });

        // Limpeza automática (manter apenas as últimas 500 localizações)
        if (store.locations.length > 500) store.locations.shift();

    } catch (error) {
        console.error('❌ Erro no /location:', error.message);
        res.status(500).json({ success: false });
    }
});

// Polling do Bot (Buscar pendentes)
app.get('/pending/:chatId', checkApiKey, (req, res) => {
    try {
        const chatId = String(req.params.chatId).trim();
        
        // Encontrar a localização não processada mais recente para este chatId
        const index = store.locations.findIndex(loc => loc.chatId === chatId && !loc.processed);
        
        if (index === -1) {
            return res.status(204).send();
        }

        const loc = store.locations[index];
        loc.processed = true;
        loc.processedAt = new Date().toISOString();

        console.log(`📤 [RELAY] Enviando localização pendente para: ${chatId}`);
        res.json({
            token: loc.token,
            chatId: loc.chatId,
            location: { lat: loc.lat, lng: loc.lng },
            timestamp: loc.timestamp,
            userAgent: loc.userAgent,
            receivedAt: loc.receivedAt
        });

    } catch (error) {
        console.error('❌ Erro no /pending:', error.message);
        res.status(204).send();
    }
});

// Telemetria (Mock)
app.post('/telemetry', checkApiKey, (req, res) => {
    store.telemetry.push({ ...req.body, timestamp: new Date().toISOString() });
    if (store.telemetry.length > 100) store.telemetry.shift();
    res.json({ success: true });
});

// Config de Grupos (Fallback estático ou memória)
app.get('/groups/:groupId/config', checkApiKey, (req, res) => {
    const config = store.groups.get(req.params.groupId) || {
        welcomeMessage: null,
        customCommands: null,
        antispamActive: 0
    };
    res.json({ success: true, ...config });
});

app.listen(PORT, () => {
    console.log(`🚀 Relay Server ONLINE na porta ${PORT}`);
});
