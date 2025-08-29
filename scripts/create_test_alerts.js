// scripts/create_test_alerts.js
// Script para criar alertas de teste no sistema

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestAlerts() {
    console.log('🚀 Criando alertas de teste...');

    const testAlerts = [
        {
            title: 'Alerta de Teste - Chuva Forte',
            message: 'Previsão de chuva forte para as próximas 24 horas. Evite áreas de risco.',
            alert_type: 'meteorologico',
            target_region: 'Beira',
            include_weather: true,
            weather_data: { temperature: 25, humidity: 85, condition: 'rainy' },
            users_count: 15,
            delivery_status: 'completed'
        },
        {
            title: 'Aviso Importante - Manutenção',
            message: 'O sistema passará por manutenção programada amanhã das 02:00 às 04:00.',
            alert_type: 'aviso',
            target_region: 'all',
            include_weather: false,
            users_count: 45,
            delivery_status: 'completed'
        },
        {
            title: 'Alerta de Segurança - Zona de Risco',
            message: 'Evite a área próxima ao rio devido ao nível elevado das águas.',
            alert_type: 'seguranca',
            target_region: 'Maputo',
            include_weather: false,
            users_count: 8,
            delivery_status: 'completed'
        },
        {
            title: 'Informação - Nova Funcionalidade',
            message: 'Agora você pode receber alertas personalizados por região!',
            alert_type: 'informacao',
            target_region: 'all',
            include_weather: false,
            users_count: 67,
            delivery_status: 'completed'
        },
        {
            title: 'Urgente - Tempestade Severa',
            message: 'Tempestade severa aproximando-se. Procure abrigo imediatamente!',
            alert_type: 'urgente',
            target_region: 'Nampula',
            include_weather: true,
            weather_data: { temperature: 28, humidity: 90, condition: 'storm', wind_speed: 45 },
            users_count: 23,
            delivery_status: 'completed'
        }
    ];

    try {
        // Inserir alertas de teste
        const { data: alerts, error: alertError } = await supabase
            .from('admin_alerts')
            .insert(testAlerts)
            .select();

        if (alertError) {
            console.error('❌ Erro ao criar alertas:', alertError);
            return;
        }

        console.log(`✅ ${alerts.length} alertas de teste criados!`);

        // Criar algumas entregas de teste para cada alerta
        const deliveries = [];

        for (const alert of alerts) {
            const deliveryCount = Math.floor(Math.random() * alert.users_count) + 1;

            for (let i = 0; i < deliveryCount; i++) {
                deliveries.push({
                    alert_id: alert.id,
                    user_contact: `258${Math.floor(Math.random() * 900000000) + 100000000}`,
                    delivery_status: Math.random() > 0.1 ? 'sent' : 'failed',
                    error_message: Math.random() > 0.9 ? 'Timeout na entrega' : null
                });
            }
        }

        // Inserir entregas de teste
        const { data: deliveriesData, error: deliveryError } = await supabase
            .from('alert_deliveries')
            .insert(deliveries);

        if (deliveryError) {
            console.error('⚠️ Erro ao criar entregas:', deliveryError);
        } else {
            console.log(`✅ ${deliveries.length} entregas de teste criadas!`);
        }

        // Criar alguns logs de teste
        const logs = [
            {
                level: 'info',
                message: 'Alertas de teste criados com sucesso',
                module: 'admin_setup',
                metadata: { alerts_created: alerts.length, deliveries_created: deliveries.length }
            },
            {
                level: 'info',
                message: 'Sistema de alertas administrativos inicializado',
                module: 'alerts',
                metadata: { timestamp: new Date().toISOString() }
            }
        ];

        const { error: logError } = await supabase
            .from('admin_logs')
            .insert(logs);

        if (logError) {
            console.error('⚠️ Erro ao criar logs:', logError);
        } else {
            console.log('✅ Logs de teste criados!');
        }

        console.log('\n📊 Resumo dos dados de teste:');
        console.log(`- ${alerts.length} alertas criados`);
        console.log(`- ${deliveries.length} entregas simuladas`);
        console.log(`- ${logs.length} logs adicionados`);

        console.log('\n🌐 Acesse o painel em: http://localhost:3000/admin');
        console.log('📱 Seção "Alertas" deve mostrar os dados agora!');

    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

// Função para verificar dados existentes
async function checkExistingData() {
    console.log('🔍 Verificando dados existentes...');

    try {
        // Verificar alertas
        const { data: alerts, error: alertError } = await supabase
            .from('admin_alerts')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(5);

        if (alertError) {
            console.error('❌ Erro ao verificar alertas:', alertError);
        } else {
            console.log(`📢 Alertas encontrados: ${alerts.length}`);
            if (alerts.length > 0) {
                console.log('Últimos alertas:');
                alerts.forEach(alert => {
                    console.log(`  - ${alert.title} (${alert.alert_type})`);
                });
            }
        }

        // Verificar view de usuários por região
        const { data: usersByRegion, error: regionError } = await supabase
            .from('users_by_region')
            .select('*')
            .limit(5);

        if (regionError) {
            console.error('❌ Erro ao verificar usuários por região:', regionError);
        } else {
            console.log(`👥 Regiões com usuários: ${usersByRegion.length}`);
            if (usersByRegion.length > 0) {
                console.log('Regiões:');
                usersByRegion.forEach(region => {
                    console.log(`  - ${region.region}: ${region.user_count} usuários`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Erro na verificação:', error);
    }
}

// Executar baseado no argumento
const command = process.argv[2];

if (command === 'check') {
    checkExistingData();
} else {
    createTestAlerts();
}
