import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { db } from '../services/db.js';
import { JsonDatabase } from '../services/jsonDatabase.js';
import { badRequest, unauthorized } from '../utils/httpError.js';

/** Vaqtga bog‘liq hujumlardan himoyalangan taqqoslash. */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function login(req, res) {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    throw badRequest('Login va parolni kiriting');
  }
  if (username.length > 100 || password.length > 200) throw badRequest('Login yoki parol juda uzun');

  const userOk = safeEqual(username.trim(), config.adminUsername);
  const passOk = safeEqual(password, config.adminPassword);
  if (!(userOk && passOk)) throw unauthorized('Login yoki parol noto‘g‘ri');

  const now = new Date().toISOString();
  const admin = await db.update('admins', (admins) => {
    let record = admins.find((a) => a.username === config.adminUsername);
    const previousLoginAt = record?.lastLoginAt ?? null;
    if (!record) {
      record = { id: JsonDatabase.nextId(admins), username: config.adminUsername, createdAt: now, loginCount: 0 };
      admins.push(record);
    }
    record.lastLoginAt = now;
    record.loginCount += 1;
    return { username: record.username, previousLoginAt };
  });

  const token = jwt.sign({ role: 'admin' }, config.jwtSecret, {
    subject: config.adminUsername,
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  });

  res.json({ token, admin });
}
