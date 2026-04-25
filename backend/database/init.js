const { database, resolveDbPath } = require('./connection');

const createSchema = () => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS instances (
            id TEXT PRIMARY KEY,
            machineId TEXT NOT NULL,
            instanceName TEXT NOT NULL,
            operatorName TEXT NOT NULL,
            whatsappNumber TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('pending', 'authorized', 'revoked')),
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            lastHeartbeatAt TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_instances_machine_id ON instances(machineId);
        CREATE INDEX IF NOT EXISTS idx_instances_whatsapp_number ON instances(whatsappNumber);
        CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);

        CREATE TABLE IF NOT EXISTS command_usage (
            id TEXT PRIMARY KEY,
            instanceId TEXT NOT NULL,
            whatsappNumber TEXT NOT NULL,
            commandName TEXT NOT NULL,
            args TEXT,
            groupId TEXT,
            userId TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (instanceId) REFERENCES instances(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_command_usage_instance_id ON command_usage(instanceId);
        CREATE INDEX IF NOT EXISTS idx_command_usage_command_name ON command_usage(commandName);
        CREATE INDEX IF NOT EXISTS idx_command_usage_user_id ON command_usage(userId);
        CREATE INDEX IF NOT EXISTS idx_command_usage_group_id ON command_usage(groupId);
        CREATE INDEX IF NOT EXISTS idx_command_usage_timestamp ON command_usage(timestamp);

        CREATE TABLE IF NOT EXISTS feedback (
            id TEXT PRIMARY KEY,
            instanceId TEXT NOT NULL,
            whatsappNumber TEXT NOT NULL,
            userId TEXT,
            groupId TEXT,
            message TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (instanceId) REFERENCES instances(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_feedback_instance_id ON feedback(instanceId);
        CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(userId);
        CREATE INDEX IF NOT EXISTS idx_feedback_group_id ON feedback(groupId);
        CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(createdAt);
    `);
};

module.exports = {
    createSchema,
    resolveDbPath
};
