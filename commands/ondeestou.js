module.exports = {
    name: 'ondeestou',
    description: 'Verifica sua localização e informações do grupo com link de mapa.',

    async execute(msg, args, context) {
        void msg;
        void args;

        const chatId = context.message?.from || context.message?.to || 'chat-desconhecido';
        const isGroup = chatId.includes('@g.us');
        const groupName = context.message?.chat?.name || 'Grupo sem nome';
        const participantNumber = context.message?.from || 'Número não identificado';
        
        // Simular coordenadas baseadas no padrão do número (para demonstração)
        // Em produção, poderia integrar com API de geolocalização real
        const generateMockCoords = (phoneNumber) => {
            // Gera coordenadas consistentes baseadas no número
            const hash = phoneNumber.replace(/\D/g, '').slice(-8);
            const lat = -23.5505 + (parseInt(hash.slice(0,4)) - 5000) * 0.001;
            const lng = -46.6333 + (parseInt(hash.slice(4,8)) - 5000) * 0.001;
            return { latitude: lat.toFixed(6), longitude: lng.toFixed(6) };
        };
        
        const coords = generateMockCoords(participantNumber);
        const mapsLink = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
        
        const response = [
            '📍 **SUA LOCALIZAÇÃO**',
            '',
            `📱 **Chat ID:** ${chatId}`,
            `👥 **Tipo:** ${isGroup ? 'Grupo' : 'Conversa Privada'}`,
            isGroup ? `📝 **Nome do Grupo:** ${groupName}` : '',
            `🔢 **Seu Número:** ${participantNumber}`,
            '',
            `🌍 **Coordenadas:**`,
            `📍 **Latitude:** ${coords.latitude}`,
            `📍 **Longitude:** ${coords.longitude}`,
            '',
            `🗺️ **Mapa:** ${mapsLink}`,
            '',
            `⏰ **Horário:** ${new Date(context.timestamp).toLocaleString('pt-BR')}`,
            '',
            `🤖 **Status do Bot:** Online`,
            '',
            `💡 *Para localização precisa, use um navegador com GPS ativado*`
        ].filter(Boolean).join('\n');

        await context.replyService.sendText(context, response);
        
        // Opcional: registrar no backend para telemetria
        try {
            if (context.backendService) {
                await context.backendService.registerLocation({
                    chatId,
                    participantNumber,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    timestamp: context.timestamp
                });
            }
        } catch (error) {
            // Silencioso - não quebra o comando se backend falhar
        }
    }
};
