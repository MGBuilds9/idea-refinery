import express from 'express';
import cors from 'cors';
import { pool } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the dist directory
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the dist directory (which is at the root level relative to server/index.js in the source, 
// but in the Docker container we'll likely copy everything. 
// Ideally dist is a sibling of server. 
// In dev, we run vite separately. In prod (Docker), we serve dist.
// Let's resolve 'dist' relative to the project root.
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rate limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

// Apply to all API routes
app.use('/api/', apiLimiter);

// Anthropic Proxy
app.post('/api/anthropic', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(400).json({ error: 'API key required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Anthropic proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OpenAI Proxy
app.post('/api/openai', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(400).json({ error: 'Authorization header required' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('OpenAI proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gemini Proxy
app.post('/api/gemini', async (req, res) => {
  const { model, apiKey, ...body } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'API key required' });
  }

  const modelName = model || 'gemini-1.5-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Gemini proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});
