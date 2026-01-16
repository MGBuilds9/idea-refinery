/**
 * Web Crypto API helpers for secure local storage
 */

// Generate a key from a PIN
const getKeyMaterial = async (pin) => {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
};

// Derive an encryption key from the PIN
const getKey = async (pin, salt) => {
  const keyMaterial = await getKeyMaterial(pin);
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

// Hash a PIN for verification (without storing the actual PIN)
export const hashPin = async (pin) => {
  const enc = new TextEncoder();
  const data = enc.encode(pin);
  const hash = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Encrypt data using a PIN
 * Returns object with { cipherText, salt, iv }
 */
export const encryptData = async (data, pin) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(pin, salt);
  
  const enc = new TextEncoder();
  const encoded = enc.encode(JSON.stringify(data));
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoded
  );

  return {
    cipherText: Array.from(new Uint8Array(encrypted)),
    salt: Array.from(salt),
    iv: Array.from(iv)
  };
};

/**
 * Decrypt data using a PIN
 */
export const decryptData = async (encryptedData, pin) => {
  try {
    const salt = new Uint8Array(encryptedData.salt);
    const iv = new Uint8Array(encryptedData.iv);
    const cipherText = new Uint8Array(encryptedData.cipherText);
    
    const key = await getKey(pin, salt);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      cipherText
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  } catch {
    throw new Error('Invalid PIN or corrupted data');
  }
};
