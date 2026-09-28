import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { JsonDatabase } from '../src/services/jsonDatabase.js';

async function freshDb() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsondb-'));
  const db = new JsonDatabase(dir);
  await db.init();
  return { db, dir };
}

test('fayllar avtomatik yaratiladi', async () => {
  const { dir } = await freshDb();
  for (const f of ['users', 'calculations', 'admins']) {
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir, `${f}.json`), 'utf8')), []);
  }
});

test('200 ta parallel yozuv — hech biri yo‘qolmaydi, ID lar takrorlanmaydi', async () => {
  const { db, dir } = await freshDb();
  await Promise.all(
    Array.from({ length: 200 }, (_, i) =>
      db.update('calculations', (items) => {
        items.push({ id: JsonDatabase.nextId(items), n: i });
      }),
    ),
  );
  const onDisk = JSON.parse(await fs.readFile(path.join(dir, 'calculations.json'), 'utf8'));
  assert.equal(onDisk.length, 200);
  assert.equal(new Set(onDisk.map((x) => x.id)).size, 200);
  assert.equal((await fs.readdir(dir)).filter((f) => f.endsWith('.tmp')).length, 0);
});

test('ruxsat etilmagan kolleksiya / fayl yo‘li rad etiladi', async () => {
  const { db } = await freshDb();
  await assert.rejects(() => db.read('../../etc/passwd'), /Noma'lum kolleksiya/);
  await assert.rejects(() => db.update('settings/../users', () => {}), /Noma'lum kolleksiya/);
});

test('buzilgan JSON fayl .bak zaxiradan tiklanadi', async () => {
  const { db, dir } = await freshDb();
  await db.update('users', (u) => u.push({ id: 1, firstName: 'Ali' }));
  await db.update('users', (u) => u.push({ id: 2, firstName: 'Vali' }));
  await fs.writeFile(path.join(dir, 'users.json'), '{ buzilgan json', 'utf8');

  const db2 = new JsonDatabase(dir);
  const users = await db2.read('users');
  assert.deepEqual(users.map((u) => u.id), [1]); // .bak = oxirgidan oldingi holat
  const files = await fs.readdir(dir);
  assert.ok(files.some((f) => f.startsWith('users.json.corrupt-')), 'buzilgan fayl nusxasi saqlanishi kerak');
});

test('mutator xato bersa — ma’lumot o‘zgarmaydi', async () => {
  const { db } = await freshDb();
  await db.update('users', (u) => u.push({ id: 1 }));
  await assert.rejects(() =>
    db.update('users', (u) => {
      u.push({ id: 2 });
      throw new Error('stop');
    }),
  );
  assert.equal((await db.read('users')).length, 1);
});

test('read() nusxa qaytaradi — tashqarida o‘zgartirish bazaga ta’sir qilmaydi', async () => {
  const { db } = await freshDb();
  await db.update('users', (u) => u.push({ id: 1, firstName: 'Ali' }));
  const copy = await db.read('users');
  copy[0].firstName = 'Hacker';
  assert.equal((await db.read('users'))[0].firstName, 'Ali');
});
