import express from 'express';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const port = 30006;

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

// Create single WebSocket server with ALB session-aware routing
const wss = new WebSocketServer({
    server,
    verifyClient: (info) => {
        const pathname = new URL(info.req.url, 'http://localhost').pathname;

        // Support ALB session-aware endpoints: /session/{sessionId}/jdtls
        const sessionMatch = pathname.match(/^\/session\/([^\/]+)\/jdtls$/);
        return sessionMatch !== null;
    }
});

console.log('Starting Eclipse JDT Language Server...');

wss.on('connection', (ws, req) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;

    // Handle ALB session-aware endpoints: /session/{sessionId}/jdtls
    const sessionMatch = pathname.match(/^\/session\/([^\/]+)\/jdtls$/);
    if (sessionMatch) {
        const sessionId = sessionMatch[1];
        console.log(`JDT LS connection established for session: ${sessionId}`);
        handleJdtlsConnection(ws);
    } else {
        console.log('Unknown WebSocket path:', pathname);
        ws.close();
    }
});

function handleJdtlsConnection(ws) {
    console.log('Starting JDT Language Server...');

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
            const parsedMessage = JSON.parse(jsonMessage);

            // Log important LSP lifecycle messages only
            if (parsedMessage.method === 'initialize') {
                console.log('LSP: Initialize request received');
            } else if (parsedMessage.method === 'shutdown') {
                console.log('LSP: Shutdown request received');
            } else if (parsedMessage.method === 'exit') {
                console.log('LSP: Exit request received');
            }

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

                try {
                    const parsedMessage = JSON.parse(jsonMessage);

                    // Log only errors and important lifecycle messages
                    if (parsedMessage.error) {
                        console.error('LSP Error from server:', parsedMessage.error);
                    } else if (parsedMessage.id && parsedMessage.result && parsedMessage.result.capabilities) {
                        console.log('LSP: Initialize response sent - Language server ready');
                    }
                } catch (parseError) {
                    // Ignore parse errors for non-JSON messages
                }

                if (ws.readyState === ws.OPEN) {
                    ws.send(jsonMessage);
                }

                buffer = buffer.substring(messageEnd);
            }
        } catch (error) {
            console.error('Error parsing LSP message:', error);
        }
    });

    // Handle JDT LS stderr - only log errors and warnings
    jdtlsProcess.stderr.on('data', (data) => {
        const stderrOutput = data.toString();

        // Only log actual errors and important warnings
        if (stderrOutput.includes('Exception') || stderrOutput.includes('Error') ||
            stderrOutput.includes('SEVERE') || stderrOutput.includes('Permission denied')) {
            console.error('JDT LS Error:', stderrOutput.trim());
        }
    });

    // Handle JDT LS process exit
    jdtlsProcess.on('exit', (code, signal) => {
        if (code !== 0) {
            console.log(`JDT LS process exited with code ${code}${signal ? `, signal: ${signal}` : ''}`);
        }
        if (ws.readyState === ws.OPEN) {
            ws.close();
        }
    });

    // Handle JDT LS process errors
    jdtlsProcess.on('error', (error) => {
        console.error('JDT LS process error:', error);
        if (ws.readyState === ws.OPEN) {
            ws.close();
        }
    });

    // Handle WebSocket close
    ws.on('close', () => {
        console.log('JDT LS client disconnected');
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


server.listen(port, () => {
    console.log(`Eclipse JDT Language Server running on port ${port}`);
    console.log(`WebSocket endpoints (ALB session-aware):`);
    console.log(`  - JDT LS: ws://localhost:${port}/session/{sessionId}/jdtls`);
    console.log(`Health check: http://localhost:${port}/health`);
});
