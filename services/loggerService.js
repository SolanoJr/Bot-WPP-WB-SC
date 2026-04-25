const logInfo = (message, metadata = {}) => {
    console.log(message, metadata);
};

const logWarning = (message, metadata = {}) => {
    console.warn(message, metadata);
};

const logError = (message, metadata = {}) => {
    console.error(message, metadata);
};

module.exports = {
    info: logInfo,
    warn: logWarning,
    error: logError,
    logInfo,
    logWarning,
    logError
};
