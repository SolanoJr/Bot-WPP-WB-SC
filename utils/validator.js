const isValidCommand = (text) => {
    const configuredPrefix = process.env.COMMAND_PREFIX || '!';
    const alternatePrefix = configuredPrefix === '$' ? '!' : '$';
    const prefixes = [configuredPrefix, alternatePrefix];

    return typeof text === 'string' && prefixes.some((prefix) => text.trim().startsWith(prefix));
};

module.exports = { isValidCommand };
