const loggerService = require('./loggerService');

const SUSPICIOUS_TERMS = [
    'http',
    'https',
    'wa.me',
    't.me',
    'aposta',
    'ganhar dinheiro',
    'lucro fácil',
    'bet',
    'cassino'
];

const seenUsers = new Set();

const normalizeText = (text) => String(text || '').toLowerCase();

const hasSuspiciousLink = (text) => {
    return text.includes('http') || text.includes('https') || text.includes('wa.me') || text.includes('t.me');
};

const hasSuspiciousKeyword = (text) => {
    return ['aposta', 'ganhar dinheiro', 'lucro fácil', 'bet', 'cassino'].some((keyword) => text.includes(keyword));
};

const resolveUserId = (message) => {
    return message?.author || message?.from || 'usuario-desconhecido';
};

const analyzeMessage = (message = {}) => {
    const text = normalizeText(message.body);

    if (!text) {
        return { isSpam: false, reason: '' };
    }

    const userId = resolveUserId(message);
    const isFirstMessage = !seenUsers.has(userId);

    if (isFirstMessage) {
        seenUsers.add(userId);
    }

    if (hasSuspiciousKeyword(text)) {
        return {
            isSpam: true,
            reason: 'palavra-chave suspeita detectada'
        };
    }

    if (hasSuspiciousLink(text)) {
        if (isFirstMessage) {
            return {
                isSpam: true,
                reason: 'link enviado na primeira mensagem'
            };
        }

        return {
            isSpam: true,
            reason: 'link suspeito detectado'
        };
    }

    return {
        isSpam: false,
        reason: ''
    };
};

const isGroupMessage = (message) => String(message?.from || '').endsWith('@g.us');

const canRemoveUser = async (chat, userId) => {
    if (!chat?.isGroup || typeof chat.removeParticipants !== 'function') {
        return false;
    }

    const participants = Array.isArray(chat?.participants)
        ? chat.participants
        : Array.isArray(chat?.groupMetadata?.participants)
            ? chat.groupMetadata.participants
            : [];

    const botParticipant = participants.find((participant) => participant.isMe);
    const userParticipant = participants.find((participant) => participant.id?._serialized === userId);

    const isBotAdmin = Boolean(botParticipant?.isAdmin || botParticipant?.isSuperAdmin);
    const isUserAdmin = Boolean(userParticipant?.isAdmin || userParticipant?.isSuperAdmin);

    return isBotAdmin && !isUserAdmin;
};

const handleModeration = async (client, message = {}) => {
    if (message.fromMe) {
        return false;
    }

    const analysis = analyzeMessage(message);

    if (!analysis.isSpam) {
        return false;
    }

    const userId = resolveUserId(message);

    try {
        if (typeof message.delete === 'function') {
            await message.delete(true);
        }
    } catch (error) {
        loggerService.logWarning('Falha ao deletar mensagem suspeita', {
            reason: analysis.reason,
            userId,
            error: error.message
        });
    }

    if (isGroupMessage(message) && typeof message.getChat === 'function') {
        try {
            const chat = await message.getChat();
            const botCanRemove = await canRemoveUser(chat, userId);

            if (botCanRemove) {
                await chat.removeParticipants([userId]);
            }
        } catch (error) {
            loggerService.logWarning('Falha ao remover usuario suspeito', {
                reason: analysis.reason,
                userId,
                error: error.message
            });
        }
    }

    try {
        if (typeof client?.blockContact === 'function') {
            await client.blockContact(userId);
        }
    } catch (error) {
        loggerService.logWarning('Falha ao bloquear contato suspeito', {
            reason: analysis.reason,
            userId,
            error: error.message
        });
    }

    loggerService.logInfo('Moderacao automatica aplicada', {
        reason: analysis.reason,
        userId,
        groupId: message.from || null
    });

    return true;
};

const resetModerationState = () => {
    seenUsers.clear();
};

module.exports = {
    SUSPICIOUS_TERMS,
    analyzeMessage,
    handleModeration,
    resetModerationState
};
