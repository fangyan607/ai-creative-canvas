// ---------------------------------------------------------------------------
// Web Crypto AES-256-GCM Encryption Utilities
//
// Implements AES-256-GCM encryption via the Web Crypto API (SubtleCrypto)
// with PBKDF2 key derivation for API key protection at rest in IndexedDB.
//
// Per D-09: App-level encryption key (not passphrase-based) for MVP velocity.
// Upgrading to user-passphrase-based encryption only requires changing
// deriveEncryptionKey(). All other functions remain unchanged.
//
// Per RESEARCH.md Pattern 2: Versioned key scheme (Pitfall 6) — keyVersion
// stored alongside ciphertext enables future key rotation without data loss.
// ---------------------------------------------------------------------------

/** Current encryption key version. Increment on key rotation. */
const KEY_VERSION = 'v0.1'

/** App-level secret used for PBKDF2 key derivation (MVP only, per D-09). */
const APP_KEY_BASE = 'ac-canvas-ai-core-encryption-v0.1'

/** PBKDF2 iterations: OWASP 2023 recommended minimum for SHA-256. */
const PBKDF2_ITERATIONS = 600000

/** Static salt for PBKDF2. A per-user salt (derived from user identity)
 *  would be stronger but adds complexity not warranted for MVP single-user
 *  client-side storage. */
const SALT = new TextEncoder().encode('ai-canvas-provider-key-salt')

// ---------------------------------------------------------------------------
// Key Derivation
// ---------------------------------------------------------------------------

/**
 * Derive an AES-256-GCM encryption key from the app-level secret.
 *
 * This is the ONLY function that needs to change when upgrading to
 * user-passphrase-based encryption (per D-09 Claude's discretion note):
 * replace `APP_KEY_BASE` with the user's passphrase-derived key material,
 * and use a per-user salt instead of the static SALT.
 */
async function deriveEncryptionKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(APP_KEY_BASE),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export interface EncryptedData {
  /** AES-256-GCM ciphertext, base64-encoded. */
  ciphertext: string
  /** Random 12-byte IV, base64-encoded. */
  iv: string
  /** Key version used for encryption (enables rotation per Pitfall 6). */
  keyVersion: string
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypt an API key string.
 * Returns base64-encoded ciphertext and IV with the current key version.
 */
export async function encryptApiKey(apiKey: string): Promise<EncryptedData> {
  const key = await deriveEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(apiKey),
  )
  return {
    ciphertext: base64Encode(new Uint8Array(ciphertext)),
    iv: base64Encode(iv),
    keyVersion: KEY_VERSION,
  }
}

/**
 * Decrypt an API key from base64-encoded ciphertext and IV.
 *
 * @param ciphertext - Base64-encoded AES-256-GCM ciphertext
 * @param iv - Base64-encoded 12-byte initialization vector
 * @param keyVersion - Key version used when encrypting (for rotation support)
 * @returns Decrypted API key string
 * @throws If decryption fails (wrong key, tampered ciphertext)
 */
export async function decryptApiKey(
  ciphertext: string,
  iv: string,
  keyVersion: string,
): Promise<string> {
  // Future: check keyVersion and use appropriate key derivation
  // For v0.1, all keys use the same derivation
  const key = await deriveEncryptionKey()
  // Using void to acknowledge keyVersion — supresses unused-parameter warnings
  void keyVersion
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Decode(iv) },
    key,
    base64Decode(ciphertext),
  )
  return new TextDecoder().decode(decrypted)
}

// ---------------------------------------------------------------------------
// Base64 Helpers
// ---------------------------------------------------------------------------

function base64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function base64Decode(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}
