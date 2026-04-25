const { database } = require('../database/connection');

const insertUsageStatement = database.prepare(`
    INSERT INTO command_usage (
        id,
        instanceId,
        whatsappNumber,
        commandName,
        args,
        groupId,
        userId,
        timestamp
    ) VALUES (
        @id,
        @instanceId,
        @whatsappNumber,
        @commandName,
        @args,
        @groupId,
        @userId,
        @timestamp
    )
`);

const insertUsage = (usage) => {
    insertUsageStatement.run(usage);
    return usage;
};

const getTopCommandsStatement = database.prepare(`
    SELECT commandName, COUNT(*) AS total
    FROM command_usage
    GROUP BY commandName
    ORDER BY total DESC, commandName ASC
    LIMIT ?
`);

const getTopUsersStatement = database.prepare(`
    SELECT userId, COUNT(*) AS total
    FROM command_usage
    WHERE userId IS NOT NULL AND userId != ''
    GROUP BY userId
    ORDER BY total DESC, userId ASC
    LIMIT ?
`);

const getUsageByGroupStatement = database.prepare(`
    SELECT groupId, COUNT(*) AS total
    FROM command_usage
    WHERE groupId IS NOT NULL AND groupId != ''
    GROUP BY groupId
    ORDER BY total DESC, groupId ASC
    LIMIT ?
`);

const getUsageSummary = ({ limit = 10 } = {}) => {
    return {
        topCommands: getTopCommandsStatement.all(limit).map((row) => ({
            commandName: row.commandName,
            count: row.total
        })),
        topUsers: getTopUsersStatement.all(limit).map((row) => ({
            userId: row.userId,
            count: row.total
        })),
        usageByGroup: getUsageByGroupStatement.all(limit).map((row) => ({
            groupId: row.groupId,
            count: row.total
        }))
    };
};

module.exports = {
    getUsageSummary,
    insertUsage
};
