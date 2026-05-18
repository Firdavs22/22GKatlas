const http = require('http');

const targetHost = '127.0.0.1';
const targetPort = 3001;
const listenPort = Number(process.env.MOBILE_API_PROXY_PORT || 3002);

const server = http.createServer((req, res) => {
  const proxyReq = http.request(
    {
      hostname: targetHost,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${targetHost}:${targetPort}`,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: 'Mobile API proxy failed', error: err.message }));
  });

  req.pipe(proxyReq);
});

server.listen(listenPort, '0.0.0.0', () => {
  console.log(`Mobile API proxy: http://0.0.0.0:${listenPort} -> http://${targetHost}:${targetPort}`);
});
