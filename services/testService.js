/**
 * 🧪 SERVIÇO DE TESTE AUTOMÁTICO PARA COMANDOS
 * 
 * TODO comando novo deve ter:
 * - Teste automático
 * - Log validando execução
 * - NÃO precisa testar manualmente
 */

const fs = require('fs');
const path = require('path');

class TestService {
    constructor() {
        this.commandsDir = path.join(__dirname, '..', 'commands');
        this.testsDir = path.join(__dirname, '..', 'tests');
        this.testResults = [];
    }

    // 🧪 Gerar teste automático para novo comando
    generateTestForCommand(commandName, commandFile) {
        const testTemplate = `const ${commandName} = require('../commands/${commandFile}');

describe('${commandName} Command Tests', () => {
    let mockMessage;
    let mockClient;
    let mockContext;

    beforeEach(() => {
        // Mock da mensagem
        mockMessage = {
            from: 'test-chat@c.us',
            body: '!${commandName}',
            reply: jest.fn().mockResolvedValue({ id: 'test-id' })
        };

        // Mock do cliente WhatsApp
        mockClient = {
            sendMessage: jest.fn().mockResolvedValue({ id: 'test-id' }),
            getNumberId: jest.fn().mockResolvedValue({ _serialized: 'test-chat@c.us' })
        };

        // Mock do contexto
        mockContext = {
            message: mockMessage,
            client: mockClient,
            args: [],
            isAdmin: false
        };
    });

    test('deve ter estrutura válida', () => {
        expect(${commandName}).toHaveProperty('name');
        expect(${commandName}).toHaveProperty('description');
        expect(${commandName}).toHaveProperty('execute');
        expect(typeof ${commandName}.execute).toBe('function');
    });

    test('deve executar sem erro', async () => {
        await expect(${commandName}.execute(mockMessage, mockClient, [])).resolves.not.toThrow();
    });

    test('deve logar execução', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await ${commandName}.execute(mockMessage, mockClient, []);
        
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Executando comando: ${commandName}')
        );
        
        consoleSpy.mockRestore();
    });

    test('deve registrar uso no telemetry', async () => {
        // Mock do telemetry se existir
        const telemetryMock = {
            registerUsage: jest.fn()
        };
        
        jest.doMock('../services/usageService', () => telemetryMock);
        
        await ${commandName}.execute(mockMessage, mockClient, []);
        
        // Verificar se o uso foi registrado (se o comando usar telemetry)
        expect(telemetryMock.registerUsage).toHaveBeenCalledWith(
            '${commandName}',
            'test-chat@c.us'
        );
    });
});`;

        return testTemplate;
    }

    // 📝 Criar arquivo de teste para novo comando
    createTestFile(commandName, commandFile) {
        const testContent = this.generateTestForCommand(commandName, commandFile);
        const testFileName = `${commandName}.test.js`;
        const testFilePath = path.join(this.testsDir, testFileName);

        try {
            fs.writeFileSync(testFilePath, testContent, 'utf8');
            console.log(`✅ [TEST] Arquivo de teste criado: ${testFileName}`);
            
            // Adicionar ao package.json se não existir
            this.addToPackageTests(testFileName);
            
            return true;
        } catch (error) {
            console.error(`❌ [TEST] Erro ao criar teste para ${commandName}:`, error.message);
            return false;
        }
    }

    // 📦 Adicionar teste ao package.json
    addToPackageTests(testFileName) {
        try {
            const packagePath = path.join(__dirname, '..', 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            // Garantir que exista script de teste
            if (!packageJson.scripts) {
                packageJson.scripts = {};
            }
            
            if (!packageJson.scripts.test) {
                packageJson.scripts.test = 'jest';
            }
            
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
            console.log(`✅ [TEST] Script de teste verificado em package.json`);
            
        } catch (error) {
            console.error(`❌ [TEST] Erro ao atualizar package.json:`, error.message);
        }
    }

    // 🏃 Executar testes de um comando específico
    async runCommandTest(commandName) {
        console.log(`🧪 [TEST] Executando testes para: ${commandName}`);
        
        try {
            const { execSync } = require('child_process');
            const testCommand = `npm test -- --testNamePattern="${commandName}"`;
            
            const result = execSync(testCommand, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            console.log(`✅ [TEST] Testes passaram para ${commandName}`);
            return { success: true, output: result };
            
        } catch (error) {
            console.error(`❌ [TEST] Testes falharam para ${commandName}:`);
            console.error(error.stdout || error.message);
            return { success: false, error: error.stdout || error.message };
        }
    }

    // 🔄 Validar comando antes de aceitar
    async validateCommand(commandPath) {
        const commandName = path.basename(commandPath, '.js');
        
        console.log(`🔍 [TEST] Validando comando: ${commandName}`);
        
        try {
            // Carregar comando
            delete require.cache[require.resolve(commandPath)];
            const command = require(commandPath);
            
            // Verificar estrutura
            const required = ['name', 'description', 'execute'];
            const missing = required.filter(prop => !command[prop]);
            
            if (missing.length > 0) {
                throw new Error(`Propriedades faltando: ${missing.join(', ')}`);
            }
            
            // Verificar se nome corresponde ao arquivo
            if (command.name !== commandName) {
                throw new Error(`Nome do comando (${command.name}) não corresponde ao arquivo (${commandName})`);
            }
            
            // Criar teste automático
            this.createTestFile(commandName, path.basename(commandPath));
            
            // Executar teste
            const testResult = await this.runCommandTest(commandName);
            
            if (testResult.success) {
                console.log(`✅ [TEST] Comando ${commandName} validado e testado com sucesso!`);
                return true;
            } else {
                console.log(`❌ [TEST] Comando ${commandName} falhou nos testes`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ [TEST] Erro na validação de ${commandName}:`, error.message);
            return false;
        }
    }

    // 📊 Gerar relatório de testes
    generateTestReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalCommands: 0,
            testedCommands: 0,
            passedTests: 0,
            failedTests: 0,
            details: this.testResults
        };
        
        const reportPath = path.join(__dirname, '..', 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        
        console.log(`📊 [TEST] Relatório gerado: test-report.json`);
        return report;
    }
}

module.exports = new TestService();
