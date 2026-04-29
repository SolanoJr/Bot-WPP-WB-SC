const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração
const BACKEND_URL = process.env.BACKEND_URL || 'http://100.101.218.16:4010';
const TAILSCALE_HOST = process.env.TAILSCALE_HOST || '100.101.218.16';
const API_KEY = process.env.API_KEY || ''; // Chave de segurança

// Middleware de Autenticação
const checkApiKey = (req, res, next) => {
    const providedKey = req.headers['x-api-key'];
    
    // Ignorar checagem se o servidor não configurou API_KEY (fallback seguro)
    if (!API_KEY) {
        return next();
    }
    
    if (providedKey !== API_KEY) {
        console.warn(`🔒 [SECURITY] Acesso negado em ${req.path} - Chave inválida`);
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    next();
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 🗄️ CONFIGURAÇÃO DO BANCO DE DADOS SQLITE
const DB_PATH = path.join(__dirname, 'relay.db');
const db = new sqlite3.Database(DB_PATH);

// Inicializar banco de dados
const initializeDatabase = () => {
    console.log('🗄️ [DATABASE] Inicializando banco SQLite...');
    
    // Tabela de localizações
    db.run(`
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL,
            chatId TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp DATETIME NOT NULL,
            userAgent TEXT,
            receivedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed BOOLEAN DEFAULT FALSE,
            processedAt DATETIME,
            INDEX(chatId),
            INDEX(token),
            INDEX(processed)
        )
    `, (err) => {
        if (err) {
            console.error('❌ [DATABASE] Erro ao criar tabela locations:', err);
        } else {
            console.log('✅ [DATABASE] Tabela locations criada/verificada');
        }
    });

    // Tabela de clientes
    db.run(`
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chatId TEXT UNIQUE NOT NULL,
            name TEXT,
            phoneNumber TEXT,
            firstSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
            lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
            totalLocations INTEGER DEFAULT 0,
            isActive BOOLEAN DEFAULT TRUE,
            INDEX(chatId),
            INDEX(isActive)
        )
    `, (err) => {
        if (err) {
            console.error('❌ [DATABASE] Erro ao criar tabela clients:', err);
        } else {
            console.log('✅ [DATABASE] Tabela clients criada/verificada');
        }
    });

    // Tabela de grupos
    db.run(`
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            groupId TEXT UNIQUE NOT NULL,
            name TEXT,
            participants INTEGER DEFAULT 0,
            welcomeMessage TEXT,
            customCommands TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            lastActivity DATETIME DEFAULT CURRENT_TIMESTAMP,
            isActive BOOLEAN DEFAULT TRUE,
            INDEX(groupId),
            INDEX(isActive)
        )
    `, (err) => {
        if (err) {
            console.error('❌ [DATABASE] Erro ao criar tabela groups:', err);
        } else {
            console.log('✅ [DATABASE] Tabela groups criada/verificada');
        }
    });

    // Tabela de feedbacks
    db.run(`
        CREATE TABLE IF NOT EXISTS feedbacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chatId TEXT NOT NULL,
            type TEXT NOT NULL, -- 'location', 'error', 'success', 'user_feedback'
            message TEXT,
            data TEXT, -- JSON com dados adicionais
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX(chatId),
            INDEX(type),
            INDEX(timestamp)
        )
    `, (err) => {
        if (err) {
            console.error('❌ [DATABASE] Erro ao criar tabela feedbacks:', err);
        } else {
            console.log('✅ [DATABASE] Tabela feedbacks criada/verificada');
        }
    });

    // Tabela de telemetria
    db.run(`
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            botNumber TEXT NOT NULL,
            botName TEXT,
            version TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX(botNumber)
        )
    `, (err) => {
        if (err) {
            console.error('❌ [DATABASE] Erro ao criar tabela telemetry:', err);
        } else {
            console.log('✅ [DATABASE] Tabela telemetry criada/verificada');
        }
    });

    console.log('🎉 [DATABASE] Banco de dados inicializado com sucesso!');
};

// Configurar axios para Tailscale (ignorar SSL se necessário)
const tailscaleAgent = new https.Agent({
    rejectUnauthorized: false
});

// Keep-alive ping endpoint - PRIMEIRO para evitar conflitos
app.get('/ping', (req, res) => {
    console.log('🏓 Relay ping received - keeping Render awake');
    res.json({
        pong: true,
        service: 'bot-wpp-relay',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'bot-wpp-relay',
        timestamp: new Date().toISOString(),
        backend: BACKEND_URL
    });
});

// Receber localização do frontend (com SQLite)
app.post('/location', async (req, res) => {
    try {
        const { token, chatId, location, userAgent, timestamp } = req.body;
        
        console.log('📥 Localização recebida para o chatId:', chatId);
        
        if (!location || !location.lat || !location.lng) {
            return res.status(400).json({
                success: false,
                message: 'Coordenadas inválidas'
            });
        }
        
        // Inserir localização no SQLite
        const stmt = db.prepare(`
            INSERT INTO locations (token, chatId, latitude, longitude, timestamp, userAgent)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
            token,
            chatId,
            location.lat,
            location.lng,
            timestamp || new Date().toISOString(),
            userAgent
        ], function(err) {
            if (err) {
                console.error('❌ [DATABASE] Erro ao inserir localização:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao salvar localização'
                });
            }
            
            // Atualizar ou criar cliente
            const clientStmt = db.prepare(`
                INSERT OR REPLACE INTO clients (chatId, lastSeen, totalLocations)
                VALUES (?, CURRENT_TIMESTAMP, COALESCE((SELECT totalLocations FROM clients WHERE chatId = ?), 0) + 1)
            `);
            
            clientStmt.run([chatId, chatId], (err) => {
                if (err) {
                    console.error('❌ [DATABASE] Erro ao atualizar cliente:', err);
                }
            });
            
            // Registrar feedback
            const feedbackStmt = db.prepare(`
                INSERT INTO feedbacks (chatId, type, message, data)
                VALUES (?, 'location', 'Localização recebida com sucesso', ?)
            `);
            
            feedbackStmt.run([chatId, JSON.stringify({token, location})], (err) => {
                if (err) {
                    console.error('❌ [DATABASE] Erro ao registrar feedback:', err);
                }
            });
            
            console.log(`✅ [DATABASE] Localização salva - ID: ${this.lastID}`);
            
            res.json({
                success: true,
                message: 'Localização recebida e armazenada',
                locationId: this.lastID
            });
        });
        
        stmt.finalize();
        
    } catch (error) {
        console.error('❌ Erro ao processar localização:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar localização'
        });
    }
});

// Endpoint para o bot buscar localizações pendentes (com SQLite e Auth)
app.get('/pending/:chatId', checkApiKey, (req, res) => {
    try {
        const chatIdParam = req.params.chatId;
        if (!chatIdParam) {
            console.log(`📋 [DATABASE] Checking data for undefined: false (invalid ID)`);
            return res.status(204).send();  // Resposta vazia instantânea
        }

        const cleanId = String(chatIdParam).trim();
        
        // Buscar localização não processada no SQLite
        db.get(`
            SELECT id, token, chatId, latitude as lat, longitude as lng, timestamp, userAgent, receivedAt
            FROM locations 
            WHERE chatId = ? AND processed = FALSE 
            ORDER BY receivedAt ASC 
            LIMIT 1
        `, [cleanId], (err, row) => {
            if (err) {
                console.error('❌ [DATABASE] Erro ao buscar localização:', err);
                return res.status(204).send();  // Resposta vazia em caso de erro
            }
            
            console.log(`📋 [DATABASE] Checking data for ${cleanId}: ${!!row}`);
            
            if (!row) {
                return res.status(204).send();  // Resposta vazia instantânea
            }
            
            // Montar objeto no formato esperado pelo bot
            const locationData = {
                token: row.token,
                chatId: row.chatId,
                location: {
                    lat: row.lat,
                    lng: row.lng
                },
                timestamp: row.timestamp,
                userAgent: row.userAgent,
                receivedAt: row.receivedAt
            };
            
            // Marcar como processado
            db.run(`
                UPDATE locations 
                SET processed = TRUE, processedAt = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [row.id], (updateErr) => {
                if (updateErr) {
                    console.error('❌ [DATABASE] Erro ao marcar como processado:', updateErr);
                } else {
                    console.log(`✅ [DATABASE] Localização ${row.id} marcada como processada`);
                }
            });
            
            // Registrar feedback de processamento
            db.run(`
                INSERT INTO feedbacks (chatId, type, message, data)
                VALUES (?, 'success', 'Localização processada pelo bot', ?)
            `, [cleanId, JSON.stringify({locationId: row.id})], (feedbackErr) => {
                if (feedbackErr) {
                    console.error('❌ [DATABASE] Erro ao registrar feedback:', feedbackErr);
                }
            });
            
            return res.json(locationData);
        });
        
    } catch (criticalError) {
        console.error('🚨 CRITICAL ERROR IN GET /pending:', criticalError);
        // Força 204 para qualquer erro - nunca retorna 500
        return res.status(204).send();
    }
});

