const missingEnvironmentVariable = (name: string) =>
  new Error(
    `Missing ${name}. Add the Supabase project credentials to .env.local before starting Trovun.`,
  );

export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw missingEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!publishableKey) {
    throw missingEnvironmentVariable('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  return { publishableKey, url };
}
