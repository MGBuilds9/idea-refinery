import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for web and iOS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['https://ideas.mkgbuilds.com', 'capacitor://localhost', 'http://localhost', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
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

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  // Allow login/health without token
  if (req.path === '/api/auth/login' || req.path === '/health') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Apply auth middleware to API routes (excluding public ones handled inside)
// Actually, it's better to apply it specifically to protected routes or use a wrapper.
// For now, let's just expose the auth endpoints publicly and protect sync/ai endpoints if desired.
// Since the user wants a simple admin login, let's protect everything under /api except auth.

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token });
    } else {
      res.status(403).json({ error: 'Invalid password' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login error' });
  }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, req.user.id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error changing password' });
  }
});

// Sync Endpoints
// POST - Push data to server (upsert)
app.post('/api/sync', authenticateToken, async (req, res) => {
  const { deviceId, data } = req.body;
  const userId = req.user.id;

  if (!data) {
    return res.status(400).json({ error: 'Data is required' });
  }

  try {
    // Upsert: update if exists, insert if not
    const result = await pool.query(
      `INSERT INTO sync_data (user_id, device_id, data, updated_at) 
       VALUES ($1, $2, $3, NOW()) 
       ON CONFLICT (user_id) 
       DO UPDATE SET device_id = $2, data = $3, updated_at = NOW()
       RETURNING updated_at`,
      [userId, deviceId || 'unknown', data]
    );

    res.json({ 
      success: true, 
      updatedAt: result.rows[0].updated_at 
    });
  } catch (e) {
    console.error('Sync error:', e);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// GET - Pull data from server
app.get('/api/sync', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT data, updated_at FROM sync_data WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ data: null, updatedAt: null });
    }

    res.json({
      data: result.rows[0].data,
      updatedAt: result.rows[0].updated_at
    });
  } catch (e) {
    console.error('Sync pull error:', e);
    res.status(500).json({ error: 'Failed to retrieve sync data' });
  }
});

// Protect Sync and AI Routes if necessary. 
// For now, note that existing routes are below. We can inject the middleware there.
// Or we can just apply it globally for /api and exclude login.
app.use('/api', (req, res, next) => {
    if (req.path === '/auth/login' || req.path === '/health') return next();
    authenticateToken(req, res, next);
});

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
