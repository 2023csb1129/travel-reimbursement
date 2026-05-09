import CryptoJS from "crypto-js";

/**
 * Encrypt content using AES (Browser Safe)
 */
export function encryptAES(plaintext: string, key: string): string {
  return CryptoJS.AES.encrypt(plaintext, key).toString();
}

/**
 * Decrypt content using AES (Browser Safe)
 */
export function decryptAES(ciphertext: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}
