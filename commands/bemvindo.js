module.exports = {
    name: 'bemvindo',
    description: 'Mensagem de boas-vindas e regras do grupo (apenas admin).',

    async execute(msg, client, args) {
        void args;

        // Verifica se é admin (simplificado para teste)
        // TODO: Implementar verificação real de admin depois
        const isAdmin = true; // Temporário para teste

        if (!isAdmin) {
            await msg.reply('❌ Apenas administradores podem usar este comando.');
            return;
        }

        const response = [
            '👋 **BEM-VINDO AO GRUPO!**',
            '',
            '📋 **Regras do Grupo:**',
            '• Respeite todos os membros',
            '• Sem spam ou links maliciosos',
            '• Use os comandos com responsabilidade',
            '• Dúvidas? Use !help',
            '',
            '🤖 **Comandos Disponíveis:**',
            '• !help - Lista todos os comandos',
            '• !ondeestou - Verifica sua localização',
            '• !status - Status do bot',
            '• !ping - Testar conexão',
            '',
            '🔧 **Suporte:**',
            'Contate o administrador se precisar de ajuda.'
        ].join('\n');

        await msg.reply(response);
    }
};
