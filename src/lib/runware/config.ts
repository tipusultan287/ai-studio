import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * ─── RUNWARE API KEY ─────────────────────────────────────────────────────────
 * Put your key in `.env` as EXPO_PUBLIC_RUNWARE_API_KEY=...  (see .env.example)
 * or paste it in the app under Settings → Runware API key (stored in SecureStore,
 * takes precedence over the env value).
 * For production, set EXPO_PUBLIC_RUNWARE_PROXY_URL to your backend instead.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const RUNWARE_API_URL = 'https://api.runware.ai/v1';
export const ENV_API_KEY = process.env.EXPO_PUBLIC_RUNWARE_API_KEY ?? '';
export const PROXY_URL = process.env.EXPO_PUBLIC_RUNWARE_PROXY_URL ?? '';

const STORE_KEY = 'runware_api_key';
let cached: string | null = null;

async function storeGet(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(STORE_KEY) ?? null;
  return SecureStore.getItemAsync(STORE_KEY);
}

export async function getApiKey(): Promise<string> {
  if (cached !== null) return cached || ENV_API_KEY;
  cached = (await storeGet()) ?? '';
  return cached || ENV_API_KEY;
}

export async function setApiKey(key: string) {
  cached = key.trim();
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(STORE_KEY, cached);
    return;
  }
  if (cached) await SecureStore.setItemAsync(STORE_KEY, cached);
  else await SecureStore.deleteItemAsync(STORE_KEY);
}

export async function hasApiKey() {
  return !!PROXY_URL || !!(await getApiKey());
}

export function maskKey(k: string) {
  if (!k) return '';
  return k.length <= 8 ? '••••' : `${k.slice(0, 4)}••••${k.slice(-4)}`;
}
