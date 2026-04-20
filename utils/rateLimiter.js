const { getMessageUserId } = require('./isAdmin');

const DEFAULT_RATE_LIMIT_MS = 15000;
const lastCommandByUser = new Map();

const checkRateLimit = (message, options = {}) => {
    const {
        intervalMs = DEFAULT_RATE_LIMIT_MS,
        isAdmin = false,
        now = Date.now()
    } = options;

    if (isAdmin) {
        return {
            allowed: true,
            remainingSeconds: 0
        };
    }

    const userId = getMessageUserId(message);

    if (!userId) {
        return {
            allowed: true,
            remainingSeconds: 0
        };
    }

    const previousTimestamp = lastCommandByUser.get(userId);

    if (!previousTimestamp || now - previousTimestamp >= intervalMs) {
        lastCommandByUser.set(userId, now);

        return {
            allowed: true,
            remainingSeconds: 0
        };
    }

    const remainingMs = intervalMs - (now - previousTimestamp);

    return {
        allowed: false,
        remainingSeconds: Math.ceil(remainingMs / 1000)
    };
};

const resetRateLimiter = () => {
    lastCommandByUser.clear();
};

module.exports = {
    DEFAULT_RATE_LIMIT_MS,
    checkRateLimit,
    resetRateLimiter
};
