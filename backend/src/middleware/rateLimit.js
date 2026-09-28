import { rateLimit } from 'express-rate-limit';

const message = (text) => ({ error: text });

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Juda ko‘p so‘rov. Birozdan keyin urinib ko‘ring.'),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: message('Juda ko‘p noto‘g‘ri urinish. 15 daqiqadan keyin qayta urinib ko‘ring.'),
});

export const calculationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Juda tez-tez hisoblayapsiz. Bir daqiqadan keyin urinib ko‘ring.'),
});
