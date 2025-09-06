-- admin_users.sql - Sistema de Gestão de Usuários Administrativos

-- Habilitar extensão para senhas criptografadas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Criar tabela para usuários administrativos
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'moderator')),
    permissions JSONB DEFAULT '{
        "view_users": true,
        "manage_users": false,
        "send_alerts": false,
        "view_analytics": true,
        "manage_settings": false,
        "view_logs": true
    }'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    session_token TEXT,
    session_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id),
    
    -- Campos adicionais para auditoria
    profile_data JSONB DEFAULT '{
        "avatar": null,
        "phone": null,
        "department": null,
        "notes": null
    }'::jsonb
);

-- Criar tabela para histórico de login
CREATE TABLE IF NOT EXISTS admin_login_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    session_duration INTEGER -- em segundos
);

-- Criar tabela para ações de auditoria
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_session_token ON admin_users(session_token) WHERE session_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_login_history_user ON admin_login_history(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_history_time ON admin_login_history(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_time ON admin_audit_log(created_at DESC);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_admin_updated_at ON admin_users;
CREATE TRIGGER trigger_update_admin_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_updated_at();

-- Função para hash de senhas
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

-- Função para verificar senhas
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (crypt(password, hash) = hash);
END;
$$ LANGUAGE plpgsql;

-- Função para gerar token de sessão
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Inserir usuário administrador padrão (senha: admin123)
INSERT INTO admin_users (
    username, 
    email, 
    password_hash, 
    full_name, 
    role,
    permissions
) VALUES (
    'admin',
    'admin@tempbot.mz',
    hash_password('admin123'),
    'Administrador Principal',
    'super_admin',
    '{
        "view_users": true,
        "manage_users": true,
        "send_alerts": true,
        "view_analytics": true,
        "manage_settings": true,
        "view_logs": true,
        "manage_admins": true
    }'::jsonb
) ON CONFLICT (username) DO NOTHING;

-- Inserir usuário moderador de exemplo (senha: mod123)
INSERT INTO admin_users (
    username, 
    email, 
    password_hash, 
    full_name, 
    role,
    permissions
) VALUES (
    'moderador',
    'moderador@tempbot.mz',
    hash_password('mod123'),
    'Moderador de Alertas',
    'moderator',
    '{
        "view_users": true,
        "manage_users": false,
        "send_alerts": true,
        "view_analytics": true,
        "manage_settings": false,
        "view_logs": true,
        "manage_admins": false
    }'::jsonb
) ON CONFLICT (username) DO NOTHING;

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    UPDATE admin_users 
    SET session_token = NULL, session_expires = NULL
    WHERE session_expires IS NOT NULL 
    AND session_expires < NOW();
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Verificar estrutura criada
SELECT 
    'Admin Users' as tabela,
    COUNT(*) as total_registros
FROM admin_users
UNION ALL
SELECT 
    'Login History' as tabela,
    COUNT(*) as total_registros
FROM admin_login_history
UNION ALL
SELECT 
    'Audit Log' as tabela,
    COUNT(*) as total_registros
FROM admin_audit_log;
