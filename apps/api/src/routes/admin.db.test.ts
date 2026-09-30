/**
 * Admin xử lý báo cáo (FR-010.6) chạy thật qua HTTP + CSDL. Cách chạy: RUNBOOK mục 6.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { oneWinner, startDbApp, TEST_DB, type DbApp } from '../test/db-app.js';

describe('Xử lý báo cáo (CSDL thật)', { skip: !TEST_DB && 'chưa đặt TEST_DATABASE_URL' }, () => {
  let app: DbApp;
  const tok = { admin1: '', admin2: '', user: '' };
  const ids = { admin1: '', admin2: '', user: '' };
  let teamId = '';
  const reportIds: string[] = [];

  const newReport = async () => {
    const r = await app.prisma.report.create({
      data: { reporterId: ids.user, reportedTeamId: teamId, reason: 'no_show' },
    });
    reportIds.push(r.id);
    return r.id;
  };

  const resolve = (as: string, id: string, status: 'reviewed' | 'dismissed') =>
    app.call(as, 'POST', `/admin/reports/${id}/resolve`, { status });

  before(async () => {
    app = await startDbApp();
    for (const who of ['admin1', 'admin2', 'user'] as const) {
      const u = await app.user(who, who === 'user' ? 'user' : 'admin');
      ids[who] = u.id;
      tok[who] = u.token;
    }
    teamId = await app.team('Bị báo cáo', ids.user);
  });

  after(async () => {
    // Nhật ký admin chụp lại tên, không gắn khoá ngoài — xoá người dùng không kéo theo.
    await app?.prisma.adminAction.deleteMany({ where: { targetId: { in: reportIds } } });
    await app?.close();
  });

  it('xử lý báo cáo: đổi trạng thái, ghi một dòng nhật ký, không xử lý lại được', async () => {
    const id = await newReport();
    const r = await resolve(tok.admin1, id, 'reviewed');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.status, 'reviewed');
    assert.equal(await app.prisma.adminAction.count({ where: { targetId: id } }), 1);
    assert.equal((await resolve(tok.admin2, id, 'dismissed')).status, 400);
  });

  it('hai admin xử lý cùng lúc: một người thắng, kết luận không bị ghi đè, nhật ký một dòng', async () => {
    const id = await newReport();
    const [a, b] = await Promise.all([
      resolve(tok.admin1, id, 'reviewed'),
      resolve(tok.admin2, id, 'dismissed'),
    ]);
    assert.ok(oneWinner([a.status, b.status]), JSON.stringify([a, b]));

    const winner = a.status === 200 ? 'reviewed' : 'dismissed';
    const report = await app.prisma.report.findUniqueOrThrow({ where: { id } });
    assert.equal(report.status, winner);
    assert.equal(await app.prisma.adminAction.count({ where: { targetId: id } }), 1);
  });

  it('người thường không vào được khu quản trị', async () => {
    assert.equal((await resolve(tok.user, await newReport(), 'dismissed')).status, 403);
  });
});
