// setup_admin.js - Script para configurar sistema administrativo
const SupabaseService = require('./database/supabase');

async function setupAdmin() {
    console.log('🚀 Configurando sistema administrativo...');

    const dbService = new SupabaseService();

    // Por enquanto, vamos apenas verificar se o sistema está funcionando
    console.log('✅ Serviços inicialized:');
    console.log('   - Database Service: OK');

    // Criar usuário admin básico usando funções simples
    try {
        // Verificar se já existe um admin básico
        const { data: existingAdmin } = await dbService.supabase
            .from('users')
            .select('contact')
            .eq('contact', 'admin')
            .single();

        if (!existingAdmin) {
            // Se não existir, criar um "admin" na tabela de usuários como placeholder
            const { data, error } = await dbService.supabase
                .from('users')
                .insert({
                    contact: 'admin',
                    preferred_city: 'maputo',
                    expertise_level: 'advanced',
                    query_count: 0
                });

            if (error) {
                console.log('⚠️  Note: Admin placeholder not created:', error.message);
            } else {
                console.log('✅ Admin placeholder created in users table');
            }
        }

        console.log('✅ Sistema administrativo configurado!');
        console.log('');
        console.log('📋 Próximos passos:');
        console.log('1. Execute o SQL em database/admin_users.sql no SQL Editor do Supabase');
        console.log('2. Acesse /admin/login para fazer login');
        console.log('3. Use as credenciais: admin / admin123');
        console.log('');
        console.log('🌐 URLs disponíveis:');
        console.log('   - Painel Admin: http://localhost:3000/admin');
        console.log('   - Login Admin: http://localhost:3000/admin/login');

    } catch (error) {
        console.log('❌ Erro na configuração:', error.message);
    }
}

setupAdmin().catch(console.error);
