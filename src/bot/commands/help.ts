import { ICommand } from './types';

export const helpCommand: ICommand = {
    name: 'help',
    description: 'Lista os comandos disponíveis.',
    
    async execute(msg, client, args) {
        const response = [
            '🤖 *Comandos Disponíveis:*',
            '',
            'Digite $ seguido do nome do comando',
            '',
            '📋 Comandos Principais:',
            '  $help - Lista os comandos',
            '  $menu - Menu principal',
            '  $ping - Testa conexão',
            '  $alive - Verifica se o bot está online',
            '',
            'Use $help <comando> para mais detalhes.'
        ].join('\n');
        
        await msg.reply(response);
    }
};