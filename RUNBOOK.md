# RUNBOOK — Mở SportsForAll để xem thử

Quy trình chạy sản phẩm trên máy local, từ trạng thái vừa clone tới lúc đăng nhập được.

## 0. Yêu cầu

| Thành phần | Bản   | Kiểm tra         |
| ---------- | ----- | ---------------- |
| Node.js    | >= 20 | `node -v`        |
| pnpm       | >= 10 | `pnpm -v`        |
| PostgreSQL | >= 14 | `psql --version` |

## 1. Bật PostgreSQL

Đây là bước hay quên nhất — API vẫn khởi động bình thường khi DB tắt, chỉ khi gọi
tới dữ liệu mới trả `500`. Nên nếu thấy đăng nhập lỗi 500, kiểm tra bước này trước.

**Windows (cài bằng installer, cần quyền admin):**

```powershell
Start-Service postgresql-x64-18      # đổi số cho khớp bản đã cài
Get-Service postgresql-x64-18        # phải thấy Running
```

**Hoặc dùng Docker (không cần quyền admin, cần Docker Desktop đang chạy):**

```bash
docker run -d --name sfa-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=<mật khẩu trong DATABASE_URL> \
  -e POSTGRES_DB=sportsforall \
  postgres:16
```

Xác nhận đã nghe cổng:

```powershell
Get-NetTCPConnection -LocalPort 5432 -State Listen
```

## 2. Cài dependencies và chuẩn bị env

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Mở `apps/api/.env` và sửa cho khớp máy bạn:

- `DATABASE_URL` — user/mật khẩu Postgres thật
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — chuỗi bất kỳ >= 16 ký tự
- `TRUST_PROXY` — để `0` khi chạy local

API kiểm tra env bằng zod lúc khởi động và **thoát ngay** nếu thiếu, kèm tên biến sai.

## 3. Tạo bảng

```bash
pnpm --filter @sfa/api db:migrate
```

## 4. Nạp dữ liệu mẫu

App rỗng thì mọi trang đều trống, không thấy gì để xem. Lệnh này tạo 4 người dùng,
2 đội, 1 bài tuyển thành viên, 1 kèo tìm đối và 3 bài tìm đội:

```bash
pnpm --filter @sfa/api db:seed
```

Chạy lại bao nhiêu lần cũng được — seed dùng `upsert` nên không nhân bản dữ liệu.

### Tài khoản demo

Cả 4 tài khoản dùng chung mật khẩu **`Demo1234!`**

| Email           | Vai trò trong dữ liệu mẫu                                                    |
| --------------- | ---------------------------------------------------------------------------- |
| `an@demo.vn`    | Đội trưởng **FC Ba Đình** — duyệt được đơn xin gia nhập                      |
| `binh@demo.vn`  | Thành viên FC Ba Đình                                                        |
| `cuong@demo.vn` | Đội trưởng **Cầu Giấy United** — đang có kèo tìm đối                         |
| `dung@demo.vn`  | Chưa vào đội nào — dùng để thử luồng xin gia nhập                            |
| `admin@demo.vn` | **Quản trị viên** — vào `/admin/landing` để thêm môn thể thao và đặt ảnh nền |

## 5. Chạy

```bash
pnpm dev
```

Lệnh này tự build `@sfa/shared` trước, rồi chạy song song ba tiến trình: watch của
shared, API, và Vite.

| Dịch vụ      | URL                              |
| ------------ | -------------------------------- |
| Web          | http://localhost:5173            |
| API          | http://localhost:4000/api        |
| Health check | http://localhost:4000/api/health |

Chạy riêng lẻ: `pnpm dev:web` hoặc `pnpm dev:api`.

## 6. Kịch bản xem thử

Đi theo thứ tự này sẽ chạm được hầu hết chức năng đã làm:

1. Mở http://localhost:5173 — trang giới thiệu
2. Đăng nhập `dung@demo.vn` / `Demo1234!`
3. **Người tìm đội** → xem 3 bài đăng cá nhân, thử bộ lọc và nút **Tải thêm**
4. **Hồ sơ cá nhân** → tải ảnh đại diện, thêm số điện thoại, đổi mật khẩu
5. **Tìm đồng đội** → thấy bài tuyển tiền đạo của FC Ba Đình → gửi đơn xin gia nhập
6. Đăng xuất, đăng nhập `an@demo.vn` (đội trưởng FC Ba Đình)
7. Chuông thông báo → có đơn mới → vào duyệt
8. **Tìm đối thủ** → thấy kèo của Cầu Giấy United → gửi lời thách đấu
9. Đăng nhập `cuong@demo.vn` → nhận thách đấu → chấp nhận → trận đấu được tạo

Thông báo dùng polling 30 giây, nên sau khi thao tác ở tài khoản này thì tài khoản
kia có thể phải đợi tới nửa phút, hoặc tải lại trang.

## 7. Dừng

Ctrl+C ở cửa sổ đang chạy `pnpm dev`. Nếu tiến trình còn treo giữ cổng:

```powershell
foreach ($p in 4000,5173) {
  Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force }
}
```

## 8. Sự cố thường gặp

| Hiện tượng                                         | Nguyên nhân                      | Xử lý                                                    |
| -------------------------------------------------- | -------------------------------- | -------------------------------------------------------- |
| Đăng nhập trả `500`                                | Postgres chưa chạy               | Bước 1                                                   |
| `EADDRINUSE :::4000`                               | Tiến trình cũ còn giữ cổng       | Lệnh ở mục 7                                             |
| `Invalid environment variables` rồi thoát          | Thiếu biến trong `apps/api/.env` | Bước 2                                                   |
| `429 RATE_LIMITED` khi đăng nhập                   | Sai mật khẩu quá 5 lần / 15 phút | Đợi hết cửa sổ, hoặc restart API để xoá bộ đếm trong RAM |
| `Cannot find module .../shared/src/types/index.js` | `@sfa/shared` chưa build         | `pnpm build:shared`                                      |
| Sửa type trong `shared` mà web không thấy          | Watch chưa chạy                  | Dùng `pnpm dev` thay vì `pnpm dev:web`                   |

## 9. Kiểm tra sức khoẻ trước khi commit

```bash
pnpm lint && pnpm typecheck && pnpm build
```
