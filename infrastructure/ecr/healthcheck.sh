#!/bin/bash

# Health check script for FRC Challenge Runtime container
# This script is used by Docker/ECS health checks to verify container health

set -e

# Configuration
HEALTH_CHECK_URL="http://localhost:30003/health"
TIMEOUT=10
MAX_RETRIES=3

# Colors for output (only if running interactively)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# Function to log messages
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

# Function to check if a process is running
check_process() {
    local process_name=$1
    if pgrep -f "$process_name" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to check if a port is listening
check_port() {
    local port=$1
    if netstat -ln | grep -q ":$port "; then
        return 0
    else
        return 1
    fi
}

# Main health check function
health_check() {
    local exit_code=0
    
    # Check if main server process is running
    if ! check_process "node.*server.js"; then
        log "${RED}❌ Node.js server process not running${NC}"
        exit_code=1
    else
        log "${GREEN}✅ Node.js server process running${NC}"
    fi
    
    # Check if Java Language Server is accessible
    if ! check_process "java.*eclipse.jdt.ls"; then
        log "${YELLOW}⚠️  Java Language Server process not found (may be starting)${NC}"
    else
        log "${GREEN}✅ Java Language Server process running${NC}"
    fi
    
    # Check if required ports are listening
    for port in 30003 30004 30005 30006; do
        if ! check_port $port; then
            log "${RED}❌ Port $port not listening${NC}"
            exit_code=1
        else
            log "${GREEN}✅ Port $port listening${NC}"
        fi
    done
    
    # Check HTTP health endpoint
    if command -v curl >/dev/null 2>&1; then
        if curl -f -s --max-time $TIMEOUT "$HEALTH_CHECK_URL" >/dev/null; then
            log "${GREEN}✅ HTTP health check passed${NC}"
        else
            log "${RED}❌ HTTP health check failed${NC}"
            exit_code=1
        fi
    else
        log "${YELLOW}⚠️  curl not available, skipping HTTP health check${NC}"
    fi
    
    # Check disk space (warn if less than 1GB free)
    if command -v df >/dev/null 2>&1; then
        local free_space=$(df /home/frcuser/workspace 2>/dev/null | awk 'NR==2 {print $4}' || echo "0")
        if [ "$free_space" -lt 1048576 ]; then  # Less than 1GB in KB
            log "${YELLOW}⚠️  Low disk space: ${free_space}KB free${NC}"
        else
            log "${GREEN}✅ Sufficient disk space: ${free_space}KB free${NC}"
        fi
    fi
    
    # Check memory usage (warn if over 90%)
    if command -v free >/dev/null 2>&1; then
        local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [ "$memory_usage" -gt 90 ]; then
            log "${YELLOW}⚠️  High memory usage: ${memory_usage}%${NC}"
        else
            log "${GREEN}✅ Memory usage OK: ${memory_usage}%${NC}"
        fi
    fi
    
    return $exit_code
}

# Run health check with retries
retry_count=0
while [ $retry_count -lt $MAX_RETRIES ]; do
    if health_check; then
        log "${GREEN}🎉 Health check passed${NC}"
        exit 0
    else
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            log "${YELLOW}⏳ Health check failed, retrying ($retry_count/$MAX_RETRIES)...${NC}"
            sleep 2
        fi
    fi
done

log "${RED}💥 Health check failed after $MAX_RETRIES attempts${NC}"
exit 1
