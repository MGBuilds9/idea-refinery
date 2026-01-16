
import { SyncService } from './src/services/SyncService.js';
import { EmailService } from './src/services/email.js';
import fs from 'fs';

// Mock localStorage
const localStorage = {
    store: {},
    getItem: (k) => localStorage.store[k],
    setItem: (k, v) => localStorage.store[k] = v
};
global.localStorage = localStorage;

// Mock fetch
global.fetch = async (url, options) => {
    console.log(`[FETCH] ${options?.method || 'GET'} ${url}`);
    if (options?.body) console.log(`[BODY] ${options.body}`);
    return {
        ok: true,
        json: async () => ({ success: true, items: [] })
    };
};

// Mock crypto
global.crypto = { randomUUID: () => 'uuid-' + Date.now() };

async function verify() {
    console.log('--- Verifying Sync ---');
    localStorage.setItem('auth_token', 'mock-token');
    
    // Test Push
    await SyncService.push('http://localhost:3001', { id: 1, idea: 'Test Idea' });
    
    // Test Pull
    await SyncService.pull('http://localhost:3001');

    console.log('\n--- Verifying Email ---');
    // We can't actually send email without a real key, but we can verify the call structure
    try {
        await EmailService.send('target@example.com', 'Test Subject', '<p>Test Body</p>', 'mock-key');
        console.log('EmailService.send executed successfully (mocked fetch)');
    } catch (e) {
        console.error('Email failed:', e);
    }
}

verify().catch(console.error);
