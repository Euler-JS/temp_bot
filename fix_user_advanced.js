const SupabaseService = require('./database/supabase');

async function fixUserAdvanced() {
    try {
        const supabaseService = new SupabaseService();

        console.log('🔄 Atualizando usuário 258846151124 para expertise_level: advanced');

        const updateResult = await supabaseService.supabase
            .from('users')
            .update({
                expertise_level: 'advanced',
                preferred_complexity: 'advanced'  // Garantir consistência
            })
            .eq('contact', '258846151124');

        if (updateResult.error) {
            console.error('❌ Erro ao atualizar:', updateResult.error);
        } else {
            console.log('✅ Usuário atualizado com sucesso!');

            // Verificar se foi realmente atualizado
            const updatedUser = await supabaseService.getUserByContact('258846151124');
            console.log('🎯 Verificação:');
            console.log('- expertise_level:', updatedUser?.expertise_level);
            console.log('- preferred_complexity:', updatedUser?.preferred_complexity);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

fixUserAdvanced().then(() => {
    console.log('\n✅ Correção completa');
    process.exit(0);
});
