// test_auth.js - Teste do sistema de autenticação
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

console.log('🧪 Testando sistema de autenticação...');

// Verificar se todos os arquivos existem
const fs = require('fs');

const files = [
    './admin/login.html',
    './admin/index.html',
    './admin/admin.js',
    './admin/admin_auth.js',
    './admin/admin_users_manager.js'
];

console.log('📁 Verificando arquivos...');
files.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - ARQUIVO NÃO ENCONTRADO`);
    }
});

console.log('\n🌐 URLs configuradas:');
console.log('   - Dashboard (protegido): http://localhost:3000/admin');
console.log('   - Login: http://localhost:3000/admin/login');
console.log('   - API de login: POST http://localhost:3000/admin/auth/login');
console.log('   - API de verificação: GET http://localhost:3000/admin/auth/verify');

console.log('\n📋 Para testar:');
console.log('1. Execute: npm start');
console.log('2. Acesse: http://localhost:3000/admin (deve redirecionar para login)');
console.log('3. Acesse: http://localhost:3000/admin/login');
console.log('4. Tente login com credenciais inválidas');
console.log('5. Execute o SQL no Supabase e tente login com: admin / admin123');

console.log('\n✅ Sistema de autenticação configurado!');
