/**
 * Teste para verificar se as tabelas admin estão criadas
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function testDatabaseSetup() {
    console.log('🔍 Verificando estrutura da base de dados...\n');

    try {
        // Testar se a tabela admin_users existe
        console.log('📋 Verificando tabela admin_users...');
        const { data: users, error: usersError } = await supabase
            .from('admin_users')
            .select('id, username, role, active')
            .limit(5);

        if (usersError) {
            console.log('❌ Tabela admin_users não encontrada:', usersError.message);
            console.log('📝 Execute o script SQL em database/admin_users.sql no Supabase');
            return false;
        }

        console.log('✅ Tabela admin_users existe');
        console.log('👥 Utilizadores encontrados:', users.length);

        if (users.length > 0) {
            console.log('📊 Utilizadores registados:');
            users.forEach(user => {
                console.log(`   - ${user.username} (${user.role}) - ${user.active ? 'Ativo' : 'Inativo'}`);
            });
        } else {
            console.log('⚠️  Nenhum utilizador admin encontrado');
        }

        // Testar se a tabela admin_login_history existe
        console.log('\n📋 Verificando tabela admin_login_history...');
        const { data: history, error: historyError } = await supabase
            .from('admin_login_history')
            .select('id')
            .limit(1);

        if (historyError) {
            console.log('❌ Tabela admin_login_history não encontrada:', historyError.message);
        } else {
            console.log('✅ Tabela admin_login_history existe');
        }

        // Testar se a tabela admin_audit_log existe
        console.log('\n📋 Verificando tabela admin_audit_log...');
        const { data: audit, error: auditError } = await supabase
            .from('admin_audit_log')
            .select('id')
            .limit(1);

        if (auditError) {
            console.log('❌ Tabela admin_audit_log não encontrada:', auditError.message);
        } else {
            console.log('✅ Tabela admin_audit_log existe');
        }

        return !usersError && !historyError && !auditError;

    } catch (error) {
        console.error('❌ Erro ao verificar base de dados:', error);
        return false;
    }
}

// Executar teste
testDatabaseSetup().then(success => {
    if (success) {
        console.log('\n🎉 Base de dados está configurada corretamente!');
        console.log('🔐 Pode fazer login com:');
        console.log('   - admin / admin123');
        console.log('   - moderator / mod123');
    } else {
        console.log('\n⚠️  Base de dados precisa ser configurada');
        console.log('📋 Execute o SQL em: database/admin_users.sql');
    }
    process.exit(0);
});
