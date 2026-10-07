import { db } from './db.js';
import { USER_STATUS, getUserStatus } from './userService.js';
import { localDateKey } from '../utils/format.js';

/**
 * Admin panel dashboard raqamlari.
 * (Avval `controllers/adminController.js` da edi — endi service qatlamida.)
 *
 * @returns {Promise<{
 *   totalUsers: number,
 *   todayUsers: number,
 *   totalCalculations: number,
 *   todayCalculations: number,
 *   bySource: Record<string, number>,
 *   byStatus: { pending: number, approved: number, rejected: number }
 * }>}
 */
export async function getDashboardStats() {
  const [users, calculations] = await Promise.all([db.read('users'), db.read('calculations')]);
  const today = localDateKey(new Date());

  const bySource = {};
  const byStatus = { [USER_STATUS.PENDING]: 0, [USER_STATUS.APPROVED]: 0, [USER_STATUS.REJECTED]: 0 };
  for (const u of users) {
    const source = u.source || 'direct';
    bySource[source] = (bySource[source] || 0) + 1;
    byStatus[getUserStatus(u)] += 1; // status yo‘q eski yozuvlar — pending
  }

  return {
    totalUsers: users.length,
    todayUsers: users.filter((u) => localDateKey(u.startedAt) === today).length,
    totalCalculations: calculations.length,
    todayCalculations: calculations.filter((c) => localDateKey(c.createdAt) === today).length,
    bySource,
    byStatus,
  };
}