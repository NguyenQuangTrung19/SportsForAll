# SportsForAll (SFA)

Nền tảng kết nối cộng đồng thể thao - tìm đồng đội, đối thủ, sân bãi.

Yêu cầu chi tiết: xem [Idea.md](./Idea.md).
Quy trình chạy thử từ đầu: xem [RUNBOOK.md](./RUNBOOK.md).
Tiến độ chức năng: xem [ROADMAP.md](./ROADMAP.md).

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

## Yêu cầu môi trường

- Node.js >= 20
- pnpm >= 10
- PostgreSQL >= 14 (local hoặc Docker)

## Khởi động

```bash
# Cài deps
pnpm install

# Chuẩn bị env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Migrate DB (lần đầu)
pnpm --filter @sfa/api db:migrate

# Chạy cả FE + BE
pnpm dev

# Hoặc tách riêng
pnpm dev:api    # http://localhost:4000
pnpm dev:web    # http://localhost:5173
```

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
