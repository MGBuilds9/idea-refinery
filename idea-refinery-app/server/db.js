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
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sync_data (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          device_id TEXT NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_sync_data_user_id ON sync_data(user_id);
        CREATE INDEX IF NOT EXISTS idx_sync_data_updated_at ON sync_data(updated_at);
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
