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
          const conversationBatch = [];

          // ⚡ Bolt Optimization: Collect items for batch insert to avoid N+1 IndexedDB transactions.
          // bulkPut is significantly faster than sequential put calls.
          for (const item of result.items) {
              if (item.type === 'conversation') {
                  try {
                      // Parse content back to object
                      const conversationData = typeof item.content === 'string' 
                          ? JSON.parse(item.content) 
                          : item.content;
                      
                      if (conversationData) {
                          conversationBatch.push(conversationData);
                      }
                  } catch (parseErr) {
                      console.error('Failed to parse item content:', parseErr);
                  }
              }
          }
          
          if (conversationBatch.length > 0) {
              await db.conversations.bulkPut(conversationBatch);
              updateCount = conversationBatch.length;
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

