#!/bin/bash
echo "Testing login rate limiting with 12 attempts..."
echo "Should be limited after 10 attempts"
echo ""

count_403=0
count_429=0

for i in {1..12}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username":"wronguser","password":"wrongpass"}')

    if [ "$response" = "403" ]; then
        count_403=$((count_403 + 1))
    elif [ "$response" = "429" ]; then
        count_429=$((count_429 + 1))
        if [ $count_429 -eq 1 ]; then
            echo "First 429 (Rate Limited) received at attempt #$i"
        fi
    fi
    echo -n "."
done

echo ""
echo ""
echo "Results:"
echo "  403 Forbidden (bad credentials): $count_403"
echo "  429 Too Many Requests (rate limited): $count_429"
echo ""

if [ $count_429 -gt 0 ]; then
    echo "✅ Login rate limiting is WORKING!"
    echo "   Protected against brute force attacks!"
else
    echo "⚠️  No login rate limiting detected"
fi
