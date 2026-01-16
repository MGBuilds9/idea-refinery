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
};

/**
 * Get all conversations ordered by timestamp desc
 * @returns {Promise<Array>}
 */
export const getRecentConversations = async () => {
  return await db.conversations
    .orderBy('lastUpdated')
    .reverse()
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
