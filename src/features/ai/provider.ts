import 'server-only';

// No tools or external browsing: all responses are bounded, structured suggestions.
export async function structuredResponse(instructions: string, input: unknown, schema: object) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('AI unavailable');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(18_000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      store: false,
      max_output_tokens: 1200,
      instructions,
      input,
      text: { format: { type: 'json_schema', name: 'marketplace_result', strict: true, schema } },
    }),
  });
  if (!response.ok) throw new Error('AI unavailable');
  const payload = await response.json();
  if (payload.status !== 'completed') throw new Error('AI incomplete');
  const output = payload.output
    ?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? [])
    .filter((part: { type: string }) => part.type === 'output_text')
    .map((part: { text: string }) => part.text)
    .join('');
  return JSON.parse(output);
}
