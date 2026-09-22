function requiredEnvironmentVariable(name: string, value: string | undefined): string {
  const configuredValue = value?.trim();

  if (!configuredValue) {
    throw new Error(
      `Missing ${name}. Add it to .env.local or your deployment environment variables.`,
    );
  }

  return configuredValue;
}

export const config = {
  supabaseUrl: requiredEnvironmentVariable(
    'VITE_SUPABASE_URL',
    import.meta.env.VITE_SUPABASE_URL,
  ),
  supabasePublishableKey: requiredEnvironmentVariable(
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  ),
  refreshMs: 3000,
  timezone: 'Indian/Maldives',
} as const;