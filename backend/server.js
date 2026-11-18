import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { createBackendApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5000;
const app = createBackendApp();

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[Backend] Hospital Management API running on port ${PORT}`);
  });
};

startServer();
