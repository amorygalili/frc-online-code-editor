import express from 'express';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { WPILibUtils } from './wpilib-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize WPILib utilities
const wpilibUtils = new WPILibUtils();

const app = express();
const server = createServer(app);
const port = 30003;

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

// Static file server for workspace files
const workspacePath = path.join(__dirname, 'workspace');

// Get file content endpoint
app.get('/files/*', async (req, res) => {
    try {
        const filePath = req.params[0]; // Get the path after /files/
        const fullPath = path.join(workspacePath, filePath);

        // Security check: ensure the path is within workspace
        const resolvedPath = path.resolve(fullPath);
        const resolvedWorkspace = path.resolve(workspacePath);
        if (!resolvedPath.startsWith(resolvedWorkspace)) {
            return res.status(403).json({ error: 'Access denied: path outside workspace' });
        }

        const content = await fs.readFile(fullPath, 'utf8');
        res.json({
            path: filePath,
            content: content
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'File not found' });
        } else if (error.code === 'EISDIR') {
            res.status(400).json({ error: 'Path is a directory, not a file' });
        } else {
            console.error('Error reading file:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// List directory contents endpoint
app.get('/files', async (req, res) => {
    try {
        const dirPath = req.query.path || '';
        const fullPath = path.join(workspacePath, dirPath);

        // Security check: ensure the path is within workspace
        const resolvedPath = path.resolve(fullPath);
        const resolvedWorkspace = path.resolve(workspacePath);
        if (!resolvedPath.startsWith(resolvedWorkspace)) {
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
            files: files
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Directory not found' });
        } else {
            console.error('Error reading directory:', error);
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

// Generate new robot project
app.post('/wpilib/generate-project', express.json(), async (req, res) => {
    try {
        const { name, teamNumber, packageName } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const result = await wpilibUtils.generateRobotProject({
            name,
            teamNumber: teamNumber || 0,
            packageName: packageName || 'frc.robot'
        });

        if (result.success) {
            // Create Eclipse project files for better LSP support
            await wpilibUtils.createEclipseProjectFiles(result.projectPath, result.projectName);
        }

        res.json(result);
    } catch (error) {
        console.error('Error generating robot project:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

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

// Create WebSocket server
const wss = new WebSocketServer({ 
    server,
    path: '/jdtls'
});

console.log('Starting Eclipse JDT Language Server...');

wss.on('connection', (ws) => {
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
            console.log('Received from client:', jsonMessage.substring(0, 100) + '...');

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
});

server.listen(port, () => {
    console.log(`Eclipse JDT Language Server running on port ${port}`);
    console.log(`WebSocket endpoint: ws://localhost:${port}/jdtls`);
    console.log(`Health check: http://localhost:${port}/health`);
});
