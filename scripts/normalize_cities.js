// scripts/normalize_cities.js
// Script para normalizar nomes de cidades já existentes no banco

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Normaliza nomes de cidades para evitar duplicações
 */
function normalizeCityName(cityName) {
    if (!cityName || typeof cityName !== 'string') {
        return 'Não definido';
    }

    // Remove espaços extras, converte para lowercase e depois capitaliza primeira letra
    const normalized = cityName
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, letter => letter.toUpperCase());

    return normalized || 'Não definido';
}

async function normalizeExistingCities() {
    console.log('🔄 Iniciando normalização de cidades existentes...');

    try {
        // 1. Buscar todos os usuários
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, contact, preferred_city, last_city');

        if (usersError) {
            console.error('❌ Erro ao buscar usuários:', usersError);
            return;
        }

        console.log(`📊 Encontrados ${users.length} usuários para normalizar`);

        let updatedCount = 0;
        const cityMapping = new Map();

        // 2. Processar cada usuário
        for (const user of users) {
            let needsUpdate = false;
            const updates = {};

            // Normalizar preferred_city
            if (user.preferred_city) {
                const normalizedPreferred = normalizeCityName(user.preferred_city);
                if (normalizedPreferred !== user.preferred_city) {
                    updates.preferred_city = normalizedPreferred;
                    needsUpdate = true;

                    // Mapear mudança
                    cityMapping.set(user.preferred_city, normalizedPreferred);
                    console.log(`   📍 ${user.contact}: "${user.preferred_city}" -> "${normalizedPreferred}"`);
                }
            }

            // Normalizar last_city
            if (user.last_city) {
                const normalizedLast = normalizeCityName(user.last_city);
                if (normalizedLast !== user.last_city) {
                    updates.last_city = normalizedLast;
                    needsUpdate = true;

                    // Mapear mudança
                    cityMapping.set(user.last_city, normalizedLast);
                    console.log(`   📍 ${user.contact}: "${user.last_city}" -> "${normalizedLast}"`);
                }
            }

            // 3. Atualizar se necessário
            if (needsUpdate) {
                const { error: updateError } = await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', user.id);

                if (updateError) {
                    console.error(`❌ Erro ao atualizar usuário ${user.contact}:`, updateError);
                } else {
                    updatedCount++;
                }
            }
        }

        // 4. Atualizar alertas também
        console.log('\n🔄 Normalizando regiões em alertas...');

        const { data: alerts, error: alertsError } = await supabase
            .from('admin_alerts')
            .select('id, target_region');

        if (alertsError) {
            console.error('❌ Erro ao buscar alertas:', alertsError);
        } else {
            for (const alert of alerts) {
                if (alert.target_region && alert.target_region !== 'all') {
                    const normalizedRegion = normalizeCityName(alert.target_region);
                    if (normalizedRegion !== alert.target_region) {
                        const { error: updateAlertError } = await supabase
                            .from('admin_alerts')
                            .update({ target_region: normalizedRegion })
                            .eq('id', alert.id);

                        if (!updateAlertError) {
                            console.log(`   🚨 Alerta: "${alert.target_region}" -> "${normalizedRegion}"`);
                        }
                    }
                }
            }
        }

        // 5. Recrear a view para aplicar a normalização
        console.log('\n🔄 Atualizando view users_by_region...');

        const viewSQL = `
            CREATE OR REPLACE VIEW users_by_region AS
            SELECT 
                INITCAP(LOWER(TRIM(COALESCE(preferred_city, last_city, 'Não definido')))) as region,
                COUNT(*) as user_count,
                COUNT(CASE WHEN last_access >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users,
                AVG(query_count) as avg_queries,
                MAX(last_access) as last_activity
            FROM users 
            GROUP BY INITCAP(LOWER(TRIM(COALESCE(preferred_city, last_city, 'Não definido'))))
            ORDER BY user_count DESC;
        `;

        const { error: viewError } = await supabase.rpc('exec_sql', { sql: viewSQL });

        if (viewError) {
            console.error('❌ Erro ao atualizar view:', viewError);
        } else {
            console.log('✅ View users_by_region atualizada');
        }

        // 6. Resumo
        console.log('\n📊 Resumo da normalização:');
        console.log(`✅ Usuários atualizados: ${updatedCount}/${users.length}`);
        console.log(`📍 Cidades normalizadas:`);

        const uniqueCities = new Map();
        cityMapping.forEach((normalized, original) => {
            if (!uniqueCities.has(normalized)) {
                uniqueCities.set(normalized, []);
            }
            uniqueCities.get(normalized).push(original);
        });

        uniqueCities.forEach((originals, normalized) => {
            if (originals.length > 1) {
                console.log(`   "${normalized}": [${originals.join(', ')}]`);
            }
        });

        console.log('\n🎉 Normalização concluída com sucesso!');
        console.log('🌐 Recarregue o painel administrativo para ver as mudanças');

    } catch (error) {
        console.error('❌ Erro na normalização:', error);
    }
}

// Função para mostrar apenas as duplicações sem alterar
async function checkDuplicates() {
    console.log('🔍 Verificando duplicações de cidades...');

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('preferred_city, last_city');

        if (error) {
            console.error('❌ Erro ao buscar usuários:', error);
            return;
        }

        const cities = new Set();
        const duplicates = new Map();

        users.forEach(user => {
            [user.preferred_city, user.last_city].forEach(city => {
                if (city) {
                    const normalized = normalizeCityName(city);
                    if (!duplicates.has(normalized)) {
                        duplicates.set(normalized, new Set());
                    }
                    duplicates.get(normalized).add(city);
                }
            });
        });

        console.log('\n📊 Cidades que serão unificadas:');
        duplicates.forEach((variants, normalized) => {
            if (variants.size > 1) {
                console.log(`"${normalized}": [${Array.from(variants).join(', ')}]`);
            }
        });

    } catch (error) {
        console.error('❌ Erro na verificação:', error);
    }
}

// Executar baseado no argumento
const command = process.argv[2];

if (command === 'check') {
    checkDuplicates();
} else {
    normalizeExistingCities();
}
