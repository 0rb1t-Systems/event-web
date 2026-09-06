/**
 * Central Vite environment. Feature code should import `env` instead of
 * reading `import.meta.env` directly.
 *
 * VITE_API_KEY is a public client identifier sent as X-API-Key. It is
 * visible in browser JavaScript by design and is not a secret.
 */

function required(value: string | undefined, name: string): string {
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and configure the Event24 Web App environment.`,
    );
  }

  return value.trim();
}

const apiBaseUrl = required(
  import.meta.env.VITE_API_BASE_URL,
  "VITE_API_BASE_URL",
).replace(/\/+$/, "");

const apiKey = required(import.meta.env.VITE_API_KEY, "VITE_API_KEY");

export const env = {
  apiBaseUrl,
  apiKey,
  appName: import.meta.env.VITE_APP_NAME?.trim() || "Event24",
  appUrl:
    import.meta.env.VITE_APP_URL?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : ""),
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "",
  waafiCurrency: import.meta.env.VITE_WAAFI_CURRENCY?.trim() || "USD",
} as const;
