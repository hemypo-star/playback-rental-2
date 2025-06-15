
import { Pool } from 'pg';

// TODO: Update these values with your new PostgreSQL server credentials
export const pool = new Pool({
  host: "https://analyticsdb.makeagency.ru",
  port: 48302,
  database: "pg_main_apps",
  user: "apps",
  password: "B2cS_2WvYc3kV308",
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
