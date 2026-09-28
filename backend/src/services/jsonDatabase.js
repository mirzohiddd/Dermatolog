import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * JSON fayl asosidagi xavfsiz "ma'lumotlar bazasi".
 *
 * Xavfsizlik choralari:
 *  1. Faqat ruxsat etilgan kolleksiyalar (users, calculations, admins) —
 *     tashqaridan fayl nomi berib, boshqa faylni o‘qib/yozib bo‘lmaydi.
 *  2. Har bir kolleksiya uchun navbat (queue): bir vaqtda kelgan ikki
 *     so‘rov bir-birining yozganini o‘chirib yubormaydi.
 *  3. Atomik yozish: avval vaqtinchalik faylga yoziladi, keyin bir zumda
 *     asosiy fayl nomiga almashtiriladi. Yozish yarmida elektr o‘chsa ham
 *     eski fayl butun qoladi.
 *  4. Har yozishdan oldin eski versiya `.bak` faylga saqlanadi. Asosiy fayl
 *     buzilgan bo‘lsa, `.bak` dan tiklanadi.
 */

export const COLLECTIONS = Object.freeze(['users', 'calculations', 'admins']);

export class JsonDatabase {
  constructor(dataDir) {
    this.dataDir = path.resolve(dataDir);
    this.cache = new Map();
    this.queues = new Map();
  }

  #filePath(name) {
    if (!COLLECTIONS.includes(name)) {
      throw new Error(`Noma'lum kolleksiya: ${name}`);
    }
    const file = path.join(this.dataDir, `${name}.json`);
    if (path.dirname(file) !== this.dataDir) throw new Error('Ruxsat etilmagan fayl yo‘li');
    return file;
  }

  /** Papka va fayllarni yaratadi (agar yo‘q bo‘lsa). */
  async init() {
    await fs.mkdir(this.dataDir, { recursive: true });
    for (const name of COLLECTIONS) {
      const file = this.#filePath(name);
      try {
        await fs.access(file);
      } catch {
        await fs.writeFile(file, '[]\n', 'utf8');
      }
      await this.#load(name);
    }
  }

  async #parseFile(file) {
    const text = await fs.readFile(file, 'utf8');
    const data = JSON.parse(text.trim() === '' ? '[]' : text);
    if (!Array.isArray(data)) throw new Error('JSON massiv (array) emas');
    return data;
  }

  async #load(name) {
    if (this.cache.has(name)) return this.cache.get(name);
    const file = this.#filePath(name);
    let data;
    try {
      data = await this.#parseFile(file);
    } catch (error) {
      if (error.code === 'ENOENT') {
        data = [];
      } else {
        console.error(`[db] ${name}.json o‘qilmadi: ${error.message}`);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        await fs.copyFile(file, `${file}.corrupt-${stamp}`).catch(() => {});
        try {
          data = await this.#parseFile(`${file}.bak`);
          console.error(`[db] ${name}.json zaxira (.bak) dan tiklandi`);
        } catch {
          console.error(`[db] ${name}.json uchun zaxira yo‘q — bo‘sh ro‘yxatdan boshlandi. Buzilgan fayl nusxasi saqlandi.`);
          data = [];
        }
        await this.#write(name, data);
      }
    }
    this.cache.set(name, data);
    return data;
  }

  async #write(name, data) {
    const file = this.#filePath(name);
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    const json = `${JSON.stringify(data, null, 2)}\n`;
    const handle = await fs.open(tmp, 'w');
    try {
      await handle.writeFile(json, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.copyFile(file, `${file}.bak`).catch(() => {});
    await fs.rename(tmp, file);
  }

  #enqueue(name, task) {
    const previous = this.queues.get(name) || Promise.resolve();
    const next = previous.then(task, task);
    this.queues.set(name, next.catch(() => {}));
    return next;
  }

  /** Kolleksiyaning nusxasini qaytaradi (o‘zgartirish bazaga ta'sir qilmaydi). */
  async read(name) {
    this.#filePath(name);
    return this.#enqueue(name, async () => structuredClone(await this.#load(name)));
  }

  /**
   * Kolleksiyani o‘zgartirish. `mutator(items)` massivni o‘zgartiradi va
   * istalgan natijani qaytaradi. Faylga yozish muvaffaqiyatli bo‘lgandagina
   * xotiradagi ma'lumot yangilanadi.
   */
  async update(name, mutator) {
    this.#filePath(name);
    return this.#enqueue(name, async () => {
      const current = await this.#load(name);
      const draft = structuredClone(current);
      const result = await mutator(draft);
      await this.#write(name, draft);
      this.cache.set(name, draft);
      return structuredClone(result);
    });
  }

  static nextId(items) {
    return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  }
}
