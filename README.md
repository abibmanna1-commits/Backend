# API Data Siswa

REST API CRUD menggunakan Express.js dan MySQL/MariaDB di Laragon. Backend memakai database dari konfigurasi `.env` dan tabel `siswa` dengan kolom `id`, `kode_siswa`, `nama`, `alamat`, `tanggal_lahir`, `jurusan`, dan `created_at`.

## Konfigurasi Laragon

Jalankan MySQL/MariaDB di Laragon, lalu buat file `.env` di folder backend:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=db_siswa
PORT=3000
```

Pastikan database dan tabel `siswa` sudah dibuat di phpMyAdmin. Sesuaikan nama kolom tabel dengan daftar di atas.

## Menjalankan

```bash
npm install
npm start
```

Server berjalan di `http://localhost:3000`. Cek koneksi backend dan MySQL melalui `http://localhost:3000/api/health`.

Jika frontend menggunakan Vite, jalankan pada port `5173` atau `5174`; konfigurasi proxy di `vite.config.js` meneruskan permintaan `/api` ke backend.

## Bentuk data

```json
{
  "kode_siswa": "S001",
  "nama": "Budi Santoso",
  "alamat": "Jl. Merdeka",
  "tanggal_lahir": "2008-05-12",
  "jurusan": "RPL"
}
```

`tanggal_lahir` boleh dikosongkan atau menggunakan tanggal valid berformat `YYYY-MM-DD`. `kode_siswa` bersifat unik.

## Endpoint

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/health` | Mengecek koneksi database |
| `GET` | `/api/siswa` | Mendapatkan semua data siswa |
| `GET` | `/api/siswa/:id` | Mendapatkan satu siswa |
| `POST` | `/api/siswa` | Menambahkan siswa; kirim JSON di atas |
| `PUT` | `/api/siswa/:id` | Memperbarui data siswa |
| `DELETE` | `/api/siswa/:id` | Menghapus siswa |

Jalankan pengujian dengan `npm test`.
