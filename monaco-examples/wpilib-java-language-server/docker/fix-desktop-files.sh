#!/bin/bash

echo "Fixing WPILib desktop file line endings..."

if [ -f "/home/frcuser/Desktop/FRC VS Code 2025.desktop" ]; then
    dos2unix "/home/frcuser/Desktop/FRC VS Code 2025.desktop"
    chmod +x "/home/frcuser/Desktop/FRC VS Code 2025.desktop"
    echo "Fixed FRC VS Code desktop file"
fi

# Fix any other .desktop files that might have been created
find /home/frcuser/Desktop -name "*.desktop" -exec dos2unix {} \;
find /home/frcuser/Desktop -name "*.desktop" -exec chmod +x {} \;

echo "Desktop files fixed!"
