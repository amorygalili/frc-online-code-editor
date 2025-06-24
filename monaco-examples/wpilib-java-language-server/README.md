# WPILib Java Language Server with Monaco Editor

This project demonstrates how to use the Eclipse JDT Language Server with Monaco Editor for WPILib FRC robot development in the browser. It provides a complete setup with Docker containerization, WPILib integration, and robot project generation capabilities for easy FRC development and education.

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** - For running the Eclipse JDT Language Server
- **Node.js 18+** - For the development server
- **Git** - For cloning and version control

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Language Server

```bash
docker compose up -d
```

This will:
- Download and build the Eclipse JDT Language Server Docker image
- Start the language server on port 30003
- Create a WebSocket endpoint at `ws://localhost:30003/jdtls`

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Open the Demo

Navigate to: **http://localhost:5173/java-language-server.html**

### 5. Use the Editor

1. Click the **"Start"** button to initialize Monaco Editor
2. The editor will load with a sample Java file (`HelloWorld.java`)
3. You should see:
   - ✅ Java syntax highlighting
   - ✅ Code completion (IntelliSense)
   - ✅ Error detection and diagnostics
   - ✅ Hover information
   - ✅ Code formatting

## 📁 Project Structure

```
java-language-server/
├── docker/
│   └── eclipse-jdt-ls/
│       ├── Dockerfile          # Eclipse JDT LS container
│       ├── package.json        # Server dependencies
│       └── server.js           # WebSocket bridge server
├── src/
│   ├── config.ts              # JDT LS configuration
│   ├── hello.java             # Sample Java file
│   ├── main.ts                # Monaco Editor client
│   └── style.css              # UI styles
├── workspace/                  # Java workspace (mounted in Docker)
├── docker-compose.yml         # Docker services configuration
├── java-language-server.html  # Standalone demo page
├── index.html                 # React app entry (original)
├── package.json               # Project dependencies
└── vite.config.ts             # Vite configuration
```

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies |
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `docker compose up -d` | Start language server in background |
| `docker compose down` | Stop language server |
| `docker compose logs eclipse-jdt-ls` | View language server logs |
| `docker compose ps` | Check service status |

## 🐳 Docker Services

### Eclipse JDT Language Server
- **Container**: `eclipse-jdt-ls`
- **Port**: `30003`
- **WebSocket**: `ws://localhost:30003/jdtls`
- **Health Check**: `http://localhost:30003/health`
- **Workspace**: `./workspace` (mounted volume)

### Service Management

```bash
# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f eclipse-jdt-ls

# Stop services
docker compose down

# Rebuild container (if needed)
docker compose build --no-cache
```

## 🔍 Troubleshooting

### Language Server Not Connecting

1. **Check if Docker container is running:**
   ```bash
   docker compose ps
   ```

2. **Verify health endpoint:**
   ```bash
   curl http://localhost:30003/health
   ```

3. **Check container logs:**
   ```bash
   docker compose logs eclipse-jdt-ls
   ```

4. **Restart the service:**
   ```bash
   docker compose restart eclipse-jdt-ls
   ```

### Monaco Editor Issues

1. **Clear browser cache** and refresh the page
2. **Check browser console** for JavaScript errors
3. **Verify WebSocket connection** in browser dev tools (Network tab)

### Build Issues

1. **Clean and rebuild:**
   ```bash
   npm run build
   ```

2. **Check TypeScript errors:**
   ```bash
   npx tsc --noEmit
   ```

3. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Docker Issues

1. **Reset everything:**
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

2. **Check Docker logs:**
   ```bash
   docker compose logs -f
   ```

3. **Free up Docker space:**
   ```bash
   docker system prune -a
   ```

## ⚙️ Configuration

### Language Server Settings

Edit `src/config.ts` to modify:
- WebSocket port (default: 30003)
- WebSocket path (default: '/jdtls')
- Workspace base path

### Monaco Editor Settings

Edit `src/main.ts` to customize:
- Editor theme
- Language features
- Keybindings
- User preferences

## 🎯 Features

- ✅ **Eclipse JDT Language Server** - Full Java language support
- ✅ **Monaco Editor** - VS Code-like editing experience
- ✅ **WebSocket Communication** - Real-time language server integration
- ✅ **Docker Containerization** - Easy deployment and isolation
- ✅ **Health Monitoring** - Service status checking
- ✅ **Volume Mounting** - Persistent workspace
- ✅ **Hot Reload** - Development server with live updates
- ✅ **TypeScript Support** - Type-safe development
- ✅ **Vite Build System** - Fast builds and HMR

## 🔄 Converting to React

This project is designed to be easily converted to React:

1. The current implementation uses vanilla TypeScript for simplicity
2. All Monaco Editor logic is contained in `src/main.ts`
3. The HTML structure in `java-language-server.html` can be converted to JSX
4. React components can wrap the Monaco Editor initialization

## 🚀 Next Steps

- [ ] Convert to React components
- [ ] Add file explorer for workspace
- [ ] Implement project management
- [ ] Add debugging support
- [ ] Integrate with FRC robot programming workflows
- [ ] Add multi-file editing
- [ ] Implement code formatting and refactoring tools

## 📝 Notes

- The workspace directory is mounted as a Docker volume for persistence
- Java files created in the editor will be saved to the workspace
- The language server provides full IntelliSense, error checking, and code completion
- This setup is ideal for educational environments and online Java development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the FRC Online Code Editor and follows the same licensing terms.