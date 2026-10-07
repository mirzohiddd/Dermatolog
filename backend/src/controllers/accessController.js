import { getUserStatus } from '../services/userService.js';

/**
 * POST /api/access — kalkulyatorni ochishdan oldin tekshiruv.
 * Bu yerga faqat `approved` foydalanuvchi yetib keladi (middleware tekshiradi).
 */
export function checkAccess(req, res) {
  const user = req.accessUser;
  res.json({
    allowed: true,
    status: getUserStatus(user),
    user: { id: user.id, firstName: user.firstName },
  });
}
