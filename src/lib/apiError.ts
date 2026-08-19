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
 *
 * Priority:
 *  1. response.data.message  (backend human-readable text, e.g. "Insufficient balance")
 *  2. first meaningful validation/domain error from response.data.errors.*
 *  3. Axios network/timeout message
 *  4. fallback
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(error)) {
    // Network error / no response (timeout, DNS failure, etc.)
    if (!error.response) {
      if (error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout")) {
        return "The request timed out. Please check your connection and try again.";
      }
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

    // 1. Prefer backend's top-level human-readable message first (e.g. "Insufficient balance")
    //    This is what Laravel/Waafi surfaces for domain failures.
    if (data && typeof data === "object") {
      const message = (data as { message?: unknown }).message;
      if (
        typeof message === "string" &&
        message.trim() &&
        message !== "Validation failed" &&
        message !== "The given data was invalid."
      ) {
        return message;
      }
    }

    // 2. Fall back to first meaningful validation/field error
    const fieldMessage = firstValidationMessage(data);
    if (fieldMessage) {
      return friendlyValidationMessage(fieldMessage);
    }

    return fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

/**
 * Extract the best human-readable failure message from a WaafiPay/charge response.
 *
 * When `POST /participant/payments/charge` returns HTTP 200 but payment.status = "failed",
 * Laravel may expose the Waafi provider message via:
 *   - payment.failure_reason  (most direct — Waafi's human message)
 *   - payment.failure_code    (machine code, still useful if reason is absent)
 *
 * If the endpoint throws an HTTP error instead, use getApiErrorMessage on the caught error.
 *
 * Returns the best available message, never an empty string.
 */
export function getChargeFailureMessage(payment: {
  failure_reason?: string | null;
  failure_code?: string | null;
}): string {
  if (payment.failure_reason && payment.failure_reason.trim()) {
    return payment.failure_reason.trim();
  }
  if (payment.failure_code && payment.failure_code.trim()) {
    // failure_code is often a machine token — capitalise it for readability
    const code = payment.failure_code.trim();
    // If it looks like a human sentence already, return as-is
    if (/\s/.test(code)) return code;
    // Convert SNAKE_CASE / SCREAMING to "Snake case"
    return code
      .split(/[_\s]+/)
      .map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())
      .join(" ");
  }
  return "Payment was not completed.";
}

export function isUnverifiedAccountError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status !== 403) return false;
  const message = getApiErrorMessage(error, "");
  return /verify your email/i.test(message);
}

export function isOrganizerSuspendedError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status !== 403) return false;
  const code = getApiErrorCode(error.response.data);
  if (code === "organizer_suspended") return true;
  const message = getApiErrorMessage(error, "");
  return /suspended/i.test(message);
}

/** Cross-organizer event show/update/gallery returns 404 (and sometimes 403). Do not render leaked details. */
export function isOrganizerEventAccessError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 403 || status === 404;
}

export function isEventQuotaError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status !== 403) return false;
  const message = getApiErrorMessage(error, "");
  return /quota|no active subscription package/i.test(message);
}
