const { database } = require('../database/connection');

const insertFeedbackStatement = database.prepare(`
    INSERT INTO feedback (
        id,
        instanceId,
        whatsappNumber,
        userId,
        groupId,
        message,
        createdAt
    ) VALUES (
        @id,
        @instanceId,
        @whatsappNumber,
        @userId,
        @groupId,
        @message,
        @createdAt
    )
`);

const insertFeedback = (feedback) => {
    insertFeedbackStatement.run(feedback);
    return feedback;
};

module.exports = {
    insertFeedback
};
