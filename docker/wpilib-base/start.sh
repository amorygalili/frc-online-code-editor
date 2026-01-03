#!/bin/bash

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
