const commandUsage = {};
const userUsage = {};

const registerUsage = (commandName, userId) => {
    if (commandName) {
        commandUsage[commandName] = (commandUsage[commandName] || 0) + 1;
    }

    if (userId) {
        userUsage[userId] = (userUsage[userId] || 0) + 1;
    }
};

const getCommandUsage = () => {
    return { ...commandUsage };
};

const getUserUsage = () => {
    return { ...userUsage };
};

const getTopUsers = (limit = 5) => {
    return Object.entries(userUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
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
    getCommandUsage,
    getTopUsers,
    getUserUsage,
    registerUsage,
    resetUsage
};
