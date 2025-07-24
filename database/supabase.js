// database/supabase.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!this.supabaseUrl || !this.supabaseServiceKey) {
            throw new Error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env');
        }

        this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
        console.log('✅ Supabase conectado com sucesso');
    }

    // ===============================================
    // GESTÃO DE USUÁRIOS
    // ===============================================

    async getUserByContact(contact) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('contact', contact)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('❌ Erro ao buscar usuário:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('❌ Erro ao buscar usuário:', error);
            return null;
        }
    }

    async saveOrUpdateAdvancedUser(contact, updates = {}) {
        try {
            const existingUser = await this.getUserByContact(contact);
            const timestamp = new Date().toISOString();

            if (existingUser) {
                // Usuário existente - atualizar
                const updatedData = {
                    ...updates,
                    last_access: timestamp,
                    query_count: (existingUser.query_count || 0) + 1
                };

                const { data, error } = await this.supabase
                    .from('users')
                    .update(updatedData)
                    .eq('contact', contact)
                    .select()
                    .single();

                if (error) {
                    console.error('❌ Erro ao atualizar usuário:', error);
                    return null;
                }

                console.log('✅ Usuário atualizado:', contact);
                return data;

            } else {
                // Novo usuário - criar perfil completo
                const newUser = {
                    contact,
                    preferred_city: null,
                    units: 'celsius',
                    language: 'pt',
                    notifications: false,
                    query_count: 1,
                    expertise_level: 'basic',
                    preferred_complexity: 'basic',
                    conversation_history: [],
                    last_city: null,
                    preferred_notification_time: '08:00',
                    weather_preferences: {
                        aspects: ['temperatura', 'chuva'],
                        timeframes: ['hoje', 'amanha'],
                        cities: []
                    },
                    profile_data: {
                        age: null,
                        occupation: null,
                        interests: []
                    },
                    created_at: timestamp,
                    last_access: timestamp,
                    weather_history: [],
                    ...updates
                };

                const { data, error } = await this.supabase
                    .from('users')
                    .insert([newUser])
                    .select()
                    .single();

                if (error) {
                    console.error('❌ Erro ao criar usuário:', error);
                    return null;
                }

                console.log('🆕 Novo usuário criado:', contact);
                return data;
            }

        } catch (error) {
            console.error('❌ Erro ao salvar usuário:', error);
            return null;
        }
    }

    async saveConversationContext(contact, message, analysis, response) {
        try {
            const user = await this.getUserByContact(contact);
            if (!user) return false;

            // Preparar novo item do histórico
            const newHistoryItem = {
                timestamp: new Date().toISOString(),
                message: message,
                intent: analysis.intent,
                city: analysis.city,
                type: analysis.type,
                expertise_level: analysis.expertiseLevel,
                response_length: response?.length || 0
            };

            // Obter histórico atual e adicionar novo item
            let conversationHistory = user.conversation_history || [];
            conversationHistory.push(newHistoryItem);

            // Manter apenas últimas 10 interações
            if (conversationHistory.length > 10) {
                conversationHistory = conversationHistory.slice(-10);
            }

            // Preparar atualizações
            const updates = {
                conversation_history: conversationHistory,
                last_city: analysis.city || user.last_city,
                last_access: new Date().toISOString()
            };

            // Atualizar expertise automaticamente
            const expertiseUpdate = this.calculateExpertiseLevel(user.query_count || 0, analysis);
            if (expertiseUpdate) {
                updates.expertise_level = expertiseUpdate;
            }

            // Atualizar preferências
            const preferencesUpdate = this.updateUserPreferences(user.weather_preferences, analysis);
            if (preferencesUpdate) {
                updates.weather_preferences = preferencesUpdate;
            }

            // Salvar no banco
            const { data, error } = await this.supabase
                .from('users')
                .update(updates)
                .eq('contact', contact)
                .select()
                .single();

            if (error) {
                console.error('❌ Erro ao salvar contexto:', error);
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ Erro ao salvar contexto da conversa:', error);
            return false;
        }
    }

    async saveAdvancedWeatherHistory(contact, weatherData, analysis) {
        try {
            const user = await this.getUserByContact(contact);
            if (!user) return false;

            // Preparar novo item do histórico meteorológico
            const newWeatherItem = {
                timestamp: new Date().toISOString(),
                city: weatherData.city,
                temperature: weatherData.temperature,
                conditions: weatherData.description,
                humidity: weatherData.humidity,
                feels_like: weatherData.feelsLike,
                query_type: analysis.type,
                expertise_level: analysis.expertiseLevel
            };

            // Obter histórico atual
            let weatherHistory = user.weather_history || [];
            weatherHistory.push(newWeatherItem);

            // Manter últimas 20 entradas
            if (weatherHistory.length > 20) {
                weatherHistory = weatherHistory.slice(-20);
            }

            // Atualizar no banco
            const { data, error } = await this.supabase
                .from('users')
                .update({
                    weather_history: weatherHistory,
                    last_access: new Date().toISOString()
                })
                .eq('contact', contact)
                .select()
                .single();

            if (error) {
                console.error('❌ Erro ao salvar histórico meteorológico:', error);
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ Erro ao salvar histórico meteorológico:', error);
            return false;
        }
    }

    // ===============================================
    // MÉTODOS DE ANÁLISE E ATUALIZAÇÃO
    // ===============================================

    calculateExpertiseLevel(queryCount, analysis) {
        // Lógica de progressão automática
        if (queryCount >= 3 && queryCount < 10) {
            return 'intermediate';
        } else if (queryCount >= 10) {
            return 'advanced';
        }

        // Override baseado em feedback da IA
        if (analysis.userProfile?.updateExpertise === 'aumentar') {
            const levels = ['basic', 'intermediate', 'advanced'];
            const currentIndex = levels.indexOf(analysis.expertiseLevel);
            if (currentIndex < levels.length - 1) {
                return levels[currentIndex + 1];
            }
        }

        return null; // Sem mudança
    }

    updateUserPreferences(currentPreferences, analysis) {
        const prefs = currentPreferences || { aspects: [], timeframes: [], cities: [] };

        let updated = false;

        // Rastrear aspectos mais perguntados
        if (analysis.context?.weatherAspect && !prefs.aspects.includes(analysis.context.weatherAspect)) {
            prefs.aspects.push(analysis.context.weatherAspect);
            updated = true;
        }

        // Rastrear timeframes
        if (analysis.context?.timeframe && !prefs.timeframes.includes(analysis.context.timeframe)) {
            prefs.timeframes.push(analysis.context.timeframe);
            updated = true;
        }

        // Rastrear cidades
        if (analysis.city) {
            const cityIndex = prefs.cities.findIndex(c => c.name === analysis.city);
            if (cityIndex >= 0) {
                prefs.cities[cityIndex].count++;
                updated = true;
            } else {
                prefs.cities.push({ name: analysis.city, count: 1 });
                updated = true;
            }

            // Ordenar por frequência
            prefs.cities.sort((a, b) => b.count - a.count);
        }

        return updated ? prefs : null;
    }

    // ===============================================
    // MÉTODOS DE CONSULTA AVANÇADA
    // ===============================================

    async getAllUsers() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('last_access', { ascending: false });

            if (error) {
                console.error('❌ Erro ao buscar todos os usuários:', error);
                return [];
            }

            return data;
        } catch (error) {
            console.error('❌ Erro ao buscar todos os usuários:', error);
            return [];
        }
    }

    async getUsersByCity(city) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .or(`preferred_city.eq.${city},last_city.eq.${city}`)
                .order('last_access', { ascending: false });

            if (error) {
                console.error('❌ Erro ao buscar usuários por cidade:', error);
                return [];
            }

            return data;
        } catch (error) {
            console.error('❌ Erro ao buscar usuários por cidade:', error);
            return [];
        }
    }

    async getUsersWithNotifications() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('notifications', true)
                .order('last_access', { ascending: false });

            if (error) {
                console.error('❌ Erro ao buscar usuários com notificações:', error);
                return [];
            }

            return data;
        } catch (error) {
            console.error('❌ Erro ao buscar usuários com notificações:', error);
            return [];
        }
    }

    async getActiveUsers(days = 7) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .gte('last_access', cutoffDate.toISOString())
                .order('last_access', { ascending: false });

            if (error) {
                console.error('❌ Erro ao buscar usuários ativos:', error);
                return [];
            }

            return data;
        } catch (error) {
            console.error('❌ Erro ao buscar usuários ativos:', error);
            return [];
        }
    }

    // ===============================================
    // MÉTODOS DE ESTATÍSTICAS
    // ===============================================

    async getStats() {
        try {
            const { count: totalUsers, error: countError } = await this.supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            if (countError) {
                console.error('❌ Erro ao contar usuários:', countError);
                return null;
            }

            const activeUsers = await this.getActiveUsers(7);
            const usersWithNotifications = await this.getUsersWithNotifications();

            // Consultas totais
            const { data: queryData, error: queryError } = await this.supabase
                .from('users')
                .select('query_count');

            let totalQueries = 0;
            if (!queryError && queryData) {
                totalQueries = queryData.reduce((sum, user) => sum + (user.query_count || 0), 0);
            }

            return {
                totalUsers,
                activeUsers: activeUsers.length,
                usersWithNotifications: usersWithNotifications.length,
                totalQueries,
                averageQueriesPerUser: totalUsers > 0 ? Math.round(totalQueries / totalUsers) : 0
            };

        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return null;
        }
    }

    // ===============================================
    // MÉTODOS UTILITÁRIOS
    // ===============================================

    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('count', { count: 'exact', head: true });

            if (error) {
                console.error('❌ Erro no teste de conexão:', error);
                return false;
            }

            console.log('✅ Conexão com Supabase OK');
            return true;

        } catch (error) {
            console.error('❌ Erro no teste de conexão:', error);
            return false;
        }
    }

    async createTablesIfNotExists() {
        // Este método seria usado numa migração inicial
        // As tabelas devem ser criadas pelo painel do Supabase
        console.log('ℹ️ Certifique-se de que a tabela "users" existe no Supabase');
        return true;
    }

    // ===============================================
    // MIGRAÇÃO DE DADOS (OPCIONAL)
    // ===============================================

    async migrateFromJSON(jsonData) {
        try {
            console.log('🔄 Iniciando migração de dados JSON para Supabase...');

            for (const user of jsonData) {
                // Converter campos do JSON para o formato do Supabase
                const supabaseUser = {
                    contact: user.contact,
                    preferred_city: user.preferredCity,
                    units: user.units,
                    language: user.language,
                    notifications: user.notifications,
                    query_count: user.queryCount,
                    expertise_level: user.expertiseLevel,
                    preferred_complexity: user.preferredComplexity,
                    conversation_history: user.conversationHistory,
                    last_city: user.lastCity,
                    preferred_notification_time: user.preferredNotificationTime,
                    weather_preferences: user.weatherPreferences,
                    profile_data: user.profileData,
                    last_access: user.last_access,
                    weather_history: user.weatherHistory || [],
                    created_at: user.last_access // Assumir que last_access é quando foi criado
                };

                const { error } = await this.supabase
                    .from('users')
                    .upsert([supabaseUser], { onConflict: 'contact' });

                if (error) {
                    console.error(`❌ Erro ao migrar usuário ${user.contact}:`, error);
                } else {
                    console.log(`✅ Usuário migrado: ${user.contact}`);
                }
            }

            console.log('✅ Migração concluída!');
            return true;

        } catch (error) {
            console.error('❌ Erro na migração:', error);
            return false;
        }
    }
}

module.exports = SupabaseService;