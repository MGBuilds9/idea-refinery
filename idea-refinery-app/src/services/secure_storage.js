import { encryptData, decryptData, hashPin } from './crypto';
import { db, saveSetting, getSetting } from './db';

/**
 * secure_storage.js
 * 
 * Manages encrypted storage of sensitive data (API keys) using the user's PIN.
 * This replaces direct localStorage usage for keys.
 * 
 * Strategy:
 * 1. PIN Hash is stored in Dexie DB (via db.js/saveSetting) for verification.
 * 2. Sensitive data is encrypted with the actual PIN and stored in localStorage.
 * 3. We NEVER store the PIN itself. The user must enter it to decrypt.
 */

const STORAGE_PREFIX = 'secure_';

export const SecureStorage = {
  
  /**
   * Verify if the entered PIN matches the stored hash
   * @param {string} pin - The PIN to verify
   * @returns {Promise<boolean>}
   */
  async verifyPin(pin) {
    if (!pin) return false;
    const storedHash = await getSetting('pinHash');
    if (!storedHash) return true; // No PIN set means everything is open/valid
    
    const inputHash = await hashPin(pin);
    return inputHash === storedHash;
  },

  /**
   * Set a new PIN. Warning: This does NOT re-encrypt existing data.
   * You should decrypt all data with old PIN, then encrypt with new PIN.
   * For this lightweight app, we will assume this is a "Fresh Setup" or "Change PIN" 
   * where the caller handles the re-encryption flow if needed.
   */
  async setPin(pin) {
    const hash = await hashPin(pin);
    await saveSetting('pinHash', hash);
  },

  /**
   * Remove PIN protection.
   * Warning: This effectively leaves data encrypted with a PIN the user just "forgot".
   * The caller should decrypt data first if they want to keep it.
   */
  async removePin() {
    await saveSetting('pinHash', null);
  },

  /**
   * Check if PIN is enabled
   */
  async isPinSet() {
    const storedHash = await getSetting('pinHash');
    return !!storedHash;
  },

  /**
   * Save a sensitive value encrypted with the PIN.
   */
  async setItem(key, value, pin) {
    if (!pin) {
        throw new Error('PIN required to save secure item');
    }

    const encrypted = await encryptData(value, pin); // returns { cipherText, salt, iv }
    // Store as JSON string in localStorage
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ encrypted }));
  },

  /**
   * Retrieve and decrypt a value.
   */
  async getItem(key, pin) {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return null;
    }

    // Handle plaintext fallback ONLY if strictly no PIN is set globally (legacy support during migration)
    // But we want to enforce PIN use. So we only allow plain if verified that no PIN is set AND migration hasn't happened.
    // Actually, based on "Strict Mode" plan, we should REJECT plain for `getItem` if we expect it to be secure.
    // However, if we are in the middle of migration, we might need to read plain from standard localStorage, not this prefix.
    // So this `secured_` prefix should ALWAYS contain encrypted data.

    // Handle encrypted
    if (parsed.encrypted) {
      if (!pin) {
        throw new Error('PIN required to decrypt item');
      }
      try {
        const decrypted = await decryptData(parsed.encrypted, pin);
        return decrypted;
      } catch (e) {
        console.error('Decryption failed for', key, e);
        return null; // Wrong PIN or corrupted
      }
    }

    return null;
  },

  /**
   * Remove an item
   */
  removeItem(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },
  
  /**
   * Clear all secure items
   */
  clearAll() {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(k);
      }
    });
  }
};
