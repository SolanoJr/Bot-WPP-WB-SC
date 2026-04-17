const replyService = require('./replyService');

const executeCommand = async (command, context) => {
    const commandName = command?.name || 'desconhecido';

    console.log(`Executando comando: ${commandName}`);

    try {
        const value = await command.execute(context.message, context.args, context);

        console.log(`Comando executado com sucesso: ${commandName}`);

        return {
            success: true,
            commandName,
            value,
            error: null
        };
    } catch (error) {
        console.error(`Erro ao executar comando ${commandName}:`, error);
        await replyService.sendError(context, 'Erro ao executar comando');

        return {
            success: false,
            commandName,
            value: null,
            error
        };
    }
};

module.exports = {
    executeCommand
};
