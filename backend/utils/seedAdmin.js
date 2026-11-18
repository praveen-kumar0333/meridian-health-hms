import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

export const ensureInitialAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn(
      '[Seed] ADMIN_EMAIL or ADMIN_PASSWORD not configured; skipping initial admin check.'
    );
    return { created: false, reason: 'missing_env' };
  }

  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return { created: false, reason: 'already_exists' };
    }

    const normalizedEmail = adminEmail.toLowerCase().trim();
    const existingEmailUser = await User.findOne({ email: normalizedEmail });
    if (existingEmailUser) {
      console.warn(
        '[Seed] An account with the configured ADMIN_EMAIL already exists under a non-admin role. No duplicate created.'
      );
      return { created: false, reason: 'email_conflict' };
    }

    await User.create({
      name: 'Hospital Administrator',
      email: normalizedEmail,
      password: adminPassword,
      role: 'admin',
      phone: '+1-555-0100',
    });
    console.log('[Seed] Initial administrator account created successfully.');
    return { created: true, reason: 'created' };
  } catch (error) {
    console.error('[Seed] Error ensuring initial admin:', error.message);
    return { created: false, reason: 'error' };
  }
};

const runCli = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error('[Seed] Cannot seed admin without a valid MONGO_URI.');
    process.exit(1);
  }

  try {
    const result = await ensureInitialAdmin();
    if (result.reason === 'missing_env') {
      process.exitCode = 1;
    } else if (result.reason === 'already_exists') {
      console.log('[Seed] An administrator account already exists. No duplicate created.');
    }
  } finally {
    await mongoose.disconnect();
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli();
}
