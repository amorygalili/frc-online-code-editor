#!/bin/bash

# Start both server.js and nt4-proxy.js
echo "Starting FRC Challenge Services..."

# Start server.js in background
echo "Starting main server..."
node server.js &
SERVER_PID=$!

# Start nt4-proxy.js in background  
echo "Starting NT4 proxy..."
node nt4-proxy.js &
NT4_PID=$!

# Function to cleanup processes on exit
cleanup() {
    echo "Shutting down services..."
    kill $SERVER_PID 2>/dev/null
    kill $NT4_PID 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

echo "Services started:"
echo "  - Main server (PID: $SERVER_PID)"
echo "  - NT4 proxy (PID: $NT4_PID)"

# Wait for both processes
wait $SERVER_PID $NT4_PID
