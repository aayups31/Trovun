import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
nextEnv.loadEnvConfig(process.cwd(), true);
const result = spawnSync(
  join(process.cwd(), 'node_modules/.bin/vitest'),
  ['run', 'src/features/ai/live-smoke.test.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, TROVUN_AI_LIVE_TEST: '1' },
  },
);
process.exitCode = result.status ?? 1;
