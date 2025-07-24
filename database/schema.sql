-- database/schema.sql
-- Execute este script no SQL Editor do Supabase para criar a tabela users

-- Habilitar extensão UUID (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela users
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contact VARCHAR(20) UNIQUE NOT NULL,
    preferred_city VARCHAR(100),
    units VARCHAR(20) DEFAULT 'celsius' CHECK (units IN ('celsius', 'fahrenheit')),
    language VARCHAR(10) DEFAULT 'pt' CHECK (language IN ('pt', 'en')),
    notifications BOOLEAN DEFAULT false,
    query_count INTEGER DEFAULT 1,
    expertise_level VARCHAR(20) DEFAULT 'basic' CHECK (expertise_level IN ('basic', 'intermediate', 'advanced')),
    preferred_complexity VARCHAR(20) DEFAULT 'basic' CHECK (preferred_complexity IN ('basic', 'intermediate', 'advanced')),
    conversation_history JSONB DEFAULT '[]'::jsonb,
    last_city VARCHAR(100),
    preferred_notification_time TIME DEFAULT '08:00',
    weather_preferences JSONB DEFAULT '{
        "aspects": ["temperatura", "chuva"],
        "timeframes": ["hoje", "amanha"],
        "cities": []
    }'::jsonb,
    profile_data JSONB DEFAULT '{
        "age": null,
        "occupation": null,
        "interests": []
    }'::jsonb,
    weather_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_access TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_contact ON users(contact);
CREATE INDEX IF NOT EXISTS idx_users_last_access ON users(last_access DESC);
CREATE INDEX IF NOT EXISTS idx_users_preferred_city ON users(preferred_city);
CREATE INDEX IF NOT EXISTS idx_users_notifications ON users(notifications) WHERE notifications = true;
CREATE INDEX IF NOT EXISTS idx_users_expertise_level ON users(expertise_level);

-- Criar índices JSONB para consultas em campos JSON
CREATE INDEX IF NOT EXISTS idx_users_weather_prefs_cities ON users USING GIN ((weather_preferences->'cities'));
CREATE INDEX IF NOT EXISTS idx_users_conversation_history ON users USING GIN (conversation_history);

-- Função para atualizar automaticamente o campo last_access
CREATE OR REPLACE FUNCTION update_last_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_access = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar last_access automaticamente
DROP TRIGGER IF EXISTS trigger_update_last_access ON users;
CREATE TRIGGER trigger_update_last_access
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_access();

-- Política de segurança RLS (Row Level Security) - OPCIONAL
-- Uncomment se quiser habilitar RLS
/*
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT/INSERT/UPDATE/DELETE
CREATE POLICY "Permitir todas as operações para service role" ON users
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);
*/

-- Inserir dados de teste (OPCIONAL - remover em produção)
/*
INSERT INTO users (
    contact, 
    preferred_city, 
    units, 
    language, 
    query_count,
    expertise_level,
    last_city
) VALUES (
    '258846151124',
    'beira',
    'celsius',
    'pt',
    2,
    'basic',
    'beira'
) ON CONFLICT (contact) DO NOTHING;
*/

-- Verificar se a tabela foi criada corretamente
-- SELECT * FROM users LIMIT 5;