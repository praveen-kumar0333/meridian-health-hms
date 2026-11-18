import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './backend/config/db.js';
import { createApiRouter } from './backend/app.js';
import { ensureInitialAdmin } from './backend/utils/seedAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const start = async () => {
  const app = express();
  app.set('trust proxy', 1);

  // Attempt MongoDB connection only if MONGO_URI is provided in environment
  const connected = await connectDB();
  if (connected) {
    await ensureInitialAdmin();
  }

  // Mount backend API under /api
  app.use('/api', createApiRouter());

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Meridian Health HMS running on http://0.0.0.0:${PORT}`);
  });
};

start();
