# RUNBOOK — Chạy SportsForAll trên máy

Tài liệu chia theo **tần suất**, không theo thứ tự kỹ thuật:

| Phần                                                                  | Khi nào làm                      | Mất bao lâu |
| --------------------------------------------------------------------- | -------------------------------- | ----------- |
| [1. Cài đặt lần đầu](#1-cài-đặt-lần-đầu--làm-một-lần-duy-nhất)        | Một lần duy nhất trên mỗi máy    | ~10 phút    |
| [2. Khởi động hằng ngày](#2-khởi-động-hằng-ngày--mỗi-lần-mở-máy)      | Mỗi lần mở máy lên làm việc      | ~30 giây    |
| [3. Khi code thay đổi](#3-khi-code-thay-đổi--chỉ-làm-khi-có-dấu-hiệu) | Chỉ khi có dấu hiệu ở bảng mục 3 | ~1 phút     |

## Quy ước trong tài liệu này

**Thư mục gốc** = thư mục chứa file `package.json` và `pnpm-lock.yaml`, trên máy này là:

```
C:\Users\ACER\Documents\Workspace\Projects\SportsForAll
```

**Mọi lệnh `pnpm` đều chạy ở thư mục gốc.** Không `cd` vào `apps/api` hay `apps/web` —
lệnh `--filter @sfa/api` đã tự chỉ đúng gói.

Mở terminal ở thư mục gốc bằng một trong hai cách:

- **VS Code:** mở thư mục gốc (File → Open Folder), rồi Terminal → New Terminal.
- **PowerShell:** `cd C:\Users\ACER\Documents\Workspace\Projects\SportsForAll`

Một vài lệnh cần **PowerShell quyền admin** — ghi rõ ở từng chỗ. Mở bằng cách: bấm
phím Windows, gõ `PowerShell`, chuột phải → **Run as administrator**.

---

## 1. Cài đặt lần đầu — làm một lần duy nhất

Làm xong phần này thì **không bao giờ phải làm lại** trên máy đó, trừ khi xoá thư mục
dự án hoặc cài lại Windows.

### 1.1 Phần mềm cần có

| Phần mềm   | Bản   | Kiểm tra                       | Máy này   |
| ---------- | ----- | ------------------------------ | --------- |
| Node.js    | >= 20 | `node -v`                      | ✅ v22    |
| pnpm       | >= 10 | `pnpm -v`                      | ✅ 10.30  |
| PostgreSQL | >= 14 | Có service `postgresql-x64-18` | ✅ bản 18 |

Lúc cài PostgreSQL, trình cài đặt bắt đặt **mật khẩu cho user `postgres`**. Ghi lại
mật khẩu đó — bước 1.4 cần tới. Quên thì xem mục 5 "Sự cố".

### 1.2 Cho Postgres tự bật cùng Windows (khuyên làm)

Mặc định service Postgres ở chế độ **Manual**: tắt máy mở lại là nó tắt, và app báo
lỗi `500` mà không nói gì thêm. Chuyển sang **Automatic** một lần là xong — sau đó bỏ
qua luôn bước 2.1 mỗi ngày.

**PowerShell quyền admin**, chạy ở bất kỳ thư mục nào:

```powershell
Set-Service postgresql-x64-18 -StartupType Automatic
Start-Service postgresql-x64-18
```

Không muốn Postgres chạy nền thường trực? Bỏ qua bước này, đổi lại mỗi ngày phải làm
bước 2.1.

### 1.3 Cài thư viện

Thư mục gốc:

```bash
pnpm install
```

Tạo ra thư mục `node_modules`. Lâu nhất ở lần đầu (~1–2 phút).

### 1.4 Tạo file cấu hình `.env`

Hai file này **chứa mật khẩu nên không nằm trong git** — mỗi máy tự tạo một lần, sau
đó giữ nguyên mãi. Nếu hai file đã tồn tại thì bỏ qua bước này.

Thư mục gốc:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

`apps/web/.env` **không cần sửa gì.**

Mở `apps/api/.env` và sửa **đúng 3 dòng**:

| Biến                 | Điền gì                                                        |
| -------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`       | Thay `postgres:postgres` bằng `postgres:<mật khẩu ở bước 1.1>` |
| `JWT_ACCESS_SECRET`  | Chuỗi ngẫu nhiên, ít nhất 16 ký tự                             |
| `JWT_REFRESH_SECRET` | Chuỗi ngẫu nhiên khác, ít nhất 16 ký tự                        |

Ví dụ `DATABASE_URL` với mật khẩu `abc123`:

```
DATABASE_URL=postgresql://postgres:abc123@localhost:5432/sportsforall?schema=public
```

> Mật khẩu có ký tự đặc biệt thì phải mã hoá: `@` → `%40`, `#` → `%23`, `/` → `%2F`,
> `:` → `%3A`. Ví dụ mật khẩu `a@b` viết thành `postgres:a%40b@localhost...`

Tạo chuỗi ngẫu nhiên cho hai biến JWT (chạy hai lần, mỗi lần dán vào một biến):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Các biến còn lại để nguyên. Thiếu hay sai biến nào thì API **thoát ngay lúc khởi
động** và in ra tên biến đó — không phải đoán.

Cuối file có nhóm biến Google / Facebook / email / SMS — **để trống cũng chạy được**,
xem mục 7 khi nào muốn bật.

### 1.5 Tạo database và bảng

Postgres phải đang chạy (bước 1.2 hoặc 2.1). Thư mục gốc:

```bash
pnpm --filter @sfa/api db:migrate
```

Lệnh này tự tạo database `sportsforall` nếu chưa có, rồi tạo toàn bộ bảng. Thấy
`Your database is now in sync with your schema` là xong.

### 1.6 Nạp dữ liệu mẫu (tuỳ chọn nhưng nên làm)

App rỗng thì trang nào cũng trống. Thư mục gốc:

```bash
pnpm --filter @sfa/api db:seed
```

Tạo 6 tài khoản demo (xem mục 4), 2 đội, bài tuyển, kèo tìm đối, 1 sân. Chạy lại
bao nhiêu lần cũng được — không nhân bản dữ liệu.

**Xong phần 1.** Từ giờ chỉ cần phần 2.

---

## 2. Khởi động hằng ngày — mỗi lần mở máy

### 2.1 Bật Postgres — _bỏ qua nếu đã làm bước 1.2_

**PowerShell quyền admin:**

```powershell
Start-Service postgresql-x64-18
```

Kiểm tra: `Get-Service postgresql-x64-18` phải thấy `Running`.

### 2.2 Chạy app

Thư mục gốc:

```bash
pnpm dev
```

**Giữ nguyên cửa sổ terminal này** — đóng nó là app tắt. Đợi tới khi thấy dòng
`Local: http://localhost:5173/` (~10 giây).

Cửa sổ này cũng là **hộp thư giả** khi chưa cấu hình email/SMS (mục 7): link xác thực
email, link quên mật khẩu và mã OTP đều in ra ở đây, dòng bắt đầu bằng `📧 EMAIL` hoặc
`📱 SMS`. Copy link dán vào trình duyệt / gõ mã vào form là dùng được.

### 2.3 Mở trình duyệt

| Địa chỉ                             | Là gì                                               |
| ----------------------------------- | --------------------------------------------------- |
| http://localhost:5173               | **Trang web — mở cái này**                          |
| http://localhost:4000/api/health    | Kiểm tra API còn sống (trả `{"status":"ok"...}`)    |
| http://localhost:4000/api/health/db | Kiểm tra API nối được CSDL (trả `"db":"connected"`) |

### 2.4 Tắt

Bấm **Ctrl+C** trong cửa sổ đang chạy `pnpm dev`. Postgres cứ để chạy, không cần tắt.

> Tóm lại, ngày thường chỉ có **một lệnh**: `pnpm dev` ở thư mục gốc — cộng thêm
> `Start-Service` nếu chưa làm bước 1.2.

---

## 3. Khi code thay đổi — chỉ làm khi có dấu hiệu

Sau khi `git pull`, chuyển nhánh, hoặc có người (hay Claude) sửa code, đối chiếu bảng
này. Không khớp dòng nào thì cứ `pnpm dev` như bình thường.

| Dấu hiệu                                           | Chạy ở thư mục gốc                              | Vì sao                                                        |
| -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `package.json` hoặc `pnpm-lock.yaml` thay đổi      | `pnpm install`                                  | Có thư viện mới                                               |
| Có thư mục mới trong `apps/api/prisma/migrations/` | `pnpm --filter @sfa/api db:migrate`             | Có bảng/cột mới — bỏ qua là API báo lỗi `500` ở chức năng mới |
| `apps/api/.env.example` có biến mới                | Thêm biến đó vào `apps/api/.env`                | API sẽ báo thiếu biến khi khởi động                           |
| Đã sửa `.env`                                      | Ctrl+C rồi `pnpm dev` lại                       | `.env` chỉ được đọc lúc khởi động                             |
| Muốn xoá sạch dữ liệu, làm lại từ đầu              | `pnpm --filter @sfa/api db:reset` rồi `db:seed` | **Mất toàn bộ dữ liệu** — hỏi xác nhận trước khi xoá          |

Không chắc đã chạy migration chưa? Chạy luôn `db:migrate` — đã đủ rồi thì nó chỉ báo
`Already in sync` và không làm gì.

---

## 4. Tài khoản demo

Có sau khi chạy bước 1.6. Tất cả dùng chung mật khẩu **`Demo1234!`**

| Email             | Vai trò trong dữ liệu mẫu                                                   |
| ----------------- | --------------------------------------------------------------------------- |
| `an@demo.vn`      | Đội trưởng **FC Ba Đình** — duyệt được đơn xin gia nhập                     |
| `binh@demo.vn`    | Thành viên FC Ba Đình                                                       |
| `cuong@demo.vn`   | Đội trưởng **Cầu Giấy United** — đang có kèo tìm đối                        |
| `dung@demo.vn`    | Chưa vào đội nào — dùng để thử luồng xin gia nhập                           |
| `admin@demo.vn`   | **Quản trị viên** — vào `/admin` xem thống kê, người dùng, báo cáo, sân bãi |
| `sanbong@demo.vn` | **Chủ sân** — sở hữu Sân bóng Mỹ Đình A với 3 khung giờ mở sẵn              |

### Kịch bản xem thử

1. Mở http://localhost:5173, đăng nhập `dung@demo.vn`
2. **Người tìm đội** → xem bài đăng cá nhân, thử bộ lọc và nút **Tải thêm**
3. **Hồ sơ cá nhân** → tải ảnh đại diện, thêm số điện thoại, xem điểm uy tín
4. **Tìm đồng đội** → bài tuyển tiền đạo của FC Ba Đình → gửi đơn xin gia nhập
5. Đăng xuất, đăng nhập `an@demo.vn` → chuông thông báo → duyệt đơn
6. **Tìm đối thủ** → kèo của Cầu Giấy United → gửi lời thách đấu
7. Đăng nhập `cuong@demo.vn` → chấp nhận thách đấu → trận đấu được tạo

Thông báo cập nhật mỗi 30 giây — thao tác ở tài khoản này, tài khoản kia có thể phải
đợi tới nửa phút hoặc tải lại trang.

---

## 5. Sự cố thường gặp

| Hiện tượng                                      | Nguyên nhân                          | Xử lý                                                                         |
| ----------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| Đăng nhập / mọi trang báo lỗi `500`             | Postgres chưa chạy                   | Mở `/api/health/db` để chắc chắn, rồi bước 2.1 (hoặc làm 1.2 để khỏi gặp lại) |
| `Can't reach database server at localhost:5432` | Postgres chưa chạy                   | Bước 2.1                                                                      |
| `Authentication failed against database server` | Sai mật khẩu trong `DATABASE_URL`    | Sửa `apps/api/.env`, xem bước 1.4                                             |
| `Invalid environment variables` rồi thoát       | Thiếu/sai biến trong `apps/api/.env` | Đọc tên biến trong thông báo, sửa theo bước 1.4                               |
| Chức năng mới báo `500`, chức năng cũ vẫn chạy  | Chưa chạy migration mới              | `pnpm --filter @sfa/api db:migrate`                                           |
| `EADDRINUSE :::4000` hoặc `:::5173`             | Lần chạy trước chưa tắt hẳn          | Lệnh bên dưới bảng này                                                        |
| `429 RATE_LIMITED` khi đăng nhập                | Sai mật khẩu quá 5 lần / 15 phút     | Đợi, hoặc Ctrl+C rồi `pnpm dev` lại                                           |
| `Cannot find module .../shared/...`             | `@sfa/shared` chưa build             | `pnpm build:shared`                                                           |
| `pnpm : The term 'pnpm' is not recognized`      | Chưa cài pnpm                        | `npm install -g pnpm`                                                         |

**Giải phóng cổng bị kẹt** (PowerShell thường, thư mục nào cũng được):

```powershell
foreach ($p in 4000,5173) {
  Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force }
}
```

**Quên mật khẩu Postgres:** mở `C:\Program Files\PostgreSQL\18\data\pg_hba.conf` bằng
Notepad quyền admin, đổi `scram-sha-256` thành `trust` ở các dòng `host`, restart
service (`Restart-Service postgresql-x64-18`), chạy
`psql -U postgres -c "ALTER USER postgres PASSWORD 'matkhaumoi'"`, rồi đổi `trust`
về lại `scram-sha-256` và restart lần nữa. **Đừng quên bước đổi lại** — để `trust` là
ai trên máy cũng vào được CSDL không cần mật khẩu.

---

## 6. Dành cho người sửa code

Kiểm tra trước khi commit, thư mục gốc:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`pnpm test` dùng `node --test` sẵn có trong Node, **không cần CSDL**. Chạy riêng một
gói: `pnpm --filter @sfa/api test`.

Chạy riêng từng phần (hiếm khi cần): `pnpm dev:api` (chỉ API, cổng 4000) hoặc
`pnpm dev:web` (chỉ web, cổng 5173). Sửa file trong `packages/shared` thì phải dùng
`pnpm dev` — hai lệnh riêng lẻ không theo dõi thay đổi của `shared`.

Xem/sửa dữ liệu trực tiếp bằng giao diện: `pnpm --filter @sfa/api db:studio`
(mở http://localhost:5555).

Đưa lên mạng: xem [DEPLOY.md](./DEPLOY.md).

---

## 7. Bật email, SMS, Google, Facebook — tuỳ chọn, làm một lần

Không bật gì thì app vẫn chạy đủ: email và mã OTP in ra terminal (mục 2.2), nút Google /
Facebook tự ẩn. Chỉ cần làm mục này khi muốn gửi **thật** — ví dụ trước khi deploy.

Mọi khoá đều điền vào `apps/api/.env` (đã có sẵn dòng trống cho từng biến ở cuối file),
xong thì **Ctrl+C rồi `pnpm dev` lại**. Mở http://localhost:4000/api/auth/providers để
xem cái nào đã bật (`true`).

### 7.1 Gửi email — Resend (quên mật khẩu, xác thực email)

1. Đăng ký https://resend.com (miễn phí 3.000 email/tháng).
2. **API Keys** → **Create API Key** → copy chuỗi `re_...` vào `RESEND_API_KEY`.

> **Giới hạn khi chưa có tên miền:** Resend chỉ cho gửi tới **chính email bạn dùng để
> đăng ký Resend**, người khác không nhận được. Muốn gửi cho ai cũng được: **Domains** →
> thêm tên miền của bạn → khai các bản ghi DNS họ đưa → khi xác minh xong thì đặt
> `MAIL_FROM=SportsForAll <no-reply@ten-mien-cua-ban.vn>`.

### 7.2 Gửi SMS — Twilio (đăng ký bằng số điện thoại)

1. Đăng ký https://twilio.com, xác minh số điện thoại của bạn.
2. Trang **Console** → copy **Account SID** vào `TWILIO_ACCOUNT_SID`, **Auth Token** vào
   `TWILIO_AUTH_TOKEN`.
3. **Phone Numbers** → lấy một số gửi → điền vào `TWILIO_FROM` (dạng `+1...`).

> **Tài khoản dùng thử** chỉ gửi được tới những số đã xác minh trong Twilio
> (**Verified Caller IDs**) và tin nhắn có kèm dòng "Sent from a Twilio trial account".
> Gửi cho người lạ phải nạp tiền; SMS về Việt Nam tính phí theo tin.

### 7.3 Đăng nhập Google

1. Vào https://console.cloud.google.com → tạo project mới (tên tuỳ ý).
2. **APIs & Services → OAuth consent screen** → chọn **External** → điền tên app, email
   hỗ trợ → lưu. Ở mục **Test users**, thêm các Gmail sẽ dùng thử (lúc app còn ở chế
   độ Testing, chỉ những Gmail này đăng nhập được).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs** → thêm đúng dòng này (không dấu `/` cuối):
     ```
     http://localhost:4000/api/auth/oauth/google/callback
     ```
4. Copy **Client ID** vào `GOOGLE_CLIENT_ID`, **Client secret** vào `GOOGLE_CLIENT_SECRET`.

### 7.4 Đăng nhập Facebook

1. Vào https://developers.facebook.com → **My Apps → Create App** → chọn use case
   **Authenticate and request data from users with Facebook Login**.
2. Trong app → **Facebook Login → Settings** → **Valid OAuth Redirect URIs**:
   ```
   http://localhost:4000/api/auth/oauth/facebook/callback
   ```
3. **App settings → Basic** → copy **App ID** vào `FACEBOOK_APP_ID`, **App Secret** vào
   `FACEBOOK_APP_SECRET`.
4. Lúc app ở chế độ **Development**, chỉ tài khoản Facebook có vai trò trong app
   (**App roles → Roles**) đăng nhập được.

### 7.5 Lỗi hay gặp

| Hiện tượng                                                               | Nguyên nhân                                                                              |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Google báo `redirect_uri_mismatch`                                       | Redirect URI ở bước 7.3 lệch một ký tự với `API_URL` + `/api/auth/oauth/google/callback` |
| Facebook báo "URL blocked"                                               | Tương tự, ở bước 7.4                                                                     |
| Bấm Google xong quay về trang đăng nhập, báo "Email này đã có tài khoản" | Google chưa xác nhận email đó — đăng nhập bằng mật khẩu                                  |
| Không nhận được email                                                    | Xem giới hạn ở 7.1; kiểm tra cả Spam                                                     |
| Log API có dòng `send verification email failed`                         | `RESEND_API_KEY` sai hoặc `MAIL_FROM` dùng tên miền chưa xác minh                        |
