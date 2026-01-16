export const EmailService = {
  /**
   * Send an email via the backend
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email body HTML
   * @param {string} [apiKey] - Optional Resend API Key override
   * @returns {Promise<Object>} Response data
   */
  send: async (to, subject, html, apiKey = null) => {
    const serverUrl = localStorage.getItem('server_url') || 'http://localhost:3001';
    const token = localStorage.getItem('auth_token');
    
    const body = {
      to,
      subject,
      html
    };

    if (apiKey) {
        body.apiKey = apiKey;
    }

    const res = await fetch(`${serverUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send email');
    }

    return await res.json();
  }
};
