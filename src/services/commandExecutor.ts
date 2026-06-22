import { sendError } from './replyService';
import { registerUsage } from './usageService';

interface CommandContext {
    message: any;
    args: any[];
    [key: string]: any;
}

interface CommandResult {
    success: boolean;
    commandName: string;
    value: any;
    error: any;
}

const executeCommand = async (command: any, context: CommandContext): Promise<CommandResult> => {
    const commandName = command?.name || 'desconhecido';

    console.log(`Executando comando: ${commandName}`);

    try {
        const value = await command.execute(context.message, context.args, context);

        registerUsage(command.name, context.message.from);

        console.log(`Comando executado com sucesso: ${commandName}`);

        return {
            success: true,
            commandName,
            value,
            error: null
        };
    } catch (error: any) {
        console.error(`Erro ao executar comando ${commandName}:`, error);
        await sendError(context, 'Erro ao executar comando');

        return {
            success: false,
            commandName,
            value: null,
            error
        };
    }
};

export {
    executeCommand
};
