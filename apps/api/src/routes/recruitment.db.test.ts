/**
 * Xin vào đội qua bài tuyển → captain/phó duyệt, chạy thật qua HTTP + CSDL (FR-006).
 * Cách chạy: RUNBOOK mục 6.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { oneWinner, startDbApp, TEST_DB, type DbApp } from '../test/db-app.js';

describe(
  'Duyệt đơn vào đội (CSDL thật)',
  { skip: !TEST_DB && 'chưa đặt TEST_DATABASE_URL' },
  () => {
    let app: DbApp;
    /** Captain, đội phó, thành viên thường của đội; hai người chơi ngoài đội. */
    const tok = { captain: '', vice: '', member: '', p1: '', p2: '' };
    const ids = { captain: '', vice: '', member: '', p1: '', p2: '' };
    let teamId = '';

    const openPost = async () => {
      const r = await app.call(tok.captain, 'POST', '/recruitment/posts', {
        teamId,
        description: 'Tuyển tiền vệ đá tối thứ 4',
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      return r.body.id;
    };

    /**
     * Gửi đơn, trả id đơn (phản hồi là cả bài đăng nên tra lại CSDL). Cho người chơi
     * rời đội trước, để test trước có hỏng giữa chừng thì test này vẫn chạy độc lập.
     */
    const apply = async (who: 'p1' | 'p2', postId: string) => {
      await app.prisma.teamMember.deleteMany({
        where: { teamId, userId: ids[who], role: 'member' },
      });
      const r = await app.call(tok[who], 'POST', `/recruitment/posts/${postId}/requests`, {});
      assert.equal(r.status, 201, JSON.stringify(r.body));
      const jr = await app.prisma.joinRequest.findFirstOrThrow({
        where: { postId, userId: ids[who] },
      });
      return jr.id;
    };

    const decide = (as: string, requestId: string, action: 'accept' | 'reject' | 'cancel') =>
      app.call(as, 'POST', `/recruitment/requests/${requestId}/${action}`);

    const isMember = async (userId: string) =>
      (await app.prisma.teamMember.count({ where: { teamId, userId } })) === 1;

    before(async () => {
      app = await startDbApp();
      for (const who of ['captain', 'vice', 'member', 'p1', 'p2'] as const) {
        const u = await app.user(who);
        ids[who] = u.id;
        tok[who] = u.token;
      }
      teamId = await app.team('Đội tuyển', ids.captain);
      await app.prisma.teamMember.createMany({
        data: [
          { teamId, userId: ids.vice, role: 'co_captain' },
          { teamId, userId: ids.member, role: 'member' },
        ],
      });
    });

    after(() => app?.close());

    it('nhận đơn: vào đội với vai trò thành viên, báo cả hai phía, không xin lại được', async () => {
      const postId = await openPost();
      const jr = await apply('p1', postId);

      const received = await app.prisma.notification.count({
        where: { userId: { in: [ids.captain, ids.vice] }, type: 'join_request_received' },
      });
      assert.ok(received >= 2);

      const r = await decide(tok.captain, jr, 'accept');
      assert.equal(r.status, 200, JSON.stringify(r.body));

      const row = await app.prisma.teamMember.findFirstOrThrow({
        where: { teamId, userId: ids.p1 },
      });
      assert.equal(row.role, 'member');
      const req = await app.prisma.joinRequest.findUniqueOrThrow({ where: { id: jr } });
      assert.equal(req.status, 'accepted');
      const told = await app.prisma.notification.count({
        where: { userId: ids.p1, type: 'join_request_accepted' },
      });
      assert.equal(told, 1);

      const again = await app.call(tok.p1, 'POST', `/recruitment/posts/${postId}/requests`, {});
      assert.equal(again.status, 409);
    });

    it('bấm nhận hai lần cùng lúc: vào đội đúng một lần, không 500', async () => {
      const jr = await apply('p1', await openPost());
      const results = await Promise.all([
        decide(tok.captain, jr, 'accept'),
        decide(tok.captain, jr, 'accept'),
      ]);
      assert.ok(oneWinner(results.map((r) => r.status)), JSON.stringify(results));
      assert.ok(await isMember(ids.p1));
    });

    it('nhận đúng lúc người xin huỷ: một bên thắng, đội và đơn khớp nhau', async () => {
      const jr = await apply('p1', await openPost());
      const [acc, cancel] = await Promise.all([
        decide(tok.captain, jr, 'accept'),
        decide(tok.p1, jr, 'cancel'),
      ]);
      assert.ok(oneWinner([acc.status, cancel.status]), JSON.stringify([acc, cancel]));

      const req = await app.prisma.joinRequest.findUniqueOrThrow({ where: { id: jr } });
      if (acc.status === 200) {
        assert.deepEqual([req.status, await isMember(ids.p1)], ['accepted', true]);
      } else {
        assert.deepEqual([req.status, await isMember(ids.p1)], ['cancelled', false]);
      }
    });

    it('captain nhận, đội phó từ chối cùng lúc: một bên thắng, đội và đơn khớp nhau', async () => {
      const jr = await apply('p2', await openPost());
      const [acc, rej] = await Promise.all([
        decide(tok.captain, jr, 'accept'),
        decide(tok.vice, jr, 'reject'),
      ]);
      assert.ok(oneWinner([acc.status, rej.status]), JSON.stringify([acc, rej]));

      const req = await app.prisma.joinRequest.findUniqueOrThrow({ where: { id: jr } });
      if (acc.status === 200) {
        assert.deepEqual([req.status, await isMember(ids.p2)], ['accepted', true]);
      } else {
        assert.deepEqual([req.status, await isMember(ids.p2)], ['rejected', false]);
      }
    });

    it('chặn: thành viên thường duyệt, huỷ đơn người khác, xin vào bài đã đóng; bị từ chối thì xin lại được', async () => {
      const postId = await openPost();
      const jr = await apply('p1', postId);

      assert.equal((await decide(tok.member, jr, 'accept')).status, 403);
      assert.equal((await decide(tok.p2, jr, 'cancel')).status, 403);

      assert.equal((await decide(tok.vice, jr, 'reject')).status, 200);
      // Xin lại làm mới chính dòng cũ (@@unique([postId, userId])).
      assert.equal(await apply('p1', postId), jr);

      const close = await app.call(tok.captain, 'PATCH', `/recruitment/posts/${postId}`, {
        status: 'closed',
      });
      assert.equal(close.status, 200);
      const late = await app.call(tok.p2, 'POST', `/recruitment/posts/${postId}/requests`, {});
      assert.equal(late.status, 400);
    });
  },
);
