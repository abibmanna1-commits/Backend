import express from 'express';
import cors from 'cors';

const COLUMNS = `
  id,
  kode_siswa,
  nama,
  alamat,
  tanggal_lahir,
  jurusan,
  created_at
`;

function formatSiswa(row) {
  if (!row) return row;

  let tanggal = row.tanggal_lahir;

  if (tanggal instanceof Date) {
    tanggal = tanggal.toISOString().slice(0, 10);
  } else if (tanggal) {
    tanggal = String(tanggal).slice(0, 10);
  } else {
    tanggal = '';
  }

  return {
    ...row,
    tanggal_lahir: tanggal,
  };
}

function validateSiswa(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'Data siswa harus berupa objek JSON.';
  }

  if (typeof data.kode_siswa !== 'string' || !data.kode_siswa.trim()) {
    return 'Kode siswa wajib diisi.';
  }

  if (typeof data.nama !== 'string' || !data.nama.trim()) {
    return 'Nama lengkap wajib diisi.';
  }

  if (data.kode_siswa.trim().length > 20) {
    return 'Kode siswa maksimal 20 karakter.';
  }

  if (data.nama.trim().length > 100) {
    return 'Nama maksimal 100 karakter.';
  }

  if (data.alamat != null && typeof data.alamat !== 'string') {
    return 'Format alamat tidak valid.';
  }

  if (data.jurusan != null && typeof data.jurusan !== 'string') {
    return 'Format jurusan tidak valid.';
  }

  if ((data.jurusan || '').length > 100) {
    return 'Jurusan maksimal 100 karakter.';
  }

  if (data.tanggal_lahir) {
    const tanggal = data.tanggal_lahir;

    if (
      typeof tanggal !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) ||
      Number.isNaN(Date.parse(`${tanggal}T00:00:00Z`)) ||
      new Date(`${tanggal}T00:00:00Z`).toISOString().slice(0, 10) !== tanggal
    ) {
      return 'Format tanggal lahir tidak valid.';
    }
  }

  return null;
}

export function createApp(pool) {
  const app = express();

  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ],
  }));
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Backend aplikasi data siswa aktif.',
      endpoints: [
        'GET /api/health',
        'GET /api/siswa',
        'POST /api/siswa',
        'PUT /api/siswa/:id',
        'DELETE /api/siswa/:id',
      ],
    });
  });

  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({
        success: true,
        message: 'Backend dan database MySQL terhubung.',
        database: process.env.DB_NAME || 'db_siswa',
      });
    } catch (error) {
      console.error('Health check gagal:', error.message);
      res.status(500).json({
        success: false,
        message: 'Backend aktif, tetapi database gagal diakses.',
      });
    }
  });

  app.get('/api/siswa', async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT ${COLUMNS} FROM siswa ORDER BY id DESC`
      );
      res.json(rows.map(formatSiswa));
    } catch (error) {
      console.error('Gagal mengambil siswa:', error.message);
      res.status(500).json({
        message: 'Gagal mengambil data siswa.',
      });
    }
  });

  app.get('/api/siswa/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: 'ID siswa tidak valid.' });
    }

    try {
      const [rows] = await pool.execute(
        `SELECT ${COLUMNS} FROM siswa WHERE id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Siswa tidak ditemukan.' });
      }

      res.json(formatSiswa(rows[0]));
    } catch (error) {
      console.error('Gagal mengambil detail siswa:', error.message);
      res.status(500).json({ message: 'Gagal mengambil detail siswa.' });
    }
  });

  app.post('/api/siswa', async (req, res) => {
    const errorMessage = validateSiswa(req.body);

    if (errorMessage) {
      return res.status(400).json({ message: errorMessage });
    }

    const {
      kode_siswa,
      nama,
      alamat = '',
      tanggal_lahir = '',
      jurusan = '',
    } = req.body;

    try {
      const [result] = await pool.execute(
        `INSERT INTO siswa
          (kode_siswa, nama, alamat, tanggal_lahir, jurusan)
         VALUES (?, ?, ?, ?, ?)`,
        [
          kode_siswa.trim(),
          nama.trim(),
          alamat,
          tanggal_lahir || null,
          jurusan.trim(),
        ]
      );

      const [rows] = await pool.execute(
        `SELECT ${COLUMNS} FROM siswa WHERE id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        message: 'Siswa berhasil ditambahkan.',
        data: formatSiswa(rows[0]),
      });
    } catch (error) {
      console.error('Gagal menambahkan siswa:', error.message);

      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          message: 'Kode siswa sudah digunakan.',
        });
      }

      res.status(500).json({
        message: 'Gagal menambahkan siswa ke database.',
      });
    }
  });

  app.put('/api/siswa/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: 'ID siswa tidak valid.' });
    }

    const errorMessage = validateSiswa(req.body);

    if (errorMessage) {
      return res.status(400).json({ message: errorMessage });
    }

    const {
      kode_siswa,
      nama,
      alamat = '',
      tanggal_lahir = '',
      jurusan = '',
    } = req.body;

    try {
      const [result] = await pool.execute(
        `UPDATE siswa
         SET kode_siswa = ?,
             nama = ?,
             alamat = ?,
             tanggal_lahir = ?,
             jurusan = ?
         WHERE id = ?`,
        [
          kode_siswa.trim(),
          nama.trim(),
          alamat,
          tanggal_lahir || null,
          jurusan.trim(),
          id,
        ]
      );

      if (result.affectedRows === 0) {
        const [existing] = await pool.execute(
          'SELECT id FROM siswa WHERE id = ?',
          [id]
        );

        if (existing.length === 0) {
          return res.status(404).json({ message: 'Siswa tidak ditemukan.' });
        }
      }

      const [rows] = await pool.execute(
        `SELECT ${COLUMNS} FROM siswa WHERE id = ?`,
        [id]
      );

      res.json({
        message: 'Data siswa berhasil diperbarui.',
        data: formatSiswa(rows[0]),
      });
    } catch (error) {
      console.error('Gagal mengedit siswa:', error.message);

      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          message: 'Kode siswa sudah digunakan siswa lain.',
        });
      }

      res.status(500).json({ message: 'Gagal memperbarui data siswa.' });
    }
  });

  app.delete('/api/siswa/:id', async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: 'ID siswa tidak valid.' });
    }

    try {
      const [result] = await pool.execute(
        'DELETE FROM siswa WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Siswa tidak ditemukan.' });
      }

      res.json({ message: 'Data siswa berhasil dihapus.' });
    } catch (error) {
      console.error('Gagal menghapus siswa:', error.message);
      res.status(500).json({ message: 'Gagal menghapus data siswa.' });
    }
  });

  app.use((req, res) => {
    res.status(404).json({
      message: `Route ${req.method} ${req.originalUrl} tidak ditemukan.`,
    });
  });

  app.use((error, req, res, next) => {
    console.error('Error server:', error.message);

    if (res.headersSent) {
      return next(error);
    }

    res.status(error.status || 500).json({
      message: error.status === 400
        ? 'Format JSON yang dikirim tidak valid.'
        : 'Terjadi kesalahan pada server.',
    });
  });

  return app;
}
