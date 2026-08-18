/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_KEY: string
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_URL?: string
  readonly VITE_WAAFI_CURRENCY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
