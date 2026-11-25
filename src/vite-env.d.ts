/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTROL_PLANE_URL?: string;
  readonly VITE_BUCKET_SERVICE_URL?: string;
  readonly VITE_BUCKET_URL?: string;
  readonly VITE_PRANA_SERVICE_URL?: string;
  readonly VITE_PRANA_URL?: string;
  readonly VITE_NIYANTRAN_URL?: string;
  readonly VITE_INSIGHTFLOW_URL?: string;
  readonly VITE_TANTRA_BASE_URL?: string;
  readonly VITE_RAJYA_BASE_URL?: string;
  readonly VITE_SANSKAR_BASE_URL?: string;
  readonly VITE_KARMA_URL?: string;
  readonly VITE_KESHAV_URL?: string;
  readonly VITE_SETU_URL?: string;
  readonly VITE_PRAVAH_URL?: string;
  readonly VITE_MITRA_URL?: string;
  readonly VITE_MITRA_LIVE_URL?: string;
  readonly VITE_AUTH_SERVER_URL?: string;
  readonly VITE_AUTH_UI_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
