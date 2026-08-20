/**
 * Google Identity Services helpers for participant Continue with Google.
 * Uses OAuth access-token popup (works with our custom button).
 */

import { env } from "@/lib/env";

const GIS_SRC = "https://accounts.google.com/gsi/client";

type TokenClient = {
  requestAccessToken: (override?: { prompt?: string }) => void;
};

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
      error_callback?: (error: { type?: string; message?: string }) => void;
    }) => TokenClient;
  };
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google sign-in.")));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/** Opens Google account picker and returns an OAuth access token. */
export async function requestGoogleAccessToken(): Promise<string> {
  const clientId = env.googleClientId;
  if (!clientId) {
    throw new Error(
      "Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID (and matching GOOGLE_CLIENT_ID on the API).",
    );
  }

  await loadGisScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google sign-in failed to initialize.");
  }

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error || "Google sign-in was cancelled."));
          return;
        }
        if (!response.access_token) {
          reject(new Error("Google did not return an access token."));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error.message || error.type || "Google sign-in was cancelled."));
      },
    });

    client.requestAccessToken({ prompt: "select_account" });
  });
}

export function isGoogleSignInConfigured(): boolean {
  return Boolean(env.googleClientId);
}
