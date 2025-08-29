// test_alerts_api.js
// Teste rápido da API de alertas

const fetch = require('node-fetch');

async function testAlertsAPI() {
    console.log('🧪 Testando API de Alertas...');

    try {
        // Testar usuários por região
        console.log('\n1️⃣ Testando /admin/users-by-region...');
        const usersResponse = await fetch('http://localhost:3000/admin/users-by-region');
        const usersData = await usersResponse.json();
        console.log('✅ Usuários por região:', usersData);

        // Testar alertas recentes
        console.log('\n2️⃣ Testando /admin/recent-alerts...');
        const alertsResponse = await fetch('http://localhost:3000/admin/recent-alerts');
        const alertsData = await alertsResponse.json();
        console.log('✅ Alertas recentes:', alertsData);

        if (alertsData.success && alertsData.data.length > 0) {
            console.log(`\n📊 Encontrados ${alertsData.data.length} alertas:`);
            alertsData.data.forEach((alert, index) => {
                console.log(`   ${index + 1}. ${alert.title} (${alert.alert_type})`);
            });
        } else {
            console.log('\n⚠️ Nenhum alerta encontrado ou erro na resposta');
        }

    } catch (error) {
        console.error('❌ Erro ao testar API:', error.message);
    }
}

testAlertsAPI();
