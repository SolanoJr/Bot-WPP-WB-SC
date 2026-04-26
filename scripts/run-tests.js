#!/usr/bin/env node

const AutoTest = require('../tests/autotest');
const telemetryService = require('../services/telemetryService');

async function runAllTests() {
    console.log('🚀 Executando suite completa de testes...\n');
    
    const startTime = Date.now();
    const tester = new AutoTest();
    
    try {
        // Executar autotestes
        const testResults = await tester.runAll();
        
        // Testar telemetria
        console.log('\n🧪 Teste 4: Telemetria...');
        try {
            await telemetryService.registerUsage({
                commandName: 'test_command',
                instanceId: 'test',
                groupId: 'test-group',
                userId: 'test-user',
                success: true,
                latency: 100,
                argsCount: 0
            });
            
            console.log('✅ Telemetria: OK');
            testResults.results.telemetry = true;
        } catch (error) {
            console.log(`❌ Telemetria: ${error.message}`);
            testResults.results.telemetry = false;
        }
        
        // Resumo final
        const duration = Date.now() - startTime;
        const allTestsPassed = Object.values(testResults.results).every(r => r === true);
        
        console.log('\n🎯 RESULTADO FINAL:');
        console.log(`⏱️ Tempo total: ${duration}ms`);
        console.log(`📊 Testes passaram: ${Object.values(testResults.results).filter(r => r).length}/${Object.keys(testResults.results).length}`);
        
        if (allTestsPassed) {
            console.log('🎉 TODOS OS TESTES PASSARAM!');
            console.log('✅ Sistema pronto para deploy');
        } else {
            console.log('❌ ALGUNS TESTES FALHARAM');
            console.log('⚠️ Corrija os erros antes de fazer deploy');
        }
        
        // Salvar resultados
        const fs = require('fs').promises;
        await fs.writeFile(
            './test-results.json',
            JSON.stringify({
                timestamp: new Date().toISOString(),
                success: allTestsPassed,
                duration,
                results: testResults
            }, null, 2)
        );
        
        console.log('📄 Resultados salvos em ./test-results.json');
        
        process.exit(allTestsPassed ? 0 : 1);
        
    } catch (error) {
        console.error('💥 Erro fatal nos testes:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runAllTests();
}

module.exports = runAllTests;
