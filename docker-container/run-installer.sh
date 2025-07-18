#!/bin/bash

# Script to run WPILib installer in the container
# This should be run from inside the container

echo "Starting WPILib installer..."
echo "Make sure you can access the VNC display at http://localhost:6901"
echo "Default VNC password is: password"
echo ""

# Set display
export DISPLAY=:1

# Check if X server is running
# if ! xdpyinfo -display :1 >/dev/null 2>&1; then
#     echo "Error: X server is not running on display :1"
#     echo "Make sure the container is started properly"
#     exit 1
# fi

# Change to installer directory and run
cd /home/frc/WPILib_Linux-2025.3.2
echo "Running WPILib installer..."
./WPILibInstaller

echo "Installer finished."
echo "Fixing desktop file line endings..."

# Fix line endings in desktop files created by the installer
if [ -f "/home/frc/Desktop/FRC VS Code 2025.desktop" ]; then
    dos2unix "/home/frc/Desktop/FRC VS Code 2025.desktop"
    chmod +x "/home/frc/Desktop/FRC VS Code 2025.desktop"
    echo "Fixed FRC VS Code desktop file"
fi

# Fix any other .desktop files that might have been created
find /home/frc/Desktop -name "*.desktop" -exec dos2unix {} \; 2>/dev/null
find /home/frc/Desktop -name "*.desktop" -exec chmod +x {} \; 2>/dev/null

echo "Desktop files fixed! You can now double-click the desktop shortcuts."
