import { ICommand } from './types';
import { feedbackCommand } from './feedback';
import { statsCommand } from './stats';
import { helpCommand } from './help';
import { menuCommand } from './menu';
import { pingCommand } from './ping';
import { aliveCommand } from './alive';
import { banCommand } from './ban';
import { kickCommand } from './kick';
import { muteCommand } from './mute';
import { promoteCommand } from './promover';
import { forcaCommand } from './forca';
import { velhaCommand } from './velha';
import { sorteioCommand } from './sorteio';
import { climaCommand } from './clima';
import { nickCommand } from './nick';
import { gttsCommand } from './gtts';
import { jokesCommand } from './jokes';
import { voteCommand, delVoteCommand, votoCommand } from './vote';
import { addCmdCommand } from './addcmd';
import { antispamCommand } from './antispam';
import { conselhoCommand } from './conselho';
import { conselhobCommand } from './conselhob';
import { aleatoriaCommand } from './aleatoria';
import { perguntaCommand } from './pergunta';
import { sendMessageCommand } from './sendMessage';
import { ondeEstouCommand } from './ondeestou';
import { jogosCommand } from './jogos';
import { alarmeCommand } from './alarme';
import { lembreteCommand } from './lembrete';
import { bemvindoCommand } from './bemvindo';
import { shutdownCommand } from './shutdown';
import { infoCommand } from './info';

// Registro de todos os comandos
export const commands: Map<string, ICommand> = new Map();

// Função para registrar um comando
export function registerCommand(command: ICommand): void {
    commands.set(command.name, command);
}

// Função para carregar todos os comandos
export function loadCommands(): Map<string, ICommand> {
    commands.clear();

    // Comandos básicos
    registerCommand(helpCommand);
    registerCommand(menuCommand);
    registerCommand(pingCommand);
    registerCommand(aliveCommand);
    
    // Comandos administrativos
    registerCommand(banCommand);
    registerCommand(kickCommand);
    registerCommand(muteCommand);
    registerCommand(promoteCommand);

    // Comandos de jogo e utilitários (placeholders)
    registerCommand(forcaCommand);
    registerCommand(velhaCommand);
    registerCommand(sorteioCommand);
    registerCommand(climaCommand);
    registerCommand(feedbackCommand);
    registerCommand(statsCommand);
    registerCommand(perguntaCommand);
    registerCommand(ondeEstouCommand);
    registerCommand(jogosCommand);
    // comando para enviar mensagem arbitrária
    registerCommand(sendMessageCommand);
    registerCommand(nickCommand);
    registerCommand(gttsCommand);
    // New commands from astabot
    registerCommand(jokesCommand);
    registerCommand(voteCommand);
    registerCommand(delVoteCommand);
    registerCommand(votoCommand);
    registerCommand(addCmdCommand);
    registerCommand(antispamCommand);
    registerCommand(conselhoCommand);
    registerCommand(conselhobCommand);
    registerCommand(aleatoriaCommand);
    registerCommand(alarmeCommand);
    registerCommand(lembreteCommand);
    registerCommand(bemvindoCommand);
    registerCommand(shutdownCommand);
    registerCommand(infoCommand);
    
    return commands;
}

// Exportar comandos individuais para uso em testes
export { helpCommand, menuCommand, pingCommand, aliveCommand, banCommand, kickCommand, muteCommand, promoteCommand, forcaCommand, velhaCommand, sorteioCommand, climaCommand, feedbackCommand, statsCommand, perguntaCommand, nickCommand, gttsCommand, ondeEstouCommand, jogosCommand };
export { jokesCommand, voteCommand, delVoteCommand, votoCommand, addCmdCommand, antispamCommand, conselhoCommand, conselhobCommand, aleatoriaCommand };
