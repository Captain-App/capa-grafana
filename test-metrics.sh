#!/bin/bash

# Quick script to test Supabase metrics locally
# Make sure you have the secrets set

echo "Testing Supabase metrics endpoint..."
echo ""

# Check if secrets are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  Environment variables not set!"
    echo ""
    echo "Set them like:"
    echo "  export SUPABASE_URL=https://app.captainapp.co.uk"
    echo "  export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo ""
    echo "Or run with:"
    echo "  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/test-supabase-metrics.js"
    exit 1
fi

echo "✓ SUPABASE_URL: $SUPABASE_URL"
echo "✓ SUPABASE_SERVICE_ROLE_KEY: [hidden]"
echo ""
echo "Running test script..."
echo ""

node scripts/test-supabase-metrics.js

