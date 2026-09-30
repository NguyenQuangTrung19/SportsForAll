import type { Prisma } from '@prisma/client';

/**
 * Uy tín cá nhân (FR-002.12) — tự tính từ phiếu chấm đội, không có phiếu riêng.
 *
 * Ba quy tắc cho công bằng:
 * 1. Chỉ tính trận mình đã báo "going" — không ăn theo điểm đội lúc vắng mặt,
 *    cũng không bị kéo xuống bởi trận mình không đá.
 * 2. Mỗi trận gộp thành một điểm (trung bình các phiếu cho đội mình trận đó), để
 *    đối thủ đông người không nặng ký hơn đối thủ ít người.
 * 3. Trung bình Bayes: cộng thêm PRIOR_WEIGHT trận "ảo" điểm PRIOR_SCORE, nên
 *    một phiếu cay cú hay một phiếu nhờ vả đầu tiên không làm điểm nhảy vọt.
 *    Chơi càng nhiều trận, điểm càng tiến về trung bình thật.
 */
export const PRIOR_SCORE = 3;
export const PRIOR_WEIGHT = 3;

/** 0 = chưa có trận nào được chấm, cùng quy ước với `Team.reputation`. */
export function playerReputation(matchScores: number[]): number {
  if (matchScores.length === 0) return 0;
  const sum = matchScores.reduce((a, b) => a + b, 0);
  return (PRIOR_SCORE * PRIOR_WEIGHT + sum) / (PRIOR_WEIGHT + matchScores.length);
}

/** Uy tín đội (FR-007.7): trung bình điểm các trận, mỗi trận nặng như nhau. */
export function teamReputation(matchScores: number[]): number {
  if (matchScores.length === 0) return 0;
  return matchScores.reduce((a, b) => a + b, 0) / matchScores.length;
}

/**
 * Ghi điểm trận `matchId` của `teamId` vào sổ đội `TeamMatchScore` và sổ cá nhân
 * `PlayerMatchScore` (mọi người của đội đã báo "going"), rồi tính lại uy tín từ
 * hai sổ đó. Trả về uy tín mới của đội.
 *
 * Điểm trận ghi đè chứ không cộng dồn — phiếu sửa được. Uy tín tính từ sổ chứ
 * không từ `Rating`, vì `Rating` bị xoá dây chuyền khi một trong hai đội giải tán:
 * đối thủ giải tán không được phép xoá phiếu mình đã nhận.
 */
export async function recordMatchScore(
  tx: Prisma.TransactionClient,
  matchId: string,
  teamId: string,
): Promise<number> {
  const [agg, players] = await Promise.all([
    tx.rating.aggregate({ where: { matchId, ratedTeamId: teamId }, _avg: { score: true } }),
    tx.matchAttendance.findMany({
      where: { matchId, teamId, status: 'going' },
      select: { userId: true },
    }),
  ]);
  const score = agg._avg.score;
  if (score === null)
    throw new Error(`recordMatchScore: trận ${matchId} chưa có phiếu cho đội ${teamId}`);

  await tx.teamMatchScore.upsert({
    where: { teamId_matchId: { teamId, matchId } },
    create: { teamId, matchId, score },
    update: { score },
  });
  const teamLedger = await tx.teamMatchScore.findMany({
    where: { teamId },
    select: { score: true },
  });
  const reputation = teamReputation(teamLedger.map((r) => r.score));
  await tx.team.update({ where: { id: teamId }, data: { reputation } });

  if (players.length === 0) return reputation;
  const userIds = players.map((p) => p.userId);

  for (const userId of userIds) {
    await tx.playerMatchScore.upsert({
      where: { userId_matchId: { userId, matchId } },
      create: { userId, matchId, score },
      update: { score },
    });
  }

  const ledger = await tx.playerMatchScore.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, score: true },
  });
  for (const userId of userIds) {
    const scores = ledger.filter((r) => r.userId === userId).map((r) => r.score);
    await tx.user.update({
      where: { id: userId },
      data: { reputation: playerReputation(scores), ratedMatches: scores.length },
    });
  }
  return reputation;
}
