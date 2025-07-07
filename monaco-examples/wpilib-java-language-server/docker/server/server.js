import express from 'express';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs/promises';
import { WPILibUtils } from './wpilib-utils.js';


// Initialize WPILib utilities
const wpilibUtils = new WPILibUtils();

const app = express();

const server = createServer(app);
const port = 30003;


server.on('upgrade', (req, socket, head) => {

});


// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Eclipse JDT Language Server' });
});

// Session root endpoint
app.get('/session/:sessionId/', (req, res) => {
    const sessionId = req.params.sessionId;
    res.json({
        message: 'FRC Challenge Session Active',
        sessionId: sessionId,
        service: 'Eclipse JDT Language Server',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: `/session/${sessionId}/`,
            files: `/files/`,
            websocket: `ws://localhost:1735` // Language Server WebSocket
        }
    });
});

// Static file server for workspace files
// In container: server is in /home/frcuser/server, workspace is in /home/frcuser/workspace
const workspacePath = '/home/frcuser/workspace';

// Get file content endpoint
app.get('/files/*', async (req, res) => {
    const filePath = req.params[0]; // Get the path after /files/
    const fullPath = path.join(workspacePath, filePath);

    try {
        // console.log(`File request: ${filePath}`);
        // console.log(`Workspace path: ${workspacePath}`);
        // console.log(`Full path: ${fullPath}`);

        // Security check: ensure the path is within workspace
        const resolvedPath = path.resolve(fullPath);
        const resolvedWorkspace = path.resolve(workspacePath);
        if (!resolvedPath.startsWith(resolvedWorkspace)) {
            console.log(`Access denied: ${resolvedPath} not within ${resolvedWorkspace}`);
            return res.status(403).json({ error: 'Access denied: path outside workspace' });
        }

        const content = await fs.readFile(fullPath, 'utf8');
        res.json({
            path: filePath,
            content: content
        });
    } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'File not found' });
        } else if (error.code === 'EISDIR') {
            res.status(400).json({ error: 'Path is a directory, not a file' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// List directory contents endpoint
app.get('/files', async (req, res) => {
    const dirPath = req.query.path || '';
    const fullPath = path.join(workspacePath, dirPath);

    try {
        // console.log(`Directory listing request: ${dirPath}`);
        // console.log(`Workspace path: ${workspacePath}`);
        // console.log(`Full path: ${fullPath}`);

        // Security check: ensure the path is within workspace
        const resolvedPath = path.resolve(fullPath);
        const resolvedWorkspace = path.resolve(workspacePath);
        if (!resolvedPath.startsWith(resolvedWorkspace)) {
            console.log(`Access denied: ${resolvedPath} not within ${resolvedWorkspace}`);
            return res.status(403).json({ error: 'Access denied: path outside workspace' });
        }

        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        const files = entries.map(entry => ({
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            path: path.posix.join(dirPath, entry.name)
        }));

        // console.log(`Found ${files.length} entries in ${fullPath}`);
        res.json({
            path: dirPath,
            files: files
        });
    } catch (error) {
        console.error(`Error reading directory ${fullPath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Directory not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Save file content endpoint
app.put('/files/*', express.json(), async (req, res) => {
    try {
        const filePath = req.params[0]; // Get the path after /files/
        const fullPath = path.join(workspacePath, filePath);
        const { content } = req.body;

        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'Content must be a string' });
        }

        // Security check: ensure the path is within workspace
        const resolvedPath = path.resolve(fullPath);
        const resolvedWorkspace = path.resolve(workspacePath);
        if (!resolvedPath.startsWith(resolvedWorkspace)) {
            return res.status(403).json({ error: 'Access denied: path outside workspace' });
        }

        // Ensure directory exists
        const dirPath = path.dirname(fullPath);
        await fs.mkdir(dirPath, { recursive: true });

        await fs.writeFile(fullPath, content, 'utf8');
        res.json({
            path: filePath,
            message: 'File saved successfully'
        });
    } catch (error) {
        console.error('Error saving file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// WPILib project management endpoints

// List robot projects
app.get('/wpilib/projects', async (req, res) => {
    try {
        const projects = await wpilibUtils.listRobotProjects();
        res.json({ projects });
    } catch (error) {
        console.error('Error listing robot projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get project information
app.get('/wpilib/projects/:projectName', async (req, res) => {
    try {
        const { projectName } = req.params;
        const projectPath = path.join(workspacePath, projectName);

        const isWPILibProject = await wpilibUtils.isWPILibProject(projectPath);
        if (!isWPILibProject) {
            return res.status(404).json({ error: 'WPILib project not found' });
        }

        const projectInfo = await wpilibUtils.getProjectInfo(projectPath);
        const classpath = await wpilibUtils.getWPILibClasspath(projectPath);

        res.json({
            name: projectName,
            path: projectPath,
            ...projectInfo,
            classpath
        });
    } catch (error) {
        console.error('Error getting project info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Build project endpoint
app.post('/wpilib/build/:projectName', express.json(), async (req, res) => {
    try {
        const { projectName } = req.params;
        const { task = 'build' } = req.body; // 'build', 'clean', 'deploy', etc.

        const projectPath = path.join(workspacePath, projectName);

        const isWPILibProject = await wpilibUtils.isWPILibProject(projectPath);
        if (!isWPILibProject) {
            return res.status(404).json({ error: 'WPILib project not found' });
        }

        // Start build process
        const buildId = Date.now().toString();
        const result = await wpilibUtils.buildProject(projectPath, task, buildId);

        res.json({
            buildId,
            projectName,
            task,
            ...result
        });
    } catch (error) {
        console.error('Error building project:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Get build status endpoint
app.get('/wpilib/build/:buildId/status', async (req, res) => {
    try {
        const { buildId } = req.params;
        const status = await wpilibUtils.getBuildStatus(buildId);
        res.json(status);
    } catch (error) {
        console.error('Error getting build status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start simulation endpoint
app.post('/wpilib/simulate/:projectName', express.json(), async (req, res) => {
    try {
        const { projectName } = req.params;
        const { simulationType = 'debug' } = req.body;

        const projectPath = path.join(workspacePath, projectName);

        const isWPILibProject = await wpilibUtils.isWPILibProject(projectPath);
        if (!isWPILibProject) {
            return res.status(404).json({ error: 'WPILib project not found' });
        }

        // Start simulation process
        const simulationId = Date.now().toString();
        const result = await wpilibUtils.startSimulation(projectPath, simulationType, simulationId);

        res.json({
            simulationId,
            projectName,
            simulationType,
            ...result
        });
    } catch (error) {
        console.error('Error starting simulation:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Stop simulation endpoint
app.post('/wpilib/simulate/:simulationId/stop', async (req, res) => {
    try {
        const { simulationId } = req.params;
        const result = await wpilibUtils.stopSimulation(simulationId);
        res.json(result);
    } catch (error) {
        console.error('Error stopping simulation:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Get simulation status endpoint
app.get('/wpilib/simulate/:simulationId/status', async (req, res) => {
    try {
        const { simulationId } = req.params;
        const status = wpilibUtils.getSimulationStatus(simulationId);

        if (!status) {
            return res.status(404).json({ error: 'Simulation not found' });
        }

        res.json(status);
    } catch (error) {
        console.error('Error getting simulation status:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Create single WebSocket server with path-based routing
const wss = new WebSocketServer({
    server,
    verifyClient: (info) => {
        const pathname = new URL(info.req.url, 'http://localhost').pathname;
        console.log("VERIFY CLIENT:", pathname);

        // Check if this is an NT4 session request - let our custom upgrade handler deal with it
        const sessionMatch = pathname.match(/^\/session\/([^\/]+)\/nt\/(.+)$/);
        if (sessionMatch) {
            console.log("VERIFY CLIENT: NT4 session request detected, rejecting to let custom handler process");
            return false; // Let our custom upgrade handler process this
        }

        return pathname === '/jdtls' || pathname === '/build';
    }
});

console.log('Starting Eclipse JDT Language Server...');

wss.on('connection', (ws, req) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    console.log("PATHNAME:", pathname);

    if (pathname === '/jdtls') {
        handleJdtlsConnection(ws);
    } else if (pathname === '/build') {
        handleBuildConnection(ws); // This now handles both builds and simulations
    } else {
        console.log('Unknown WebSocket path:', pathname);
        ws.close();
    }
});

function handleJdtlsConnection(ws) {
    console.log('Client connected to JDT LS WebSocket');

    // Start Eclipse JDT LS process
    const jdtlsProcess = spawn('java', [
        '-Declipse.application=org.eclipse.jdt.ls.core.id1',
        '-Dosgi.bundles.defaultStartLevel=4',
        '-Declipse.product=org.eclipse.jdt.ls.core.product',
        '-Dlog.level=ALL',
        '-Xmx1G',
        '--add-modules=ALL-SYSTEM',
        '--add-opens', 'java.base/java.util=ALL-UNNAMED',
        '--add-opens', 'java.base/java.lang=ALL-UNNAMED',
        '-jar', '/home/frcuser/eclipse-jdt-ls/plugins/org.eclipse.equinox.launcher_1.6.900.v20240613-2009.jar',
        '-configuration', '/home/frcuser/eclipse-jdt-ls/config_linux',
        '-data', '/home/frcuser/workspace'
    ], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';

    // Forward messages from WebSocket to JDT LS
    ws.on('message', (data) => {
        try {
            const jsonMessage = data.toString();
            // console.log('Received from client:', jsonMessage.substring(0, 100) + '...');

            // Convert JSON message to LSP format with Content-Length header
            const lspMessage = `Content-Length: ${Buffer.byteLength(jsonMessage, 'utf8')}\r\n\r\n${jsonMessage}`;
            jdtlsProcess.stdin.write(lspMessage);
        } catch (error) {
            console.error('Error forwarding message to JDT LS:', error);
        }
    });

    // Parse LSP messages from JDT LS and forward JSON to WebSocket
    jdtlsProcess.stdout.on('data', (data) => {
        try {
            buffer += data.toString();

            // Process complete messages
            while (true) {
                const contentLengthMatch = buffer.match(/Content-Length: (\d+)\r?\n/);
                if (!contentLengthMatch) break;

                const contentLength = parseInt(contentLengthMatch[1]);
                const headerEndIndex = buffer.indexOf('\r\n\r\n');
                if (headerEndIndex === -1) break;

                const messageStart = headerEndIndex + 4;
                const messageEnd = messageStart + contentLength;

                if (buffer.length < messageEnd) break;

                const jsonMessage = buffer.substring(messageStart, messageEnd);
                console.log('Sending to client:', jsonMessage.substring(0, 100) + '...');

                if (ws.readyState === ws.OPEN) {
                    ws.send(jsonMessage);
                }

                buffer = buffer.substring(messageEnd);
            }
        } catch (error) {
            console.error('Error parsing LSP message:', error);
        }
    });

    // Handle JDT LS stderr
    jdtlsProcess.stderr.on('data', (data) => {
        console.error('JDT LS stderr:', data.toString());
    });

    // Handle JDT LS process exit
    jdtlsProcess.on('exit', (code) => {
        console.log(`JDT LS process exited with code ${code}`);
        if (ws.readyState === ws.OPEN) {
            ws.close();
        }
    });

    // Handle WebSocket close
    ws.on('close', () => {
        console.log('Client disconnected from JDT LS WebSocket');
        if (jdtlsProcess && !jdtlsProcess.killed) {
            jdtlsProcess.kill();
        }
    });

    // Handle WebSocket error
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (jdtlsProcess && !jdtlsProcess.killed) {
            jdtlsProcess.kill();
        }
    });
}

function handleBuildConnection(ws) {
    console.log('Client connected to build/simulation WebSocket');

    // Store client connection for both build and simulation output streaming
    wpilibUtils.addBuildClient(ws);
    wpilibUtils.addSimulationClient(ws);

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            // console.log('Build/Simulation WebSocket message:', message);

            // Handle build and simulation commands
            if (message.type === 'subscribe') {
                if (message.buildId) {
                    wpilibUtils.subscribeToBuild(ws, message.buildId);
                }
                if (message.simulationId) {
                    wpilibUtils.subscribeToSimulation(message.simulationId, ws);
                }
            }
        } catch (error) {
            console.error('Error parsing build/simulation WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected from build/simulation WebSocket');
        wpilibUtils.removeBuildClient(ws);
        wpilibUtils.removeSimulationClient(ws);
    });

    ws.on('error', (error) => {
        console.error('Build/Simulation WebSocket error:', error);
        wpilibUtils.removeBuildClient(ws);
        wpilibUtils.removeSimulationClient(ws);
    });
}

server.listen(port, () => {
    console.log(`Eclipse JDT Language Server running on port ${port}`);
    console.log(`WebSocket endpoints:`);
    console.log(`  - JDT LS: ws://localhost:${port}/jdtls`);
    console.log(`  - Build/Simulation: ws://localhost:${port}/build`);
    console.log(`Health check: http://localhost:${port}/health`);
});
