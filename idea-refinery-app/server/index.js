import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

import { DEFAULT_PROMPTS } from './default_prompts.js';

// Seeding Default Prompts
const seedPrompts = async () => {
  try {
    const client = await pool.connect();
    try {
      for (const [type, content] of Object.entries(DEFAULT_PROMPTS)) {
        await client.query(
          `INSERT INTO prompt_overrides (type, content) 
           VALUES ($1, $2) 
           ON CONFLICT (type) DO NOTHING`,
          [type, content]
        );
      }
      console.log('✅ Default prompts seeded');
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('❌ Error seeding prompts:', e);
  }
};
seedPrompts();


const app = express();
const PORT = process.env.PORT || 3001;

// Security headers (Helmet)
// CSP disabled to maintain frontend compatibility as per project requirements
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS configuration for web and iOS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://ideas.mkgbuilds.com', 'capacitor://localhost', 'http://localhost', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    const isAllowed = allowedOrigins.indexOf(origin) !== -1 ||
      allowedOrigins.some(allowed => origin.startsWith(allowed)) ||
      /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|localhost)/.test(origin); // Allow local IPs and localhost

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true
}));
app.set('trust proxy', 1); // Trust first key-value pair in X-Forwarded-For

app.use(express.json({ limit: '50mb' }));

// Serve static files from the dist directory
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the dist directory (which is at the root level relative to server/index.js in the source, 
// but in the Docker container we'll likely copy everything. 
// Ideally dist is a sibling of server. 
// In dev, we run vite separately. In prod (Docker), we serve dist.
// Let's resolve 'dist' relative to the project root.
const distPath = path.resolve(__dirname, '../dist');

// DEBUG: Log dist path and contents to verify Docker copy
console.log('📂 Serving static files from:', distPath);
if (fs.existsSync(distPath)) {
  console.log('✅ Dist directory exists.');
  try {
    const files = fs.readdirSync(distPath);
    console.log('📄 Files in dist:', files);
    const assetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      const assetFiles = fs.readdirSync(assetsPath);
      console.log('📄 Files in dist/assets:', assetFiles);
      console.log(`📊 Total assets: ${assetFiles.length}`);
    } else {
      console.warn('⚠️  dist/assets directory missing!');
    }
  } catch (e) {
    console.error('❌ Error listing dist files:', e);
  }
} else {
  console.error('❌ Dist directory does NOT exist at:', distPath);
}

// Explicitly handle assets with proper error handling
// Allow fallthrough to 404 handler instead of throwing 500 errors
app.use('/assets', express.static(path.join(distPath, 'assets')));

app.use(express.static(distPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rate limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 5000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

// Apply to all API routes
app.use('/api/', apiLimiter);

// Stricter rate limiting for authentication (Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many login attempts, please try again later.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  // Allow login/register/health without token
  if (req.path === '/api/auth/login' || req.path === '/api/auth/register' || req.path === '/health') {
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

// User Registration (Open)
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check for existing user
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

    console.log(`✅ New user registered: ${username}`);
    res.json({ token, userId: user.id });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ error: 'Registration failed' });
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

// Sync Endpoints (Granular)
// POST - Push changes to server
app.post('/api/sync/push', authenticateToken, async (req, res) => {
  const { items } = req.body; // Expects array of items
  const userId = req.user.id;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Batch Upsert Optimization
      if (items.length === 0) {
        await client.query('COMMIT');
        return res.json({ success: true, synced: 0 });
      }

      const ids = items.map(i => i.id);
      const types = items.map(i => i.type);
      // Stringify content (JSONB) to pass as text[] then cast to jsonb in query
      const contents = items.map(i => JSON.stringify(i.content));
      const versions = items.map(i => i.version);
      const deleteds = items.map(i => i.deleted || false);

      const query = `
        INSERT INTO items (id, user_id, type, content, version, deleted, updated_at)
        SELECT id, $2, type, content::jsonb, version, deleted, NOW()
        FROM UNNEST($1::uuid[], $3::text[], $4::text[], $5::int[], $6::boolean[])
        AS t(id, type, content, version, deleted)
        ON CONFLICT (user_id, id) DO UPDATE SET
          type = EXCLUDED.type,
          content = EXCLUDED.content,
          version = EXCLUDED.version,
          deleted = EXCLUDED.deleted,
          updated_at = NOW()
        RETURNING id, updated_at
      `;

      const res = await client.query(query, [ids, userId, types, contents, versions, deleteds]);
      const results = res.rows;

      await client.query('COMMIT');
      res.json({ success: true, synced: results.length });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Sync push error:', e);
    res.status(500).json({ error: 'Sync push failed' });
  }
});

