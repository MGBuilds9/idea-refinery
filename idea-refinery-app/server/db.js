import pg from 'pg';
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
        CREATE TABLE IF NOT EXISTS sync_data (
          id SERIAL PRIMARY KEY,
          device_id TEXT NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_sync_data_updated_at ON sync_data(updated_at);
      `);
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
