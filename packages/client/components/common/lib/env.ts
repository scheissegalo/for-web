export const NORTH_CHAT_HOST = "talk.north-industries.com";
const NORTH_CHAT_API = "https://talk.north-industries.com/api";

/** App config endpoint format */
export interface AppConfig {
  api: string;
}

/**
 * Fetch env var by name, optionally only when in dev mode.
 * Also prevents compiler from optimizing out injected strings in Docker
 */
const getEnv = (name: string, devOnly?: boolean) =>
  !devOnly || import.meta.env.DEV
    ? (import.meta.env[name] as string)
    : undefined;

/** North Chat is a single self-hosted instance, so hosts are not rewritten. */
export const normalizeHost = (host: string) => host;

const isNorthChatAPI = (api: string) => api === NORTH_CHAT_API;

const DEFAULT_HOST = normalizeHost(
  getEnv("VITE_DEV_HOST", true) ||
    getEnv("VITE_HOST") ||
    NORTH_CHAT_HOST,
);

const DEFAULT_API_URL =
  getEnv("VITE_DEV_API_URL", true) || getEnv("VITE_API_URL") || NORTH_CHAT_API;

if (!isNorthChatAPI(DEFAULT_API_URL) && DEFAULT_HOST === NORTH_CHAT_HOST)
  console.error("VITE_HOST required when VITE_API_URL is set!");

export default {
  /** Default instance (without the protocol) */
  DEFAULT_HOST,
  /** API URL of default instance */
  DEFAULT_API_URL,
  /** WS server override for development */
  DEV_WS_URL: getEnv("VITE_DEV_WS_URL", true),
  /** Media server override for development */
  DEV_MEDIA_URL: getEnv("VITE_DEV_MEDIA_URL", true),
  /** Proxy server override for development */
  DEV_PROXY_URL: getEnv("VITE_DEV_PROXY_URL", true),
  /** Gifbox server override for development */
  DEV_GIFBOX_URL: getEnv("VITE_DEV_GIFBOX_URL", true),
  /** Gifbox URL for production / self-hosted builds */
  GIFBOX_URL: getEnv("VITE_GIFBOX_URL"),
  /**
   * RNNoise worklet CDN host location. Defaults to blank, which uses the url provided by the livekit-rnnoise-processor package.
   */
  RNNOISE_WORKLET_CDN_URL: getEnv("VITE_RNNOISE_WORKLET_CDN_URL"),
  /**
   * Session ID to set during development.
   */
  DEVELOPMENT_SESSION_ID: getEnv("VITE_SESSION_ID", true),
  /**
   * Token to set during development.
   */
  DEVELOPMENT_TOKEN: getEnv("VITE_TOKEN", true),
  /**
   * User ID to set during development.
   */
  DEVELOPMENT_USER_ID: getEnv("VITE_USER_ID", true),
};
