// admin_auth.js - Sistema de Autenticação Administrativa
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class AdminAuthService {
    constructor(supabase) {
        this.supabase = supabase;
        this.JWT_SECRET = process.env.JWT_SECRET || 'tempbot-admin-secret-key';
        this.SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas
        this.MAX_LOGIN_ATTEMPTS = 5;
        this.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos
    }

    // ===============================================
    // AUTENTICAÇÃO
    // ===============================================

    async login(username, password, ipAddress, userAgent) {
        try {
            console.log('🔐 Tentativa de login admin:', { username, ipAddress });

            // Buscar usuário
            const { data: user, error } = await this.supabase
                .from('admin_users')
                .select('*')
                .eq('username', username)
                .eq('status', 'active')
                .single();

            if (error || !user) {
                await this.logLoginAttempt(null, ipAddress, userAgent, false, 'user_not_found');
                return { success: false, error: 'Credenciais inválidas' };
            }

            // Verificar se a conta está bloqueada
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
                return {
                    success: false,
                    error: `Conta bloqueada. Tente novamente em ${remainingTime} minutos.`
                };
            }

            // Verificar senha usando a função do banco
            const { data: passwordCheck } = await this.supabase
                .rpc('verify_password', {
                    password: password,
                    hash: user.password_hash
                });

            if (!passwordCheck) {
                await this.handleFailedLogin(user.id, ipAddress, userAgent);
                return { success: false, error: 'Credenciais inválidas' };
            }

            // Login bem-sucedido
            await this.handleSuccessfulLogin(user, ipAddress, userAgent);

            // Gerar JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    username: user.username,
                    role: user.role,
                    permissions: user.permissions
                },
                this.JWT_SECRET,
                { expiresIn: '8h' }
            );

            console.log('✅ Login admin bem-sucedido:', user.username);

            return {
                success: true,
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        full_name: user.full_name,
                        role: user.role,
                        permissions: user.permissions,
                        last_login: user.last_login
                    },
                    token: token
                }
            };

        } catch (error) {
            console.error('❌ Erro no login admin:', error);
            return { success: false, error: 'Erro interno do servidor' };
        }
    }

    async logout(userId, sessionToken) {
        try {
            // Remover token de sessão
            await this.supabase
                .from('admin_users')
                .update({
                    session_token: null,
                    session_expires: null
                })
                .eq('id', userId);

            console.log('👋 Logout admin realizado:', userId);
            return { success: true };

        } catch (error) {
            console.error('❌ Erro no logout admin:', error);
            return { success: false, error: error.message };
        }
    }

    async handleSuccessfulLogin(user, ipAddress, userAgent) {
        try {
            // Gerar token de sessão
            const sessionToken = crypto.randomBytes(32).toString('base64');
            const sessionExpires = new Date(Date.now() + this.SESSION_DURATION);

            // Atualizar usuário
            await this.supabase
                .from('admin_users')
                .update({
                    last_login: new Date().toISOString(),
                    login_attempts: 0,
                    locked_until: null,
                    session_token: sessionToken,
                    session_expires: sessionExpires.toISOString()
                })
                .eq('id', user.id);

            // Registrar no histórico
            await this.logLoginAttempt(user.id, ipAddress, userAgent, true);

        } catch (error) {
            console.error('❌ Erro ao processar login bem-sucedido:', error);
        }
    }

    async handleFailedLogin(userId, ipAddress, userAgent) {
        try {
            // Incrementar tentativas
            const { data: user } = await this.supabase
                .from('admin_users')
                .select('login_attempts')
                .eq('id', userId)
                .single();

            const newAttempts = (user?.login_attempts || 0) + 1;
            let updateData = { login_attempts: newAttempts };

            // Bloquear se excedeu tentativas
            if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
                updateData.locked_until = new Date(Date.now() + this.LOCKOUT_DURATION).toISOString();
            }

            await this.supabase
                .from('admin_users')
                .update(updateData)
                .eq('id', userId);

            // Registrar no histórico
            await this.logLoginAttempt(userId, ipAddress, userAgent, false, 'invalid_password');

        } catch (error) {
            console.error('❌ Erro ao processar falha de login:', error);
        }
    }

    async logLoginAttempt(userId, ipAddress, userAgent, success, failureReason = null) {
        try {
            await this.supabase
                .from('admin_login_history')
                .insert({
                    admin_user_id: userId,
                    login_time: new Date().toISOString(),
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    success: success,
                    failure_reason: failureReason
                });
        } catch (error) {
            console.error('❌ Erro ao registrar tentativa de login:', error);
        }
    }

    // ===============================================
    // VERIFICAÇÃO DE TOKENS
    // ===============================================

    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET);

            // Verificar se usuário ainda está ativo
            const { data: user, error } = await this.supabase
                .from('admin_users')
                .select('id, username, role, permissions, status, session_expires')
                .eq('id', decoded.userId)
                .single();

            if (error || !user || user.status !== 'active') {
                return { valid: false, error: 'Token inválido' };
            }

            // Verificar se sessão não expirou
            if (user.session_expires && new Date(user.session_expires) < new Date()) {
                return { valid: false, error: 'Sessão expirada' };
            }

            return {
                valid: true,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    permissions: user.permissions
                }
            };

        } catch (error) {
            return { valid: false, error: 'Token inválido' };
        }
    }

    // ===============================================
    // GESTÃO DE USUÁRIOS
    // ===============================================

    async getAllAdminUsers() {
        try {
            const { data, error } = await this.supabase
                .from('admin_users')
                .select(`
                    id, username, email, full_name, role, status,
                    permissions, last_login, created_at, profile_data
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('❌ Erro ao buscar usuários admin:', error);
            return { success: false, error: error.message };
        }
    }

    async createAdminUser(userData, createdBy) {
        try {
            const { username, email, password, full_name, role, permissions } = userData;

            // Verificar se usuário já existe
            const { data: existing } = await this.supabase
                .from('admin_users')
                .select('id')
                .or(`username.eq.${username},email.eq.${email}`);

            if (existing && existing.length > 0) {
                return { success: false, error: 'Usuário ou email já existe' };
            }

            // Hash da senha usando função do banco
            const { data: passwordHash } = await this.supabase
                .rpc('hash_password', { password });

            // Criar usuário
            const { data, error } = await this.supabase
                .from('admin_users')
                .insert({
                    username,
                    email,
                    password_hash: passwordHash,
                    full_name,
                    role: role || 'admin',
                    permissions: permissions || this.getDefaultPermissions(role),
                    created_by: createdBy
                })
                .select()
                .single();

            if (error) throw error;

            // Registrar auditoria
            await this.logAuditAction(createdBy, 'create_admin', 'admin_user', data.id, {
                username, email, role
            });

            console.log('✅ Usuário admin criado:', username);

            return {
                success: true,
                data: {
                    id: data.id,
                    username: data.username,
                    email: data.email,
                    full_name: data.full_name,
                    role: data.role
                }
            };

        } catch (error) {
            console.error('❌ Erro ao criar usuário admin:', error);
            return { success: false, error: error.message };
        }
    }

    async updateAdminUser(userId, updateData, updatedBy) {
        try {
            const { username, email, full_name, role, permissions, status, password } = updateData;

            let dataToUpdate = {};

            if (username) dataToUpdate.username = username;
            if (email) dataToUpdate.email = email;
            if (full_name) dataToUpdate.full_name = full_name;
            if (role) dataToUpdate.role = role;
            if (permissions) dataToUpdate.permissions = permissions;
            if (status) dataToUpdate.status = status;

            // Hash nova senha se fornecida
            if (password) {
                const { data: passwordHash } = await this.supabase
                    .rpc('hash_password', { password });
                dataToUpdate.password_hash = passwordHash;
            }

            const { data, error } = await this.supabase
                .from('admin_users')
                .update(dataToUpdate)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;

            // Registrar auditoria
            await this.logAuditAction(updatedBy, 'update_admin', 'admin_user', userId, updateData);

            console.log('✅ Usuário admin atualizado:', data.username);

            return {
                success: true,
                data: {
                    id: data.id,
                    username: data.username,
                    email: data.email,
                    full_name: data.full_name,
                    role: data.role,
                    status: data.status
                }
            };

        } catch (error) {
            console.error('❌ Erro ao atualizar usuário admin:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteAdminUser(userId, deletedBy) {
        try {
            // Não permitir deletar o próprio usuário
            if (userId === deletedBy) {
                return { success: false, error: 'Não é possível deletar seu próprio usuário' };
            }

            // Buscar dados do usuário antes de deletar
            const { data: user } = await this.supabase
                .from('admin_users')
                .select('username, email')
                .eq('id', userId)
                .single();

            // Deletar usuário
            const { error } = await this.supabase
                .from('admin_users')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            // Registrar auditoria
            await this.logAuditAction(deletedBy, 'delete_admin', 'admin_user', userId, {
                username: user?.username,
                email: user?.email
            });

            console.log('✅ Usuário admin deletado:', user?.username);

            return { success: true };

        } catch (error) {
            console.error('❌ Erro ao deletar usuário admin:', error);
            return { success: false, error: error.message };
        }
    }

    // ===============================================
    // PERMISSÕES E AUDITORIA
    // ===============================================

    getDefaultPermissions(role) {
        const permissions = {
            super_admin: {
                view_users: true,
                manage_users: true,
                send_alerts: true,
                view_analytics: true,
                manage_settings: true,
                view_logs: true,
                manage_admins: true
            },
            admin: {
                view_users: true,
                manage_users: true,
                send_alerts: true,
                view_analytics: true,
                manage_settings: true,
                view_logs: true,
                manage_admins: false
            },
            moderator: {
                view_users: true,
                manage_users: false,
                send_alerts: true,
                view_analytics: true,
                manage_settings: false,
                view_logs: true,
                manage_admins: false
            }
        };

        return permissions[role] || permissions.admin;
    }

    async checkPermission(userId, permission) {
        try {
            const { data: user } = await this.supabase
                .from('admin_users')
                .select('permissions, role')
                .eq('id', userId)
                .single();

            if (!user) return false;

            return user.permissions?.[permission] === true;
        } catch (error) {
            console.error('❌ Erro ao verificar permissão:', error);
            return false;
        }
    }

    async logAuditAction(userId, action, resourceType, resourceId, details, ipAddress, userAgent) {
        try {
            await this.supabase
                .from('admin_audit_log')
                .insert({
                    admin_user_id: userId,
                    action,
                    resource_type: resourceType,
                    resource_id: resourceId,
                    details,
                    ip_address: ipAddress,
                    user_agent: userAgent
                });
        } catch (error) {
            console.error('❌ Erro ao registrar auditoria:', error);
        }
    }

    async getAuditLog(limit = 100, offset = 0) {
        try {
            const { data, error } = await this.supabase
                .from('admin_audit_log')
                .select(`
                    id, action, resource_type, resource_id, details,
                    ip_address, created_at,
                    admin_users!admin_user_id(username, full_name)
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('❌ Erro ao buscar log de auditoria:', error);
            return { success: false, error: error.message };
        }
    }

    async getLoginHistory(userId = null, limit = 50) {
        try {
            let query = this.supabase
                .from('admin_login_history')
                .select(`
                    id, login_time, ip_address, user_agent, success, failure_reason,
                    admin_users!admin_user_id(username, full_name)
                `)
                .order('login_time', { ascending: false })
                .limit(limit);

            if (userId) {
                query = query.eq('admin_user_id', userId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('❌ Erro ao buscar histórico de login:', error);
            return { success: false, error: error.message };
        }
    }

    // ===============================================
    // MIDDLEWARE
    // ===============================================

    middlewareAuth() {
        return async (req, res, next) => {
            try {
                const token = req.headers.authorization?.split(' ')[1];

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        error: 'Token de acesso requerido'
                    });
                }

                const verification = await this.verifyToken(token);

                if (!verification.valid) {
                    return res.status(401).json({
                        success: false,
                        error: verification.error
                    });
                }

                // Adicionar dados do usuário à requisição
                req.adminUser = verification.user;
                next();

            } catch (error) {
                return res.status(401).json({
                    success: false,
                    error: 'Token inválido'
                });
            }
        };
    }

    middlewarePermission(permission) {
        return async (req, res, next) => {
            try {
                const hasPermission = await this.checkPermission(req.adminUser.id, permission);

                if (!hasPermission) {
                    return res.status(403).json({
                        success: false,
                        error: 'Permissão insuficiente'
                    });
                }

                next();
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: 'Erro ao verificar permissões'
                });
            }
        };
    }

    // ===============================================
    // UTILIDADES
    // ===============================================

    async cleanupExpiredSessions() {
        try {
            const { data } = await this.supabase
                .rpc('cleanup_expired_sessions');

            console.log(`🧹 Limpeza de sessões: ${data} sessões removidas`);
            return data;
        } catch (error) {
            console.error('❌ Erro na limpeza de sessões:', error);
            return 0;
        }
    }
}

module.exports = AdminAuthService;
