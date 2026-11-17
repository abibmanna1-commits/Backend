import 'dotenv/config';
import { createApp } from './app.js';
import { pool, testDatabase } from './db.js';

const PORT = Number(process.env.PORT || 3000);
const app = createApp(pool);

async function startServer() {
  try {
    await testDatabase();

    app.listen(PORT, () => {
      console.log('===================================');
      console.log('Backend aplikasi data siswa aktif');
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Tes koneksi: http://localhost:${PORT}/api/health`);
      console.log(`Data siswa: http://localhost:${PORT}/api/siswa`);
      console.log('===================================');
    });
  } catch (error) {
    console.error('Koneksi database gagal:', error.message);
    console.error('Periksa Laragon, file .env, dan konfigurasi DB di db.js.');
    process.exitCode = 1;
    await pool.end();
  }
}

startServer();
