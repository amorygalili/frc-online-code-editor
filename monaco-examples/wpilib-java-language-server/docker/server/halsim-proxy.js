import express from 'express';
import { createServer } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

const wsProxy = createProxyMiddleware({
  target: 'http://localhost:3300',
  ws: true,
  pathRewrite: {
    '^/session/[^/]+/halsim': '/wpilibws', // Rewrite /session/{sessionId}/halsim to /wpilibws
  },
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log('HALSim proxy HTTP request:', req.method, req.url, '-> target:', proxyReq.path);
  },
  onProxyReqWs: (proxyReq, req, socket, options, head) => {
    console.log('HALSim proxy WebSocket request:', req.url, '-> target:', proxyReq.path);
  },
});

app.use('/session/:sessionId/halsim', wsProxy);

const server = createServer(app);

server.on('upgrade', (req, socket, head) => {
  console.log('HALSim proxy upgrade request:', req.url);

  if (req.url.includes('/halsim')) {
    // Rewrite the URL to match what the HAL simulation server expects
    const originalUrl = req.url;
    req.url = req.url.replace(/^\/session\/[^\/]+\/halsim/, '/wpilibws');

    console.log('HALSim WebSocket upgrade:', originalUrl, '->', req.url);
    wsProxy.upgrade(req, socket, head);
  } else {
    console.log("NOT HALSIM WebSocket upgrade:", req.url);
    socket.destroy();
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

const port = 30005;

// Session root endpoint for HALSim proxy
// app.get('/session/:sessionId/halsim', (req, res) => {
//     const sessionId = req.params.sessionId;
//     res.json({
//         message: 'HALSim proxy service available',
//         sessionId: sessionId,
//         service: 'HALSim WebSocket Proxy',
//         timestamp: new Date().toISOString(),
//         endpoints: {
//             health: `/session/${sessionId}/halsim/health`,
//             websocket: `ws://localhost:${port}/session/${sessionId}/halsim`
//         }
//     });
// });

// Session-aware health check endpoint for HALSim proxy
app.get('/session/:sessionId/halsim/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'HALSim WebSocket Proxy',
        timestamp: new Date().toISOString()
    });
});

server.listen(port, () => {
    console.log(`HALSim Proxy Server running on port ${port}`);
    console.log(`Proxying WebSocket requests to HALSim server at ws://localhost:3300/wpilibws`);
});
