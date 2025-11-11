import { Pool } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgres://postgres:xyler23@localhost:5434/pushdb',
});

pool.on('error', (err: Error) => logger.error(`PostgreSQL pool error: ${err}`));

// Create table on startup
export const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      request_id VARCHAR(255) PRIMARY KEY,
      status VARCHAR(50) DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      error TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  logger.info('PostgreSQL initialized');
};

export default pool;