import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The question bank lives at the repo root so it reads well on GitHub; the app serves it under /questions.
const questionBank = (): Plugin => ({
  name: 'question-bank',
  configureServer(server) {
    server.middlewares.use('/questions', (request, response, next) => {
      const file = join(__dirname, 'questions', (request.url ?? '').split('?')[0]);
      if (!existsSync(file) || !statSync(file).isFile()) return next();
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      createReadStream(file).pipe(response);
    });
  },
  closeBundle() {
    cpSync(join(__dirname, 'questions'), join(__dirname, 'dist', 'questions'), { recursive: true });
  },
});

export default defineConfig({ plugins: [react(), questionBank()] });
