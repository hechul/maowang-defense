/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_SUPPORT_HOURS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
