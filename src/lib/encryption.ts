import crypto from "crypto";
import CryptoJS from "crypto-js";

// RSA + Diffie-Hellman Key Exchange and AES Encryption

/**
 * Generate RSA key pair for user
 */
export function generateRSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return {
    publicKey,
    privateKey,
  };
}

/**
 * Perform Diffie-Hellman key exchange
 */
export function performDiffieHellman() {
  const dh = crypto.createDiffieHellman(256);
  const publicKey = dh.generateKeys();
  const privateKey = dh.getPrivateKey();

  return {
    publicKey: publicKey.toString("hex"),
    privateKey: privateKey.toString("hex"),
    sharedSecret: null, // Will be computed after receiving peer's public key
  };
}

/**
 * Compute shared secret using Diffie-Hellman
 */
export function computeSharedSecret(
  privateKey: string,
  peerPublicKey: string
) {
  const dh = crypto.createDiffieHellman(
    Buffer.from(privateKey, "hex").length * 8
  );
  dh.setPrivateKey(Buffer.from(privateKey, "hex"));

  const sharedSecret = dh.computeSecret(Buffer.from(peerPublicKey, "hex"));
  return sharedSecret.toString("hex").substring(0, 32); // Get 256-bit key
}

/**
 * Encrypt content using AES
 */
export function encryptAES(plaintext: string, key: string): string {
  return CryptoJS.AES.encrypt(plaintext, key).toString();
}

/**
 * Decrypt content using AES
 */
export function decryptAES(ciphertext: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Sign content with RSA private key
 */
export function signContent(content: string, privateKey: string): string {
  const sign = crypto.createSign("SHA256");
  sign.update(content);
  return sign.sign(privateKey, "hex");
}

/**
 * Verify signature with RSA public key
 */
export function verifySignature(
  content: string,
  signature: string,
  publicKey: string
): boolean {
  const verify = crypto.createVerify("SHA256");
  verify.update(content);
  return verify.verify(publicKey, signature, "hex");
}

/**
 * Hash content for integrity check
 */
export function hashContent(content: string): string {
  return crypto
    .createHash("sha256")
    .update(content)
    .digest("hex");
}

export interface SecureMessagePayload {
  content: string;
  encryptedContent: string;
  contentHash: string;
  signature?: string;
  timestamp: number;
}

/**
 * Create secure message payload
 */
export function createSecureMessagePayload(
  plaintext: string,
  aesKey: string,
  privateKey?: string
): SecureMessagePayload {
  const encryptedContent = encryptAES(plaintext, aesKey);
  const contentHash = hashContent(plaintext);
  const signature = privateKey
    ? signContent(plaintext, privateKey)
    : undefined;

  return {
    content: plaintext,
    encryptedContent,
    contentHash,
    signature,
    timestamp: Date.now(),
  };
}

/**
 * Decrypt and verify secure message
 */
export function decryptSecureMessage(
  payload: SecureMessagePayload,
  aesKey: string,
  senderPublicKey?: string
): string | null {
  try {
    // Verify signature if available
    if (payload.signature && senderPublicKey) {
      const isValid = verifySignature(
        payload.content,
        payload.signature,
        senderPublicKey
      );
      if (!isValid) {
        console.error("Signature verification failed");
        return null;
      }
    }

    // Decrypt content
    const decrypted = decryptAES(payload.encryptedContent, aesKey);

    // Verify hash
    const computedHash = hashContent(decrypted);
    if (computedHash !== payload.contentHash) {
      console.error("Content hash verification failed");
      return null;
    }

    return decrypted;
  } catch (error) {
    console.error("Error decrypting message:", error);
    return null;
  }
}
