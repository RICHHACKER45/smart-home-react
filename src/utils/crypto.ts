/**
 * Cryptographic Utility for Smart Home System
 * Uses standard Web Crypto API (crypto.subtle) for SHA-256 hashing.
 */

const DEFAULT_SALT = 'smart_home_sec_v1_';

/**
 * Computes a standard SHA-256 hexadecimal hash string.
 */
export async function hashString(value: string, salt: string = DEFAULT_SALT): Promise<string> {
  const clean = value.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + clean);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a plaintext value against a stored hash string.
 * Supports backward compatibility for legacy un-hashed test credentials.
 */
export async function verifyHash(
  plainValue: string, 
  storedHashOrPlain: string, 
  salt: string = DEFAULT_SALT
): Promise<boolean> {
  if (!plainValue || !storedHashOrPlain) return false;

  // 1. Check direct cryptographic hash match
  const computedHash = await hashString(plainValue, salt);
  if (computedHash.toLowerCase() === storedHashOrPlain.toLowerCase()) {
    return true;
  }

  // 2. Fallback for legacy demo/unhashed test credentials (e.g. 'password123', '1234')
  if (plainValue === storedHashOrPlain) {
    return true;
  }

  return false;
}
