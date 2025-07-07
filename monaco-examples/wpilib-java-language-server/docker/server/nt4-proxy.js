import express from 'express';
import { createServer } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

const wsProxy = createProxyMiddleware({
  target: 'http://localhost:5810/nt/frc-challenges', // include your WS path
  ws: true,
});

app.use('/session/:sessionId/nt/frc-challenges', wsProxy);


const server = createServer(app);


server.on('upgrade', (req, socket, head) => {
  if (req.url.includes('/nt/frc-challenges')) {
    wsProxy.upgrade(req, socket, head);
  }
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

const port = 30004;

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

server.listen(port, () => {
    console.log(`NT4 Proxy Server running on port ${port}`);
    console.log(`Proxying WebSocket requests to NT4 server at ws://localhost:5810/nt/frc-challenges`);
});
