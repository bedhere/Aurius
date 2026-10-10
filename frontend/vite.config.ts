import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const publicUploadDirectories = new Set(['brand', 'dealers', 'products']);

function serveUploads() {
  const uploadsRoot = path.resolve(__dirname, '../uploads');

  return {
    name: 'serve-local-public-uploads',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: { url?: string }, res: { statusCode: number; end: () => void }, next: () => void) => void) => void } }) {
      server.middlewares.use('/uploads', (req, res, next) => {
        const pathname = decodeURIComponent((req.url ?? '').split('?')[0]);
        const segments = pathname.split('/').filter(Boolean);

        if (segments.length !== 2 || !publicUploadDirectories.has(segments[0])) {
          res.statusCode = 404;
          res.end();
          return;
        }

        const filePath = path.resolve(uploadsRoot, ...segments);
        const allowedDirectory = path.resolve(uploadsRoot, segments[0]) + path.sep;

        if (!filePath.startsWith(allowedDirectory) || !fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end();
          return;
        }

        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Type', contentTypeFor(filePath));
        fs.createReadStream(filePath).pipe(res as never);
      });
    },
  };
}

function contentTypeFor(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  return extension === '.png' ? 'image/png'
    : extension === '.webp' ? 'image/webp'
      : extension === '.svg' ? 'image/svg+xml'
        : 'image/jpeg';
}

export default defineConfig({
  plugins: [react(), serveUploads()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
