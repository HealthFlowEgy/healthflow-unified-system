#!/bin/bash
# HealthFlow Service Health Check

echo "=== HealthFlow Service Health Check ==="
echo ""

# Function to check HTTP service
check_http_service() {
    local name=$1
    local url=$2
    
    echo -n "Checking $name... "
    
    status_code=$(curl -f -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$status_code" = "200" ]; then
        echo "✅ UP (HTTP $status_code)"
        return 0
    else
        echo "❌ DOWN (HTTP $status_code)"
        return 1
    fi
}

# Check all services
check_http_service "API Gateway" "http://localhost:8000/health"
check_http_service "Auth Service" "http://localhost:4003/health"
check_http_service "AI Validation Service" "http://localhost:5000/health"
check_http_service "Pharmacy Service" "http://localhost:4001/health"

echo ""
echo "=== Service Health Check Complete ==="
