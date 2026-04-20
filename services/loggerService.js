const formatLog = (level, message) => {
    return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message
    });
};

const info = (message) => {
    console.log(formatLog('info', message));
};

const warn = (message) => {
    console.warn(formatLog('warn', message));
};

const error = (message, details) => {
    if (details) {
        console.error(formatLog('error', message), details);
        return;
    }

    console.error(formatLog('error', message));
};

module.exports = {
    error,
    info,
    warn
};
