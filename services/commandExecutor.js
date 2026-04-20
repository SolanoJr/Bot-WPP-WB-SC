const logger = require('./loggerService');
const replyService = require('./replyService');

const executeCommand = async (command, context) => {
    const commandName = command?.name || 'desconhecido';
    const serializedArgs = Array.isArray(context?.args) ? context.args.join(', ') : '';

    logger.info(`Executando comando: ${commandName}${serializedArgs ? ` | args: ${serializedArgs}` : ' | args: nenhum'}`);

    try {
        const value = await command.execute(context.message, context.args, context);

        logger.info(`Comando executado com sucesso: ${commandName}`);

        return {
            success: true,
            commandName,
            value,
            error: null
        };
    } catch (error) {
        logger.error(`Erro ao executar comando ${commandName}.`, error);
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
