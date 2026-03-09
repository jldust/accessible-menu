#!/usr/bin/env node

import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
  try {
    let filePath = join(__dirname, req.url === '/' ? '/examples/basic.html' : req.url);
    
    // Remove query string if present
    filePath = filePath.split('?')[0];
    
    const stats = await stat(filePath);
    
    if (stats.isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
    
    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    const content = await readFile(filePath);
    
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
    
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - 200`);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>404 Not Found</title></head>
          <body>
            <h1>404 Not Found</h1>
            <p>The requested file was not found.</p>
            <p><a href="/examples/basic.html">Go to Demo</a></p>
          </body>
        </html>
      `);
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - 404`);
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      console.error(`${new Date().toISOString()} - ${req.method} ${req.url} - 500:`, error.message);
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Development server running at:`);
  console.log(`   Local:   http://${HOST}:${PORT}`);
  console.log(`   Demo:    http://${HOST}:${PORT}/examples/basic.html`);
  console.log(`\n📁 Serving files from: ${__dirname}`);
  console.log(`\n⌨️  Press Ctrl+C to stop the server\n`);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Development server stopped');
  process.exit(0);
});
