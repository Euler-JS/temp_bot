-- add_last_command_column.sql
-- Execute este comando no SQL Editor do Supabase para adicionar a coluna last_command

-- Adicionar a coluna last_command à tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_command VARCHAR(50);

-- Verificar se a coluna foi adicionada
\d users;

-- Verificar dados existentes
SELECT id, contact, last_command, created_at FROM users LIMIT 5;
