const fs = require('fs').promises;
const path = require('path');

class TelemetryService {
    constructor() {
        this.dbPath = path.join(__dirname, '../backend/database.sqlite');
        this.retentionDays = {
            usage: 90,
            moderation: 180,
            feedback: 365,
            detailed_logs: 30
        };
    }

    // Registrar uso de comando
    async registerUsage(data) {
        const {
            commandName,
            instanceId,
            groupId,
            userId,
            success = true,
            errorCode = null,
            latency = 0,
            argsCount = 0
        } = data;

        const record = {
            timestamp: new Date().toISOString(),
            commandName,
            instanceId,
            groupId,
            userId,
            success,
            errorCode,
            latency,
            argsCount,
            retentionType: 'usage'
        };

        await this.saveRecord(record);
    }

    // Registrar feedback explícito
    async registerFeedback(data) {
        const {
            instanceId,
            userId,
            feedbackText,
            category = 'general'
        } = data;

        const record = {
            timestamp: new Date().toISOString(),
            instanceId,
            userId,
            feedbackText,
            category,
            retentionType: 'feedback'
        };

        await this.saveRecord(record);
    }

    // Registrar evento de moderação
    async registerModeration(data) {
        const {
            instanceId,
            groupId,
            userId,
            action, // 'warn', 'kick', 'ban'
            reason,
            contentPreview // apenas preview, não conteúdo completo
        } = data;

        const record = {
            timestamp: new Date().toISOString(),
            instanceId,
            groupId,
            userId,
            action,
            reason,
            contentPreview,
            retentionType: 'moderation'
        };

        await this.saveRecord(record);
    }

    // Salvar registro (simplificado - poderia ser DB real)
    async saveRecord(record) {
        const logFile = path.join(__dirname, '../logs/telemetry.jsonl');
        const logLine = JSON.stringify(record) + '\n';
        
        try {
            await fs.appendFile(logFile, logLine);
        } catch (error) {
            console.error('Erro ao salvar telemetria:', error);
        }
    }

    // Limpar registros expirados
    async cleanup() {
        const now = new Date();
        const cutoffDates = {};
        
        Object.entries(this.retentionDays).forEach(([type, days]) => {
            cutoffDates[type] = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        });

        // Implementação simplificada - em produção usaria DB
        console.log('Cleanup telemetry:', cutoffDates);
    }

    // Obter estatísticas de uso
    async getUsageStats(instanceId, days = 7) {
        // Implementação simplificada
        return {
            totalCommands: 0,
            successRate: 0,
            avgLatency: 0,
            topCommands: []
        };
    }
}

module.exports = new TelemetryService();
