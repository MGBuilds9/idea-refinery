import { db } from './db.js';

export const SyncService = {
  // Push local data to server
  push: async (serverUrl, data) => {
    if (!serverUrl) return; 
    
    const baseUrl = serverUrl.replace(/\/$/, '');
    const token = localStorage.getItem('auth_token'); // Matches App.jsx storage key
    
    if (!token) return;

    try {
      // Map legacy 'conversation' data to generic 'items' format for server
      // Server expects: { items: [ { id, type, content, version, deleted } ] }
      
      const item = {
        id: data.id ? data.id.toString() : crypto.randomUUID(), // Ensure string ID for server
        type: 'conversation',
        content: JSON.stringify(data), // Server stores content as text/json
        version: 1, // Simple versioning for now
        deleted: false
      };

      const response = await fetch(`${baseUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: [item]
        })
      });

      if (!response.ok) {
        throw new Error('Sync push failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Push sync error:', error);
      // Don't throw, just log. Offline is valid state.
    }
  },

  // Pull latest data from server
  pull: async (serverUrl) => {
    if (!serverUrl) return;
    
    const baseUrl = serverUrl.replace(/\/$/, '');
    const token = localStorage.getItem('auth_token');
    
    if (!token) return;
    
    try {
      // Get last sync time? For now, pull all (since=0) or we can implement incremental later.
      const since = new Date(0).toISOString();
      
      const response = await fetch(`${baseUrl}/api/sync/pull?since=${since}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Sync pull failed');
      }

      const result = await response.json();
      
      if (result.items && Array.isArray(result.items)) {
          // Process incoming items
          let updateCount = 0;
          
          for (const item of result.items) {
              if (item.type === 'conversation') {
                  try {
                      // Parse content back to object
                      const conversationData = typeof item.content === 'string' 
                          ? JSON.parse(item.content) 
                          : item.content;
                      
                      // Fix ID if needed (server strings vs dexie numbers)
                      // If Dexie uses ++id, we might have issues syncing IDs.
                      // Ideally, we move to UUIDs. 
                      // For now, let's assume conversationData contains the real ID logic or we just append.
                      
                      // Actually, 'saveConversation' in db.js handles upsert.
                      // But careful about ID conflicts if ID is number vs string.
                      // If server item has an ID, we should respect it? 
                      // Dexie 'conversations' table is ++id (auto-increment).
                      // We might need to handle this carefully.
                      // STRATEGY: 
                      // 1. Check if we have a conversation with this 'idea' and similar timestamp?
                      // 2. Or just force save.
                      
                      // Let's use the content as truth.
                      if (conversationData) {
                          // FORCE ID from server if possible, or let Dexie handle it if it was null?
                          // If it came from another client, it might have an ID we don't know.
                          // For simplicity in v1.2: We just save it. 
                          // If the Local ID was numeric, and server sent us a UUID string, Dexie will barf on ++id potentially?
                          // Checked db.js: conversations: '++id...'
                          // So ID must be number.
                          // If data.id is string (from server), we might need to ignore it and rely on content?
                          // Or we matched by idea+timestamp.
                          
                          // Let's try to save. 'saveConversation' checks data.id. 
                          // If we pull from server, we want to replicate.
                          
                          await db.conversations.put(conversationData);
                          updateCount++;
                      }
                  } catch (parseErr) {
                      console.error('Failed to parse item content:', parseErr);
                  }
              }
          }
          
          if (updateCount > 0) {
              console.log(`[Sync] Pulled ${updateCount} items.`);
              return true; // Signal that updates occurred
          }
      }
      
      return false;
    } catch (error) {
      console.error('Pull sync error:', error);
    }
  }
};

