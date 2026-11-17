import { pool } from './db.js';

try {
    const [rows] = await pool.query(
        'SELECT * FROM siswa'
    );

    console.log('Koneksi berhasil!');
    console.table(rows);

} catch (error) {
    console.error('Koneksi gagal:', error.message);

} finally {
    await pool.end();
}