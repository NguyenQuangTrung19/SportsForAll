import { prisma } from './db.js';
import { logger } from './logger.js';
import { notify } from './notify.js';

/** Nhắc trước giờ đá bao lâu — đủ sớm để còn kịp báo có mặt (khoá lúc bóng lăn). */
export const REMIND_BEFORE_MS = 24 * 3_600_000;
const TICK_MS = 5 * 60_000;

// Máy chủ chạy UTC; giờ trong thông báo phải là giờ người đọc.
const KICKOFF = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Nhắc trận sắp diễn ra (FR-009.4) cho mọi thành viên hai đội.
 *
 * Mỗi trận được "giữ chỗ" bằng `updateMany ... where reminderSentAt null` trong
 * cùng giao dịch với thông báo: hai instance quét trùng thì chỉ một bên thắng,
 * còn gửi lỗi thì cờ cũng lùi lại theo, lần quét sau thử lại.
 */
export async function sendMatchReminders(now = new Date()): Promise<number> {
  const due = await prisma.match.findMany({
    where: {
      status: 'scheduled',
      reminderSentAt: null,
      scheduledAt: { gt: now, lte: new Date(now.getTime() + REMIND_BEFORE_MS) },
    },
    include: {
      homeTeam: { include: { members: { select: { userId: true } } } },
      awayTeam: { include: { members: { select: { userId: true } } } },
    },
  });

  let sent = 0;
  for (const m of due) {
    const claimed = await prisma.$transaction(async (tx) => {
      const { count } = await tx.match.updateMany({
        where: { id: m.id, reminderSentAt: null },
        data: { reminderSentAt: now },
      });
      if (count === 0) return false;
      await notify(tx, {
        userIds: [...m.homeTeam.members, ...m.awayTeam.members].map((x) => x.userId),
        type: 'match_reminder',
        title: `Sắp đá: ${m.homeTeam.name} vs ${m.awayTeam.name}`,
        message: `${KICKOFF.format(m.scheduledAt!)}${m.venueName ? ` · ${m.venueName}` : ''} — nhớ báo có mặt`,
        link: m.matchRequestId ? `/match-requests/${m.matchRequestId}` : '/dashboard',
      });
      return true;
    });
    if (claimed) sent++;
  }
  return sent;
}

/**
 * Chạy vòng quét ngay khi khởi động rồi cứ 5 phút một lần.
 *
 * ponytail: hẹn giờ trong process — Render free ngủ sau 15 phút không có request
 * thì vòng quét ngủ theo; nhắc trễ tới khi có request đánh thức, và trận đá trước
 * lúc đó thì mất nhắc. Cần chắc chắn thì cho một cron ngoài (cron-job.org) gọi
 * `/api/health` mỗi 10 phút, hoặc chuyển sang Render Cron Job.
 */
export function startMatchReminders(): () => void {
  const tick = () =>
    sendMatchReminders()
      .then((n) => n > 0 && logger.info({ sent: n }, 'match reminders sent'))
      .catch((err: unknown) => logger.error({ err }, 'match reminder tick failed'));
  void tick();
  const timer = setInterval(() => void tick(), TICK_MS);
  return () => clearInterval(timer);
}
