import { timingSafeEqual } from 'node:crypto';
import { dispatchMessageEmails } from '@/features/notifications/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret ?? ''}`);
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  }
  try {
    const result = await dispatchMessageEmails();
    return Response.json(result, { status: result.configured ? 200 : 503, headers });
  } catch {
    return Response.json({ error: 'Notification processing failed' }, { status: 503, headers });
  }
}
