// Teste directo das rotas admin
async function testAdminRoutes() {
    try {
        // Fazer login primeiro
        console.log('🔐 Fazendo login...');
        const loginResponse = await fetch('/admin/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginResult = await loginResponse.json();
        console.log('✅ Login resultado:', loginResult);

        if (!loginResult.success) {
            console.error('❌ Erro no login');
            return;
        }

        const token = loginResult.data.token;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // Testar rota de admin users
        console.log('👥 Testando /admin/auth/users...');
        const usersResponse = await fetch('/admin/auth/users', { headers });
        const usersResult = await usersResponse.json();
        console.log('📊 Users resultado:', usersResult);

        // Testar rota de logs
        console.log('📋 Testando /admin/logs...');
        const logsResponse = await fetch('/admin/logs', { headers });
        const logsResult = await logsResponse.json();
        console.log('📝 Logs resultado:', logsResult);

        // Tentar carregar na tabela
        if (usersResult.success && usersResult.data) {
            const tbody = document.getElementById('adminUsersTable');
            if (tbody) {
                tbody.innerHTML = usersResult.data.map(user => `
                    <tr>
                        <td><span class="badge bg-${user.status === 'active' ? 'success' : 'secondary'}">${user.status}</span></td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.full_name}</td>
                        <td><span class="badge bg-primary">${user.role}</span></td>
                        <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Nunca'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary me-1">✏️</button>
                            <button class="btn btn-sm btn-outline-danger">🗑️</button>
                        </td>
                    </tr>
                `).join('');
                console.log('✅ Tabela de usuários preenchida');
            }
        }

        // Tentar carregar logs
        if (logsResult.success && logsResult.data) {
            const container = document.getElementById('logsContainer');
            if (container) {
                container.innerHTML = logsResult.data.map(log => `
                    <div class="log-entry mb-2 p-2 border-start border-3 border-info">
                        <strong>[${new Date(log.created_at).toLocaleString()}]</strong> 
                        <span class="badge bg-info">${log.level}</span>
                        <br>
                        ${log.message}
                    </div>
                `).join('');
                console.log('✅ Logs carregados');
            }
        }

    } catch (error) {
        console.error('❌ Erro nos testes:', error);
    }
}

// Executar teste quando página carregare
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testAdminRoutes);
} else {
    testAdminRoutes();
}

// Também disponibilizar para teste manual
window.testAdminRoutes = testAdminRoutes;
