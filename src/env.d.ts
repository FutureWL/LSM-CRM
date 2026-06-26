/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STORAGE_PREFIX: string
  readonly VITE_SEED_ENABLED: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_VERSION: string
  readonly VITE_BUILD_TIME: string
  readonly VITE_GIT_SHA: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
