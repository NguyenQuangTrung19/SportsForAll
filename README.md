# SportsForAll (SFA)

Nền tảng kết nối cộng đồng thể thao - tìm đồng đội, đối thủ, sân bãi.

Yêu cầu chi tiết: xem [Idea.md](./Idea.md).
Cách chạy trên máy: xem [RUNBOOK.md](./RUNBOOK.md).
Tiến độ chức năng: xem [ROADMAP.md](./ROADMAP.md).
Triển khai lên mạng: xem [DEPLOY.md](./DEPLOY.md).

## Cấu trúc monorepo

```
apps/
  web/          Frontend - React + Vite + TypeScript + TailwindCSS
  api/          Backend  - Express + TypeScript + Prisma + PostgreSQL
packages/
  shared/       Shared types & Zod schemas (dùng chung FE/BE)
```

`@sfa/shared` được compile ra `dist/` và liên kết qua TypeScript project references,
nên `apps/api` chạy được bằng `node dist/index.js` ở production. Các script `dev`
đã tự build `shared` trước, không cần chạy tay.

## Khởi động

Xem [RUNBOOK.md](./RUNBOOK.md) — chia rõ việc làm **một lần** (cài đặt, tạo `.env`),
việc làm **mỗi ngày** (`pnpm dev`), và việc chỉ làm **khi code thay đổi** (migration).

## Scripts

| Lệnh                             | Tác dụng                                            |
| -------------------------------- | --------------------------------------------------- |
| `pnpm dev`                       | Chạy cả `web` và `api` song song                    |
| `pnpm build`                     | Build tất cả packages                               |
| `pnpm build:shared`              | Build riêng `@sfa/shared` (các script `dev` tự gọi) |
| `pnpm typecheck`                 | Type-check toàn repo                                |
| `pnpm lint`                      | Lint toàn repo (ESLint 9 flat config, type-aware)   |
| `pnpm lint:fix`                  | Lint và tự sửa các lỗi fix được                     |
| `pnpm format`                    | Format code bằng Prettier                           |
| `pnpm --filter @sfa/api db:seed` | Nạp dữ liệu mẫu để xem thử                          |
