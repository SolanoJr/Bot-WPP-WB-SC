const fs = require('fs').promises;
const path = require('path');

class AutoTest {
    constructor() {
        this.commandsDir = path.join(__dirname, '../commands');
        this.results = [];
    }

    // Teste 1: Carregar todos os comandos sem crash
    async testCommandLoading() {
        console.log('🧪 Teste 1: Carregamento de comandos...');
        
        try {
            const files = await fs.readdir(this.commandsDir);
            const commandFiles = files.filter(file => file.endsWith('.js'));
            
            let loadedCommands = 0;
            let failedCommands = 0;
            
            for (const file of commandFiles) {
                try {
                    const commandPath = path.join(this.commandsDir, file);
                    delete require.cache[require.resolve(commandPath)];
                    const command = require(commandPath);
                    
                    // Verificar estrutura básica
                    if (!command.name || typeof command.execute !== 'function') {
                        throw new Error(`Estrutura inválida: name ou execute ausente`);
                    }
                    
                    loadedCommands++;
                    console.log(`✅ ${file}: ${command.name}`);
                } catch (error) {
                    failedCommands++;
                    console.log(`❌ ${file}: ${error.message}`);
                    this.results.push({
                        test: 'command_loading',
                        file,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            const success = failedCommands === 0;
            this.results.push({
                test: 'command_loading_summary',
                success,
                loadedCommands,
                failedCommands,
                totalCommands: commandFiles.length
            });
            
            console.log(`📊 Resultado: ${loadedCommands}/${commandFiles.length} comandos carregados`);
            return success;
            
        } catch (error) {
            console.log(`❌ Erro ao ler diretório de comandos: ${error.message}`);
            return false;
        }
    }

    // Teste 2: !bemvindo bloqueia não-admin
    async testBemVindoPermission() {
        console.log('🧪 Teste 2: Permissão !bemvindo...');
        
        try {
            const bemvindoPath = path.join(this.commandsDir, 'bemvindo.js');
            
            if (!await fs.access(bemvindoPath).then(() => true).catch(() => false)) {
                console.log('⚠️ Comando !bemvindo não encontrado - pulando teste');
                return true;
            }
            
            delete require.cache[require.resolve(bemvindoPath)];
            const bemvindoCommand = require(bemvindoPath);
            
            // Simular contexto de não-admin
            const mockContext = {
                isAdmin: false,
                replyService: {
                    sendText: async (ctx, text) => {
                        mockContext.lastReply = text;
                    }
                }
            };
            
            // Executar comando
            await bemvindoCommand.execute(null, [], mockContext);
            
            // Verificar se bloqueou
            const blocked = mockContext.lastReply && 
                           mockContext.lastReply.includes('Apenas administradores');
            
            if (blocked) {
                console.log('✅ !bemvindo bloqueou não-admin corretamente');
                this.results.push({
                    test: 'bemvindo_permission',
                    success: true
                });
                return true;
            } else {
                console.log('❌ !bemvindo NÃO bloqueou não-admin');
                this.results.push({
                    test: 'bemvindo_permission',
                    success: false,
                    error: 'Permissão não aplicada'
                });
                return false;
            }
            
        } catch (error) {
            console.log(`❌ Erro no teste de permissão: ${error.message}`);
            this.results.push({
                test: 'bemvindo_permission',
                success: false,
                error: error.message
            });
            return false;
        }
    }

    // Teste 3: Health endpoints respondem
    async testHealthEndpoints() {
        console.log('🧪 Teste 3: Health endpoints...');
        
        let axios;
        try {
            axios = require('axios');
        } catch (error) {
            console.log('⚠️ axios não encontrado - pulando teste de health endpoints');
            this.results.push({
                test: 'health_endpoint',
                success: false,
                error: 'axios não instalado'
            });
            return false;
        }
        
        const https = require('https');
        
        // Configurar axios para ignorar SSL auto-assinado
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });
        
        const tests = [
            { url: 'http://127.0.0.1:4010/health', name: 'HTTP 4010' },
            { url: 'https://127.0.0.1:8443/health', name: 'HTTPS 8443' }
        ];
        
        let passedTests = 0;
        
        for (const test of tests) {
            try {
                const response = await axios.get(test.url, {
                    httpsAgent: test.url.startsWith('https') ? httpsAgent : undefined,
                    timeout: 5000
                });
                
                if (response.data && response.data.ok) {
                    console.log(`✅ ${test.name}: OK`);
                    passedTests++;
                    this.results.push({
                        test: 'health_endpoint',
                        endpoint: test.name,
                        success: true
                    });
                } else {
                    throw new Error('Resposta inválida');
                }
            } catch (error) {
                console.log(`❌ ${test.name}: ${error.message}`);
                this.results.push({
                    test: 'health_endpoint',
                    endpoint: test.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        const success = passedTests === tests.length;
        console.log(`📊 Health: ${passedTests}/${tests.length} endpoints OK`);
        return success;
    }

    // Executar todos os testes
    async runAll() {
        console.log('🚀 Iniciando autotestes...\n');
        
        const startTime = Date.now();
        
        const results = {
            commandLoading: await this.testCommandLoading(),
            bemVindoPermission: await this.testBemVindoPermission(),
            healthEndpoints: await this.testHealthEndpoints()
        };
        
        const duration = Date.now() - startTime;
        const allPassed = Object.values(results).every(r => r === true);
        
        console.log('\n📋 Resumo dos Testes:');
        console.log(`⏱️ Duração: ${duration}ms`);
        console.log(`🧪 Comandos: ${results.commandLoading ? '✅' : '❌'}`);
        console.log(`🔒 Permissões: ${results.bemVindoPermission ? '✅' : '❌'}`);
        console.log(`💚 Health: ${results.healthEndpoints ? '✅' : '❌'}`);
        console.log(`🎯 Status Geral: ${allPassed ? '✅ APROVADO' : '❌ REPROVADO'}`);
        
        return {
            success: allPassed,
            results,
            duration,
            details: this.results
        };
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const tester = new AutoTest();
    tester.runAll()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Erro nos testes:', error);
            process.exit(1);
        });
}

module.exports = AutoTest;
