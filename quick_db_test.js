/**
 * Teste rápido da base de dados admin (sem servidor)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function quickTest() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    try {
        const { data, error } = await supabase
            .from('admin_users')
            .select('username, role')
            .limit(3);

        if (error) {
            console.log('❌ Tabelas admin não existem. Execute o SQL schema.');
            console.log('Error:', error.message);
        } else {
            console.log('✅ Base de dados OK!');
            console.log('👥 Users:', data);
        }
    } catch (err) {
        console.log('❌ Erro:', err.message);
    }

    process.exit(0);
}

quickTest();
