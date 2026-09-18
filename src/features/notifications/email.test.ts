import { describe, expect, it, vi } from 'vitest';
import { messageEmail, processMessageEmailQueue, type EmailQueue } from './email';

const job = {
  id: 'job-1',
  conversation_id: 'thread-1',
  recipient_email: 'student@uwaterloo.ca',
  lease: 'lease-1',
};
const config = {
  apiKey: 'test-key',
  from: 'Trovun <messages@example.com>',
  siteUrl: 'https://example.com',
};
function queue(eligible = true): EmailQueue {
  return {
    claim: vi.fn().mockResolvedValue({ data: [job], error: null }),
    eligible: vi.fn().mockResolvedValue({ data: eligible, error: null }),
    finish: vi.fn().mockResolvedValue({ error: null }),
  };
}
describe('message email delivery', () => {
  it('links to the conversation and notification preference without disclosing message content', () => {
    const mail = messageEmail(job, config);
    expect(mail.to).toEqual([job.recipient_email]);
    expect(mail.text).toContain('https://example.com/messages?conversation=thread-1');
    expect(mail.html).toContain('https://example.com/profile#notifications');
    expect(mail.subject).toBe('You have a new message on Trovun');
  });
  it('uses a stable idempotency key and acknowledges the lease after delivery', async () => {
    const q = queue();
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    expect(await processMessageEmailQueue(q, config, request)).toEqual({
      configured: true,
      sent: 1,
      failed: 0,
    });
    expect(request.mock.calls[0][1].headers['Idempotency-Key']).toBe('trovun-message-job-1');
    expect(q.finish).toHaveBeenCalledWith('job-1', 'lease-1', 'sent');
  });
  it('rechecks preferences/read state immediately before sending', async () => {
    const q = queue(false);
    const request = vi.fn();
    await processMessageEmailQueue(q, config, request);
    expect(request).not.toHaveBeenCalled();
    expect(q.finish).toHaveBeenCalledWith('job-1', 'lease-1', 'cancelled');
  });
  it('fails closed if preference checking fails', async () => {
    const q = queue();
    vi.mocked(q.eligible).mockResolvedValue({ data: null, error: new Error('offline') });
    const request = vi.fn();
    await processMessageEmailQueue(q, config, request);
    expect(request).not.toHaveBeenCalled();
    expect(q.finish).toHaveBeenCalledWith('job-1', 'lease-1', 'retry');
  });
  it.each([429, 500])('retries a provider failure (%s) without marking sent', async (status) => {
    const q = queue();
    const result = await processMessageEmailQueue(
      q,
      config,
      vi.fn().mockResolvedValue(new Response('{}', { status })),
    );
    expect(result).toEqual({ configured: true, sent: 0, failed: 1 });
    expect(q.finish).toHaveBeenCalledWith('job-1', 'lease-1', 'retry');
  });
  it('does not acknowledge jobs without an owned lease', async () => {
    const q = queue();
    vi.mocked(q.claim).mockResolvedValue({ data: [{ ...job, lease: null }], error: null });
    const request = vi.fn();
    await processMessageEmailQueue(q, config, request);
    expect(request).not.toHaveBeenCalled();
    expect(q.finish).not.toHaveBeenCalled();
  });
});
