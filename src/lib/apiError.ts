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
