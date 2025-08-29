#!/usr/bin/env node

// test_admin_panel.js - Teste do Painel Administrativo
const axios = require('axios');

class AdminPanelTester {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runAllTests() {
        console.log('🧪 Testando Painel Administrativo do TempBot\n');
        console.log(`🌐 Base URL: ${this.baseUrl}\n`);

        // Lista de testes
        const tests = [
            { name: 'Health Check', endpoint: '/health', method: 'GET' },
            { name: 'Admin Stats', endpoint: '/admin/stats', method: 'GET' },
            { name: 'Admin Users', endpoint: '/admin/users', method: 'GET' },
            { name: 'Admin Analytics', endpoint: '/admin/analytics', method: 'GET' },
            { name: 'Admin Logs', endpoint: '/admin/logs', method: 'GET' },
            { name: 'Admin Page', endpoint: '/admin/', method: 'GET', isHtml: true }
        ];

        for (const test of tests) {
            await this.runTest(test);
        }

        this.printSummary();
    }

    async runTest({ name, endpoint, method, isHtml = false }) {
        try {
            console.log(`⏳ Testando: ${name}`);

            const response = await axios({
                method,
                url: `${this.baseUrl}${endpoint}`,
                timeout: 5000,
                validateStatus: () => true // Aceitar qualquer status para análise
            });

            const result = {
                name,
                endpoint,
                status: response.status,
                success: false,
                message: '',
                data: null
            };

            if (response.status === 200) {
                if (isHtml) {
                    // Teste para página HTML
                    if (response.data.includes('TempBot Admin')) {
                        result.success = true;
                        result.message = '✅ Página HTML carregada corretamente';
                    } else {
                        result.message = '❌ Página HTML não contém conteúdo esperado';
                    }
                } else {
                    // Teste para API JSON
                    if (response.data && response.data.success !== false) {
                        result.success = true;
                        result.message = '✅ API respondeu corretamente';
                        result.data = this.summarizeApiResponse(response.data);
                    } else {
                        result.message = '❌ API retornou erro';
                        result.data = response.data;
                    }
                }
            } else {
                result.message = `❌ Status HTTP ${response.status}`;
                if (response.data) {
                    result.data = response.data;
                }
            }

            this.results.tests.push(result);

            if (result.success) {
                this.results.passed++;
                console.log(`   ${result.message}`);
                if (result.data) {
                    console.log(`   📊 Dados: ${JSON.stringify(result.data, null, 2)}`);
                }
            } else {
                this.results.failed++;
                console.log(`   ${result.message}`);
                if (result.data) {
                    console.log(`   ❓ Resposta: ${JSON.stringify(result.data, null, 2)}`);
                }
            }

            console.log('');

        } catch (error) {
            this.results.failed++;
            this.results.tests.push({
                name,
                endpoint,
                success: false,
                message: `❌ Erro de conexão: ${error.message}`,
                error: error.code || error.message
            });

            console.log(`   ❌ Erro de conexão: ${error.message}\n`);
        }
    }

    summarizeApiResponse(data) {
        if (data.success === true) {
            if (data.data) {
                // Resumir dados baseado no tipo
                if (Array.isArray(data.data)) {
                    return `Array com ${data.data.length} itens`;
                } else if (typeof data.data === 'object') {
                    const keys = Object.keys(data.data);
                    return `Objeto com chaves: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
                }
                return `Dados: ${typeof data.data}`;
            }
            return 'Sucesso';
        }
        return data;
    }

    printSummary() {
        console.log('📋 RESUMO DOS TESTES');
        console.log('='.repeat(50));
        console.log(`✅ Testes Passou: ${this.results.passed}`);
        console.log(`❌ Testes Falhou: ${this.results.failed}`);
        console.log(`📊 Total: ${this.results.tests.length}`);
        console.log('');

        if (this.results.failed > 0) {
            console.log('❌ TESTES QUE FALHARAM:');
            this.results.tests
                .filter(test => !test.success)
                .forEach(test => {
                    console.log(`   • ${test.name}: ${test.message}`);
                });
            console.log('');
        }

        if (this.results.passed === this.results.tests.length) {
            console.log('🎉 TODOS OS TESTES PASSARAM!');
            console.log('✅ Painel Administrativo está funcionando corretamente.');
            console.log(`🌐 Acesse: ${this.baseUrl}/admin`);
        } else {
            console.log('⚠️  ALGUNS TESTES FALHARAM');
            console.log('🔧 Verifique se o servidor está rodando e as configurações estão corretas.');
        }

        console.log('');
        console.log('📝 PRÓXIMOS PASSOS:');
        console.log('1. Acesse o painel administrativo no browser');
        console.log('2. Verifique se todos os dados estão carregando');
        console.log('3. Teste a funcionalidade de exportação');
        console.log('4. Configure as preferências na seção Settings');
    }

    async testEndpointPerformance(endpoint, iterations = 5) {
        console.log(`⚡ Teste de Performance: ${endpoint}`);
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                await axios.get(`${this.baseUrl}${endpoint}`, { timeout: 10000 });
                const time = Date.now() - start;
                times.push(time);
                console.log(`   Tentativa ${i + 1}: ${time}ms`);
            } catch (error) {
                console.log(`   Tentativa ${i + 1}: ERRO`);
            }
        }

        if (times.length > 0) {
            const average = times.reduce((a, b) => a + b, 0) / times.length;
            console.log(`   📊 Tempo médio: ${average.toFixed(2)}ms`);
        }
        console.log('');
    }
}

// Função principal
async function main() {
    const args = process.argv.slice(2);
    const baseUrl = args[0] || 'http://localhost:3000';

    const tester = new AdminPanelTester(baseUrl);

    // Verificar se server está rodando primeiro
    try {
        await axios.get(`${baseUrl}/health`, { timeout: 3000 });
    } catch (error) {
        console.log('❌ Servidor não está respondendo!');
        console.log('💡 Certifique-se de que o TempBot está rodando:');
        console.log('   npm start');
        console.log('');
        process.exit(1);
    }

    await tester.runAllTests();

    // Teste de performance opcional
    if (args.includes('--performance')) {
        console.log('\n⚡ TESTES DE PERFORMANCE');
        console.log('='.repeat(50));
        await tester.testEndpointPerformance('/admin/stats');
        await tester.testEndpointPerformance('/admin/users');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Erro no teste:', error.message);
        process.exit(1);
    });
}

module.exports = AdminPanelTester;
