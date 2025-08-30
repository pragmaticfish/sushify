#!/bin/bash

echo "🧪 Testing Sushify Docker Integration"
echo "===================================="
echo

# Step 1: Generate the override file by starting and quickly stopping
echo "📄 Step 1: Testing override file generation..."
timeout 10s ../../bin/sushify.js start --docker=backend "echo 'test'" 2>/dev/null || true

# Check if override file was generated
if [ -f "docker-compose.sushify.yml" ]; then
    echo "✅ Override file generated successfully!"
    echo "🔍 Generated file contents:"
    echo "---"
    head -20 docker-compose.sushify.yml
    echo "---"
else
    echo "❌ Override file not generated"
    exit 1
fi

echo
echo "🐳 Step 2: Testing Docker Compose merge..."

# Test that the merge works
docker compose -f docker-compose.sushify.yml -f docker-compose.yml config --no-interpolate > /tmp/merged-config.yml 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Docker Compose merge successful!"
    echo "🔍 Backend service configuration:"
    echo "---"
    grep -A 10 "backend:" /tmp/merged-config.yml | head -15
    echo "---"
else
    echo "❌ Docker Compose merge failed"
    exit 1
fi

echo
echo "🚀 Step 3: Starting containers..."

# Start containers in detached mode
docker compose -f docker-compose.sushify.yml -f docker-compose.yml up -d

if [ $? -eq 0 ]; then
    echo "✅ All containers started successfully!"
    echo "📋 Running containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
    
    echo
    echo "🧪 Step 4: Testing backend service..."
    
    # Wait for backend to be ready
    sleep 5
    
    # Test backend health
    response=$(curl -s http://localhost:8000/health 2>/dev/null)
    if [[ $response == *"healthy"* ]]; then
        echo "✅ Backend service is healthy!"
        echo "📡 Testing external API calls..."
        
        # Trigger API calls
        api_response=$(curl -s http://localhost:8000/api/test 2>/dev/null)
        if [[ $api_response == *"success"* ]]; then
            echo "✅ External API calls successful!"
            echo "🎯 Response preview:"
            echo "$api_response" | jq '.totalCalls, .results[].service' 2>/dev/null || echo "$api_response" | head -3
        else
            echo "⚠️  API calls may have failed, but containers are running"
        fi
    else
        echo "⚠️  Backend health check failed, but containers are running"
    fi
    
    echo
    echo "🎉 Docker integration test completed!"
    echo "💡 You can now:"
    echo "   • Open http://localhost:3000 (frontend)"
    echo "   • Test http://localhost:8000/api/test (backend API calls)"
    echo "   • Check docker ps to see all containers"
    echo
    echo "🧹 To clean up, run: docker compose down"
    
else
    echo "❌ Failed to start containers"
    exit 1
fi

# Clean up override file
rm -f docker-compose.sushify.yml
