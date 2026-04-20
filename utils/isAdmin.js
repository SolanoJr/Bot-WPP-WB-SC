const getAdminNumbersFromEnv = () => {
    return (process.env.ADMIN_NUMBERS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
};

const getMessageUserId = (message) => {
    return message?.author || message?.from || '';
};

const isAdmin = (message, adminNumbers = getAdminNumbersFromEnv()) => {
    const userId = getMessageUserId(message);
    return Boolean(userId) && adminNumbers.includes(userId);
};

module.exports = {
    getAdminNumbersFromEnv,
    getMessageUserId,
    isAdmin
};
