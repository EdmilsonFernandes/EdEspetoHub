import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';

const DEFAULT_TIMEOUT_MS = 1200;

async function withTimeout<T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('clipboard-timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

export async function readMfaClipboardText(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  let nativeError: unknown;

  if (Capacitor.isNativePlatform()) {
    try {
      const result = await withTimeout(Clipboard.read(), timeoutMs);
      if (result?.value) {
        return result.value;
      }
    } catch (error) {
      nativeError = error;
    }
  }

  if (navigator.clipboard?.readText) {
    return withTimeout(navigator.clipboard.readText(), timeoutMs);
  }

  throw nativeError || new Error('clipboard-unavailable');
}
