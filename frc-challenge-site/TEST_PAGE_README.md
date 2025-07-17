# Local Docker Test Page

This test page provides a standalone environment for testing the FRC Challenge Editor against a locally running Docker container, without needing the full ALB infrastructure or authentication system.

## Purpose

- Test the challenge editor functionality with a local Docker container
- Verify NT4 WebSocket connections and data flow
- Test HAL simulation integration
- Debug session-based routing (ALB simulation)
- Validate proxy functionality

## Setup

### 1. Start the Docker Container

First, make sure your WPILib Docker container is running:

```bash
cd monaco-examples/wpilib-java-language-server/docker
docker-compose up -d
```

This will start the container with:
- Main server on port 30003
- NT4 WebSocket server on port 5810
- HAL Simulation server on port 3300

### 2. Start the Development Server

```bash
cd monaco-examples/wpilib-java-language-server
npm run dev
```

### 3. Access the Test Page

Open your browser and navigate to:
```
http://localhost:5173/test.html
```

## Using the Test Page

The test page provides a simple interface for testing against a local Docker container:

### Fixed Configuration
- **Docker Host**: localhost
- **Docker Port**: 30003
- **NT4 Port**: 5810
- **HAL Sim Port**: 3300

### Connection Testing
- The page automatically tests the connection on startup
- Green "Connected" chip indicates successful connection
- Red "Disconnected" chip indicates connection issues
- Click "Test Connection" to retry

### Session Routing Toggle
- Enable "Session Routing" to simulate ALB routing behavior
- Uses test session ID: `test-session-123`
- When enabled, WebSocket connections use session-based paths

### Launching the Editor
1. Ensure the connection status shows "Connected"
2. Optionally enable session routing for ALB testing
3. Click "Launch Challenge Editor"
4. The full editor interface will load

## Testing Scenarios

### 1. Basic Local Testing
- Use default configuration (localhost:30003)
- Test basic editor functionality
- Verify file operations and build system

### 2. NT4 WebSocket Testing
- Monitor browser developer tools for WebSocket connections
- Check NT4 data flow in the NetworkTables tab
- Verify robot simulation data

### 3. HAL Simulation Testing
- Start a robot simulation from the build controls
- Check HAL WebSocket connections
- Verify simulation data display

### 4. Session Routing Testing (ALB Simulation)
- Enable "Use Session-based Routing"
- Set a test session ID
- Verify proxy routing works correctly
- Check WebSocket paths include session information

## Troubleshooting

### Connection Issues
- Verify Docker container is running: `docker ps`
- Check container logs: `docker-compose logs`
- Ensure ports are not blocked by firewall
- Confirm container is accessible at localhost:30003

### WebSocket Issues
- Open browser developer tools → Network tab
- Look for WebSocket connection attempts
- Check for CORS errors in console
- Verify proxy rules in server.js

### Editor Issues
- Check browser console for JavaScript errors
- Verify all required files are accessible
- Test with different browsers

## Development Benefits

This test page allows you to:
- Rapidly iterate on editor changes without full deployment
- Test specific configurations and edge cases
- Debug WebSocket and proxy issues
- Validate session routing before ALB deployment
- Test against different Docker container versions

## Files Created

- `test.html` - Test page HTML entry point
- `src/test-main.tsx` - Test page TypeScript entry point  
- `src/TestApp.tsx` - Main test application component
- `vite.config.ts` - Updated with test entry point
- `TEST_PAGE_README.md` - This documentation

## Next Steps

After validating functionality with the test page:
1. Deploy to staging environment with real ALB
2. Test with actual session management
3. Validate production configuration
4. Run integration tests