// GET - Pull changes from server
app.get('/api/sync/pull', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const since = req.query.since ? new Date(req.query.since) : new Date(0);

  if (isNaN(since.getTime())) {
    return res.status(400).json({ error: 'Invalid timestamp' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM items WHERE user_id = $1 AND updated_at > $2',
      [userId, since.toISOString()]
    );

    // Include prompt overrides in pull response if needed? 
    // Or make a separate endpoint. Let's send them if since=0 (first sync)
    // Or just let the client request them separately.
    // For now, let's keep it simple and add a separate endpoint for prompts to avoid payload bloat.

    res.json({
      items: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Sync pull error:', e);
    res.status(500).json({ error: 'Failed to retrieve sync data' });
  }
});

// Prompt Overrides Sync
// GET is public (no auth) - allows fetching default prompts
// POST/reset require auth (handled by global middleware)
app.get('/api/prompts', async (req, res) => {
  try {
    const result = await pool.query('SELECT type, content, updated_at FROM prompt_overrides');
    const overrides = {};
    result.rows.forEach(row => {
      overrides[row.type] = row;
    });

    // Merge defaults with overrides
    const prompts = Object.keys(DEFAULT_PROMPTS).map(type => {
      if (overrides[type]) {
        return overrides[type];
      }
      return {
        type,
        content: DEFAULT_PROMPTS[type],
        updated_at: new Date()
      };
    });

    res.json(prompts);
  } catch (e) {
    console.error('Prompts fetch error:', e);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

app.post('/api/prompts', authenticateToken, async (req, res) => {
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({ error: 'Type and content required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO prompt_overrides (type, content, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (type) DO UPDATE SET 
         content = EXCLUDED.content, 
         updated_at = NOW() 
       RETURNING *`,
      [type, content]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Prompts save error:', e);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

app.post('/api/prompts/reset', authenticateToken, async (req, res) => {
  const { type } = req.body;
  if (!type) return res.status(400).json({ error: 'Type required' });

  try {
    // We don't actually delete, we just reset to default.
    // But since we are only storing overrides, we can just update it to the hardcoded default?
    // Actually, if we delete the row, we need a way to fall back.
    // The requirement says "preloaded into the database".
    // So "Reset" means "Update DB row back to original default string".

    if (DEFAULT_PROMPTS[type]) {
      const result = await pool.query(
        `UPDATE prompt_overrides SET content = $1, updated_at = NOW() WHERE type = $2 RETURNING *`,
        [DEFAULT_PROMPTS[type], type]
      );
      res.json(result.rows[0]);
    } else {
      res.status(400).json({ error: 'Unknown prompt type' });
    }
  } catch (e) {
    console.error('Prompts reset error:', e);
    res.status(500).json({ error: 'Failed to reset prompt' });
  }
});


// Email Endpoint (Resend)
app.post('/api/email/send', authenticateToken, async (req, res) => {
  const { to, subject, html, apiKey } = req.body; // Allow passing key from client (since we store it in Settings)

  // If user doesn't provide key, maybe fallback to env?
  const resendKey = apiKey || process.env.RESEND_API_KEY;

  if (!resendKey) {
    return res.status(400).json({
      error: 'Resend API Key required. Please add it in Settings.'
    });
  }

  const resend = new Resend(resendKey);

  try {
    const data = await resend.emails.send({
      from: 'Idea Refinery <onboarding@resend.dev>', // Default testing domain
      to: [to], // In free tier, can only send to verified email (which is usually the owner's email)
      subject: subject,
      html: html
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Resend error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Protect Sync and AI Routes if necessary. 
// For now, note that existing routes are below. We can inject the middleware there.
// Or we can just apply it globally for /api and exclude login.
app.use('/api', (req, res, next) => {
  // Public endpoints - no auth required
  if (req.path === '/auth/login' || req.path === '/auth/register' || req.path === '/health') return next();

  // Allow GET requests to /api/prompts (read default prompts without auth)
  // POST requests to /api/prompts still require auth
  if (req.path === '/prompts' && req.method === 'GET') return next();

  // All other /api routes require authentication
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

// ===== PUBLIC SHARE ENDPOINTS =====

// POST /api/public/publish - Create a public share (authenticated)
app.post('/api/public/publish', authenticateToken, async (req, res) => {
  const { title, content, expiresInDays } = req.body;
  const userId = req.user.id;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await pool.query(
      `INSERT INTO public_blueprints (user_id, title, content, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at, expires_at`,
      [userId, title || 'Untitled Blueprint', content, expiresAt]
    );

    const blueprint = result.rows[0];
    const publicUrl = `/public/${blueprint.id}`;

    res.json({
      success: true,
      id: blueprint.id,
      url: publicUrl,
      expiresAt: blueprint.expires_at
    });
  } catch (e) {
    console.error('Publish error:', e);
    res.status(500).json({ error: 'Failed to publish blueprint' });
  }
});

// GET /api/public/:id - View a public blueprint (no auth required)
app.get('/api/public/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if blueprint exists and is not expired
    const result = await pool.query(
      `SELECT id, title, content, created_at, expires_at, view_count
       FROM public_blueprints 
       WHERE id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blueprint not found or expired' });
    }

    // Increment view count
    await pool.query(
      'UPDATE public_blueprints SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );

    const blueprint = result.rows[0];
    res.json({
      id: blueprint.id,
      title: blueprint.title,
      content: blueprint.content,
      createdAt: blueprint.created_at,
      expiresAt: blueprint.expires_at,
      viewCount: blueprint.view_count + 1
    });
  } catch (e) {
    console.error('Public view error:', e);
    res.status(500).json({ error: 'Failed to retrieve blueprint' });
  }
});

// DELETE /api/public/:id - Delete a public share (authenticated, owner only)
app.delete('/api/public/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'DELETE FROM public_blueprints WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blueprint not found or not owned by you' });
    }

    res.json({ success: true, deleted: id });
  } catch (e) {
    console.error('Delete public blueprint error:', e);
    res.status(500).json({ error: 'Failed to delete blueprint' });
  }
});

// GET /api/public/my/list - List user's published blueprints (authenticated)
app.get('/api/public/my/list', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT id, title, created_at, expires_at, view_count
       FROM public_blueprints 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (e) {
    console.error('List public blueprints error:', e);
    res.status(500).json({ error: 'Failed to list blueprints' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
  // Don't serve index.html for API calls or assets that were missed
  if (req.path.startsWith('/api') || req.path.startsWith('/assets')) {
    console.warn(`⚠️  404 - Asset/API not found: ${req.path}`);
    return res.status(404).send('Not Found');
  }

  const indexPath = path.resolve(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`📄 Serving index.html for route: ${req.path}`);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('❌ Error sending index.html:', err);
        res.status(500).send('Server Error');
      }
    });
  } else {
    console.error('❌ index.html not found at:', indexPath);
    res.status(404).send('Application not built (index.html missing)');
  }
});
