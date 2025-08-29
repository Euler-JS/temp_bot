-- database/admin_tables.sql
-- Script para criar tabelas do painel administrativo

-- Habilitar extensão UUID (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela para armazenar alertas enviados
CREATE TABLE IF NOT EXISTS admin_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('urgente', 'aviso', 'informacao', 'meteorologico', 'seguranca')),
    target_region VARCHAR(100) NOT NULL, -- 'all' para todos ou nome da cidade/região
    include_weather BOOLEAN DEFAULT false,
    weather_data JSONB DEFAULT '{}'::jsonb,
    sent_by VARCHAR(100) DEFAULT 'admin',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    users_count INTEGER DEFAULT 0, -- Quantos usuários receberam
    delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para rastrear entregas de alertas
CREATE TABLE IF NOT EXISTS alert_deliveries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    alert_id UUID REFERENCES admin_alerts(id) ON DELETE CASCADE,
    user_contact VARCHAR(20) NOT NULL,
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    delivery_status VARCHAR(50) DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed', 'read')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para logs do sistema administrativo
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
    message TEXT NOT NULL,
    module VARCHAR(100) DEFAULT 'system',
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para configurações do sistema
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    updated_by VARCHAR(100) DEFAULT 'admin',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_admin_alerts_sent_at ON admin_alerts(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_target_region ON admin_alerts(target_region);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_alert_type ON admin_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_delivery_status ON admin_alerts(delivery_status);

CREATE INDEX IF NOT EXISTS idx_alert_deliveries_alert_id ON alert_deliveries(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_user_contact ON alert_deliveries(user_contact);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_delivered_at ON alert_deliveries(delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_level ON admin_logs(level);
CREATE INDEX IF NOT EXISTS idx_admin_logs_module ON admin_logs(module);

CREATE INDEX IF NOT EXISTS idx_admin_settings_setting_key ON admin_settings(setting_key);

-- Inserir configurações padrão
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
('default_expertise_level', 'basic', 'string', 'Nível de expertise padrão para novos usuários'),
('enable_expertise_progression', 'true', 'boolean', 'Habilitar progressão automática de expertise'),
('alert_password_hash', '$2b$10$KqH4jZ8ZcZ8ZcZ8ZcZ8ZcO', 'string', 'Hash da senha para envio de alertas'),
('max_alerts_per_day', '5', 'number', 'Máximo de alertas por dia'),
('alert_cooldown_minutes', '60', 'number', 'Tempo entre alertas em minutos')
ON CONFLICT (setting_key) DO NOTHING;

-- Views úteis para analytics
CREATE OR REPLACE VIEW users_by_region AS
SELECT 
    COALESCE(preferred_city, last_city, 'Não definido') as region,
    COUNT(*) as user_count,
    COUNT(CASE WHEN last_access >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users,
    AVG(query_count) as avg_queries,
    MAX(last_access) as last_activity
FROM users 
GROUP BY COALESCE(preferred_city, last_city, 'Não definido')
ORDER BY user_count DESC;

CREATE OR REPLACE VIEW recent_alerts_summary AS
SELECT 
    aa.*,
    COUNT(ad.id) as delivered_count,
    COUNT(CASE WHEN ad.delivery_status = 'failed' THEN 1 END) as failed_count
FROM admin_alerts aa
LEFT JOIN alert_deliveries ad ON aa.id = ad.alert_id
WHERE aa.sent_at >= NOW() - INTERVAL '30 days'
GROUP BY aa.id, aa.title, aa.message, aa.alert_type, aa.target_region, 
         aa.include_weather, aa.weather_data, aa.sent_by, aa.sent_at, 
         aa.users_count, aa.delivery_status, aa.created_at
ORDER BY aa.sent_at DESC;

-- Função para limpar logs antigos automaticamente
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_logs WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM alert_deliveries WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Verificar se as tabelas foram criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_alerts', 'alert_deliveries', 'admin_logs', 'admin_settings')
ORDER BY table_name;
