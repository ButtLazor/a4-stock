export function preference(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(`vmg-${key}`, value);
    return localStorage.getItem(`vmg-${key}`);
  } catch {
    return null;
  }
}
