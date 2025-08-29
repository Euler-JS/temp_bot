// test_health_api.js
// Teste simples para verificar a API de health

const http = require('http');

function testHealthAPI() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/health',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (error) {
                    resolve({ status: res.statusCode, error: 'Invalid JSON', data: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

async function testHealth() {
    console.log('🔧 Testando API de Health Check...\n');

    try {
        const result = await testHealthAPI();

        console.log('✅ Status Code:', result.status);
        console.log('📊 Resposta:', JSON.stringify(result.data, null, 2));

        if (result.data && result.data.services) {
            console.log('\n🔍 Status dos Serviços:');
            console.log(`  Database: ${result.data.services.database}`);
            console.log(`  OpenAI: ${result.data.services.openai}`);
            console.log(`  WhatsApp: ${result.data.services.whatsapp}`);
        }

    } catch (error) {
        console.error('❌ Erro ao testar health API:', error.message);
    }
}

testHealth();
