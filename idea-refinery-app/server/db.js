import pg from 'pg';
import bcrypt from 'bcrypt';
const { Pool } = pg;

// Build pool config. Prefer discrete env vars when present (avoids URL-parser
// failures when password contains '@', '/', or other RFC-3986-reserved chars
// that compose ${VAR} interpolation does not URL-encode). Falls back to
// connectionString for legacy/dev environments that set DATABASE_URL with a
// safe password.
function buildPoolConfig() {
  const user = process.env.DATABASE_USER || process.env.POSTGRES_USER;
  const password = process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD;
  const host = process.env.DATABASE_HOST || process.env.POSTGRES_HOST;
  const database = process.env.DATABASE_DB || process.env.POSTGRES_DB;
  const port = parseInt(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || '5432', 10);

  // Discrete-vars path: use if at minimum user, password, host, and database are set.
  if (user && password && host && database) {
    console.log(`🔌 Database Config (discrete env):
      Host: ${host}
      Port: ${port}
      Database: ${database}
      User: ${user}
      Password: ****`);
    return { user, password, host, port, database };
  }

  // Fallback: connectionString
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      console.log(`🔌 Database Config (connectionString):
      Host: ${url.hostname}
      Port: ${url.port}
      Database: ${url.pathname.substring(1)}
      User: ${url.username}
      Password: ${url.password ? '****' : 'none'}`);
    } catch (e) {
      console.error('❌ Invalid DATABASE_URL format (likely unescaped special chars in password) — set DATABASE_USER/DATABASE_PASSWORD/DATABASE_HOST/DATABASE_DB instead');
    }
    return { connectionString: process.env.DATABASE_URL };
  }

  console.error('❌ FATAL: No database config — set DATABASE_URL or discrete DATABASE_USER/PASSWORD/HOST/DB env vars');
  return {};
}

const pool = new Pool(buildPoolConfig());

// Initialize database
const initDb = async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS items (
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          content JSONB NOT NULL,
          version INT DEFAULT 1,
          updated_at TIMESTAMPTZ DEFAULT now(),
          deleted BOOLEAN DEFAULT FALSE,
          UNIQUE(user_id, id)
        );
        CREATE INDEX IF NOT EXISTS idx_items_sync ON items(user_id, updated_at);

        CREATE TABLE IF NOT EXISTS prompt_overrides (
          id SERIAL PRIMARY KEY,
          type TEXT UNIQUE NOT NULL,
          content TEXT NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public_blueprints (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          title TEXT,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          expires_at TIMESTAMPTZ,
          view_count INT DEFAULT 0
        );
        -- ⚡ Bolt Optimization: Add index for user's public blueprints list (with ordering)
        CREATE INDEX IF NOT EXISTS idx_public_blueprints_user_list ON public_blueprints(user_id, created_at DESC);

        -- ⚡ Bolt Optimization: Drop redundant index on primary key (id)
        DROP INDEX IF EXISTS idx_public_blueprints_id;

        -- Blueprint v1.5 Relational Schema
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT CHECK (status IN ('draft', 'refined', 'exported')) DEFAULT 'draft',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS features (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
          status TEXT DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS artifacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          version INT NOT NULL,
          type TEXT CHECK (type IN ('blueprint_md', 'cursor_rules', 'mockup_html')),
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);
      
      // SECURITY: No default credentials in production
      // Migration: Add user_id to prompt_overrides and scope uniqueness to user
      try {
        await client.query(`
          ALTER TABLE prompt_overrides
          ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE
        `);

        await client.query(`
          ALTER TABLE prompt_overrides
          DROP CONSTRAINT IF EXISTS prompt_overrides_type_key
        `);

        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_overrides_user_type
          ON prompt_overrides(user_id, type)
        `);
        console.log('✅ Migrated prompt_overrides to user scope');
      } catch (e) {
        console.warn('⚠️ Migration warning:', e.message);
      }

      // SECURITY: No default credentials in production
      const userCheck = await client.query('SELECT count(*) FROM users');
      if (parseInt(userCheck.rows[0].count) === 0) {
        if (process.env.NODE_ENV === 'production') {
          console.log('ℹ️  No default admin created in production. Register via the app.');
        } else if (process.env.SEED_DEFAULT_ADMIN === 'true') {
          console.log('🌱 Seeding default admin user...');
          const hashedPassword = await bcrypt.hash('admin123', 10);
          await client.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
            ['admin', hashedPassword]
          );
          console.warn('⚠️ WARNING: Default admin user created (admin/admin123). Change this immediately.');
        } else {
          console.log('ℹ️  No users found. In development, run with SEED_DEFAULT_ADMIN=true to create default admin.');
        }
      }

      console.log('✅ Database initialized');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }
};

if (process.env.DATABASE_URL || (process.env.DATABASE_HOST || process.env.POSTGRES_HOST)) {
  initDb();
}

export { pool };
