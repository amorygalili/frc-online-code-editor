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

    # Kill HAL simulation related processes more aggressively
    pkill -f "wpilibws" || true
    pkill -f "WPILibWebSocket" || true
    pkill -f "HALSim" || true
    pkill -f "SimulationExtension" || true
    pkill -f "NetworkTablesExtension" || true

    # Kill any Java processes that might be HAL simulation clients
    pkill -f "java.*halsim" || true
    pkill -f "java.*wpilibws" || true
    pkill -f "java.*simulation" || true

    # Kill processes using simulation ports (more comprehensive)
    for port in 3300 3301 3302 3303 3304 3305 3306 3307 3308 3309 3310; do
        lsof -ti:$port | xargs -r kill -9 || true
    done

    # Kill processes using NT4 port range
    for port in 5800 5801 5802 5803 5804 5805 5806 5807 5808 5809 5810 5811 5812 5813 5814 5815 5816 5817 5818 5819 5820; do
        lsof -ti:$port | xargs -r kill -9 || true
    done

    # Kill processes using NT3 port
    lsof -ti:1735 | xargs -r kill -9 || true

    # Wait longer for processes to terminate
    sleep 3

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
