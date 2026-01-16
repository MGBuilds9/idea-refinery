// Authentication Service for Server Login
// Handles JWT token management and authentication state

export const AuthService = {
  // Get stored auth token
  getToken() {
    return localStorage.getItem('authToken');
  },

  // Get stored username
  getUsername() {
    return localStorage.getItem('username');
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  },

  // Login to server
  async login(serverUrl, username, password) {
    const baseUrl = serverUrl.replace(/\/$/, '');
    
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const { token } = await response.json();
      
      // Store token and username
      localStorage.setItem('authToken', token);
      localStorage.setItem('username', username);
      localStorage.setItem('serverUrl', serverUrl);
      
      return { success: true, token };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout (clear token)
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    // Keep serverUrl for convenience
  },

  // Change password
  async changePassword(serverUrl, newPassword) {
    const baseUrl = serverUrl.replace(/\/$/, '');
    const token = this.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Password change failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  },

  // Get server URL from storage
  getServerUrl() {
    return localStorage.getItem('serverUrl') || '';
  }
};
