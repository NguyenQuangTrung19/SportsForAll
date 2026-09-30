/**
 * Thách đấu → ghép trận → sau trận, chạy thật qua HTTP + CSDL (FR-005, 7.6, 5.10).
 * Cách chạy: RUNBOOK mục 6.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { oneWinner, startDbApp, TEST_DB, type DbApp } from '../test/db-app.js';

describe(
  'Thách đấu và ghép trận (CSDL thật)',
  { skip: !TEST_DB && 'chưa đặt TEST_DATABASE_URL' },
  () => {
    let app: DbApp;
    /** Captain của ba đội, và một thành viên thường của đội nhà. */
    const tok = { home: '', a: '', b: '', member: '' };
    const ids = { home: '', a: '', b: '', member: '' };
    const team = { home: '', a: '', b: '' };

    const openRequest = async (body: Record<string, unknown> = {}) => {
      const r = await app.call(tok.home, 'POST', '/matches/requests', {
        teamId: team.home,
        description: 'Giao hữu cuối tuần',
        ...body,
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      return r.body.id;
    };

    /** Gửi thách đấu, trả id của thách đấu (phản hồi là cả lời mời nên tra lại CSDL). */
    const challenge = async (who: 'a' | 'b', requestId: string) => {
      const r = await app.call(tok[who], 'POST', `/matches/requests/${requestId}/challenges`, {
        challengerTeamId: team[who],
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      const c = await app.prisma.challenge.findFirstOrThrow({
        where: { matchRequestId: requestId, challengerTeamId: team[who] },
      });
      return c.id;
    };

    const accept = (challengeId: string, as = tok.home) =>
      app.call(as, 'POST', `/matches/challenges/${challengeId}/accept`);

    before(async () => {
      app = await startDbApp();
      for (const who of ['home', 'a', 'b', 'member'] as const) {
        const u = await app.user(who);
        ids[who] = u.id;
        tok[who] = u.token;
      }
      team.home = await app.team('Nhà', ids.home);
      team.a = await app.team('Khách A', ids.a);
      team.b = await app.team('Khách B', ids.b);
      await app.prisma.teamMember.create({ data: { teamId: team.home, userId: ids.member } });
    });

    after(() => app?.close());

    it('nhận một thách đấu: tạo trận, đóng lời mời, từ chối thách đấu còn lại, báo cả ba đội', async () => {
      const at = new Date(Date.now() + 3 * 86_400_000);
      const requestId = await openRequest({ preferredTime: at.toISOString(), venueName: 'Sân X' });
      const ca = await challenge('a', requestId);
      const cb = await challenge('b', requestId);

      const r = await accept(ca);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.status, 'matched');

      const match = await app.prisma.match.findUniqueOrThrow({
        where: { matchRequestId: requestId },
      });
      assert.equal(match.homeTeamId, team.home);
      assert.equal(match.awayTeamId, team.a);
      assert.equal(match.scheduledAt?.toISOString(), at.toISOString());
      assert.equal(match.venueName, 'Sân X');

      const lost = await app.prisma.challenge.findUniqueOrThrow({ where: { id: cb } });
      assert.equal(lost.status, 'rejected');

      const types = async (userId: string) =>
        (await app.prisma.notification.findMany({ where: { userId } })).map((n) => n.type);
      assert.ok((await types(ids.a)).includes('challenge_accepted'));
      assert.ok((await types(ids.b)).includes('challenge_rejected'));
      assert.ok((await types(ids.home)).includes('match_scheduled'));

      // Lời mời đã ghép thì không nhận thêm thách đấu.
      const late = await app.call(tok.b, 'POST', `/matches/requests/${requestId}/challenges`, {
        challengerTeamId: team.b,
      });
      assert.equal(late.status, 400);
    });

    it('nhận hai thách đấu cùng lúc: chỉ một trận, bên kia nhận lỗi 4xx', async () => {
      const requestId = await openRequest();
      const ca = await challenge('a', requestId);
      const cb = await challenge('b', requestId);

      const results = await Promise.all([accept(ca), accept(cb)]);
      assert.ok(oneWinner(results.map((r) => r.status)), JSON.stringify(results));
      assert.equal(await app.prisma.match.count({ where: { matchRequestId: requestId } }), 1);

      const rows = await app.prisma.challenge.findMany({ where: { matchRequestId: requestId } });
      assert.deepEqual(rows.map((c) => c.status).sort(), ['accepted', 'rejected']);
    });

    it('nhận và rút cùng lúc: đúng một bên thắng, dữ liệu khớp với bên thắng', async () => {
      const requestId = await openRequest();
      const ca = await challenge('a', requestId);

      const [acc, wd] = await Promise.all([
        accept(ca),
        app.call(tok.a, 'POST', `/matches/challenges/${ca}/withdraw`),
      ]);
      assert.ok(oneWinner([acc.status, wd.status]), JSON.stringify([acc, wd]));

      const c = await app.prisma.challenge.findUniqueOrThrow({ where: { id: ca } });
      const req = await app.prisma.matchRequest.findUniqueOrThrow({ where: { id: requestId } });
      const matches = await app.prisma.match.count({ where: { matchRequestId: requestId } });
      if (acc.status === 200) {
        assert.deepEqual([c.status, req.status, matches], ['accepted', 'matched', 1]);
      } else {
        assert.deepEqual([c.status, req.status, matches], ['withdrawn', 'open', 0]);
      }
    });

    it('không nhận được thách đấu trên lời mời đã huỷ', async () => {
      const requestId = await openRequest();
      const ca = await challenge('a', requestId);
      const cancel = await app.call(tok.home, 'PATCH', `/matches/requests/${requestId}`, {
        status: 'cancelled',
      });
      assert.equal(cancel.status, 200);

      assert.equal((await accept(ca)).status, 400);
      assert.equal(await app.prisma.match.count({ where: { matchRequestId: requestId } }), 0);
    });

    it('chặn: tự thách đấu, gửi trùng, thành viên thường duyệt; bị từ chối thì gửi lại được', async () => {
      const requestId = await openRequest();
      const self = await app.call(tok.home, 'POST', `/matches/requests/${requestId}/challenges`, {
        challengerTeamId: team.home,
      });
      assert.equal(self.status, 400);

      const ca = await challenge('a', requestId);
      const dup = await app.call(tok.a, 'POST', `/matches/requests/${requestId}/challenges`, {
        challengerTeamId: team.a,
      });
      assert.equal(dup.status, 409);
      assert.equal((await accept(ca, tok.member)).status, 403);

      const rej = await app.call(tok.home, 'POST', `/matches/challenges/${ca}/reject`);
      assert.equal(rej.status, 200);
      // Gửi lại làm mới chính dòng cũ (@@unique([matchRequestId, challengerTeamId])).
      assert.equal(await challenge('a', requestId), ca);
    });

    it('sau trận: chốt tỉ số một lần, hiện trong lịch sử đội, chấm điểm cập nhật uy tín', async () => {
      // Không hẹn giờ thì chốt lúc nào cũng được (canEndMatch).
      const requestId = await openRequest();
      await accept(await challenge('a', requestId));
      const match = await app.prisma.match.findUniqueOrThrow({
        where: { matchRequestId: requestId },
      });

      const notManager = await app.call(tok.member, 'POST', `/matches/${match.id}/complete`, {
        homeScore: 2,
        awayScore: 1,
      });
      assert.equal(notManager.status, 403);

      const done = await app.call(tok.a, 'POST', `/matches/${match.id}/complete`, {
        homeScore: 2,
        awayScore: 1,
      });
      assert.equal(done.status, 200, JSON.stringify(done.body));
      assert.equal(done.body.status, 'completed');
      const again = await app.call(tok.home, 'POST', `/matches/${match.id}/complete`, {
        homeScore: 0,
        awayScore: 0,
      });
      assert.equal(again.status, 400);

      const history = await app.call(tok.b, 'GET', `/matches/team/${team.home}`);
      assert.equal(history.status, 200);
      const items = history.body.items as { id: string; homeScore: number; awayScore: number }[];
      const row = items.find((m) => m.id === match.id);
      assert.deepEqual([row?.homeScore, row?.awayScore], [2, 1]);

      const rated = await app.call(tok.home, 'POST', `/matches/${match.id}/rating`, { score: 5 });
      assert.equal(rated.status, 201, JSON.stringify(rated.body));
      const away = await app.prisma.team.findUniqueOrThrow({ where: { id: team.a } });
      assert.ok(away.reputation > 0);
    });
  },
);
