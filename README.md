# SportsForAll (SFA)

Nền tảng kết nối cộng đồng thể thao - tìm đồng đội, đối thủ, sân bãi.

Yêu cầu chi tiết: xem [Idea.md](./Idea.md).

## Cấu trúc monorepo

```
apps/
  web/          Frontend - React + Vite + TypeScript + TailwindCSS
  api/          Backend  - Express + TypeScript + Prisma + PostgreSQL
packages/
  shared/       Shared types & Zod schemas (dùng chung FE/BE)
```

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

| Lệnh | Tác dụng |
|---|---|
| `pnpm dev` | Chạy cả `web` và `api` song song |
| `pnpm build` | Build tất cả packages |
| `pnpm typecheck` | Type-check toàn repo |
| `pnpm lint` | Lint toàn repo |
| `pnpm format` | Format code bằng Prettier |
