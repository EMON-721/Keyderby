// Read-only check of tracked repository files before publishing source code.
// Catches common committed credentials and private storage; cannot prove absence of all secrets.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const privateFiles = /(?:^|\/)(?:\.env(?:\.[^/]+)?|\.dev\.vars(?:\.[^/]+)?|service-account[^/]*\.json|credentials[^/]*\.json|[^/]+\.(?:pem|p12|sqlite|sqlite3|db))$/i;
const credentialPatterns = [
  /(?:github_pat_[A-Za-z0-9_]{50,}|gh[pousr]_[A-Za-z0-9]{30,})/g,
  /(?:sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{35,})/g,
  /AKIA[0-9A-Z]{16}/g,
  /AIza[0-9A-Za-z_-]{30,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
];
const warnings = [];
let scanned = 0;
for (const file of files) {
  if ((privateFiles.test(file) && file !== '.env.example') || /(?:^|\/)(?:\.wrangler|\.sites-runtime|backups)(?:\/|$)/i.test(file)) {
    warnings.push(`Private file is tracked: ${file}`);
    continue;
  }
  if (file === 'scripts/security-scan.mjs') continue;
  if (!/\.(?:js|mjs|cjs|jsx|ts|tsx|json|jsonc|yml|yaml|toml|md|sh|sql|txt)$/i.test(file) || statSync(file).size > 2_000_000) continue;
  const content = readFileSync(file, 'utf8');
  if (content.includes('\0')) continue;
  scanned++;
  for (const pattern of credentialPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) warnings.push(`Potential credential in tracked file: ${file}`);
  }
}
if (warnings.length) {
  for (const warning of warnings) console.error('SECURITY FAIL:', warning);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${files.length} tracked paths checked, ${scanned} text files scanned, no recognizable exposed credentials or private data files.`);
}
