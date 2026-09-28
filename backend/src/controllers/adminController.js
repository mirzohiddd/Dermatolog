import { db } from '../services/db.js';
import { localDateKey } from '../utils/format.js';

/** GET /api/admin/stats — dashboard raqamlari. */
export async function getStats(_req, res) {
  const [users, calculations] = await Promise.all([db.read('users'), db.read('calculations')]);
  const today = localDateKey(new Date());

  const bySource = {};
  for (const u of users) bySource[u.source || 'direct'] = (bySource[u.source || 'direct'] || 0) + 1;

  res.json({
    totalUsers: users.length,
    todayUsers: users.filter((u) => localDateKey(u.startedAt) === today).length,
    totalCalculations: calculations.length,
    todayCalculations: calculations.filter((c) => localDateKey(c.createdAt) === today).length,
    bySource,
  });
}
