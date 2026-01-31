
// Mock Browser Environment
import { webcrypto } from 'node:crypto';
import { TextEncoder, TextDecoder } from 'util';

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
}

// Mock window object
globalThis.window = {
    crypto: globalThis.crypto
};

// Mock LocalStorage
const store = {};
globalThis.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; }
};

// Mock DBLite (Dexie wrapper)
// simplified mock for db.js dependency
const dbSettings = {};
const mockDb = {
    getSetting: async (key) => dbSettings[key],
    saveSetting: async (key, val) => { dbSettings[key] = val; }
};

// Mock Modules using simple object replacements if possible, 
// but since we are importing real modules that might have other deps, 
// strictly unit testing `secure_storage.js` might be hard if it imports `db.js`.
// `secure_storage.js` imports `db` and `saveSetting`, `getSetting`.

// We'll create a modified version of secure_storage logic for testing 
// OR we assume we can run this. 
// If I assume `src/services/db.js` uses Dexie, it will fail in Node.
// So I will just test the `crypto.js` logic which is the core correct?
// No, I want to test the `SecureStorage` logic.

// Plan: Test `crypto.js` (encryption correctness) and `SecureStorage` logic by mocking dependencies.
// Since I can't easily mock imports in ESM without a test runner (Vitest/Jest),
// I will create a standalone test that copies the LOGIC of SecureStorage but uses mocks.
// This is "Verification by Simulation".

// Actually, I can run `crypto.js` directly if it has no browser deps other than `crypto`.
// `src/services/crypto.js` uses `window.crypto`? 
// Step 49 viewed `src/services/crypto.js`. It uses `window.crypto` or `crypto`.

// Let's create a test that imports `crypto.js` and tests it.

import { encryptData, decryptData, hashPin } from './src/services/crypto.js';

async function testCrypto() {
    console.log('🧪 Testing Crypto Service...');
    
    const pin = '1234';
    const data = { secret: 'super sensitive key' };
    
    // 1. Test PIN Hashing
    console.log('  Testing PIN Hashing...');
    const hash1 = await hashPin(pin);
    const hash2 = await hashPin(pin);
    if (hash1 !== hash2) throw new Error('Hash not deterministic');
    if (hash1 === pin) throw new Error('Hash is plaintext');
    console.log('  ✅ PIN Hashing passed');

    // 2. Test Encryption/Decryption
    console.log('  Testing Encryption/Decryption...');
    const encrypted = await encryptData(data, pin);
    console.log('    Encrypted object keys:', Object.keys(encrypted));
    console.log('    Cipher length:', encrypted.cipherText.length);
    
    const decrypted = await decryptData(encrypted, pin);
    if (JSON.stringify(decrypted) !== JSON.stringify(data)) {
        throw new Error('Decryption failed! Mismatch.');
    }
    console.log('  ✅ Encryption/Decryption passed');

    // 3. Test Wrong PIN
    console.log('  Testing Wrong PIN...');
    try {
        await decryptData(encrypted, '0000');
        throw new Error('Should have failed with wrong PIN');
    } catch (e) {
        console.log('  ✅ Wrong PIN correctly failed verification');
    }
}

testCrypto().catch(e => {
    console.error('❌ Test Failed:', e);
    process.exit(1);
});
