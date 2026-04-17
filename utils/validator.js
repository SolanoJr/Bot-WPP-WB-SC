const isValidCommand = (text) => {
    return typeof text === 'string' && text.trim().startsWith('!');
};

module.exports = { isValidCommand };
