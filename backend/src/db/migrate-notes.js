import { query } from '../config/db.js';

await query(`
  ALTER TABLE follow_up_sessions
  ADD COLUMN IF NOT EXISTS notes TEXT;
`);
console.log('✅ Colonne notes ajoutée à follow_up_sessions');
process.exit(0);
