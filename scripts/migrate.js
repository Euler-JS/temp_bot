// scripts/migrate.js - Migração de users.json para Supabase
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const SupabaseService = require('../database/supabase');

async function migrate() {
    console.log('🚀 Iniciando migração de users.json para Supabase...\n');

    try {
        // 1. Verificar se o arquivo users.json existe
        const jsonPath = path.join(__dirname, '..', 'users.json');

        if (!fs.existsSync(jsonPath)) {
            console.log('❌ Arquivo users.json não encontrado.');
            console.log('💡 Se você não tem dados para migrar, pode pular este passo.\n');
            return;
        }

        // 2. Ler dados do JSON
        console.log('📖 Lendo dados do users.json...');
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        console.log(`✅ Encontrados ${jsonData.length} usuários no arquivo JSON\n`);

        // 3. Conectar ao Supabase
        console.log('🔌 Conectando ao Supabase...');
        const dbService = new SupabaseService();

        const connectionTest = await dbService.testConnection();
        if (!connectionTest) {
            console.log('❌ Falha na conexão com Supabase');
            console.log('💡 Verifique as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
            return;
        }
        console.log('✅ Conexão com Supabase estabelecida\n');

        // 4. Migrar dados
        console.log('📦 Iniciando migração dos dados...\n');

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < jsonData.length; i++) {
            const user = jsonData[i];

            try {
                console.log(`Migrando usuário ${i + 1}/${jsonData.length}: ${user.contact}`);

                // 5. Converter estrutura do JSON para Supabase
                const supabaseUser = convertJsonToSupabase(user);

                // 6. Inserir/atualizar no Supabase
                const result = await dbService.supabase
                    .from('users')
                    .upsert([supabaseUser], {
                        onConflict: 'contact',
                        ignoreDuplicates: false
                    })
                    .select()
                    .single();

                if (result.error) {
                    console.log(`❌ Erro ao migrar ${user.contact}:`, result.error.message);
                    errorCount++;
                } else {
                    console.log(`✅ Usuário ${user.contact} migrado com sucesso`);
                    successCount++;
                }

            } catch (error) {
                console.log(`❌ Erro ao processar ${user.contact}:`, error.message);
                errorCount++;
            }
        }

        // 7. Relatório final
        console.log('\n📊 RELATÓRIO DE MIGRAÇÃO:');
        console.log(`✅ Sucessos: ${successCount}`);
        console.log(`❌ Erros: ${errorCount}`);
        console.log(`📦 Total processado: ${jsonData.length}`);

        if (successCount > 0) {
            console.log('\n🎉 Migração concluída com sucesso!');

            // 8. Verificar dados migrados
            console.log('\n🔍 Verificando dados migrados...');
            const migratedUsers = await dbService.getAllUsers();
            console.log(`📊 Total de usuários no Supabase: ${migratedUsers.length}`);

            // 9. Opção de backup do JSON original
            console.log('\n💾 Criando backup do users.json original...');
            const backupPath = path.join(__dirname, '..', `users_backup_${Date.now()}.json`);
            fs.copyFileSync(jsonPath, backupPath);
            console.log(`✅ Backup criado: ${backupPath}`);

            console.log('\n⚠️  IMPORTANTE:');
            console.log('   • Verifique se os dados foram migrados corretamente');
            console.log('   • Teste o bot para garantir que está funcionando');
            console.log('   • Só remova o users.json depois de confirmar que tudo está OK');
        }

    } catch (error) {
        console.error('💥 Erro crítico na migração:', error);
        console.log('\n🔧 Passos para resolver:');
        console.log('1. Verifique se o arquivo .env está configurado corretamente');
        console.log('2. Confirme que a tabela users foi criada no Supabase');
        console.log('3. Teste a conexão com: npm run dev');
    }
}

function convertJsonToSupabase(jsonUser) {
    return {
        contact: jsonUser.contact,
        preferred_city: jsonUser.preferredCity,
        units: jsonUser.units || 'celsius',
        language: jsonUser.language || 'pt',
        notifications: jsonUser.notifications || false,
        query_count: jsonUser.queryCount || 0,
        expertise_level: jsonUser.expertiseLevel || 'basic',
        preferred_complexity: jsonUser.preferredComplexity || 'basic',
        conversation_history: jsonUser.conversationHistory || [],
        last_city: jsonUser.lastCity,
        preferred_notification_time: jsonUser.preferredNotificationTime || '08:00',
        weather_preferences: jsonUser.weatherPreferences || {
            aspects: ['temperatura', 'chuva'],
            timeframes: ['hoje', 'amanha'],
            cities: []
        },
        profile_data: jsonUser.profileData || {
            age: null,
            occupation: null,
            interests: []
        },
        weather_history: jsonUser.weatherHistory || [],
        last_access: jsonUser.last_access || new Date().toISOString(),
        created_at: jsonUser.last_access || new Date().toISOString()
    };
}

// Executar migração se chamado diretamente
if (require.main === module) {
    migrate().then(() => {
        console.log('\n👋 Migração finalizada. Pressione Ctrl+C para sair.');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = { migrate, convertJsonToSupabase };