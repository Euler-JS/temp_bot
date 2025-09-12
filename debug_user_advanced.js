const SupabaseService = require('./database/supabase');

async function debugUserAdvanced() {
    try {
        const supabaseService = new SupabaseService();
        const user = await supabaseService.getUserByContact('258846151124');
        console.log('🔍 Usuário 258846151124 completo:');
        console.log(JSON.stringify(user, null, 2));

        console.log('\n🎯 Campos específicos relevantes:');
        console.log('user.expertise_level:', user?.expertise_level);
        console.log('user.expertiseLevel:', user?.expertiseLevel);

        // Testar como seria passado para a AI
        const contextPassedToAI = {
            ...user,
            conversationHistory: user?.conversation_history || []
        };

        console.log('\n🤖 Contexto que seria passado para AI:');
        console.log('contextPassedToAI.expertise_level:', contextPassedToAI?.expertise_level);
        console.log('contextPassedToAI.expertiseLevel:', contextPassedToAI?.expertiseLevel);

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

debugUserAdvanced().then(() => {
    console.log('\n✅ Debug completo');
    process.exit(0);
});
