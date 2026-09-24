import nextEnv from '@next/env';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

nextEnv.loadEnvConfig(process.cwd(), true);
const secret = process.env.CRON_SECRET;
const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.trovun.ca';
if (!secret || secret.length < 32)
  throw new Error(
    'Set the same strong CRON_SECRET (at least 32 characters) locally and on the deployed app first.',
  );
const origin = new URL(site);
if (origin.protocol !== 'https:')
  throw new Error('NEXT_PUBLIC_SITE_URL must be your deployed HTTPS site.');
// Read-only preflight: never enable a scheduler pointing at an undeployed route.
const response = await fetch(`${origin.origin}/api/cron/listing-reviews`, {
  redirect: 'error',
  signal: AbortSignal.timeout(10_000),
});
if (response.status !== 401)
  throw new Error('Deploy the protected listing review route before enabling its schedule.');
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const sql = `begin;
do $setup$ declare v_id uuid; begin
  select id into v_id from vault.secrets where name='trovun_ai_review_cron_secret';
  if v_id is null then perform vault.create_secret(${quote(secret)},'trovun_ai_review_cron_secret');
  else perform vault.update_secret(v_id,${quote(secret)}); end if;
  select id into v_id from vault.secrets where name='trovun_ai_review_url';
  if v_id is null then perform vault.create_secret(${quote(origin.origin + '/api/cron/listing-reviews')},'trovun_ai_review_url');
  else perform vault.update_secret(v_id,${quote(origin.origin + '/api/cron/listing-reviews')}); end if;
end $setup$;
select cron.schedule('trovun-ai-listing-reviews','* * * * *',$job$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name='trovun_ai_review_url'),
    headers := jsonb_build_object('Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='trovun_ai_review_cron_secret')),
    timeout_milliseconds := 110000
  );
$job$);
commit;`;
const dir = await mkdtemp(join(tmpdir(), 'trovun-ai-schedule-'));
try {
  const file = join(dir, 'schedule.sql');
  await writeFile(file, sql, { mode: 0o600 });
  // Never print raw SQL, credentials or CLI error details that might quote SQL.
  const result = spawnSync(
    join(process.cwd(), 'node_modules/.bin/supabase'),
    ['db', 'query', '--linked', '--file', file],
    { encoding: 'utf8' },
  );
  if (result.status !== 0)
    throw new Error(
      'Could not configure the schedule. Check Supabase CLI access and that Cron, Vault and pg_net are enabled.',
    );
  console.log('Listing review retry schedule configured: once per minute.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
