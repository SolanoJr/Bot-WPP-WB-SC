import { ICommand } from './types';
import { feedbackCommand } from './feedback';
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

// Registro de todos os comandos
export const commands: Map<string, ICommand> = new Map();

// Função para registrar um comando
export function registerCommand(command: ICommand): void {
    commands.set(command.name, command);
}

// Função para carregar todos os comandos
export function loadCommands(): Map<string, ICommand> {
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
    
    return commands;
}

// Exportar comandos individuais para uso em testes
export { helpCommand, menuCommand, pingCommand, aliveCommand, banCommand, kickCommand, muteCommand, promoteCommand, forcaCommand, velhaCommand, sorteioCommand, climaCommand, feedbackCommand, nickCommand, gttsCommand };
export { jokesCommand, voteCommand, delVoteCommand, votoCommand, addCmdCommand, antispamCommand, conselhoCommand, conselhobCommand, aleatoriaCommand };