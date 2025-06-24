# FRC WPILib Docker Container

This Docker container provides a complete environment for running the WPILib installer and developing FRC robot code with a graphical interface accessible through your web browser.

## Features

- Ubuntu 22.04 base with XFCE desktop environment
- Java 17 JDK pre-installed
- WPILib 2025.3.2 installer pre-downloaded
- VNC server with web-based access (noVNC)
- Virtual display (Xvfb) for headless GUI applications

## Quick Start

### 1. Build the Docker Image

```bash
docker build -t frc-wpilib .
```

### 2. Run the Container

```bash
# Stop and remove any existing container
docker rm -f frc-container

# Run the container with proper port mapping
docker run -d -p 5901:5901 -p 6901:6901 --name frc-container frc-wpilib
```

### 3. Access the Desktop Environment

Open your web browser and go to:
```
http://localhost:6901/vnc.html
```

- **VNC Password**: `password`
- **Alternative VNC client**: Connect to `localhost:5901`

### 4. Run the WPILib Installer

```bash
docker exec -it frc-container /home/frc/run-installer.sh
```

```bash
# Run the installer directly
docker exec -it frc-container /home/frc/WPILib_Linux-2025.3.2/WPILibInstaller
```
