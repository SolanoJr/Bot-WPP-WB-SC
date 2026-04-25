const commandUsage = Object.create(null);
const userUsage = Object.create(null);

const registerUsage = (commandName, userId) => {
    const safeCommandName = String(commandName || 'desconhecido').toLowerCase();
    const safeUserId = String(userId || 'usuario-desconhecido');

    commandUsage[safeCommandName] = (commandUsage[safeCommandName] || 0) + 1;
    userUsage[safeUserId] = (userUsage[safeUserId] || 0) + 1;
};

const getCommandUsage = () => ({ ...commandUsage });

const getUserUsage = () => ({ ...userUsage });

const getTopUsers = (limit = 5) => {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 5;

    return Object.entries(userUsage)
        .sort(([, usageA], [, usageB]) => usageB - usageA)
        .slice(0, safeLimit)
        .map(([userId, count]) => ({ userId, count }));
};

const resetUsage = () => {
    for (const key of Object.keys(commandUsage)) {
        delete commandUsage[key];
    }

    for (const key of Object.keys(userUsage)) {
        delete userUsage[key];
    }
};

module.exports = {
    registerUsage,
    getCommandUsage,
    getUserUsage,
    getTopUsers,
    resetUsage
};
