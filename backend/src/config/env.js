import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

const TELEGRAM_ID_RE = /^\d{1,15}$/;

function list(value) {
  return String(value || '')
    .split(',')
    .map((v) => v.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const frontendUrls = list(process.env.FRONTEND_URL || 'http://localhost:5173');

const adminIds = [process.env.ADMIN_ID_1, process.env.ADMIN_ID_2]
  .map(clean)
  .filter(Boolean);

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  frontendUrls,
  webAppUrl: clean(process.env.WEBAPP_URL) || frontendUrls[0],
  dataDir: path.resolve(BACKEND_ROOT, clean(process.env.DATA_DIR) || 'data'),
  timezone: clean(process.env.TIMEZONE) || 'Asia/Tashkent',

  botToken: clean(process.env.BOT_TOKEN),
  webhookDomain: clean(process.env.WEBHOOK_DOMAIN).replace(/\/+$/, ''),
  adminIds: adminIds.filter((id) => TELEGRAM_ID_RE.test(id)),
  invalidAdminIds: adminIds.filter((id) => !TELEGRAM_ID_RE.test(id)),
  notifyOnCalculation: clean(process.env.NOTIFY_ON_CALCULATION).toLowerCase() !== 'false',
  initDataMaxAgeSeconds: 24 * 60 * 60,

  adminUsername: clean(process.env.ADMIN_USERNAME),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: '12h',
};

/**
 * Server ishga tushishidan oldin majburiy sozlamalarni tekshiradi.
 * Xato bo‘lsa — tushunarli xabar bilan to‘xtaydi.
 */
export function validateConfig(cfg = config) {
  const errors = [];
  const warnings = [];

  if (!cfg.adminUsername) errors.push('ADMIN_USERNAME to‘ldirilmagan');
  if (!cfg.adminPassword) errors.push('ADMIN_PASSWORD to‘ldirilmagan');
  else if (cfg.adminPassword.length < 8) errors.push('ADMIN_PASSWORD kamida 8 ta belgidan iborat bo‘lsin');
  if (!cfg.jwtSecret) errors.push('JWT_SECRET to‘ldirilmagan');
  else if (cfg.jwtSecret.length < 32) errors.push('JWT_SECRET kamida 32 ta belgidan iborat bo‘lsin');

  if (!cfg.botToken) warnings.push('BOT_TOKEN yo‘q — Telegram bot va bildirishnomalar o‘chirilgan');
  if (cfg.botToken && cfg.adminIds.length === 0) warnings.push('ADMIN_ID_1 / ADMIN_ID_2 yo‘q — adminlarga xabar yuborilmaydi');
  for (const bad of cfg.invalidAdminIds) warnings.push(`Admin ID noto‘g‘ri (faqat raqam bo‘lishi kerak): "${bad}"`);
  if (cfg.botToken && !cfg.webAppUrl.startsWith('https://')) {
    warnings.push('WEBAPP_URL https:// emas — Telegram Web App tugmasi o‘rniga oddiy havola ishlatiladi');
  }

  return { errors, warnings };
}
