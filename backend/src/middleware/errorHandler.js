import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, `API yo‘li topilmadi: ${req.method} ${req.originalUrl}`));
}

// Express xato handleri 4 ta argument talab qiladi
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'So‘rov tanasi noto‘g‘ri JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'So‘rov juda katta' });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
  }
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({ error: 'Serverda kutilmagan xatolik. Birozdan keyin qayta urinib ko‘ring.' });
}
