/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_BACKEND_API_BASE_URL: string;
  readonly VITE_EVALUATION_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
