import express from 'express';
import { WebSocketServer } from 'ws';
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

// Session-aware health check endpoint for ALB
app.get('/session/:sessionId/main/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'FRC Main Server',
        timestamp: new Date().toISOString()
    });
});



// Static file server for workspace files
// In container: server is in /home/frcuser/server, workspace is in /home/frcuser/workspace
const workspacePath = '/home/frcuser/workspace';

// Session-aware get file content endpoint
app.get('/session/:sessionId/main/files/*', async (req, res) => {
    const sessionId = req.params.sessionId;
    const filePath = req.params[0]; // Get the path after /files/
    const fullPath = path.join(workspacePath, filePath);

    try {
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
            content: content,
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

// Session-aware list directory contents endpoint
app.get('/session/:sessionId/main/files', async (req, res) => {
    const dirPath = req.query.path || '';
    const fullPath = path.join(workspacePath, dirPath);

    try {
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

        res.json({
            path: dirPath,
            files: files,
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

// Session-aware get all Java files recursively endpoint
app.get('/session/:sessionId/main/java-files', async (req, res) => {
    const sessionId = req.params.sessionId;

    try {
        const javaFiles = [];

        // Recursive function to find all Java files
        async function findJavaFiles(dirPath) {
            const fullPath = path.join(workspacePath, dirPath);

            // Security check: ensure the path is within workspace
            const resolvedPath = path.resolve(fullPath);
            const resolvedWorkspace = path.resolve(workspacePath);
            if (!resolvedPath.startsWith(resolvedWorkspace)) {
                console.log(`Access denied: ${resolvedPath} not within ${resolvedWorkspace}`);
                return;
            }

            try {
                const entries = await fs.readdir(fullPath, { withFileTypes: true });

                for (const entry of entries) {
                    const entryPath = path.posix.join(dirPath, entry.name);

                    if (entry.isDirectory()) {
                        // Recursively search subdirectories
                        await findJavaFiles(entryPath);
                    } else if (entry.isFile() && entry.name.endsWith('.java')) {
                        // Add Java file to results
                        javaFiles.push({
                            name: entry.name,
                            type: 'file',
                            path: entryPath
                        });
                    }
                }
            } catch (error) {
                console.error(`Error reading directory ${fullPath}:`, error);
                // Continue processing other directories even if one fails
            }
        }

        // Start recursive search from workspace root
        await findJavaFiles('');

        res.json({
            files: javaFiles,
            count: javaFiles.length
        });
    } catch (error) {
        console.error('Error finding Java files:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Session-aware save file content endpoint
app.put('/session/:sessionId/main/files/*', express.json(), async (req, res) => {
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
            message: 'File saved successfully',
        });
    } catch (error) {
        console.error('Error saving file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// WPILib project management endpoints

// Session-aware list robot projects
app.get('/session/:sessionId/main/wpilib/projects', async (req, res) => {
    try {
        const projects = await wpilibUtils.listRobotProjects();
        res.json({ projects });
    } catch (error) {
        console.error('Error listing robot projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Session-aware get project information
app.get('/session/:sessionId/main/wpilib/projects/:projectName', async (req, res) => {
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
            classpath,
        });
    } catch (error) {
        console.error('Error getting project info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Session-aware build project endpoint
app.post('/session/:sessionId/main/wpilib/build/:projectName', express.json(), async (req, res) => {
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

// Session-aware get build status endpoint
app.get('/session/:sessionId/main/wpilib/build/:buildId/status', async (req, res) => {
    try {
        const { buildId } = req.params;
        const status = await wpilibUtils.getBuildStatus(buildId);
        res.json(status);
    } catch (error) {
        console.error('Error getting build status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Session-aware start simulation endpoint
app.post('/session/:sessionId/main/wpilib/simulate/:projectName', express.json(), async (req, res) => {
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

// Session-aware stop simulation endpoint
app.post('/session/:sessionId/main/wpilib/simulate/:simulationId/stop', async (req, res) => {
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

// Session-aware get simulation status endpoint
app.get('/session/:sessionId/main/wpilib/simulate/:simulationId/status', async (req, res) => {
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

        // Support ALB session-aware endpoints: /session/{sessionId}/main/build
        const sessionMatch = pathname.match(/^\/session\/([^\/]+)\/main\/build$/);
        return sessionMatch !== null;
    }
});

wss.on('connection', (ws, req) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;

    // Handle ALB session-aware endpoints: /session/{sessionId}/main/build
    const sessionMatch = pathname.match(/^\/session\/([^\/]+)\/main\/build$/);
    if (sessionMatch) {
        handleBuildConnection(ws); // This now handles both builds and simulations
    } else {
        console.log('Unknown WebSocket path:', pathname);
        ws.close();
    }
});


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
    console.log(`FRC Simulation Server running on port ${port}`);
    console.log(`WebSocket endpoints:`);
    console.log(`  - Build/Simulation: ws://localhost:${port}/session/{sessionId}/main/build`);
    console.log(`Health check: http://localhost:${port}/session/{sessionId}/main/health`);
});
