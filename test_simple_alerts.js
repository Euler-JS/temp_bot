// test_simple_alerts.js
// Teste simples para verificar os alertas

const http = require('http');

function testEndpoint(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
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
                    resolve(jsonData);
                } catch (error) {
                    resolve({ error: 'Invalid JSON', data: data });
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

async function testAlerts() {
    console.log('🧪 Testando endpoints de alertas...\n');

    try {
        console.log('1️⃣ Testando /admin/recent-alerts...');
        const alertsResult = await testEndpoint('/admin/recent-alerts');
        console.log('✅ Resultado:', JSON.stringify(alertsResult, null, 2));

        if (alertsResult.success && alertsResult.data.length > 0) {
            console.log(`\n📊 Encontrados ${alertsResult.data.length} alertas:`);
            alertsResult.data.forEach((alert, index) => {
                console.log(`   ${index + 1}. ${alert.title} (${alert.alert_type}) - ${alert.target_region}`);
            });
        }

        console.log('\n2️⃣ Testando /admin/users-by-region...');
        const usersResult = await testEndpoint('/admin/users-by-region');
        console.log('✅ Resultado:', JSON.stringify(usersResult, null, 2));

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

testAlerts();
