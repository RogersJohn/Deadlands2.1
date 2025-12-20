#!/bin/bash
echo "Testing rate limiting with 105 requests..."
echo "This should trigger 429 responses after ~100 requests"
echo ""

count_200=0
count_429=0

for i in {1..105}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/reference/skills)
    if [ "$response" = "200" ]; then
        count_200=$((count_200 + 1))
    elif [ "$response" = "429" ]; then
        count_429=$((count_429 + 1))
        if [ $count_429 -eq 1 ]; then
            echo "First 429 (Rate Limited) received at request #$i"
        fi
    fi
done

echo ""
echo "Results:"
echo "  200 OK responses: $count_200"
echo "  429 Rate Limited responses: $count_429"
echo ""

if [ $count_429 -gt 0 ]; then
    echo "✅ Rate limiting is WORKING!"
else
    echo "⚠️  No rate limiting detected - may need adjustment"
fi
