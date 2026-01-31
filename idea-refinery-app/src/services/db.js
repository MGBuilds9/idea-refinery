import Dexie from 'dexie';

export const db = new Dexie('IdeaRefineryDB');

// Schema v3: Added settings (encrypted keys) and systemPrompts (custom agents)
db.version(3).stores({
  conversations: '++id, timestamp, lastUpdated, idea, [timestamp+idea]',
  settings: 'key', // key-value store for app settings (encrypted keys, pin hash)
  systemPrompts: 'stage' // key-value store for custom agent prompts (questions, blueprint, refiner, mockup)
});

// Migration from v1 to v2 happens automatically
// chatHistory is stored as an array in each conversation record

/**
 * Save or update a conversation
 * @param {Object} data - The conversation data to save
 * @returns {Promise<number>} - The ID of the saved conversation
 */
export const saveConversation = async (data) => {
  const timestamp = Date.now();
  console.log('[DB] Saving conversation:', data.id ? `Update ${data.id}` : 'New Record', data);
  
  try {
    // If we have an ID, update existing
    if (data.id) {
      await db.conversations.update(data.id, {
        ...data,
        lastUpdated: timestamp
      });
      return data.id;
    }
    
    // Otherwise create new
    return await db.conversations.add({
      ...data,
      timestamp,
      lastUpdated: timestamp
    });
  } catch (e) {
    console.error('[DB] Save failed:', e);
    throw e;
  }
};

/**
 * Get all conversations ordered by timestamp desc
 * @param {number} limit - Max items to return (default 50)
 * @param {number} offset - Number of items to skip (default 0)
 * @returns {Promise<Array>}
 */
export const getRecentConversations = async (limit = 50, offset = 0) => {
  return await db.conversations
    .orderBy('lastUpdated')
    .reverse()
    .offset(offset)
    .limit(limit)
    .toArray();
};

/**
 * Delete conversations older than 7 days
 * @returns {Promise<number>} - Number of deleted items
 */
export const cleanupOldConversations = async () => {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  return await db.conversations
    .where('timestamp')
    .below(sevenDaysAgo)
    .delete();
};

/**
 * Delete a specific conversation
 * @param {number} id 
 */
export const deleteConversation = async (id) => {
  await db.conversations.delete(id);
};

// Settings Helpers
export const saveSetting = async (key, value) => {
  await db.settings.put({ key, value });
};

export const getSetting = async (key) => {
  const result = await db.settings.get(key);
  return result ? result.value : null;
};

// --- Sync Logic (Granular V4) ---

db.version(4).stores({
  conversations: '++id, timestamp, lastUpdated, idea, [timestamp+idea]',
  settings: 'key',
  systemPrompts: 'stage',
  items: 'id, user_id, type, updated_at, deleted, [user_id+updated_at]'
});

export async function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export async function setSyncToken(token) {
  await db.settings.put({ key: 'sync_token', value: token });
}

export async function getSyncToken() {
  const setting = await db.settings.get('sync_token');
  return setting ? setting.value : null;
}

export async function pushItem(item, apiBaseUrl) {
  const token = await getAuthToken();
  if (!token) return;

  // Save locally first
  await db.items.put(item);

  try {
    const response = await fetch(`${apiBaseUrl}/api/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items: [item] })
    });
    
    if (!response.ok) throw new Error('Push failed');
    return await response.json();
  } catch (e) {
    console.error('Push error:', e);
  }
}

export async function pullItems(apiBaseUrl) {
  const token = await getAuthToken();
  if (!token) return;

  const lastSync = await getSyncToken();
  const since = lastSync || new Date(0).toISOString();

  try {
    const response = await fetch(`${apiBaseUrl}/api/sync/pull?since=${since}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Pull failed');
    
    const { items, timestamp } = await response.json();
    
    if (items && items.length > 0) {
      await db.items.bulkPut(items);
    }
    
    await setSyncToken(timestamp);
    console.log(`Synced ${items.length} items from server.`);
  } catch (e) {
    console.error('Pull error:', e);
  }
}

/**
 * Export all local data for backup
 * @returns {Object} All data in exportable format
 */
export async function exportAllData() {
  const conversations = await db.conversations.toArray();
  const settings = await db.settings.toArray();
  const systemPrompts = await db.systemPrompts.toArray();
  
  // Include localStorage items that aren't sensitive
  const localSettings = {
    llm_provider: localStorage.getItem('llm_provider'),
    sync_mode: localStorage.getItem('sync_mode'),
    server_url: localStorage.getItem('server_url'),
    username: localStorage.getItem('username')
  };
  
  return {
    version: '1.2',
    exportedAt: new Date().toISOString(),
    data: {
      conversations,
      settings,
      systemPrompts,
      localSettings
    }
  };
}

