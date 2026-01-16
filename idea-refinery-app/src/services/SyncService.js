export const SyncService = {
  // Push local data to server
  push: async (serverUrl, data) => {
    if (!serverUrl) return; // No server configured, skip
    
    // Ensure URL doesn't end with slash, normalize
    const baseUrl = serverUrl.replace(/\/$/, '');
    const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
    
    if (!localStorage.getItem('deviceId')) {
      localStorage.setItem('deviceId', deviceId);
    }

    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/api/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          deviceId,
          data
        })
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Push sync error:', error);
      throw error;
    }
  },

  // Pull latest data from server
  pull: async (serverUrl) => {
    if (!serverUrl) return null;
    
    const baseUrl = serverUrl.replace(/\/$/, '');
    
    try {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${baseUrl}/api/sync`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error('Sync pull failed');
      }

      const result = await response.json();
      return result.data; // Expecting { data: { ...actual app state... }, updatedAt: ... }
    } catch (error) {
      console.error('Pull sync error:', error);
      throw error;
    }
  }
};
