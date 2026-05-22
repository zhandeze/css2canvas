import http from 'node:http';
import {promises as fs} from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const host = '127.0.0.1';
const port = 4173;

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
]);

const server = http.createServer(async (req, res) => {
  try {
    const requestPath = new URL(req.url ?? '/', `http://${host}:${port}`).pathname;
    const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(root, safePath);
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {'content-type': contentTypes.get(ext) ?? 'text/plain; charset=utf-8'});
    res.end(file);
  } catch {
    res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
    res.end('not found');
  }
});

server.listen(port, host, () => {
  console.log(`static server listening on http://${host}:${port}`);
});
