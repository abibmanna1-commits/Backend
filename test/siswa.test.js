import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

function createPoolMock() {
  const rows = [];
  let nextId = 1;

  return {
    async query(sql) {
      if (sql === 'SELECT 1') return [[{ 1: 1 }]];
      if (sql.includes('ORDER BY id DESC')) {
        return [[...rows].sort((a, b) => b.id - a.id)];
      }
      throw new Error(`Query tidak didukung dalam tes: ${sql}`);
    },
    async execute(sql, values) {
      if (sql.includes('INSERT INTO siswa')) {
        const [kode_siswa, nama, alamat, tanggal_lahir, jurusan] = values;
        if (rows.some((row) => row.kode_siswa === kode_siswa)) {
          const error = new Error('Duplicate entry');
          error.code = 'ER_DUP_ENTRY';
          throw error;
        }

        const row = {
          id: nextId++,
          kode_siswa,
          nama,
          alamat,
          tanggal_lahir,
          jurusan,
          created_at: null,
        };
        rows.push(row);
        return [{ insertId: row.id }];
      }

      if (sql.includes('UPDATE siswa')) {
        const [kode_siswa, nama, alamat, tanggal_lahir, jurusan, id] = values;
        const row = rows.find((item) => item.id === id);
        if (!row) return [{ affectedRows: 0 }];

        Object.assign(row, {
          kode_siswa,
          nama,
          alamat,
          tanggal_lahir,
          jurusan,
        });
        return [{ affectedRows: 1 }];
      }

      if (sql.includes('DELETE FROM siswa')) {
        const index = rows.findIndex((row) => row.id === values[0]);
        if (index === -1) return [{ affectedRows: 0 }];
        rows.splice(index, 1);
        return [{ affectedRows: 1 }];
      }

      if (sql.includes('FROM siswa WHERE id = ?')) {
        return [[
          ...rows.filter((row) => row.id === values[0]).map((row) => ({ ...row })),
        ]];
      }

      throw new Error(`Query tidak didukung dalam tes: ${sql}`);
    },
  };
}

let server;
let baseUrl;

before(async () => {
  server = createApp(createPoolMock()).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('menambah, membaca, memperbarui, lalu menghapus siswa', async () => {
  const student = {
    kode_siswa: 'S001',
    nama: 'Budi Santoso',
    alamat: 'Jl. Merdeka',
    tanggal_lahir: '2008-05-12',
    jurusan: 'RPL',
  };

  const created = await fetch(`${baseUrl}/api/siswa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student),
  });
  assert.equal(created.status, 201);
  assert.deepEqual((await created.json()).data.kode_siswa, 'S001');

  const list = await fetch(`${baseUrl}/api/siswa`);
  assert.equal((await list.json())[0].nama, 'Budi Santoso');

  const updated = await fetch(`${baseUrl}/api/siswa/1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...student, jurusan: 'TKJ' }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).data.jurusan, 'TKJ');

  const deleted = await fetch(`${baseUrl}/api/siswa/1`, { method: 'DELETE' });
  assert.equal(deleted.status, 200);
  assert.equal((await fetch(`${baseUrl}/api/siswa/1`)).status, 404);
});

test('menolak input tidak valid dan kode siswa duplikat', async () => {
  const student = {
    kode_siswa: 'S002',
    nama: 'Siti Aminah',
    alamat: 'Jl. Melati',
    tanggal_lahir: '2010-02-30',
    jurusan: 'DKV',
  };

  const invalidDate = await fetch(`${baseUrl}/api/siswa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student),
  });
  assert.equal(invalidDate.status, 400);

  student.tanggal_lahir = '2010-02-28';
  const created = await fetch(`${baseUrl}/api/siswa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student),
  });
  assert.equal(created.status, 201);

  const duplicate = await fetch(`${baseUrl}/api/siswa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student),
  });
  assert.equal(duplicate.status, 409);

  const missingBody = await fetch(`${baseUrl}/api/siswa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(missingBody.status, 400);
});