// Endpoint para telemetria do bot (com Auth)
app.post('/telemetry', checkApiKey, (req, res) => {
    try {
        const { botNumber, botName, version } = req.body;
        if (!botNumber) {
            return res.status(400).json({ success: false, message: 'botNumber é obrigatório' });
        }
        
        db.run(`
            INSERT INTO telemetry (botNumber, botName, version)
            VALUES (?, ?, ?)
        `, [botNumber, botName, version], function(err) {
            if (err) {
                console.error('❌ [DATABASE] Erro ao salvar telemetria:', err);
                return res.status(500).json({ success: false, message: 'Erro ao salvar telemetria' });
            }
            console.log(`📊 [TELEMETRY] Instância registrada: ${botNumber} (${botName || 'N/A'}) v${version || 'N/A'}`);
            res.json({ success: true, message: 'Telemetria salva' });
        });
    } catch (error) {
        console.error('❌ Erro no /telemetry:', error);
        res.status(500).json({ success: false, message: 'Erro interno' });
    }
});

// Endpoint para buscar configurações de grupo (com Auth)
app.get('/groups/:groupId/config', checkApiKey, (req, res) => {
    try {
        const groupId = req.params.groupId;
        if (!groupId) return res.status(400).json({ success: false });

        db.get(`
            SELECT welcomeMessage, customCommands
            FROM groups
            WHERE groupId = ?
        `, [groupId], (err, row) => {
            if (err) {
                console.error('❌ [DATABASE] Erro ao buscar config de grupo:', err);
                return res.status(500).json({ success: false });
            }
            
            if (!row) {
                // Retorna um default vazio se não existir
                return res.json({ success: true, welcomeMessage: null, customCommands: null });
            }

            let parsedCommands = null;
            if (row.customCommands) {
                try {
                    parsedCommands = JSON.parse(row.customCommands);
                } catch(e) {}
            }

            res.json({
                success: true,
                welcomeMessage: row.welcomeMessage,
                customCommands: parsedCommands
            });
        });
    } catch (error) {
        console.error('❌ Erro no /groups/config:', error);
        res.status(500).json({ success: false });
    }
});

