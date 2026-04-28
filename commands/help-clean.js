module.exports = {
    name: 'help',
    description: 'Lista os comandos disponiveis.',

    async execute(msg, client, args) {
        void args;

        const fs = require('fs');
        const path = require('path');
        
        // Carregar comandos dinamicamente
        const commandsPath = path.join(__dirname, '..', 'commands');
        const commands = [];
        
        if (fs.existsSync(commandsPath)) {
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                try {
                    const command = require(`./${file}`);
                    commands.push(command);
                } catch (error) {
                    console.error(`[ERROR] Erro ao carregar comando ${file}:`, error.message);
                }
            }
        }

        const sortedCommands = commands
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
            .map((command) => `- !${command.name}: ${command.description || 'Sem descricao.'}`);

        const response = [
            '🤖 *Comandos Disponíveis:*',
            '',
            ...sortedCommands,
            '',
            '📋 *Como usar:* !<comando>',
            '💡 *Exemplo:* !ping'
        ].join('\n');

        await msg.reply(response);
    }
};
