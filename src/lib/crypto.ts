/**
 * Symmetric encryption utilities for storing IMAP/SMTP passwords in the DB.
 *
 * Algorithm: AES-256-CBC
 * Key source: ENCRYPTION_KEY env var (must be 64 hex characters = 32 bytes)
 *
 * Encrypted format: "<iv_hex>:<ciphertext_hex>"
 * - iv  : 16 random bytes (128-bit IV), re-generated on every encrypt call
 * - ciphertext: AES-256-CBC encrypted ciphertext
 *
 * Security notes:
 *  - Each encryption call uses a fresh random IV, so the same plaintext
 *    produces different ciphertexts every time.
 *  - This is envelope encryption at the application layer. For higher security
 *    in production, consider using a KMS (AWS KMS, Google Cloud KMS) to wrap
 *    the encryption key itself.
 *  - Never log or expose decrypted passwords.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // AES block size

// ---------------------------------------------------------------------------
// Key loading
// ---------------------------------------------------------------------------

function loadKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;

  if (!hexKey) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        "Generate one with: openssl rand -hex 32"
    );
  }

  if (!/^[0-9a-f]{64}$/i.test(hexKey)) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). " +
        "Generate one with: openssl rand -hex 32"
    );
  }

  return Buffer.from(hexKey, "hex");
}

// ---------------------------------------------------------------------------
// encrypt / decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext string using AES-256-CBC.
 *
 * @param text - The plaintext to encrypt (e.g. an IMAP password).
 * @returns    - A string in the format "<iv_hex>:<ciphertext_hex>".
 */
export function encrypt(text: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a ciphertext string produced by {@link encrypt}.
 *
 * @param encrypted - A string in the format "<iv_hex>:<ciphertext_hex>".
 * @returns         - The original plaintext.
 * @throws          - If the format is invalid or decryption fails.
 */
export function decrypt(encrypted: string): string {
  const key = loadKey();

  const parts = encrypted.split(":");
  if (parts.length !== 2) {
    throw new Error(
      "Invalid encrypted value format. Expected '<iv_hex>:<ciphertext_hex>'."
    );
  }

  const [ivHex, ciphertextHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  if (iv.length !== IV_LENGTH) {
    throw new Error(
      `Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}.`
    );
  }

  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
