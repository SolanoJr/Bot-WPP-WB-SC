import { Message } from 'whatsapp-web.js';

// Interface simplificada para comandos. O handler de mensagens já fornece
// os parâmetros individuais (msg, client, args). Mantemos a assinatura
// compatível para evitar a criação de objetos de contexto extra.
export interface ICommand {
    name: string;
    description: string;
    // Recebe a mensagem, o cliente do WhatsApp e os argumentos já parseados.
    execute: (msg: any, client: any, args: string[]) => Promise<void> | void;
}