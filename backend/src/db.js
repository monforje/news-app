import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.PG_CONNECTION_STRING });

export async function saveReaction({ userId, articleId, emoji, ts }) {
  await pool.query(
    'INSERT INTO reactions (user_id, article_id, emoji, created_at) VALUES ($1, $2, $3, to_timestamp($4 / 1000.0))',
    [userId, articleId, emoji, ts]
  );
} 