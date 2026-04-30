/**
 * 🧪 SISTEMA DE AUTOTEST PARA COMANDOS
 * 
 * Testa todos os comandos antes de fazer modificações
 * Evita quebrar o sistema funcionando
 */

const axios = require('axios');

class CommandTester {
    constructor() {
        this.testResults = [];
        this.errors = [];
        this.success = 0;
        this.failed = 0;
    }

    // Testar saúde do sistema
    async testSystemHealth() {
        console.log('🏥 Testando saúde do sistema...');
        
        try {
            // Testar Relay
            const relayResponse = await axios.get('https://bot-wpp-relay.onrender.com/ping', {
                timeout: 10000
            });
            
            if (relayResponse.status === 200) {
                this.addResult('✅ Relay', 'Online', 'success');
            } else {
                this.addResult('❌ Relay', `Status: ${relayResponse.status}`, 'error');
            }
        } catch (error) {
            this.addResult('❌ Relay', `Erro: ${error.message}`, 'error');
        }

        try {
            // Testar Interface
            const interfaceResponse = await axios.get('https://bot-wpp-wb-sc.pages.dev', {
                timeout: 10000
            });
            
            if (interfaceResponse.status === 200) {
                this.addResult('✅ Interface', 'Online', 'success');
            } else {
                this.addResult('❌ Interface', `Status: ${interfaceResponse.status}`, 'error');
            }
        } catch (error) {
            this.addResult('❌ Interface', `Erro: ${error.message}`, 'error');
        }
    }

    // Testar se comandos existem
    async testCommands() {
        console.log('📋 Testando comandos...');
        
        const fs = require('fs');
        const path = require('path');
        
        const commandsPath = path.join(__dirname, 'commands');
        if (!fs.existsSync(commandsPath)) {
            this.addResult('❌ Commands', 'Pasta commands não existe', 'error');
            return;
        }

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        if (commandFiles.length === 0) {
            this.addResult('❌ Commands', 'Nenhum arquivo de comando encontrado', 'error');
            return;
        }

        this.addResult('✅ Commands', `${commandFiles.length} comandos encontrados`, 'success');
        
        // Testar cada comando
        for (const file of commandFiles) {
            try {
                const command = require(`./commands/${file}`);
                
                if (!command.name) {
                    this.addResult(`❌ ${file}`, 'Sem nome', 'error');
                    continue;
                }
                
                if (!command.execute || typeof command.execute !== 'function') {
                    this.addResult(`❌ ${command.name}`, 'Sem função execute', 'error');
                    continue;
                }
                
                this.addResult(`✅ ${command.name}`, 'OK', 'success');
                
            } catch (error) {
                this.addResult(`❌ ${file}`, `Erro: ${error.message}`, 'error');
            }
        }
    }

    // Testar arquivos de configuração
    async testConfig() {
        console.log('⚙️  Testando configuração...');
        
        const fs = require('fs');
        
        // Testar .env
        if (fs.existsSync('.env')) {
            this.addResult('✅ .env', 'Arquivo existe', 'success');
        } else {
            this.addResult('❌ .env', 'Arquivo não encontrado', 'error');
        }

        // Testar package.json
        if (fs.existsSync('package.json')) {
            this.addResult('✅ package.json', 'Arquivo existe', 'success');
        } else {
            this.addResult('❌ package.json', 'Arquivo não encontrado', 'error');
        }

        // Testar node_modules
        if (fs.existsSync('node_modules')) {
            this.addResult('✅ node_modules', 'Pasta existe', 'success');
        } else {
            this.addResult('❌ node_modules', 'Execute npm install', 'error');
        }
    }

    // Testar se bot pode iniciar (sem conectar)
    async testBotInit() {
        console.log('🤖 Testando inicialização do bot...');
        
        try {
            const { Client } = require('whatsapp-web.js');
            
            // Tentar criar cliente (sem inicializar)
            const client = new Client({
                authStrategy: { 
                    // Estratégia vazia só para testar
                }
            });
            
            this.addResult('✅ Bot', 'Pode criar cliente', 'success');
            
        } catch (error) {
            this.addResult('❌ Bot', `Erro: ${error.message}`, 'error');
        }
    }

    // Adicionar resultado
    addResult(test, result, type) {
        this.testResults.push({ test, result, type });
        
        if (type === 'success') {
            this.success++;
            console.log(`✅ ${test}: ${result}`);
        } else {
            this.failed++;
            console.log(`❌ ${test}: ${result}`);
            this.errors.push(`${test}: ${result}`);
        }
    }

    // Gerar relatório
    generateReport() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 RELATÓRIO DE TESTES');
        console.log('='.repeat(50));
        
        console.log(`✅ Sucesso: ${this.success}`);
        console.log(`❌ Falhas: ${this.failed}`);
        console.log(`📊 Total: ${this.testResults.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ ERROS ENCONTRADOS:');
            this.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        const successRate = Math.round((this.success / this.testResults.length) * 100);
        console.log(`\n📈 Taxa de sucesso: ${successRate}%`);
        
        if (successRate >= 80) {
            console.log('🎉 SISTEMA ESTÁ OK PARA MODIFICAÇÕES!');
        } else {
            console.log('⚠️  CORRIJA OS ERROS ANTES DE CONTINUAR!');
        }
        
        console.log('='.repeat(50));
        
        return successRate >= 80;
    }

    // Executar todos os testes
    async runAllTests() {
        console.log('🧪 INICIANDO AUTOTEST COMPLETO');
        console.log('='.repeat(50));
        
        await this.testSystemHealth();
        await this.testCommands();
        await this.testConfig();
        await this.testBotInit();
        
        return this.generateReport();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const tester = new CommandTester();
    
    tester.runAllTests().then(isOk => {
        process.exit(isOk ? 0 : 1);
    }).catch(error => {
        console.error('❌ Erro nos testes:', error);
        process.exit(1);
    });
}

module.exports = CommandTester;
