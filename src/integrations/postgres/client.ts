
import { Pool } from 'pg';

// TODO: Update these values with your new PostgreSQL server credentials
export const pool = new Pool({
  host: "YOUR_PG_HOST",
  port: 5432,
  database: "YOUR_PG_DATABASE",
  user: "YOUR_PG_USER",
  password: "YOUR_PG_PASSWORD",
  ssl: { rejectUnauthorized: false } // Remove 'ssl' if not required
});

// Helper for queries
export const pgQuery = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
};
