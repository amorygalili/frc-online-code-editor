import express from 'express';
import { createServer } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

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

// Session-aware health check endpoint for ALB
app.get('/session/:sessionId/nt/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'NT4 WebSocket Proxy',
        timestamp: new Date().toISOString()
    });
});

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

server.listen(port, () => {
    console.log(`NT4 Proxy Server running on port ${port}`);
    console.log(`Proxying WebSocket requests to NT4 server at ws://localhost:5810/nt/frc-challenges`);
});
