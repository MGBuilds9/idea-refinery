
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function test() {
    console.log(`Testing ${BASE_URL}...`);

    // 1. Health Check
    try {
        const health = await fetch(`${BASE_URL}/health`);
        console.log('Health Status:', health.status);
        if (!health.ok) throw new Error('Health check failed');
    } catch (e) {
        console.error('SERVER NOT REACHABLE:', e.message);
        return;
    }

    // 2. Register/Login Temp User
    const username = `test_${Date.now()}`;
    const password = 'password123';
    console.log(`Registering temp user: ${username}`);

    let token = '';
    try {
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const regData = await regRes.json();
        console.log('Registration:', regRes.status, regData);

        if (regRes.ok) {
            token = regData.token;
        } else {
            // Try login if user exists (unlikely with timestamp)
            console.log('Registration failed, trying login...');
        }
    } catch (e) {
        console.error('Auth Error:', e);
    }

    if (!token) return;

    // 3. Fetch Prompts
    console.log('Fetching prompts...');
    try {
        const promptRes = await fetch(`${BASE_URL}/api/prompts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Prompts Status:', promptRes.status);
        const data = await promptRes.json();
        console.log('Prompts Data Length:', Array.isArray(data) ? data.length : 'Not Array');
        console.log('Prompts Data Sample:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    } catch (e) {
        console.error('Prompts Fetch Error:', e);
    }
}

test();
