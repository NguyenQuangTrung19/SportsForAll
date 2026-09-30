/**
 * Khung dùng chung cho test chạm CSDL (`*.db.test.ts`): dựng app thật trên cổng
 * ngẫu nhiên, nối vào `TEST_DATABASE_URL`, và dọn đúng dữ liệu nó đã tạo.
 *
 * Không có `TEST_DATABASE_URL` thì file test gọi `describe(..., { skip: !TEST_DB })`
 * và không bao giờ tới đây.
 */
import type { AddressInfo } from 'node:net';
import type { PrismaClient, UserRole } from '@prisma/client';

export const TEST_DB = process.env.TEST_DATABASE_URL;

/** Mọi phản hồi test đọc tới (sân, khung, đơn, lời mời, thách đấu, trận) đều có `id` và `status`. */
export interface Res {
  status: number;
  body: { id: string; status: string } & Record<string, unknown>;
}

export interface DbApp {
  prisma: PrismaClient;
  /** Slug môn thể thao riêng của lượt chạy này — sân, đội đều gắn vào nó. */
  sport: string;
  user: (name: string, role?: UserRole) => Promise<{ id: string; token: string }>;
  team: (name: string, captainId: string) => Promise<string>;
  call: (token: string, method: string, path: string, body?: unknown) => Promise<Res>;
  close: () => Promise<void>;
}

/**
 * Hai request đua nhau: đúng một bên thắng (2xx), bên thua nhận lỗi phía client.
 * Bên thua đọc trước lúc bên thắng commit thì vấp điều kiện trong giao dịch (409),
 * đọc sau thì vấp bước kiểm tra sớm (400) — cả hai đều đúng, 5xx thì không.
 */
export function oneWinner(statuses: number[]): boolean {
  const [win, lose] = [...statuses].sort((x, y) => x - y);
  return statuses.length === 2 && win! >= 200 && win! < 300 && (lose === 400 || lose === 409);
}

export async function startDbApp(): Promise<DbApp> {
  // Phải đặt trước khi nạp bất cứ thứ gì đọc `config/env.ts`.
  process.env.DATABASE_URL = TEST_DB;
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'fatal';
  const { prisma } = await import('../lib/db.js');
  const { createApp } = await import('../app.js');
  const { signAccessToken } = await import('../lib/jwt.js');

  const run = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const sport = `${run}-sport`;
  await prisma.sport.create({
    data: { slug: sport, nameVi: 'Test', primary: '0 0 0', primaryDark: '0 0 0' },
  });

  const server = createApp().listen(0);
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  const userIds: string[] = [];
  const teamIds: string[] = [];

  return {
    prisma,
    sport,
    async user(name, role = 'user') {
      const u = await prisma.user.create({
        data: { email: `${name}-${run}@test.local`, displayName: `${name} ${run}`, role },
      });
      userIds.push(u.id);
      return { id: u.id, token: signAccessToken({ sub: u.id, role }) };
    },
    async team(name, captainId) {
      const t = await prisma.team.create({
        data: {
          name: `${name} ${run}`,
          sport,
          members: { create: { userId: captainId, role: 'captain' } },
        },
      });
      teamIds.push(t.id);
      return t.id;
    },
    async call(token, method, path, body) {
      const res = await fetch(`${base}/api${path}`, {
        method,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, body: (await res.json().catch(() => null)) as Res['body'] };
    },
    async close() {
      server.close();
      // Đội kéo theo lời mời, thách đấu, trận; người dùng kéo theo sân, khung, đơn,
      // thông báo (onDelete: Cascade). Môn thể thao xoá sau cùng vì bị tham chiếu.
      await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.sport.deleteMany({ where: { slug: sport } });
      await prisma.$disconnect();
    },
  };
}
