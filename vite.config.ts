import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';
import dotenv from 'dotenv';
import path from 'path';

// Nạp biến môi trường từ .env và .env.local cho backend serverless function
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

function apiProxyPlugin() {
  return {
    name: 'api-chat-dev-server',
    configureServer(server: any) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url?.startsWith('/api/chat') && req.method === 'POST') {
          try {
            let body = '';
            for await (const chunk of req) {
              body += chunk;
            }
            const parsedBody = body ? JSON.parse(body) : {};

            const { default: handler } = await server.ssrLoadModule('/api/chat.ts');

            // Tạo đối tượng req/res tương thích chuẩn Vercel serverless function
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            const mockReq = {
              method: 'POST',
              body: parsedBody,
              headers: {
                ...req.headers,
                'x-forwarded-for': clientIp,
              },
              socket: req.socket,
            };

            const mockRes = {
              statusCode: 200,
              status(code: number) {
                this.statusCode = code;
                return this;
              },
              json(data: any) {
                res.writeHead(this.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(data));
              },
              setHeader(name: string, value: string) {
                res.setHeader(name, value);
                return this;
              }
            };

            await handler(mockReq, mockRes);
          } catch (error: any) {
            console.error('[API Proxy Error]:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              error: 'Lỗi máy chủ: ' + (error?.message || 'Không rõ nguyên nhân')
            }));
          }
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiProxyPlugin()],
  server: {
    port: 3000,
    host: true,
  }
});

