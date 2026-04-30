#!/usr/bin/env node

/**
 * 🎮 CONTROLE DO AUTOTEST - WORKFLOW COMPLETO
 * 
 * Executa testes → Aguarda confirmação → Sincroniza automaticamente
 */

const AutoTestSystem = require('./autotest');
const readline = require('readline');

class AutoTestController {
    constructor() {
        this.autoTest = new AutoTestSystem();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async runWorkflow() {
        console.log('🤖 SISTEMA DE AUTOTEST - WORKFLOW COMPLETO');
        console.log('=' .repeat(60));
        console.log('');
        
        try {
            // Etapa 1: Executar testes automatizados
            console.log('📋 ETAPA 1: Executando testes automatizados...');
            const results = await this.autoTest.runAllTests();
            
            // Verificar se todos passaram
            const allPassed = results.every(r => r.status === '✅ PASS');
            
            if (!allPassed) {
                console.log('\n❌ ALGUNS TESTES FALHARAM');
                console.log('🔧 Corrija os erros antes de prosseguir');
                this.rl.close();
                return;
            }
            
            // Etapa 2: Aguardar confirmação manual
            console.log('\n📋 ETAPA 2: Confirmação manual necessária');
            console.log('=' .repeat(40));
            
            const confirmed = await this.waitForConfirmation();
            
            if (!confirmed) {
                console.log('\n❌ TESTE NÃO CONFIRMADO');
                console.log('🔧 Verifique manualmente e tente novamente');
                this.rl.close();
                return;
            }
            
            // Etapa 3: Sincronização automática
            console.log('\n📋 ETAPA 3: Sincronização automática');
            console.log('=' .repeat(40));
            
            const syncSuccess = await this.autoTest.synchronizeAfterConfirmation();
            
            if (syncSuccess) {
                console.log('\n🎉 WORKFLOW CONCLUÍDO COM SUCESSO!');
                console.log('✅ Sistema testado, confirmado e sincronizado');
            } else {
                console.log('\n❌ ERRO NA SINCRONIZAÇÃO');
                console.log('🔧 Verifique o Git e tente novamente');
            }
            
        } catch (error) {
            console.error('\n❌ ERRO NO WORKFLOW:', error);
        } finally {
            this.rl.close();
        }
    }

    async waitForConfirmation() {
        return new Promise((resolve) => {
            console.log('🤖 Por favor, execute os seguintes testes manuais:');
            console.log('');
            console.log('1️⃣  Enviar !ondeestou no WhatsApp');
            console.log('2️⃣  Clicar no link recebido');
            console.log('3️⃣  Permitir localização no navegador');
            console.log('4️⃣  Verificar se a resposta está bonita e completa');
            console.log('');
            console.log('📝 Respostas esperadas:');
            console.log('   ✅ Link com token e chatId corretos');
            console.log('   ✅ Polling automático funcionando');
            console.log('   ✅ Resposta formatada com Google Maps');
            console.log('   ✅ Informações do contato/grupo');
            console.log('');
            
            const askConfirmation = () => {
                this.rl.question('🤖 Digite "CONFIRMADO" se tudo funcionou, ou "FALHOU" se houve problemas: ', (answer) => {
                    const normalized = answer.toUpperCase().trim();
                    
                    if (normalized === 'CONFIRMADO') {
                        console.log('✅ Confirmação recebida!');
                        resolve(true);
                    } else if (normalized === 'FALHOU') {
                        console.log('❌ Falha reportada');
                        resolve(false);
                    } else {
                        console.log('❌ Resposta inválida. Digite exatamente "CONFIRMADO" ou "FALHOU"');
                        askConfirmation();
                    }
                });
            };
            
            askConfirmation();
        });
    }
}

// 🚀 Executar workflow completo
if (require.main === module) {
    const controller = new AutoTestController();
    controller.runWorkflow();
}

module.exports = AutoTestController;
