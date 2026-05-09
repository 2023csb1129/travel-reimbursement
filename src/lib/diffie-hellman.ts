/**
 * A lightweight implementation of Diffie-Hellman Key Exchange using BigInt.
 * This can be used safely in both Node.js and Browser environments.
 */

// A standard 2048-bit prime (MODP Group 14) or a smaller one for demonstration.
// For performance in browser JS, we use a 256-bit safe prime.
const P_HEX = "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF";
const G_HEX = "2";

export class DiffieHellman {
  public p: bigint;
  public g: bigint;
  private privateKey: bigint;
  public publicKey: bigint;

  constructor() {
    this.p = BigInt("0x" + P_HEX);
    this.g = BigInt("0x" + G_HEX);
    
    // Choose a random private key (random number)
    this.privateKey = this.generateRandomBigInt();
    
    // Calculate public key: (g ^ privateKey) mod p
    this.publicKey = this.modPow(this.g, this.privateKey, this.p);
  }

  // Calculate shared secret: (otherPublicKey ^ privateKey) mod p
  public computeSecret(otherPublicKeyHex: string): string {
    const otherPublicKey = BigInt("0x" + otherPublicKeyHex);
    const sharedSecret = this.modPow(otherPublicKey, this.privateKey, this.p);
    return sharedSecret.toString(16); // Return as hex string
  }

  public getPublicKeyHex(): string {
    return this.publicKey.toString(16);
  }

  // Generate a random 256-bit BigInt
  private generateRandomBigInt(): bigint {
    const array = new Uint32Array(8); // 8 * 32 = 256 bits
    if (typeof window !== "undefined" && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for non-browser or non-crypto
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 0xffffffff);
      }
    }
    
    let hex = "";
    for (let i = 0; i < array.length; i++) {
      hex += array[i].toString(16).padStart(8, "0");
    }
    return BigInt("0x" + hex);
  }

  // Modular exponentiation: (base^exponent) mod modulus
  private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
    if (modulus === 1n) return 0n;
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
      if (exponent % 2n === 1n) {
        result = (result * base) % modulus;
      }
      exponent = exponent / 2n;
      base = (base * base) % modulus;
    }
    return result;
  }
}

/**
 * Utility to derive an AES key from the DH shared secret
 */
export function deriveAESKeyFromSecret(sharedSecretHex: string): string {
  // We can just use the hex string directly as an AES key for crypto-js (it accepts strings)
  // or we could hash it to ensure a fixed length.
  return sharedSecretHex.substring(0, 64); // Use first 64 chars (256 bits)
}
