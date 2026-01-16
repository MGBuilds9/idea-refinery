import pg from 'pg';
import bcrypt from 'bcrypt';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
      `);
      
      // Seed default admin if no users exist
      const userCheck = await client.query('SELECT count(*) FROM users');
      if (parseInt(userCheck.rows[0].count) === 0) {
        console.log('🌱 Seeding default admin user...');
        // Hash 'admin123'
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await client.query(
          'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
          ['admin', hashedPassword]
        );
        console.log('⚠️  Default user created: admin / admin123');
      }

      console.log('✅ Database initialized');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }
};

if (process.env.DATABASE_URL) {
  initDb();
}

export { pool };
