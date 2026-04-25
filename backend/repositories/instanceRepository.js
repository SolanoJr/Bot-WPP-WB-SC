const { database } = require('../database/connection');

const mapInstance = (row) => {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        machineId: row.machineId,
        instanceName: row.instanceName,
        operatorName: row.operatorName,
        whatsappNumber: row.whatsappNumber,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastHeartbeatAt: row.lastHeartbeatAt
    };
};

const upsertInstanceStatement = database.prepare(`
    INSERT INTO instances (
        id,
        machineId,
        instanceName,
        operatorName,
        whatsappNumber,
        status,
        createdAt,
        updatedAt,
        lastHeartbeatAt
    ) VALUES (
        @id,
        @machineId,
        @instanceName,
        @operatorName,
        @whatsappNumber,
        @status,
        @createdAt,
        @updatedAt,
        @lastHeartbeatAt
    )
    ON CONFLICT(id) DO UPDATE SET
        machineId = excluded.machineId,
        instanceName = excluded.instanceName,
        operatorName = excluded.operatorName,
        whatsappNumber = excluded.whatsappNumber,
        updatedAt = excluded.updatedAt,
        lastHeartbeatAt = excluded.lastHeartbeatAt
`);

const insertInstance = (instance) => {
    upsertInstanceStatement.run(instance);
    return findInstanceById(instance.id);
};

const findInstanceByIdStatement = database.prepare(`
    SELECT * FROM instances WHERE id = ?
`);

const findInstanceById = (id) => {
    return mapInstance(findInstanceByIdStatement.get(id));
};

const listInstancesStatement = database.prepare(`
    SELECT * FROM instances
    ORDER BY createdAt DESC
`);

const listInstances = () => {
    return listInstancesStatement.all().map(mapInstance);
};

const updateInstanceStatusStatement = database.prepare(`
    UPDATE instances
    SET status = @status,
        updatedAt = @updatedAt,
        lastHeartbeatAt = COALESCE(@lastHeartbeatAt, lastHeartbeatAt)
    WHERE id = @id
`);

const updateInstanceStatus = ({ id, status, updatedAt, lastHeartbeatAt = null }) => {
    updateInstanceStatusStatement.run({ id, status, updatedAt, lastHeartbeatAt });
    return findInstanceById(id);
};

const updateInstanceHeartbeatStatement = database.prepare(`
    UPDATE instances
    SET machineId = @machineId,
        instanceName = @instanceName,
        operatorName = @operatorName,
        whatsappNumber = @whatsappNumber,
        updatedAt = @updatedAt,
        lastHeartbeatAt = @lastHeartbeatAt
    WHERE id = @id
`);

const updateInstanceHeartbeat = (instance) => {
    updateInstanceHeartbeatStatement.run(instance);
    return findInstanceById(instance.id);
};

module.exports = {
    findInstanceById,
    insertInstance,
    listInstances,
    updateInstanceHeartbeat,
    updateInstanceStatus
};
