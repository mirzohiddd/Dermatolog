import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { unauthorized } from '../utils/httpError.js';

/** Admin yo‘llarini himoyalaydi: "Authorization: Bearer <token>" talab qilinadi. */
export function requireAdmin(req, _res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());

  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (payload.role !== 'admin') return next(unauthorized('Ruxsat yo‘q'));
    req.admin = { username: payload.sub };
    return next();
  } catch {
    return next(unauthorized('Sessiya muddati tugagan. Qaytadan kiring.'));
  }
}
