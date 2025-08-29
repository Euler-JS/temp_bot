// scripts/setup_admin_tables.js - Script para criar tabelas administrativas no Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class AdminTablesSetup {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!this.supabaseUrl || !this.supabaseServiceKey) {
            throw new Error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env');
        }

        this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
        console.log('✅ Conectado ao Supabase');
    }

    async setupTables() {
        try {
            console.log('🔧 Configurando tabelas administrativas...\n');

            // Ler script SQL
            const sqlPath = path.join(__dirname, '..', 'database', 'admin_tables.sql');
            const sqlScript = fs.readFileSync(sqlPath, 'utf8');

            // Dividir em comandos individuais
            const commands = sqlScript
                .split(';')
                .map(cmd => cmd.trim())
                .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

            let successCount = 0;
            let errorCount = 0;

            for (const command of commands) {
                try {
                    if (command.toLowerCase().includes('create table') ||
                        command.toLowerCase().includes('create index') ||
                        command.toLowerCase().includes('create extension') ||
                        command.toLowerCase().includes('insert into') ||
                        command.toLowerCase().includes('create or replace')) {

                        console.log(`⏳ Executando: ${command.substring(0, 50)}...`);

                        const { error } = await this.supabase.rpc('exec_sql', { sql: command });

                        if (error) {
                            console.log(`❌ Erro: ${error.message}`);
                            errorCount++;
                        } else {
                            console.log(`✅ Sucesso`);
                            successCount++;
                        }
                    }
                } catch (error) {
                    console.log(`❌ Erro no comando: ${error.message}`);
                    errorCount++;
                }
            }

            console.log(`\n📊 RESULTADO:`);
            console.log(`✅ Sucessos: ${successCount}`);
            console.log(`❌ Erros: ${errorCount}`);

            if (errorCount === 0) {
                console.log('\n🎉 Todas as tabelas foram criadas com sucesso!');
                await this.verifyTables();
            } else {
                console.log('\n⚠️ Alguns comandos falharam. Verifique os erros acima.');
            }

        } catch (error) {
            console.error('❌ Erro geral na configuração:', error);
        }
    }

    async verifyTables() {
        try {
            console.log('\n🔍 Verificando tabelas criadas...');

            const tables = ['admin_alerts', 'alert_deliveries', 'admin_logs', 'admin_settings'];

            for (const table of tables) {
                const { data, error } = await this.supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.log(`❌ Tabela ${table}: ${error.message}`);
                } else {
                    console.log(`✅ Tabela ${table}: OK`);
                }
            }

            // Verificar views
            console.log('\n🔍 Verificando views...');
            const views = ['users_by_region', 'recent_alerts_summary'];

            for (const view of views) {
                try {
                    const { data, error } = await this.supabase
                        .from(view)
                        .select('*', { count: 'exact', head: true });

                    if (error) {
                        console.log(`❌ View ${view}: ${error.message}`);
                    } else {
                        console.log(`✅ View ${view}: OK`);
                    }
                } catch (error) {
                    console.log(`❌ View ${view}: ${error.message}`);
                }
            }

        } catch (error) {
            console.error('❌ Erro na verificação:', error);
        }
    }

    async seedTestData() {
        try {
            console.log('\n🌱 Inserindo dados de teste...');

            // Inserir alerta de teste
            const { error: alertError } = await this.supabase
                .from('admin_alerts')
                .insert([
                    {
                        title: 'Teste do Sistema',
                        message: 'Este é um alerta de teste para verificar o funcionamento do sistema.',
                        alert_type: 'informacao',
                        target_region: 'all',
                        include_weather: false,
                        users_count: 0,
                        delivery_status: 'completed'
                    }
                ]);

            if (alertError) {
                console.log(`❌ Erro ao inserir alerta de teste: ${alertError.message}`);
            } else {
                console.log(`✅ Alerta de teste inserido`);
            }

            // Inserir log de teste
            const { error: logError } = await this.supabase
                .from('admin_logs')
                .insert([
                    {
                        level: 'info',
                        message: 'Sistema administrativo configurado com sucesso',
                        module: 'setup'
                    }
                ]);

            if (logError) {
                console.log(`❌ Erro ao inserir log de teste: ${logError.message}`);
            } else {
                console.log(`✅ Log de teste inserido`);
            }

        } catch (error) {
            console.error('❌ Erro ao inserir dados de teste:', error);
        }
    }
}

// Função principal
async function main() {
    try {
        const setup = new AdminTablesSetup();
        await setup.setupTables();

        // Perguntar se quer inserir dados de teste
        const args = process.argv.slice(2);
        if (args.includes('--seed')) {
            await setup.seedTestData();
        }

        console.log('\n🎉 Configuração concluída!');
        console.log('💡 Para inserir dados de teste, execute: npm run setup:admin -- --seed');

    } catch (error) {
        console.error('❌ Erro na configuração:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = AdminTablesSetup;
