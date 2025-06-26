#!/bin/bash

# Function to cleanup processes
cleanup_processes() {
    echo "Cleaning up existing processes..."

    # Kill any existing Gradle daemon processes
    pkill -f "gradle.*daemon" || true
    pkill -f "GradleDaemon" || true

    # Kill any existing Java simulation processes
    pkill -f "frc.robot.Main" || true
    pkill -f "edu.wpi.first.wpilibj" || true
    pkill -f "halsim" || true

    # Kill processes using port 3300 (HAL WebSocket)
    lsof -ti:3300 | xargs -r kill -9 || true

    # Kill processes using port 5810 (NT4)
    lsof -ti:5810 | xargs -r kill -9 || true

    # Kill processes using port 1735 (NT3)
    lsof -ti:1735 | xargs -r kill -9 || true

    # Wait a moment for processes to terminate
    sleep 2

    echo "Process cleanup completed"
}

# Function to handle script termination
handle_exit() {
    echo "Received termination signal, cleaning up..."
    cleanup_processes
    exit 0
}

# Set up signal handlers
trap handle_exit SIGTERM SIGINT

# Initial cleanup
cleanup_processes

# Start Xvfb in background
Xvfb :1 -screen 0 1280x720x24 &
XVFB_PID=$!

# Wait for X server to be ready
sleep 3

# Start XFCE desktop session
DISPLAY=:1 startxfce4 &
XFCE_PID=$!

# Wait a bit more for desktop to initialize
sleep 2

# Start VNC server
x11vnc -forever -passwd password -display :1 -rfbport 5901 -shared &
VNC_PID=$!

# Start noVNC websocket proxy
websockify --web /usr/share/novnc/ 6901 localhost:5901 &
WEBSOCKIFY_PID=$!

# Keep container running
wait
