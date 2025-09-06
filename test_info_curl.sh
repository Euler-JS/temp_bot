#!/bin/bash

# test_info_curl.sh - Script para testar a rota /info via cURL

echo "🧪 Testando rota /info via cURL"
echo "================================"

# URL do servidor (ajuste se necessário)
SERVER_URL="http://localhost:3000"

echo ""
echo "📋 Teste 1: Mensagem com dados meteorológicos"
echo "----------------------------------------------"
curl -X POST $SERVER_URL/info \
  -H "Content-Type: application/json" \
  -d '{
    "message": "🎉 Olá! Esta é uma mensagem de teste do TempBot. Como está o tempo na sua região hoje?",
    "includeWeather": true
  }' | jq '.'

echo ""
echo "⏳ Aguardando 5 segundos..."
sleep 5

echo ""
echo "📋 Teste 2: Mensagem sem dados meteorológicos"
echo "---------------------------------------------"
curl -X POST $SERVER_URL/info \
  -H "Content-Type: application/json" \
  -d '{
    "message": "📢 Aviso importante: Lembrem-se de sempre verificar as condições climáticas antes de sair de casa!",
    "includeWeather": false
  }' | jq '.'

echo ""
echo "⏳ Aguardando 5 segundos..."
sleep 5

echo ""
echo "📋 Teste 3: Apenas dados meteorológicos"
echo "--------------------------------------"
curl -X POST $SERVER_URL/info \
  -H "Content-Type: application/json" \
  -d '{
    "includeWeather": true
  }' | jq '.'

echo ""
echo "✅ Testes concluídos!"
echo ""
echo "💡 Para executar este script:"
echo "   chmod +x test_info_curl.sh"
echo "   ./test_info_curl.sh"
echo ""
echo "📝 Nota: Instale jq para formatação JSON:"
echo "   # No Ubuntu/Debian:"
echo "   sudo apt-get install jq"
echo "   # No macOS:"
echo "   brew install jq"
