const logger = require('./loggerService');
const { isAdmin } = require('../utils/isAdmin');

const SUSPICIOUS_KEYWORDS = [
    'aposta',
    'ganhar dinheiro',
    'lucro facil',
    'lucro fácil',
    'bet',
    'cassino'
];

const hasSuspiciousLink = (text) => {
    return /(https?:\/\/|wa\.me|t\.me)/i.test(text);
};

const hasSuspiciousKeyword = (text) => {
    const normalizedText = text.toLowerCase();
    return SUSPICIOUS_KEYWORDS.some((keyword) => normalizedText.includes(keyword));
};

const analyzeMessage = (message) => {
    const text = String(message?.body || '').trim().toLowerCase();

    if (!text) {
        return {
            isSpam: false,
            reason: ''
        };
    }

    const containsLink = hasSuspiciousLink(text);
    const containsKeyword = hasSuspiciousKeyword(text);
    const isFirstMessage = message?._data?.isNewMsg === true;

    if (containsLink && containsKeyword) {
        return {
            isSpam: true,
            reason: 'link suspeito com palavra-chave proibida'
        };
    }

    if (containsLink && isFirstMessage) {
        return {
            isSpam: true,
            reason: 'link enviado na primeira mensagem'
        };
    }

    if (containsKeyword) {
        return {
            isSpam: true,
            reason: 'palavra-chave suspeita'
        };
    }

    return {
        isSpam: false,
        reason: ''
    };
};

const handleModeration = async (client, message) => {
    if (!message || message.fromMe) {
        return {
            actionTaken: false,
            reason: ''
        };
    }

    const analysis = analyzeMessage(message);

    if (!analysis.isSpam) {
        return {
            actionTaken: false,
            reason: ''
        };
    }

    logger.warn(`Mensagem suspeita detectada de ${message.from}. Motivo: ${analysis.reason}.`);

    if (typeof message.delete === 'function') {
        try {
            await message.delete(true);
            logger.info(`Mensagem removida automaticamente de ${message.from}.`);
        } catch (error) {
            logger.error(`Falha ao remover mensagem suspeita de ${message.from}.`, error);
        }
    }

    const canModerateGroup =
        Boolean(message.from) &&
        String(message.from).endsWith('@g.us') &&
        typeof message.getChat === 'function';

    if (canModerateGroup) {
        try {
            const chat = await message.getChat();
            const contactId = message.author || message.from;
            const botId = client?.info?.wid?._serialized;
            const participant = chat?.participants?.find((item) => item.id?._serialized === contactId);
            const botParticipant = chat?.participants?.find((item) => item.id?._serialized === botId);

            if (chat.isGroup && botParticipant?.isAdmin && participant && !participant.isAdmin) {
                if (typeof chat.removeParticipants === 'function') {
                    await chat.removeParticipants([contactId]);
                    logger.warn(`Participante removido do grupo: ${contactId}.`);
                }
            }
        } catch (error) {
            logger.error(`Falha ao moderar participante ${message.author || message.from} no grupo.`, error);
        }
    }

    try {
        const contactId = message.author || message.from;

        if (contactId && !isAdmin({ from: contactId })) {
            await client.blockContact(contactId);
            logger.warn(`Contato bloqueado automaticamente: ${contactId}.`);
        }
    } catch (error) {
        logger.error(`Falha ao bloquear contato ${message.author || message.from}.`, error);
    }

    return {
        actionTaken: true,
        reason: analysis.reason
    };
};

module.exports = {
    analyzeMessage,
    handleModeration
};
