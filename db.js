
import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_siswa',
  waitForConnections: true,
  connectionLimit: 10,
});

export async function testDatabase() {
  const connection = await pool.getConnection();

  try {
    await connection.query('SELECT 1');
    console.log('Database MySQL berhasil terhubung.');
  } finally {
    connection.release();
  }
}
