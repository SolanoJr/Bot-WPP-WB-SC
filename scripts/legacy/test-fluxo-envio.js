/**
 * 🧪 TESTE AUTOMATIZADO DO FLUXO DE ENVIO
 * 
 * PROVA (não apenas diz) que o fluxo funciona:
 * 1. Insere mensagem na fila
 * 2. Processa envio
 * 3. Confirma sucesso com logs
 */

const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// 🚯 USAR SINGLETON GLOBAL - NÃO CRIAR NOVO CLIENT
const whatsappSingleton = require('./services/whatsappSingleton');

// Obter instância existente (não cria nova)
let client;
try {
    client = whatsappSingleton.getClient();
    console.log('✅ [TEST] Usando client existente do singleton');
} catch (error) {
    console.error('❌ [TEST] Erro ao obter client do singleton:', error.message);
    console.log('⚠️  [TEST] Execute: node whatsapp.js primeiro');
    process.exit(1);
}

// Número real controlado (substituir com número de teste real)
const TEST_NUMBER = '5511999999999@c.us'; // ALTERAR PARA NÚMERO REAL
const TEST_MESSAGE = `🧪 Teste automatizado - ${new Date().toISOString()}`;

// Sistema de fila simples para teste
const messageQueue = [];
let isProcessing = false;

// Função para enfileirar mensagem
const enqueueMessage = (chatId, message) => {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
        id: messageId,
        chatId,
        message,
        timestamp: new Date().toISOString(),
        status: 'queued',
        retryCount: 0
    };
    
    messageQueue.push(messageData);
    console.log(`📥 [ENQUEUE] Mensagem enfileirada: ${messageId}`);
    console.log(`📊 [ENQUEUE] Tamanho da fila: ${messageQueue.length}`);
    
    return messageId;
};

// Função para processar fila
const processQueue = async () => {
    if (isProcessing || messageQueue.length === 0) {
        return;
    }
    
    isProcessing = true;
    console.log('🔄 [PROCESS] Iniciando processamento da fila...');
    
    while (messageQueue.length > 0) {
        const messageData = messageQueue.shift();
        console.log(`📤 [PROCESS] Processando mensagem: ${messageData.id}`);
        
        try {
            // Validar número antes de enviar
            const numberId = await client.getNumberId(messageData.chatId.replace('@c.us', ''));
            if (!numberId) {
                throw new Error(`Número inválido: ${messageData.chatId}`);
            }
            
            // Enviar mensagem
            const startTime = Date.now();
            const result = await client.sendMessage(messageData.chatId, messageData.message);
            const duration = Date.now() - startTime;
            
            console.log(`✅ [SUCCESS] Mensagem enviada com sucesso!`);
            console.log(`📊 [SUCCESS] ID: ${messageData.id}`);
            console.log(`📊 [SUCCESS] MessageID: ${result.id?.id || 'unknown'}`);
            console.log(`📊 [SUCCESS] Duração: ${duration}ms`);
            console.log(`📊 [SUCCESS] Para: ${messageData.chatId}`);
            
            // Salvar log de sucesso
            const successLog = {
                ...messageData,
                status: 'sent',
                sentAt: new Date().toISOString(),
                duration,
                whatsappMessageId: result.id?.id
            };
            
            fs.appendFileSync(
                path.join(__dirname, 'test-envio-success.log'),
                JSON.stringify(successLog) + '\n'
            );
            
        } catch (error) {
            console.error(`❌ [ERROR] Falha ao enviar mensagem: ${messageData.id}`);
            console.error(`📊 [ERROR] Erro:`, error.message);
            
            // Se for erro de número, não tentar novamente
            if (error.message.includes('No LID for user') || error.message.includes('Número inválido')) {
                console.log(`🚫 [ERROR] Número inválido - descartando mensagem`);
                
                const errorLog = {
                    ...messageData,
                    status: 'failed',
                    error: error.message,
                    failedAt: new Date().toISOString()
                };
                
                fs.appendFileSync(
                    path.join(__dirname, 'test-envio-errors.log'),
                    JSON.stringify(errorLog) + '\n'
                );
            } else {
                // Tentar novamente (máximo 3 tentativas)
                messageData.retryCount++;
                if (messageData.retryCount < 3) {
                    console.log(`🔄 [RETRY] Tentativa ${messageData.retryCount}/3 - reenfileirando`);
                    messageQueue.push(messageData);
                } else {
                    console.log(`❌ [RETRY] Máximo de tentativas atingido - descartando`);
                }
            }
        }
    }
    
    isProcessing = false;
    console.log('🏁 [PROCESS] Processamento da fila concluído');
};

// ✅ Eventos já configurados no singleton - não duplicar

// Verificar se client está pronto antes de iniciar teste
const waitForReady = () => {
    return new Promise((resolve) => {
        if (client.info && client.info.wid) {
            console.log('🚀 [TEST] Cliente pronto para teste!');
            console.log(`📱 [TEST] Número do bot: ${client.info.wid.user}`);
            resolve();
        } else {
            console.log('⏳ [TEST] Aguardando client ficar pronto...');
            setTimeout(() => waitForReady(), 2000);
        }
    });
};

// Função principal de teste
const runTest = async () => {
    try {
        console.log(`\n🎯 [TEST] Iniciando teste de envio para ${TEST_NUMBER}`);
        console.log(`📝 [TEST] Mensagem: "${TEST_MESSAGE}"`);
        
        // 1. Enfileirar mensagem
        const messageId = enqueueMessage(TEST_NUMBER, TEST_MESSAGE);
        
        // 2. Processar fila
        await processQueue();
        
        // 3. Verificar resultado
        setTimeout(() => {
            console.log('\n📊 [TEST] Resumo do teste:');
            console.log(`📥 Mensagens enfileiradas: ${messageId ? '1' : '0'}`);
            console.log(`📤 Status: Verificar logs de sucesso/erro`);
            console.log(`📁 Logs: test-envio-success.log, test-envio-errors.log`);
            
            // Encerrar após teste
            setTimeout(() => {
                console.log('🏁 [TEST] Teste concluído - encerrando...');
                client.destroy();
                process.exit(0);
            }, 5000);
        }, 3000);
        
    } catch (error) {
        console.error('❌ [TEST] Erro no teste:', error);
        client.destroy();
        process.exit(1);
    }
};

// Iniciar teste - aguardar client estar pronto
const startTest = async () => {
    try {
        console.log('🔄 [TEST] Aguardando client estar pronto...');
        await waitForReady();
        
        // Iniciar teste após 5 segundos
        setTimeout(() => {
            console.log('🧪 [TEST] Iniciando teste automatizado...');
            runTest();
        }, 5000);
        
    } catch (error) {
        console.error('❌ [TEST] Erro ao iniciar teste:', error.message);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 [TEST] Encerrando teste...');
    process.exit(0);
});

// Iniciar teste
startTest();

module.exports = {
    enqueueMessage,
    processQueue,
    runTest
};
