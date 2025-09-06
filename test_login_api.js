/**
 * Teste rápido da API de login
 */

async function testLoginAPI() {
    const API_BASE = 'http://localhost:3000';

    console.log('🧪 Testando API de login...\n');

    try {
        // Teste 1: Tentar login com credenciais corretas
        console.log('📡 Teste 1: Login com admin/admin123');
        const loginResponse = await fetch(`${API_BASE}/admin/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const loginResult = await loginResponse.json();
        console.log('📥 Status:', loginResponse.status);
        console.log('📄 Resposta:', JSON.stringify(loginResult, null, 2));

        if (loginResult.success && loginResult.data?.token) {
            console.log('✅ Login bem-sucedido!');

            // Teste 2: Verificar token
            console.log('\n📡 Teste 2: Verificação de token');
            const token = loginResult.data.token;

            const verifyResponse = await fetch(`${API_BASE}/admin/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const verifyResult = await verifyResponse.json();
            console.log('📥 Status verificação:', verifyResponse.status);
            console.log('📄 Resultado verificação:', JSON.stringify(verifyResult, null, 2));

            if (verifyResult.success) {
                console.log('✅ Token válido!');

                // Teste 3: Acessar rota protegida
                console.log('\n📡 Teste 3: Acesso à rota protegida');
                const protectedResponse = await fetch(`${API_BASE}/admin/users`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('📥 Status rota protegida:', protectedResponse.status);
                const protectedResult = await protectedResponse.text();
                console.log('📄 Resposta:', protectedResult.substring(0, 200) + '...');

                if (protectedResponse.status === 200) {
                    console.log('✅ Rota protegida acessível!');
                } else {
                    console.log('❌ Erro ao acessar rota protegida');
                }

            } else {
                console.log('❌ Token inválido');
            }

        } else {
            console.log('❌ Erro no login:', loginResult.error);
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

testLoginAPI();
