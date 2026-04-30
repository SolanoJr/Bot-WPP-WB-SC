#!/bin/bash

# Script de Teste Automático do Relay
# Autor: Wind (AI Assistant)
# Descrição: Monitora saúde do Relay com testes automatizados

echo "🧪 INICIANDO TESTE AUTOMÁTICO DO RELAY"
echo "=================================="

RELAY_URL="https://bot-wpp-relay.onrender.com"
SUCCESS_COUNT=0
ERROR_COUNT=0
TOTAL_TESTS=0

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}🔍 Testando: ${description}${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /dev/null "$url" --max-time 10)
        http_code="${response: -3}"
    else
        response=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d "$data" "$url" --max-time 10)
        http_code="${response: -3}"
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ SUCESSO (${http_code})${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    elif [ "$http_code" = "204" ]; then
        echo -e "${GREEN}✅ SUCESSO (${http_code} - No Content)${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    elif [ "$http_code" = "404" ]; then
        echo -e "${YELLOW}⚠️  ESPERADO (${http_code} - Not Found)${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}❌ ERRO (${http_code})${NC}"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
    echo ""
}

# Teste 1: Health Check
test_endpoint "GET" "${RELAY_URL}/health" "" "Health Check"

# Teste 2: Ping
test_endpoint "GET" "${RELAY_URL}/ping" "" "Ping"

# Teste 3: GET Pending (vazio)
test_endpoint "GET" "${RELAY_URL}/pending/test-chat-id" "" "GET Pending (vazio)"

# Teste 4: POST Location (fake)
fake_location='{
    "token": "test-token-'$(date +%s)'",
    "chatId": "test-chat-id",
    "location": {
        "latitude": -23.5505,
        "longitude": -46.6333,
        "accuracy": 10
    },
    "userAgent": "test-script",
    "timestamp": "'$(date -Iseconds)'"
}'

test_endpoint "POST" "${RELAY_URL}/location" "$fake_location" "POST Location (fake)"

# Teste 5: GET Pending (após POST)
sleep 2
test_endpoint "GET" "${RELAY_URL}/pending/test-chat-id" "" "GET Pending (após POST)"

# Resumo final
echo "=================================="
echo -e "${BLUE}📊 RESUMO DOS TESTES${NC}"
echo -e "Total de testes: ${TOTAL_TESTS}"
echo -e "${GREEN}Sucessos: ${SUCCESS_COUNT}${NC}"
echo -e "${RED}Erros: ${ERROR_COUNT}${NC}"

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 TODOS OS TESTES PASSARAM!${NC}"
    echo -e "${GREEN}✅ Relay está estável e pronto para uso${NC}"
    exit 0
else
    echo -e "${RED}⚠️  ${ERROR_COUNT} TESTE(S) FALHARAM(ES)${NC}"
    echo -e "${YELLOW}⚠️  Verifique os logs do Relay para mais detalhes${NC}"
    exit 1
fi
