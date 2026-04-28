/**
 * 🧪 AUTOTEST REAL DOS COMANDOS
 * 
 * Testa os comandos como eles realmente funcionam
 * Simula a estrutura real do bot
 */

const fs = require('fs');
const path = require('path');

class RealCommandTester {
    constructor() {
        this.testResults = [];
        this.errors = [];
        this.success = 0;
        this.failed = 0;
    }

    // Testar se comandos podem ser carregados e executados
    async testCommandsReal() {
        console.log('📋 Testando comandos REAIS...');
        
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
                
                // Testar estrutura básica
                if (!command.name) {
                    this.addResult(`❌ ${file}`, 'Sem nome', 'error');
                    continue;
                }
                
                if (!command.execute || typeof command.execute !== 'function') {
                    this.addResult(`❌ ${command.name}`, 'Sem função execute', 'error');
                    continue;
                }
                
                // Simular mensagem e client
                const mockMsg = {
                    body: `!${command.name}`,
                    reply: async (text) => {
                        console.log(`📝 Resposta simulada de ${command.name}: ${text.substring(0, 50)}...`);
                        return true;
                    }
                };
                
                const mockClient = {
                    info: { wid: { user: 'test' } }
                };
                
                const mockArgs = [];
                
                // Testar execução real
                try {
                    await command.execute(mockMsg, mockClient, mockArgs);
                    this.addResult(`✅ ${command.name}`, 'Execução OK', 'success');
                } catch (error) {
                    this.addResult(`❌ ${command.name}`, `Erro execução: ${error.message}`, 'error');
                }
                
            } catch (error) {
                this.addResult(`❌ ${file}`, `Erro carregamento: ${error.message}`, 'error');
            }
        }
    }

    // Testar estrutura do bot
    async testBotStructure() {
        console.log('🤖 Testando estrutura do bot...');
        
        // Testar se start-qr.js existe
        if (fs.existsSync('start-qr.js')) {
            this.addResult('✅ start-qr.js', 'Arquivo existe', 'success');
        } else {
            this.addResult('❌ start-qr.js', 'Arquivo não encontrado', 'error');
        }

        // Testar se whatsapp.js existe
        if (fs.existsSync('whatsapp.js')) {
            this.addResult('✅ whatsapp.js', 'Arquivo existe', 'success');
        } else {
            this.addResult('❌ whatsapp.js', 'Arquivo não encontrado', 'error');
        }

        // Testar se package.json existe
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

    // Testar dependências
    async testDependencies() {
        console.log('📦 Testando dependências...');
        
        try {
            require('whatsapp-web.js');
            this.addResult('✅ whatsapp-web.js', 'OK', 'success');
        } catch (error) {
            this.addResult('❌ whatsapp-web.js', `Erro: ${error.message}`, 'error');
        }

        try {
            require('qrcode-terminal');
            this.addResult('✅ qrcode-terminal', 'OK', 'success');
        } catch (error) {
            this.addResult('❌ qrcode-terminal', `Erro: ${error.message}`, 'error');
        }

        try {
            require('axios');
            this.addResult('✅ axios', 'OK', 'success');
        } catch (error) {
            this.addResult('❌ axios', `Erro: ${error.message}`, 'error');
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
        console.log('📊 RELATÓRIO DE TESTES REAIS');
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
        
        if (successRate >= 90) {
            console.log('🎉 SISTEMA ESTÁ PRONTO PARA USO!');
        } else {
            console.log('⚠️  CORRIJA OS ERROS ANTES DE CONTINUAR!');
        }
        
        console.log('='.repeat(50));
        
        return successRate >= 90;
    }

    // Executar todos os testes
    async runAllTests() {
        console.log('🧪 INICIANDO AUTOTEST REAL DOS COMANDOS');
        console.log('='.repeat(50));
        
        await this.testBotStructure();
        await this.testDependencies();
        await this.testCommandsReal();
        
        return this.generateReport();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const tester = new RealCommandTester();
    
    tester.runAllTests().then(isOk => {
        process.exit(isOk ? 0 : 1);
    }).catch(error => {
        console.error('❌ Erro nos testes:', error);
        process.exit(1);
    });
}

module.exports = RealCommandTester;
