import nextEnv from '@next/env';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());
const required = ['RESEND_API_KEY', 'MESSAGE_EMAIL_FROM'];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(
    `Add ${missing.join(' and ')} to .env.local, then run this command again. Do not commit credentials.`,
  );
  process.exit(1);
}
const siteUrl =
  process.env.MESSAGE_EMAIL_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.trovun.ca';
if (new URL(siteUrl).protocol !== 'https:') {
  console.error('Set MESSAGE_EMAIL_SITE_URL to the public HTTPS app URL.');
  process.exit(1);
}
const values = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  MESSAGE_EMAIL_FROM: process.env.MESSAGE_EMAIL_FROM,
  MESSAGE_EMAIL_SITE_URL: new URL(siteUrl).origin,
};
if (Object.values(values).some((value) => /[\r\n]/.test(value)))
  throw new Error('Configuration values must be single-line');
const dir = await mkdtemp(join(tmpdir(), 'trovun-mail-config-'));
try {
  const file = join(dir, 'worker.env');
  await writeFile(
    file,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n'),
    { mode: 0o600 },
  );
  const result = spawnSync(
    join(process.cwd(), 'node_modules/.bin/supabase'),
    ['secrets', 'set', '--env-file', file],
    { stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else
    console.log(
      'Email provider configured. The scheduled worker processes unread messages every minute.',
    );
} finally {
  await rm(dir, { recursive: true, force: true });
}
