#!/bin/bash

# Login and get token
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"gamemaster","password":"password"}')

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Token: $TOKEN"

# Fetch characters
echo ""
echo "Fetching characters..."
curl -s http://localhost:8080/api/characters \
  -H "Authorization: Bearer $TOKEN" > api-response.json

echo "Response saved to api-response.json"
echo ""
echo "Checking for relationship data..."
echo "Skills:"
cat api-response.json | python -m json.tool | grep -c '"skills"'
echo "Edges:"
cat api-response.json | python -m json.tool | grep -c '"edges"'
echo "Hindrances:"
cat api-response.json | python -m json.tool | grep -c '"hindrances"'
echo "Equipment:"
cat api-response.json | python -m json.tool | grep -c '"equipment"'
echo "Arcane Powers:"
cat api-response.json | python -m json.tool | grep -c '"arcanePowers"'
echo "Wounds:"
cat api-response.json | python -m json.tool | grep -c '"wounds"'
