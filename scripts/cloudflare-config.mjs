import fs from 'node:fs';

// This is the public D1 database UUID shown in the owner's Cloudflare dashboard.
// It is a database locator, NOT an API token, password, or access credential.
// A build variable can override it for a different account or deployment.
const DEFAULT_KEYDERBY_D1_DATABASE_ID = 'b29fbc9f-6c3e-4dbc-9dca-540bd86219b5';
const supplied = process.env.KEYDERBY_D1_DATABASE_ID?.trim();
const id = supplied || DEFAULT_KEYDERBY_D1_DATABASE_ID;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuid.test(id)) {
  throw new Error('Invalid KEYDERBY_D1_DATABASE_ID. Use the real D1 database UUID from Cloudflare, not an API token.');
}
const generated = 'dist/server/wrangler.json';
if (!fs.existsSync(generated)) {
  throw new Error('Build output missing. Run pnpm build before pnpm cloudflare:config.');
}
const config = JSON.parse(fs.readFileSync(generated, 'utf8'));
config.name = 'keyderby';
config.d1_databases = [{ binding: 'DB', database_name: 'keyderby', database_id: id, migrations_dir: '../../drizzle' }];
config.workers_dev = true;
config.assets = { ...config.assets, directory: '../client' };
fs.writeFileSync('dist/server/wrangler.cloudflare.json', JSON.stringify(config, null, 2) + '\n');
console.log('Prepared Cloudflare Worker with D1 binding DB (keyderby). Database UUID source: ' + (supplied ? 'KEYDERBY_D1_DATABASE_ID build variable' : 'owner-confirmed repository default') + '.');
