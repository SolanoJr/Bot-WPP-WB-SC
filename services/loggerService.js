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
    logInfo,
    logWarning,
    logError
};
