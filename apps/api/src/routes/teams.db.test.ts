/**
 * Lời mời vào đội (FR-006.8) — chiều ngược của đơn xin vào đội — chạy thật qua
 * HTTP + CSDL. Cách chạy: RUNBOOK mục 6.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { oneWinner, startDbApp, TEST_DB, type DbApp } from '../test/db-app.js';

describe('Lời mời vào đội (CSDL thật)', { skip: !TEST_DB && 'chưa đặt TEST_DATABASE_URL' }, () => {
  let app: DbApp;
  /** Captain, đội phó, thành viên thường của đội; hai người chơi ngoài đội. */
  const tok = { captain: '', vice: '', member: '', p1: '', p2: '' };
  const ids = { captain: '', vice: '', member: '', p1: '', p2: '' };
  let teamId = '';

  /**
   * Mời một người chơi, trả id lời mời (phản hồi là cả đội nên tra lại CSDL). Cho
   * người đó rời đội trước, để test trước có hỏng giữa chừng thì test này vẫn chạy.
   */
  const invite = async (who: 'p1' | 'p2') => {
    await app.prisma.teamMember.deleteMany({ where: { teamId, userId: ids[who], role: 'member' } });
    await app.prisma.teamInvite.deleteMany({ where: { teamId, userId: ids[who] } });
    const r = await app.call(tok.captain, 'POST', `/teams/${teamId}/invites`, { userId: ids[who] });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const inv = await app.prisma.teamInvite.findFirstOrThrow({
      where: { teamId, userId: ids[who] },
    });
    return inv.id;
  };

  const decide = (as: string, inviteId: string, action: 'accept' | 'reject' | 'cancel') =>
    app.call(as, 'POST', `/teams/invites/${inviteId}/${action}`);

  const isMember = async (userId: string) =>
    (await app.prisma.teamMember.count({ where: { teamId, userId } })) === 1;

  const inviteStatus = async (id: string) =>
    (await app.prisma.teamInvite.findUniqueOrThrow({ where: { id } })).status;

  before(async () => {
    app = await startDbApp();
    for (const who of ['captain', 'vice', 'member', 'p1', 'p2'] as const) {
      const u = await app.user(who);
      ids[who] = u.id;
      tok[who] = u.token;
    }
    teamId = await app.team('Đội mời', ids.captain);
    await app.prisma.teamMember.createMany({
      data: [
        { teamId, userId: ids.vice, role: 'co_captain' },
        { teamId, userId: ids.member, role: 'member' },
      ],
    });
  });

  after(() => app?.close());

  it('nhận lời mời: vào đội với vai trò thành viên, báo cả hai phía, không mời lại được', async () => {
    const inv = await invite('p1');
    const received = await app.prisma.notification.count({
      where: { userId: ids.p1, type: 'team_invite_received' },
    });
    assert.ok(received >= 1);

    assert.equal((await decide(tok.p1, inv, 'accept')).status, 204);
    const row = await app.prisma.teamMember.findFirstOrThrow({ where: { teamId, userId: ids.p1 } });
    assert.equal(row.role, 'member');
    assert.equal(await inviteStatus(inv), 'accepted');
    const told = await app.prisma.notification.count({
      where: { userId: { in: [ids.captain, ids.vice] }, type: 'team_invite_accepted' },
    });
    assert.ok(told >= 2);

    const again = await app.call(tok.captain, 'POST', `/teams/${teamId}/invites`, {
      userId: ids.p1,
    });
    assert.equal(again.status, 409);
  });

  it('bấm nhận hai lần cùng lúc: vào đội đúng một lần, không 500', async () => {
    const inv = await invite('p1');
    const results = await Promise.all([
      decide(tok.p1, inv, 'accept'),
      decide(tok.p1, inv, 'accept'),
    ]);
    assert.ok(oneWinner(results.map((r) => r.status)), JSON.stringify(results));
    assert.ok(await isMember(ids.p1));
  });

  it('người chơi nhận đúng lúc đội rút lời mời: một bên thắng, đội và lời mời khớp nhau', async () => {
    const inv = await invite('p1');
    const [acc, cancel] = await Promise.all([
      decide(tok.p1, inv, 'accept'),
      decide(tok.captain, inv, 'cancel'),
    ]);
    assert.ok(oneWinner([acc.status, cancel.status]), JSON.stringify([acc, cancel]));

    if (acc.status === 204) {
      assert.deepEqual([await inviteStatus(inv), await isMember(ids.p1)], ['accepted', true]);
    } else {
      assert.deepEqual([await inviteStatus(inv), await isMember(ids.p1)], ['cancelled', false]);
    }
  });

  it('người chơi bấm nhận và từ chối cùng lúc (hai tab): một bên thắng, dữ liệu khớp', async () => {
    const inv = await invite('p2');
    const [acc, rej] = await Promise.all([
      decide(tok.p2, inv, 'accept'),
      decide(tok.p2, inv, 'reject'),
    ]);
    assert.ok(oneWinner([acc.status, rej.status]), JSON.stringify([acc, rej]));

    if (acc.status === 204) {
      assert.deepEqual([await inviteStatus(inv), await isMember(ids.p2)], ['accepted', true]);
    } else {
      assert.deepEqual([await inviteStatus(inv), await isMember(ids.p2)], ['rejected', false]);
    }
  });

  it('chặn: thành viên thường mời/rút, nhận lời mời của người khác, mời trùng; bị từ chối thì mời lại được', async () => {
    const byMember = await app.call(tok.member, 'POST', `/teams/${teamId}/invites`, {
      userId: ids.p2,
    });
    assert.equal(byMember.status, 403);

    const inv = await invite('p2');
    const dup = await app.call(tok.vice, 'POST', `/teams/${teamId}/invites`, { userId: ids.p2 });
    assert.equal(dup.status, 409);
    assert.equal((await decide(tok.p1, inv, 'accept')).status, 403);
    assert.equal((await decide(tok.member, inv, 'cancel')).status, 403);

    assert.equal((await decide(tok.p2, inv, 'reject')).status, 204);
    // Mời lại làm mới chính dòng cũ (@@unique([teamId, userId])).
    const again = await app.call(tok.captain, 'POST', `/teams/${teamId}/invites`, {
      userId: ids.p2,
    });
    assert.equal(again.status, 201);
    const rows = await app.prisma.teamInvite.findMany({ where: { teamId, userId: ids.p2 } });
    assert.deepEqual([rows.length, rows[0]?.id, rows[0]?.status], [1, inv, 'pending']);
  });
});
