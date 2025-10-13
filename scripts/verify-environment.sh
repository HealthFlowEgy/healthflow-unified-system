#!/bin/bash
echo "=== Environment Variables Verification ==="
check_env() {
    if grep -q "^$1=" ../.env 2>/dev/null; then
        echo "✅ $1 is set"
    else
        echo "❌ $1 is NOT set"
    fi
}
check_env "JWT_SECRET_KEY"
check_env "POSTGRES_PASSWORD"
check_env "DATABASE_URL"
check_env "REDIS_URL"
echo "=== Verification Complete ==="
