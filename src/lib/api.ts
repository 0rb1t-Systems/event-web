import axios, { type AxiosError, type AxiosInstance } from "axios";

import { env } from "./env";
import {
  organizerSessionStorage,
  participantSessionStorage,
} from "./authStorage";
import { getApiErrorCode } from "./apiError";

const API_KEY_ERROR_CODES = new Set(["missing_api_key", "invalid_api_key"]);

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: env.apiBaseUrl,
    headers: {
      Accept: "application/json",
      "X-API-Key": env.apiKey,
    },
  });
}

function attachBearer(
  client: AxiosInstance,
  getToken: () => string | null,
): void {
  client.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });
}

function attachExpiredSessionHandler(
  client: AxiosInstance,
  options: {
    getToken: () => string | null;
    clear: () => void;
    redirectTo: string;
  },
): void {
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const code = getApiErrorCode(error.response?.data);

      if (
        error.response?.status === 401 &&
        !API_KEY_ERROR_CODES.has(code ?? "") &&
        options.getToken()
      ) {
        options.clear();

        if (typeof window !== "undefined") {
          window.location.assign(options.redirectTo);
        }
      }

      return Promise.reject(error);
    },
  );
}

export const publicApi = createClient();

export const participantApi = createClient();

attachBearer(participantApi, () => participantSessionStorage.getToken());
attachExpiredSessionHandler(participantApi, {
  getToken: () => participantSessionStorage.getToken(),
  clear: () => participantSessionStorage.clear(),
  redirectTo: "/auth?expired=1",
});

export const organizerApi = createClient();

attachBearer(organizerApi, () => organizerSessionStorage.getToken());
attachExpiredSessionHandler(organizerApi, {
  getToken: () => organizerSessionStorage.getToken(),
  clear: () => organizerSessionStorage.clear(),
  redirectTo: "/organizer/login?expired=1",
});
