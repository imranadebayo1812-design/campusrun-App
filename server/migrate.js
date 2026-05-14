import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  host: 'db.xwnedkgpwhbmoxanhmth.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Adebayo@106#',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('Connecting to Supabase database...');
  await client.connect();
  console.log('Connected!\n');

  const files = [
    join(__dirname, '../supabase/migrations/001_initial_schema.sql'),
    join(__dirname, '../supabase/migrations/002_wallet_rpc.sql'),
  ];

  for (const file of files) {
    const name = file.split('/').pop();
    console.log(`Running ${name}...`);
    try {
      const sql = readFileSync(file, 'utf8');
      await client.query(sql);
      console.log(`✓ ${name} done\n`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`⚠ ${name} — some objects already exist, skipping\n`);
      } else {
        console.error(`✗ ${name} failed:`, err.message, '\n');
      }
    }
  }

  // Make you admin
  console.log('Setting admin account...');
  await client.query(
    `UPDATE public.profiles SET is_admin = true WHERE email = 'imranadebayo1812@gmail.com'`
  );
  console.log('✓ Admin set\n');

  await client.end();
  console.log('All done! Your database is ready.');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
