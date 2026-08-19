import axios from "axios";

export function getApiErrorCode(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as {
    error_code?: unknown;
    errors?: {
      error_code?: unknown;
    };
  };

  if (typeof payload.error_code === "string") {
    return payload.error_code;
  }

  const nested = payload.errors?.error_code;

  if (typeof nested === "string") {
    return nested;
  }

  if (Array.isArray(nested) && typeof nested[0] === "string") {
    return nested[0];
  }

  return null;
}

function firstValidationMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const errors = (data as { errors?: unknown }).errors;
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return null;

  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim() && value !== "participant_admin_login_forbidden") {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      if (value[0] === "participant_admin_login_forbidden") continue;
      return value[0];
    }
  }

  return null;
}

function friendlyValidationMessage(message: string): string {
  if (/already been taken/i.test(message)) {
    return "An account with this email already exists.";
  }
  return message;
}

/**
 * Human-readable API error for toasts/forms. Never returns raw JSON.
 * Does not surface participant_admin_login_forbidden (admin-panel only).
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Unable to connect. Check your internet connection and try again.";
    }

    const data = error.response.data;
    const code = getApiErrorCode(data);

    if (code === "missing_api_key" || code === "invalid_api_key") {
      return "This app is not configured correctly. Please try again later.";
    }

    if (code === "participant_admin_login_forbidden") {
      return fallback;
    }

    const fieldMessage = firstValidationMessage(data);
    if (fieldMessage) {
      return friendlyValidationMessage(fieldMessage);
    }

    if (data && typeof data === "object") {
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string" && message.trim() && message !== "Validation failed") {
        return message;
      }
    }

    return fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function isUnverifiedAccountError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status !== 403) return false;
  const message = getApiErrorMessage(error, "");
  return /verify your email/i.test(message);
}
