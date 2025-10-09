/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_NODE_ENV: string
  readonly VITE_ENABLE_VOICE_COMMANDS: string
  readonly VITE_ENABLE_BARCODE_SCANNING: string
  readonly VITE_ENABLE_NUTRITIONAL_ANALYSIS: string
  readonly VITE_GOOGLE_ANALYTICS_ID: string
  readonly VITE_MIXPANEL_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}