// Endpoint para receber feedback (com Auth)
app.post('/feedback', checkApiKey, (req, res) => {
    try {
        const { chatId, message, data } = req.body;
        if (!chatId || !message) {
            return res.status(400).json({ success: false, message: 'chatId e message são obrigatórios' });
        }

        db.run(`
            INSERT INTO feedbacks (chatId, type, message, data)
            VALUES (?, 'user_feedback', ?, ?)
        `, [chatId, message, data ? JSON.stringify(data) : null], function(err) {
            if (err) {
                console.error('❌ [DATABASE] Erro ao salvar feedback:', err);
                return res.status(500).json({ success: false });
            }
            console.log(`📝 [FEEDBACK] Recebido de ${chatId}: ${message}`);
            res.json({ success: true, feedbackId: this.lastID });
        });
    } catch (error) {
        console.error('❌ Erro no /feedback:', error);
        res.status(500).json({ success: false });
    }
});

// Status geral do relay
app.get('/status', (req, res) => {
    res.json({
        service: 'bot-wpp-relay',
        status: 'online',
        backend: BACKEND_URL,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro no relay:', error);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
    });
});

// Limpeza automática de dados antigos (SQLite)
const cleanupOldData = () => {
    console.log(`🧹 [DATABASE] Iniciando limpeza de dados antigos...`);
    
    // Limpar localizações processadas com mais de 24 horas
    db.run(`
        DELETE FROM locations 
        WHERE processed = TRUE AND processedAt < datetime('now', '-1 day')
    `, (err) => {
        if (err) {
            console.error('❌ [DATABASE] Erro ao limpar localizações antigas:', err);
        } else {
            console.log('✅ [DATABASE] Localizações antigas limpas');
        }
    });
    
    // Limpar feedbacks com mais de 7 dias
    db.run(`
        DELETE FROM feedbacks 
        WHERE timestamp < datetime('now', '-7 days')
    `, (err) => {
        if (err) {
            console.error('❌ [DATABASE] Erro ao limpar feedbacks antigos:', err);
        } else {
            console.log('✅ [DATABASE] Feedbacks antigos limpos');
        }
    });
    
    console.log(`✅ [DATABASE] Limpeza concluída`);
};

// Limpar a cada 5 minutos
setInterval(cleanupOldData, 5 * 60 * 1000);

// Iniciar banco de dados e servidor
initializeDatabase();

app.listen(PORT, () => {
    console.log(`🚀 Relay API rodando na porta ${PORT}`);
    console.log(`📡 Backend: ${BACKEND_URL}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🏓 Ping: http://localhost:${PORT}/ping`);
    console.log(`📊 Status: http://localhost:${PORT}/status`);
    console.log(`📍 Location: POST http://localhost:${PORT}/location`);
    console.log(`🔍 Pending: GET http://localhost:${PORT}/pending/:chatId`);
    console.log(`⏰ Iniciado: ${new Date().toISOString()}`);
    
    // Log de rotas registradas
    console.log(`📋 Rotas registradas:`);
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
            const path = middleware.route.path;
            console.log(`   ${methods} ${path}`);
        }
    });
    
    // Iniciar limpeza inicial
    setTimeout(cleanupOldData, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM - encerrando graceful...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT - encerrando graceful...');
    process.exit(0);
});

module.exports = app;
