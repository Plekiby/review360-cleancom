import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'review360_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

try {
  await pool.query(schema);
  console.log('✅ Migrations appliquées avec succès');
} catch (err) {
  console.error('❌ Erreur migration:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
