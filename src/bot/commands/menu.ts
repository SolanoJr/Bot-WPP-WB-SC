import { ICommand } from './types';

export const menuCommand: ICommand = {
    name: 'menu',
    description: 'Exibe o menu principal do bot.',
    
    async execute(msg, client, args) {
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        
        const menu = [
            '╔════════════════════════╗',
            '║          🤖 BOT         ║',
            '╠════════════════════════╣',
            '║  Comandos Disponíveis  ║',
            '╠════════════════════════╣',
            '║ $help      - Ajuda     ║',
            '║ $menu      - Menu      ║',
            '║ $ping      - Conexão   ║',
            '║ $alive     - Online    ║',
            '╚════════════════════════╝',
            '',
            `⏱️ Uptime: ${hours}h ${minutes}m`
        ].join('\n');
        
        await msg.reply(menu);
    }
};