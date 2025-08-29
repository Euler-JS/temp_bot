// test_admin_routes.js
// Teste das rotas do painel administrativo

const http = require('http');

function testRoute(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            resolve({
                path: path,
                status: res.statusCode,
                contentType: res.headers['content-type']
            });
        });

        req.on('error', (error) => {
            reject({ path: path, error: error.message });
        });

        req.setTimeout(5000, () => {
            req.destroy();
            reject({ path: path, error: 'Timeout' });
        });

        req.end();
    });
}

async function testAdminRoutes() {
    console.log('🧪 Testando rotas do painel administrativo...\n');

    const routes = [
        '/admin',
        '/admin.js',
        '/admin/admin.js',
        '/admin/stats',
        '/admin/weather-stats'
    ];

    for (const route of routes) {
        try {
            const result = await testRoute(route);
            const statusEmoji = result.status === 200 ? '✅' : '❌';
            console.log(`${statusEmoji} ${route}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Content-Type: ${result.contentType}`);
            console.log('');
        } catch (error) {
            console.log(`❌ ${route}`);
            console.log(`   Erro: ${error.error}`);
            console.log('');
        }
    }

    console.log('🎉 Teste concluído!');
    console.log('📝 Se todas as rotas mostrarem ✅, o deploy deve funcionar no Vercel.');
}

testAdminRoutes();
