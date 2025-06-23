import express from 'express';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const port = 30003;

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Eclipse JDT Language Server' });
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
        '-jar', '/home/jdtls/eclipse-jdt-ls/plugins/org.eclipse.equinox.launcher_1.6.900.v20240613-2009.jar',
        '-configuration', '/home/jdtls/eclipse-jdt-ls/config_linux',
        '-data', '/home/jdtls/workspace'
    ], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    // Forward messages from WebSocket to JDT LS
    ws.on('message', (data) => {
        try {
            const message = data.toString();
            console.log('Received from client:', message.substring(0, 100) + '...');
            jdtlsProcess.stdin.write(message);
        } catch (error) {
            console.error('Error forwarding message to JDT LS:', error);
        }
    });

    // Forward messages from JDT LS to WebSocket
    jdtlsProcess.stdout.on('data', (data) => {
        try {
            const message = data.toString();
            console.log('Sending to client:', message.substring(0, 100) + '...');
            if (ws.readyState === ws.OPEN) {
                ws.send(message);
            }
        } catch (error) {
            console.error('Error forwarding message to client:', error);
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
