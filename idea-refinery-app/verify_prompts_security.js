const BASE_URL = 'http://localhost:3001';

async function verify() {
  console.log('🛡️ Verifying Prompts Security...');

  // 1. Create User A
  const userA = { username: `userA_${Date.now()}`, password: 'password123' };
  const tokenA = await register(userA);
  if (!tokenA) return console.error('❌ Failed to register User A');
  console.log(`✅ Registered User A: ${userA.username}`);

  // 2. Create User B
  const userB = { username: `userB_${Date.now()}`, password: 'password123' };
  const tokenB = await register(userB);
  if (!tokenB) return console.error('❌ Failed to register User B');
  console.log(`✅ Registered User B: ${userB.username}`);

  // 3. User A sets a prompt override
  console.log('📝 User A setting prompt override...');
  const overrideRes = await fetch(`${BASE_URL}/api/prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      type: 'questions',
      content: JSON.stringify({ system: 'System A', prompt: 'Prompt A' })
    })
  });

  if (!overrideRes.ok) {
    console.error('❌ User A failed to set prompt:', overrideRes.status);
    // If 500, check server logs.
    return;
  }
  console.log('✅ User A set prompt override.');

  // 4. Verify User A fetches the override
  const promptsA = await fetchPrompts(tokenA);
  const overrideA = promptsA.find(p => p.type === 'questions');
  // Note: API returns MERGED list of defaults + overrides.
  // We check if content matches what we set.
  if (overrideA && overrideA.content.includes('Prompt A')) {
    console.log('✅ User A sees their override.');
  } else {
    console.error('❌ User A DOES NOT see their override!', JSON.stringify(overrideA));
  }

  // 5. Verify User B fetches defaults (NOT User A's override)
  const promptsB = await fetchPrompts(tokenB);
  const overrideB = promptsB.find(p => p.type === 'questions');
  if (overrideB && overrideB.content.includes('Prompt A')) {
    console.error('🚨 CRITICAL FAIL: User B sees User A\'s override!');
  } else {
    console.log('✅ User B does NOT see User A\'s override (Isolation verified).');
  }

  // 6. Verify Unauthenticated fetches defaults
  const promptsGuest = await fetchPrompts(null);
  const overrideGuest = promptsGuest.find(p => p.type === 'questions');
  if (overrideGuest && overrideGuest.content.includes('Prompt A')) {
    console.error('🚨 CRITICAL FAIL: Guest sees User A\'s override!');
  } else {
    console.log('✅ Guest does NOT see User A\'s override (Isolation verified).');
  }

  console.log('🎉 Verification Complete!');
}

async function register(user) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await res.json();
    return data.token;
  } catch (e) {
    console.error('Auth Error:', e);
    return null;
  }
}

async function fetchPrompts(token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api/prompts`, { headers });
  if (!res.ok) {
      console.error('Fetch Prompts Failed:', res.status);
      return [];
  }
  const data = await res.json();
  return data;
}

verify();
