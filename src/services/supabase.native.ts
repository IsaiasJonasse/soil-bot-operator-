import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

type NativeCryptoRuntime = {
  getRandomValues: (array: Uint8Array | Uint32Array) => Uint8Array | Uint32Array;
  subtle: {
    digest: (algorithm: AlgorithmIdentifier, data: BufferSource) => Promise<ArrayBuffer>;
  };
};

class NativeTextEncoder {
  readonly encoding = 'utf-8';

  encode(input = ''): Uint8Array {
    const bytes: number[] = [];
    for (let index = 0; index < input.length; index += 1) {
      let codePoint = input.charCodeAt(index);
      if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
        const lowSurrogate = input.charCodeAt(index + 1);
        if (lowSurrogate >= 0xdc00 && lowSurrogate <= 0xdfff) {
          codePoint = ((codePoint - 0xd800) << 10) + lowSurrogate - 0xdc00 + 0x10000;
          index += 1;
        } else {
          codePoint = 0xfffd;
        }
      } else if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
        codePoint = 0xfffd;
      }

      if (codePoint <= 0x7f) bytes.push(codePoint);
      else if (codePoint <= 0x7ff) bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
      else if (codePoint <= 0xffff) bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
      else bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    }
    return new Uint8Array(bytes);
  }
}

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextEncoder', {
    configurable: true,
    value: NativeTextEncoder,
    writable: true,
  });
}

if (typeof globalThis.btoa === 'undefined') {
  Object.defineProperty(globalThis, 'btoa', {
    configurable: true,
    value: (binary: string) => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      for (let index = 0; index < binary.length; index += 3) {
        const first = binary.charCodeAt(index);
        const hasSecond = index + 1 < binary.length;
        const hasThird = index + 2 < binary.length;
        const second = hasSecond ? binary.charCodeAt(index + 1) : 0;
        const third = hasThird ? binary.charCodeAt(index + 2) : 0;
        if (first > 0xff || second > 0xff || third > 0xff) {
          throw new Error('The string to encode contains characters outside the Latin1 range.');
        }
        result += alphabet[first >> 2];
        result += alphabet[((first & 0x03) << 4) | (second >> 4)];
        result += hasSecond ? alphabet[((second & 0x0f) << 2) | (third >> 6)] : '=';
        result += hasThird ? alphabet[third & 0x3f] : '=';
      }
      return result;
    },
    writable: true,
  });
}

const runtime = globalThis as typeof globalThis & { crypto?: NativeCryptoRuntime };
const existingCrypto = runtime.crypto;
const nativeCrypto = Object.create(existingCrypto ?? null) as NativeCryptoRuntime;
const subtle = Object.create(existingCrypto?.subtle ?? null) as NativeCryptoRuntime['subtle'];

nativeCrypto.getRandomValues = (array) => ExpoCrypto.getRandomValues(array);
subtle.digest = (algorithm, data) => {
  const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
  if (name !== ExpoCrypto.CryptoDigestAlgorithm.SHA256) {
    return Promise.reject(new Error(`Unsupported native WebCrypto digest: ${name}`));
  }
  return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
};
nativeCrypto.subtle = subtle;
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: nativeCrypto,
  writable: true,
});

if (typeof globalThis.crypto?.subtle?.digest !== 'function' || typeof globalThis.TextEncoder === 'undefined') {
  throw new Error('Secure PKCE crypto could not be initialized for this native runtime.');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const authConfigured = Boolean(supabaseUrl && supabaseKey);

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = authConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
