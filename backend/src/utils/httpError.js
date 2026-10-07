export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Avtorizatsiya talab qilinadi', details) => new HttpError(401, message, details);
export const forbidden = (message = 'Ruxsat yo‘q', details) => new HttpError(403, message, details);
export const notFound = (message = 'Topilmadi') => new HttpError(404, message);
