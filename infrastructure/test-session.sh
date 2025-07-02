#!/bin/bash

# Test script for FRC Challenge Session Management
# This script tests the session management API endpoints

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev}"
JWT_TOKEN="${JWT_TOKEN:-your-jwt-token-here}"
CHALLENGE_ID="${CHALLENGE_ID:-test-challenge-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    echo -e "${BLUE}Making ${method} request to ${endpoint}${NC}"
    
    if [ -n "$data" ]; then
        curl -s -X ${method} \
            -H "Authorization: Bearer ${JWT_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "${data}" \
            "${API_BASE_URL}${endpoint}" | jq '.'
    else
        curl -s -X ${method} \
            -H "Authorization: Bearer ${JWT_TOKEN}" \
            "${API_BASE_URL}${endpoint}" | jq '.'
    fi
}

# Test functions
test_create_session() {
    echo -e "${GREEN}🚀 Testing session creation...${NC}"
    
    local response=$(api_call POST "/sessions" "{\"challengeId\": \"${CHALLENGE_ID}\", \"resourceProfile\": \"basic\"}")
    
    # Extract session ID from response
    SESSION_ID=$(echo "$response" | jq -r '.sessionId // empty')
    
    if [ -n "$SESSION_ID" ]; then
        echo -e "${GREEN}✅ Session created successfully: ${SESSION_ID}${NC}"
        echo "$response"
    else
        echo -e "${RED}❌ Failed to create session${NC}"
        echo "$response"
        return 1
    fi
}

test_get_session() {
    if [ -z "$SESSION_ID" ]; then
        echo -e "${YELLOW}⚠️  No session ID available, skipping get session test${NC}"
        return 0
    fi
    
    echo -e "${GREEN}📋 Testing get session...${NC}"
    
    local response=$(api_call GET "/sessions/${SESSION_ID}")
    echo "$response"
    
    # Check if session is running
    local status=$(echo "$response" | jq -r '.status // empty')
    if [ "$status" = "running" ]; then
        echo -e "${GREEN}✅ Session is running${NC}"
    else
        echo -e "${YELLOW}⏳ Session status: ${status}${NC}"
    fi
}

test_list_sessions() {
    echo -e "${GREEN}📝 Testing list sessions...${NC}"
    
    local response=$(api_call GET "/sessions")
    echo "$response"
    
    local count=$(echo "$response" | jq '.sessions | length')
    echo -e "${GREEN}📊 Found ${count} sessions${NC}"
}

test_keep_alive() {
    if [ -z "$SESSION_ID" ]; then
        echo -e "${YELLOW}⚠️  No session ID available, skipping keep alive test${NC}"
        return 0
    fi
    
    echo -e "${GREEN}💓 Testing keep alive...${NC}"
    
    local response=$(api_call POST "/sessions/${SESSION_ID}/keepalive")
    echo "$response"
}

test_terminate_session() {
    if [ -z "$SESSION_ID" ]; then
        echo -e "${YELLOW}⚠️  No session ID available, skipping terminate test${NC}"
        return 0
    fi
    
    echo -e "${GREEN}🛑 Testing session termination...${NC}"
    
    local response=$(api_call DELETE "/sessions/${SESSION_ID}")
    echo "$response"
    
    local status=$(echo "$response" | jq -r '.status // empty')
    if [ "$status" = "stopping" ]; then
        echo -e "${GREEN}✅ Session termination initiated${NC}"
    else
        echo -e "${RED}❌ Failed to terminate session${NC}"
    fi
}

# Wait for session to be ready
wait_for_session() {
    if [ -z "$SESSION_ID" ]; then
        return 0
    fi
    
    echo -e "${YELLOW}⏳ Waiting for session to be ready...${NC}"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local response=$(api_call GET "/sessions/${SESSION_ID}")
        local status=$(echo "$response" | jq -r '.status // empty')
        
        echo -e "${BLUE}Attempt ${attempt}/${max_attempts}: Status = ${status}${NC}"
        
        if [ "$status" = "running" ]; then
            echo -e "${GREEN}✅ Session is ready!${NC}"
            return 0
        elif [ "$status" = "failed" ]; then
            echo -e "${RED}❌ Session failed to start${NC}"
            echo "$response"
            return 1
        fi
        
        sleep 10
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Session did not become ready within timeout${NC}"
    return 1
}

# Main test function
run_tests() {
    echo -e "${BLUE}🧪 Starting FRC Challenge Session API Tests${NC}"
    echo -e "${BLUE}API Base URL: ${API_BASE_URL}${NC}"
    echo -e "${BLUE}Challenge ID: ${CHALLENGE_ID}${NC}"
    echo ""
    
    # Check prerequisites
    if [ "$JWT_TOKEN" = "your-jwt-token-here" ]; then
        echo -e "${RED}❌ Please set JWT_TOKEN environment variable${NC}"
        exit 1
    fi
    
    if [ "$API_BASE_URL" = "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev" ]; then
        echo -e "${RED}❌ Please set API_BASE_URL environment variable${NC}"
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required but not installed${NC}"
        exit 1
    fi
    
    # Run tests
    test_list_sessions
    echo ""
    
    test_create_session
    echo ""
    
    if [ -n "$SESSION_ID" ]; then
        wait_for_session
        echo ""
        
        test_get_session
        echo ""
        
        test_keep_alive
        echo ""
        
        # Wait a bit before terminating
        echo -e "${YELLOW}⏳ Waiting 30 seconds before termination...${NC}"
        sleep 30
        
        test_terminate_session
        echo ""
    fi
    
    echo -e "${GREEN}🎉 Tests completed!${NC}"
}

# Handle script arguments
case "${1:-test}" in
    "test")
        run_tests
        ;;
    "create")
        test_create_session
        ;;
    "get")
        test_get_session
        ;;
    "list")
        test_list_sessions
        ;;
    "keepalive")
        test_keep_alive
        ;;
    "terminate")
        test_terminate_session
        ;;
    *)
        echo "Usage: $0 [test|create|get|list|keepalive|terminate]"
        echo ""
        echo "Environment variables:"
        echo "  API_BASE_URL - API Gateway base URL"
        echo "  JWT_TOKEN - JWT token for authentication"
        echo "  CHALLENGE_ID - Challenge ID to test with"
        echo ""
        echo "Example:"
        echo "  export API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/dev"
        echo "  export JWT_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
        echo "  export CHALLENGE_ID=basic-motor-control"
        echo "  ./test-session.sh"
        exit 1
        ;;
esac
