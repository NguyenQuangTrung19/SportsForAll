# Kịch bản test SportsForAll — từ A đến Z

Tài liệu kiểm thử thủ công (manual QA) end-to-end cho toàn bộ flow hiện có. Mỗi bước ghi rõ:

- **Thư mục chạy lệnh** (in đậm trước mỗi command block)
- **Kết quả mong đợi** (✅) và **dấu hiệu lỗi** (❌)

Quy ước thư mục:
- `ROOT/` = `C:\Users\ACER\Documents\Workspace\Projects\SportsForAll`
- `API/`  = `ROOT/apps/api`
- `WEB/`  = `ROOT/apps/web`

Shell mặc định: **PowerShell**. Mở 3 terminal song song (PostgreSQL, API, Web) để chạy phần 3-4.

---

## 0. Yêu cầu trước khi test

| Thành phần | Phiên bản | Kiểm tra |
|---|---|---|
| Node.js | ≥ 20 | `node -v` |
| pnpm    | ≥ 10 | `pnpm -v` |
| PostgreSQL | ≥ 14 chạy ở `localhost:5432` | `docker exec sfa-pg psql -U postgres -c "SELECT 1"` (nếu dùng Docker) hoặc `psql -U postgres -c "SELECT 1"` (nếu cài local) |
| Trình duyệt | Chrome/Edge mới nhất, có DevTools | — |

Nếu chưa có PostgreSQL local, có thể dùng Docker:

**Terminal 1 — chạy ở bất kỳ thư mục nào**
```powershell
docker run -d --name sfa-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
```

---

## 1. Cài đặt phụ thuộc và cấu hình env

### 1.1 Cài deps cho toàn monorepo

**Thư mục: `ROOT/`**
```powershell
pnpm install
```

✅ Kết thúc không có `ERR_PNPM_*`, có dòng `Done in ...s`.
❌ Nếu lỗi `EBUSY` trên `query_engine-windows.dll.node`: kill tiến trình node đang chiếm DLL rồi chạy lại.

### 1.2 Tạo file env cho API

**Thư mục: `API/`**
```powershell
Copy-Item .env.example .env
```

Sau đó mở `API/.env`, đảm bảo:
- `DATABASE_URL` trỏ đến Postgres của bạn
- `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` đổi sang chuỗi ngẫu nhiên (≥ 32 ký tự)
- `CORS_ORIGINS=http://localhost:5173`

### 1.3 Tạo file env cho Web

**Thư mục: `WEB/`**
```powershell
Copy-Item .env.example .env
```

Mặc định `VITE_API_URL=http://localhost:4000` là đúng.

---

## 2. Khởi tạo database

### 2.1 Tạo database trống (nếu chưa có)

**Thư mục: bất kỳ**

Nếu Postgres chạy trong Docker (container `sfa-pg`):
```powershell
docker exec sfa-pg psql -U postgres -c "CREATE DATABASE sportsforall;"
```

Nếu cài Postgres local (có `psql` trong PATH):
```powershell
psql -U postgres -c "CREATE DATABASE sportsforall;"
```

✅ Trả về `CREATE DATABASE`.
❌ Nếu lỗi `already exists` — bỏ qua, OK, sang 2.2.
❌ Nếu lỗi `'psql' is not recognized` — máy bạn không có psql local, dùng lệnh `docker exec` ở trên.

### 2.2 Chạy Prisma migrate

**Thư mục: `API/`**
```powershell
pnpm db:migrate
```

✅ Hiện list các migration đã apply, kết thúc bằng `Your database is now in sync with your schema`.
✅ Prisma Client tự generate.
❌ Lỗi `P1001 can't reach database server` → kiểm tra Postgres đang chạy + `DATABASE_URL`.

### 2.3 Xác nhận schema bằng Prisma Studio (tùy chọn)

**Thư mục: `API/`**
```powershell
pnpm db:studio
```

✅ Trình duyệt mở `http://localhost:5555`, thấy các bảng: `User`, `Profile`, `SportPreference`, `Team`, `TeamMember`, `RecruitmentPost`, `JoinRequest`, `MatchRequest`, `Challenge`, `Match`, `Notification`, `RefreshToken`.

Đóng Prisma Studio (Ctrl+C) trước khi sang phần 3 để giải phóng cổng.

---

## 3. Khởi động API và Web

Mở **2 terminal mới** (giữ terminal cài deps để theo dõi log).

### 3.1 Chạy API

**Terminal 2 — thư mục: `ROOT/`**
```powershell
pnpm dev:api
```

✅ Log hiển thị `API listening on http://localhost:4000` (hoặc tương tự).
❌ Lỗi `EADDRINUSE :4000` → kill process đang chiếm cổng:
```powershell
Get-NetTCPConnection -LocalPort 4000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### 3.2 Chạy Web

**Terminal 3 — thư mục: `ROOT/`**
```powershell
pnpm dev:web
```

✅ Vite hiển thị `Local: http://localhost:5173/`.

### 3.3 Smoke test cơ bản

**Terminal 4 (mới) — thư mục: bất kỳ**
```powershell
curl http://localhost:4000/api/health
curl http://localhost:4000/api/health/db
```

✅ Cả hai trả `{"status":"ok"}` hoặc tương đương; `/api/health/db` xác nhận kết nối DB.
❌ `/api/health/db` lỗi 500 → kiểm tra Prisma + DATABASE_URL.
❌ Nếu trả `Route /health not found` → bạn quên prefix `/api`. Tất cả endpoint của server đều dưới `/api`.

Mở trình duyệt: `http://localhost:5173` → ✅ thấy Landing page có "Tìm trận. Tìm bạn. Ra sân."

---

## 4. Test flow đăng ký + onboarding (User A)

Tất cả thao tác sau ở **trình duyệt** `http://localhost:5173`. Mở DevTools (F12) → tab **Network** để theo dõi request.

### 4.1 Đăng ký

1. Click **Tham gia** ở góc phải header.
2. Nhập:
   - Email: `alice@test.local`
   - Mật khẩu: `Password123!`
   - Tên hiển thị: `Alice Test`
3. Nhấn **Đăng ký**.

✅ Redirect sang `/onboarding`.
✅ Trong DevTools Network: thấy `POST /auth/register` → 201, có response `{user, tokens}`.
✅ `localStorage` lưu access + refresh token.
❌ Nếu redirect về `/` hoặc đứng yên → kiểm tra console errors.

### 4.2 Onboarding 3 bước

**Bước 1 — Thông tin cá nhân:**
- Tuổi: `25`
- Giới tính: chọn bất kỳ
- Khu vực: `Hà Nội`
- Click **Tiếp tục**.

**Bước 2 — Chọn môn:**
- Chọn ít nhất 1 môn (ví dụ Bóng đá).
- Đặt trình độ: `Intermediate`.
- Click **Tiếp tục**.

**Bước 3 — Vai trò + xác nhận:**
- Chọn vai trò Player.
- Click **Hoàn tất**.

✅ Redirect về `/dashboard` (HomePage).
✅ `POST /profile/me/onboarding` → 200.
✅ HomePage hiện `Chào, Test.` (lấy tên cuối) và emoji môn vừa chọn.
❌ Nếu kẹt lại ở step → kiểm tra Network response.

### 4.3 Xem & sửa hồ sơ

1. Click avatar góc phải → **Hồ sơ cá nhân**.

✅ URL = `/profile`, hiển thị Alice Test, các môn đã chọn, vai trò.

2. Click **Chỉnh sửa**, đổi khu vực sang `TP. HCM`, **Lưu**.

✅ `PUT /profile/me` → 200, UI hiện khu vực mới.
✅ Reload trang → khu vực vẫn là TP. HCM (persisted).

---

## 5. Test đăng xuất + đăng nhập + refresh token

### 5.1 Đăng xuất

1. Trên HomePage, hover header → click **Đăng xuất** (icon hoặc menu).

✅ Redirect về Landing page.
✅ `POST /auth/logout` → 200, localStorage xóa tokens.
✅ Truy cập `/dashboard` thủ công → redirect về `/login`.

### 5.2 Đăng nhập lại

1. Click **Đăng nhập**.
2. Nhập email + mật khẩu của Alice.

✅ `POST /auth/login` → 200, redirect về `/dashboard`.

### 5.3 Test refresh token (tự động)

**Terminal 4 — thư mục: bất kỳ**

Mô phỏng access token hết hạn bằng cách xóa nó khỏi localStorage:

1. Trong DevTools console (Application → Local Storage → http://localhost:5173):
   - Sửa giá trị `access-token` thành chuỗi rác: `invalid-token`.
2. Reload trang.

✅ Axios interceptor bắt 401 → tự gọi `POST /auth/refresh` → nhận access token mới → request gốc tự retry → trang load bình thường.
❌ Nếu redirect về `/login` ngay → refresh interceptor đang lỗi, xem `WEB/src/lib/api.ts`.

---

## 6. Test Teams (CRUD)

User Alice đang đăng nhập.

### 6.1 Tạo đội

1. Vào **Quản lý đội** (shortcut tile) hoặc URL `/teams`.
2. Click **Tạo đội mới** → URL `/teams/new`.
3. Nhập:
   - Tên: `FC Test Đỏ`
   - Môn: Bóng đá
   - Khu vực: Hà Nội
   - Mô tả: `Đội thử nghiệm`
4. **Tạo**.

✅ `POST /teams` → 201. Redirect về `/teams/:id`.
✅ Hiển thị thông tin đội + Alice là Captain.

### 6.2 Sửa thông tin đội

1. Trên trang đội, click **Sửa**.
2. Đổi tên thành `FC Test Xanh`.
3. **Lưu**.

✅ `PUT /teams/:id` → 200, UI cập nhật.

### 6.3 Danh sách đội của tôi

1. Vào `/teams`.

✅ `GET /teams/me` → 200, hiển thị `FC Test Xanh`.

### 6.4 (Để sau phần 9) Xóa đội

Khoan xóa — cần đội này cho các test recruitment/match.

---

## 7. Test Recruitment Posts (tuyển thành viên)

### 7.1 Captain Alice đăng tin tuyển

1. Trên trang đội `FC Test Xanh`, click **Đăng tin tuyển**.
2. Nhập:
   - Tiêu đề: `Tuyển hậu vệ`
   - Vị trí cần: `Hậu vệ`
   - Trình độ tối thiểu: Beginner
   - Mô tả: `Đá tối thứ 7`
3. **Đăng**.

✅ `POST /recruitment/posts` → 201, redirect `/posts/:id`.
✅ Detail page hiện tin + button **Đóng tin** (vì Alice là tác giả).

### 7.2 Xem trên Find Teammates

1. Vào `/find-teammates`.

✅ Tin `Tuyển hậu vệ` xuất hiện trong list.
✅ `GET /recruitment/posts?sport=football` → 200.

### 7.3 Sửa và xóa tin (giữ tin để test apply ở phần 9)

Chỉ kiểm tra tồn tại button **Sửa** và **Xóa** trên trang detail (do Alice là captain).

---

## 8. Test Match Requests (thách đấu)

### 8.1 Tạo yêu cầu trận

1. Trên trang đội, click **Tạo yêu cầu trận**.
2. Nhập:
   - Thời gian: chọn ngày bất kỳ trong tương lai
   - Sân: `Sân ABC`
   - Khu vực: Hà Nội
   - Ghi chú: `Friendly match`
3. **Tạo**.

✅ `POST /matches/requests` → 201, redirect `/match-requests/:id`.

### 8.2 Xem trên Find Opponents

1. Vào `/find-opponents`.

✅ Yêu cầu trận của FC Test Xanh hiện trong list.

---

## 9. Test flow 2 user — Recruitment apply/accept

Cần user thứ 2. Mở **trình duyệt khác** (hoặc chế độ Ẩn danh / Incognito) để giữ session Alice ở browser 1.

### 9.1 Tạo user Bob ở browser 2

Trong browser ẩn danh, vào `http://localhost:5173`:
1. Đăng ký:
   - Email: `bob@test.local`
   - Mật khẩu: `Password123!`
   - Tên: `Bob Player`
2. Hoàn tất onboarding (chọn Bóng đá, Intermediate, Hà Nội).

### 9.2 Bob xin gia nhập đội

1. Bob vào `/find-teammates`.
2. Click vào tin `Tuyển hậu vệ` của FC Test Xanh.
3. Nhập tin nhắn: `Em xin gia nhập`.
4. Click **Gửi đơn**.

✅ `POST /recruitment/posts/:id/requests` → 201.
✅ Button đổi thành **Đã gửi đơn**.

### 9.3 Alice nhận thông báo + duyệt

Quay lại browser 1 (Alice):
1. Quan sát **chuông thông báo** ở header (góc phải gần avatar).

✅ Trong vòng 30 giây (poll interval), chuông hiện badge số `1`.
✅ `GET /notifications` → 200 với `unreadCount: 1`.

2. Click chuông → thấy thông báo `Bob Player xin gia nhập FC Test Xanh`.

✅ Click thông báo → mở `/posts/:id`. Badge biến mất (mark-as-read tự động khi mở chuông).

3. Trên trang post, kéo xuống danh sách đơn → thấy đơn của Bob.
4. Click **Duyệt**.

✅ `POST /recruitment/requests/:id/accept` → 200.
✅ Bob xuất hiện trong `team.members` của FC Test Xanh.

### 9.4 Bob nhận thông báo "đã được duyệt"

Quay lại browser 2 (Bob):

✅ Chuông badge hiện `1`. Mở → thấy `Đơn xin gia nhập của bạn đã được chấp nhận`.
✅ Bob vào `/teams` → thấy FC Test Xanh trong "Đội của tôi".

---

## 9A. Test flow 2 user — Đội mời người chơi (FR-006.8)

Chiều ngược lại của phần 9: đội chủ động mời, người chơi bấm đồng ý mới vào đội.
Cần một user chưa ở trong FC Test Xanh — dùng Carol (tạo ở 10.1) hoặc tạo `dave@test.local`.

### 9A.1 Dave đăng bài "Tìm đội"

Browser 3 (Dave, đã onboard môn Bóng đá):
1. Vào `/looking-for-team`.
2. Click **Đăng bài tìm đội** → môn Bóng đá, khu vực `Hà Nội`, giới thiệu ≥ 10 ký tự.
3. Click **Đăng bài**.

✅ `POST /looking-for-team` → 201, thẻ của Dave hiện đầu danh sách.

### 9A.2 Alice mời Dave

Browser 1 (Alice, captain FC Test Xanh):
1. Vào `/looking-for-team` → tìm thẻ của Dave.
2. Click **Mời vào đội →** ở chân thẻ.

✅ Chỉ hiện đội **cùng môn** với bài. Alice chỉ có 1 đội bóng đá nên không có ô chọn đội.
❌ Nếu nút không hiện: Alice không phải captain/phó của đội nào cùng môn — kiểm tra `/teams/me`.

3. Nhập lời nhắn `Đội mình đang thiếu hậu vệ` → click **Gửi lời mời**.

✅ `POST /api/teams/:id/invites` → 201.
✅ Chân thẻ đổi thành **Đã gửi lời mời**.

4. Bấm lại lần nữa (reload trang rồi thử mời lại).

✅ Lỗi 409 `ALREADY_INVITED`, message `Đã có lời mời đang chờ người này trả lời`.

### 9A.3 Alice thấy lời mời đang treo

Browser 1: vào `/teams/:id` của FC Test Xanh.

✅ Cột phải hiện thẻ **Lời mời đã gửi · 1** với tên Dave và nút **Rút lại**.
✅ Mở cùng trang bằng account KHÔNG phải captain/phó → không thấy thẻ này (`pendingInvites` trả mảng rỗng).

### 9A.4 Dave nhận lời mời và đồng ý

Browser 3 (Dave):
1. Chuông thông báo → `FC Test Xanh mời bạn gia nhập`.
2. Vào `/dashboard`.

✅ Khối **Cần bạn xử lý** có thẻ `FC Test Xanh mời bạn gia nhập`, kèm tên Alice và lời nhắn.
✅ Số việc cần xử lý tăng 1.

3. Click **Gia nhập**.

✅ `POST /api/teams/invites/:id/accept` → 204.
✅ Thẻ biến mất, `/teams` của Dave có FC Test Xanh.
✅ Alice nhận thông báo `Dave ... đã nhận lời mời vào FC Test Xanh`.

### 9A.5 Đường từ chối và rút lại

1. Alice mời một user khác (ví dụ Bob nếu Bob chưa vào đội) → user đó bấm **Từ chối**.

✅ `POST /api/teams/invites/:id/reject` → 204, Alice nhận thông báo `... đã từ chối lời mời ...`.
✅ Alice mời lại chính người đó được (bản ghi cũ được làm mới, không lỗi unique).

2. Alice mời tiếp rồi vào `/teams/:id` bấm **Rút lại**.

✅ `POST /api/teams/invites/:id/cancel` → 200, thẻ lời mời biến mất.
✅ Người được mời không còn thấy thẻ trên `/dashboard`.

### 9A.6 Kiểm tra quyền

Dùng curl/Postman với access token của một **member thường** (không phải captain/phó):

```powershell
curl -X POST http://localhost:4000/api/teams/<teamId>/invites -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"userId\":\"<someUserId>\"}"
```

✅ 403 `INSUFFICIENT_TEAM_ROLE`.
✅ Accept lời mời của người khác → 403 `FORBIDDEN`.
✅ Mời người đã ở trong đội → 409 `ALREADY_MEMBER`.

---

## 10. Test flow 2 user — Match challenge

Cần đội thứ 2 (của Bob hoặc tạo user thứ 3). Mình dùng user thứ 3 cho rõ ràng.

### 10.1 Tạo user Carol ở browser thứ 3

Mở thêm một cửa sổ ẩn danh khác (hoặc xóa cookies browser 2):
- Email: `carol@test.local` / `Password123!` / Tên: `Carol Captain`
- Onboarding: Bóng đá, Intermediate, Hà Nội.
- Tạo đội: `FC Test Vàng` (cô là Captain).

### 10.2 Carol thách đấu FC Test Xanh

1. Carol vào `/find-opponents`.
2. Click yêu cầu trận của FC Test Xanh.
3. Chọn đội thách đấu: `FC Test Vàng`.
4. Tin nhắn: `Đá nhé!`.
5. Click **Gửi thách đấu**.

✅ `POST /matches/requests/:id/challenges` → 201.

### 10.3 Alice chấp nhận

Quay lại browser 1 (Alice):
1. Chuông → thông báo Carol thách đấu → click.
2. Trên trang `/match-requests/:id`, thấy challenge của FC Test Vàng.
3. Click **Chấp nhận**.

✅ `POST /matches/challenges/:id/accept` → 200.
✅ Trạng thái request đổi sang **Đã ghép cặp**.
✅ Bản ghi `Match` được tạo (kiểm tra bằng Prisma Studio bảng `Match`).

### 10.4 Cả hai đội thấy match trên dashboard

- Alice: HomePage hiển thị `matchesCount = 1` (Trận: 01) trong khối stats.
- Carol: tương tự.

✅ `GET /matches/my` → 200 với 1 record.

### 10.5 Auto-reject các challenge khác (nếu có)

Nếu trước đó có challenge khác đến cùng request → tất cả tự reject. Test: trước khi Alice accept Carol, có thể tạo thêm 1 challenge giả từ Bob (cần Bob là captain đội khác — bỏ qua nếu không có).

---

## 11. Test Notifications nâng cao

### 11.1 Đa thông báo

Trên browser 1 (Alice):
1. Đóng tin tuyển (button **Đóng tin**).
2. Quay lại Bob → đăng ký gia nhập tin khác (nếu có) hoặc tạo recruitment post mới ở đội khác.

Mục tiêu: tạo ≥ 3 thông báo cho 1 user.

✅ Chuông badge hiển thị đúng số chưa đọc.
✅ Sau khi mở chuông, tất cả thông báo trong dropdown chuyển sang trạng thái đã đọc (`POST /notifications/mark-read`).
✅ Reload trang → badge không quay lại.

### 11.2 Poll interval

Trên browser 1, mở DevTools Network, filter `notifications`.
✅ Cứ ~30 giây thấy một `GET /notifications` mới.

---

## 11A. Test Admin panel (FR-010)

Đăng nhập bằng tài khoản quản trị do seed tạo: `admin@demo.vn` / `Demo1234!`
(chạy `pnpm --filter @sfa/api db:seed` ở `ROOT/` nếu chưa seed).

✅ Header Trang chủ hiện nút **Quản trị** — tài khoản thường KHÔNG thấy nút này.
✅ Người thường gõ thẳng `http://localhost:5173/admin` → bị đẩy về `/dashboard`.
✅ Gọi `GET /api/admin/stats` bằng token của người thường → 403 `FORBIDDEN`.

### 11A.1 Tổng quan (FR-010.1)

Click **Quản trị** → vào `/admin`.

✅ Bốn khối số: Người dùng · Đội & trận · Bài đăng đang mở · Nội dung.
✅ Số "Tài khoản" khớp với `SELECT count(*) FROM "User"`.
✅ Có báo cáo chờ → hiện dải đỏ "N báo cáo đang chờ xử lý" ở đầu trang, bấm sang `/admin/reports`.

### 11A.2 Người dùng (FR-010.2)

Tab **Người dùng**:

1. Gõ `bob` vào ô tìm → danh sách lọc theo email hoặc tên hiển thị.
2. Bấm các pill **Vai trò** / **Trạng thái**.
3. Cuộn xuống bấm **Tải thêm** (cần > 20 tài khoản).

✅ `GET /api/admin/users?q=...&role=...&status=...` → 200, phân trang bằng cursor.
✅ Dòng của chính bạn hiện "Không tự thao tác lên chính mình", không có nút nào.

4. Đổi ô vai trò của một user thường sang **Doanh nghiệp**.

✅ `PATCH /api/admin/users/:id` → 200, nhãn đổi ngay.

5. Bấm **Xoá** một user đang là captain của đội nào đó.

✅ 409 `CAPTAIN_MUST_TRANSFER`, câu lỗi nêu tên đội. Tài khoản KHÔNG bị xoá.

6. Bấm **Xoá** một user không làm captain → xác nhận.

✅ 204, dòng biến mất.

### 11A.3 Khoá / mở khoá (FR-010.7)

1. Bấm **Khoá** trên tài khoản của Bob.

✅ 200, dòng mờ đi và hiện nhãn `ĐÃ KHOÁ`.

2. Ở browser của Bob, bấm Đăng xuất rồi đăng nhập lại.

✅ 403 `ACCOUNT_DISABLED`, hiện câu "Tài khoản đã bị khoá...".
✅ Refresh token cũ cũng chết: `POST /api/auth/refresh` với token cũ → 403.

> ⚠️ Nếu Bob **không** đăng xuất, phiên của Bob còn chạy tối đa 15 phút (tuổi thọ access
> token). Đây là giới hạn đã biết, ghi trong ROADMAP mục FR-010.

3. Bấm **Mở khoá** → Bob đăng nhập lại được.

### 11A.4 Bài đăng (FR-010.3)

Tab **Bài đăng**:

1. Chọn loại **Tuyển thành viên**, trạng thái **Đang hiển thị**.
2. Bấm **Xem như người dùng →** trên một bài → mở đúng trang bài đó.
3. Quay lại, bấm **Gỡ bài**.

✅ `POST /api/admin/posts/recruitment/:id/close` → 204.
✅ Bài biến mất khỏi tab "Đang hiển thị", xuất hiện ở tab "Đã gỡ / đã đóng".
✅ Mở `/find-teammates` bằng tài khoản thường → bài đó không còn trong danh sách.

4. Sang tab "Đã gỡ / đã đóng", bấm **Khôi phục**.

✅ Bài quay lại `/find-teammates`.

5. Lặp lại với loại **Tìm đối thủ** và **Tìm đội**.

✅ Tin tìm đối bị gỡ có trạng thái `CANCELLED` (không phải `closed`) — đúng enum của model đó.

### 11A.5 Báo cáo (FR-010.6)

Cần ít nhất một báo cáo: dùng tài khoản thường báo cáo một đội (nút Báo cáo ở trang trận).

Tab **Báo cáo**, lọc **Chờ xử lý**:

1. Nhập ghi chú `Đã liên hệ hai bên` rồi bấm **Đánh dấu đã xử lý**.

✅ `POST /api/admin/reports/:id/resolve` → 200, thẻ chuyển sang trạng thái ĐÃ XỬ LÝ.
✅ Bấm lại lần nữa (reload rồi thử qua curl) → 400 `REPORT_NOT_PENDING`.

2. Với báo cáo khác, bấm **Bỏ qua** → trạng thái ĐÃ BỎ QUA.

### 11A.6 Nhật ký (FR-010.8)

Tab **Nhật ký**:

✅ Bảng có đủ mọi thao tác vừa làm ở 11A.2 → 11A.5, mới nhất trên cùng.
✅ Cột "Quản trị viên" ghi tên admin; cột "Chi tiết" ghi `user → business`, email, hoặc ghi
   chú kết luận báo cáo.
✅ Chỉ ghi thao tác làm đổi dữ liệu — mở trang, lọc, tìm kiếm KHÔNG sinh dòng nào.

### 11A.7 Môn & ảnh nền (FR-010.4)

Tab **Môn & ảnh nền** — chính là trang `/admin/landing` cũ, giờ nằm trong khung có thanh tab.

✅ Thêm môn, sửa môn, tải icon, tải ảnh nền vẫn chạy như trước.

---

## 11B. Test Sân bãi (FR-008)

Seed tạo sẵn: chủ sân `sanbong@demo.vn` / `Demo1234!`, sân **Sân bóng Mỹ Đình A** với 3 khung
tối 19:00–21:00 trong 3 ngày tới (khung đầu đã bật "cần ghép đội").

### 11B.1 Đăng ký tài khoản chủ sân (FR-008.1)

Ở `/register`, trên cùng form có nhóm chọn **Bạn là**:

✅ Hai lựa chọn: Người chơi (mặc định) · Chủ sân. Không có lựa chọn Quản trị.
✅ Chọn **Chủ sân** rồi đăng ký → `GET /api/auth/me` trả `role: "business"`.
✅ Header Trang chủ và trang `/venues` hiện nút **Đăng sân** cho tài khoản này.
✅ Tài khoản người chơi thường KHÔNG thấy nút đó; gọi thẳng `POST /api/venues` → 403.

### 11B.2 Đăng sân (FR-008.2)

Đăng nhập `sanbong@demo.vn` → `/venues` → **Đăng sân**:

1. Chọn môn, nhập tên `Sân test`, địa chỉ, khu vực `Hà Nội`, giá `250000`, mô tả.
2. Bấm **Đăng sân**.

✅ `POST /api/venues` → 201, tự chuyển sang `/venues/:id/manage`.
✅ Ở trang quản lý, bấm **Tải ảnh lên**, chọn một ảnh ngang → ảnh hiện ngay.
✅ Ảnh lưu ở `API/uploads/venue-*.webp`, rộng tối đa 1600px.
❌ Ảnh > 8MB → lỗi `LIMIT_FILE_SIZE`; file PDF → `UNSUPPORTED_MEDIA`.

### 11B.3 Lịch sân & giá (FR-008.3, FR-008.4)

Ở `/venues/:id/manage`, khối **Mở khung giờ mới**:

1. Chọn bắt đầu 18:00 mai, kết thúc 20:00 mai, giá `400000`, ghi chú `Sân số 3`.

✅ `POST /api/venues/:id/slots` → 201, khung hiện trong danh sách.

2. Mở lại đúng khoảng đó (hoặc 19:00–21:00 mai — có giao nhau).

✅ 409 `SLOT_OVERLAP`. Đây là điểm quan trọng: chồng lấn = bán một mặt sân hai lần.

3. Thử mở khung có giờ kết thúc **trước** giờ bắt đầu.

✅ Nút **Mở khung** bị khoá ở client; gọi thẳng API → 400 `VALIDATION_ERROR`.

4. Thử mở khung trong quá khứ → 400 `SLOT_IN_PAST`.
5. Đổi **Giá niêm yết** sang `350000`, bấm **Lưu giá**.

✅ `PATCH /api/venues/:id` → 200.
✅ Giá các khung **đã mở** giữ nguyên (400000) — chỉ khung mở sau đó mới lấy giá mới.

6. Bấm **Đóng khung** trên một khung → trạng thái `blocked`, biến khỏi trang người thuê.
7. Bấm **Xoá** một khung chưa ai đặt → 204.

### 11B.4 Đặt sân (FR-008.5)

Đăng nhập bằng tài khoản người chơi ở browser khác → `/venues`:

✅ Bộ lọc môn / tên / khu vực / giá tối đa / sắp xếp đều đổi được kết quả.
✅ Thẻ sân hiện giá, điểm đánh giá, số khung trống.

1. Mở sân → mục **Lịch sân** → bấm **Đặt khung này** trên một khung.
2. Chọn "Nhân danh <đội>" nếu có đội, nhập lời nhắn, bấm **Gửi yêu cầu**.

✅ `POST /api/venues/slots/:slotId/bookings` → 201, khung đổi nhãn thành `CHỜ DUYỆT`.
✅ Chủ sân nhận thông báo `... xin đặt Sân bóng Mỹ Đình A · ...`.
✅ Bấm đặt lại lần nữa → 409 `ALREADY_BOOKED`.
✅ Chủ sân tự đặt sân của mình → 400 `SELF_BOOKING`.
✅ Gắn `teamId` của đội mình không thuộc → 403 `NOT_TEAM_MEMBER`.

3. Cho **người thứ hai** cũng đặt đúng khung đó.

✅ Vẫn 201 — nhiều người xin chung một khung là hợp lệ, chủ sân sẽ chọn.

### 11B.5 Xác nhận / từ chối (FR-008.6)

Về browser chủ sân → `/venues/:id/manage`, khối **Đơn đặt sân**:

✅ Đơn `pending` nằm trên cùng, có vạch đỏ bên trái.

1. Bấm **Xác nhận** đơn của người thứ nhất.

✅ `POST /api/venues/bookings/:id/confirm` → 200.
✅ Người thứ nhất nhận thông báo `Đơn đặt sân đã được xác nhận`.
✅ **Người thứ hai tự động bị từ chối** và nhận thông báo `... đã có người khác đặt trước`.
✅ Khung chuyển trạng thái `Đã có người đặt`, không ai đặt thêm được nữa.
✅ Bấm xác nhận lần hai (qua curl) → 400 `BOOKING_NOT_PENDING`.

2. Với một khung khác, bấm **Từ chối** → người đặt nhận thông báo, khung vẫn còn trống.

### 11B.6 Người đặt tự huỷ

Browser người chơi → `/bookings` (hoặc nút **Sân tôi đã đặt** ở `/venues`):

✅ Danh sách đơn của mình, lọc được theo trạng thái.

1. Bấm **Huỷ** một đơn đã xác nhận (khung chưa tới giờ).

✅ `POST /api/venues/bookings/:id/cancel` → 200.
✅ Khung quay lại `Còn trống` — người khác đặt được. Đây là điểm dễ sai nhất: không mở lại
   khung thì nó kẹt `booked` vĩnh viễn.
✅ Chủ sân nhận thông báo `... đã huỷ đơn đặt ...`.
✅ Huỷ đơn của người khác → 403 `FORBIDDEN`.

### 11B.7 Sân cần tìm đội (FR-008.7 + FR-004.4)

Ở trang quản lý, tích **Cần ghép đội** trên một khung còn trống.

✅ `PATCH /api/venues/slots/:slotId` → 200.
✅ Trang chủ (`/dashboard`) mục **Sân đang cần đội** hiện khung đó — nhớ chọn đúng môn.
✅ Bỏ tích → khung biến khỏi mục đó ngay.
✅ Khung đã có người đặt KHÔNG xuất hiện ở mục này.

### 11B.8 Đánh giá sân (FR-008.8)

Cần một đơn đã xác nhận và khung giờ **đã trôi qua**. Nhanh nhất là sửa thẳng CSDL:

**Thư mục: `API/`**
```powershell
pnpm exec prisma studio
```
Mở bảng `VenueSlot`, lùi `startsAt`/`endsAt` của khung đã đặt về hôm qua.

✅ Trang sân hiện khối **Bạn đã thuê sân này** với 5 nút sao.
✅ Chấm 4★ + nhận xét → `POST /api/venues/:id/reviews` → 201, điểm sân cập nhật ngay.
✅ Chấm lại 5★ → điểm đổi theo, **không** cộng thêm một phiếu (trung bình chứ không phải tổng).
✅ Người chưa từng thuê chấm → 403 `NO_COMPLETED_BOOKING`.
✅ Chủ sân tự chấm sân mình → 400 `SELF_REVIEW`.

### 11B.9 Thống kê (FR-008.9)

Đầu trang `/venues/:id/manage`:

✅ Bốn ô: Khung còn trống · Đơn chờ duyệt · Đơn đã xác nhận · Doanh thu dự kiến.
✅ "Doanh thu dự kiến" = tổng giá các khung có đơn đã xác nhận — là số dự kiến, không phải
   tiền đã thu (hệ thống chưa có thanh toán).
✅ Người không phải chủ sân gọi `GET /api/venues/:id/stats` → 403 `NOT_VENUE_OWNER`.

### 11B.10 Admin quản lý sân (FR-010.5)

Đăng nhập admin → `/admin/venues`:

✅ Danh sách mọi sân kèm chủ sân, email, số khung, số đơn đã xác nhận.
✅ Bấm **Đình chỉ** → sân biến khỏi `/venues` của người thường.
✅ Đặt sân đang bị đình chỉ (qua curl) → 400 `VENUE_SUSPENDED`.
✅ Đơn đã xác nhận trước đó **vẫn còn** — đình chỉ không huỷ hộ buổi đá đã hẹn.
✅ Tab **Nhật ký** có dòng `Đình chỉ sân`.
✅ Bấm **Mở lại** → sân trở lại danh sách.

### 11B.11 Xoá sân

✅ Xoá sân còn đơn đã xác nhận chưa tới ngày → 409 `VENUE_HAS_BOOKINGS`, câu lỗi nêu số đơn.
✅ Huỷ hết đơn rồi xoá → 204, sân biến mất, ảnh bìa bị dọn khỏi `API/uploads/`.

---

## 12. Test edge cases & validation

### 12.1 Đăng ký email trùng

Lặp lại đăng ký Alice với cùng email:
✅ `POST /auth/register` → 409 (hoặc 400) với message `Email đã tồn tại`.

### 12.2 Đăng nhập sai mật khẩu

✅ `POST /auth/login` → 401, UI hiện `Email hoặc mật khẩu không đúng`.

### 12.3 Truy cập route bảo vệ khi chưa onboard

1. Tạo user mới, hủy giữa onboarding (đóng tab).
2. Đăng nhập lại → vào URL `/teams` thủ công.

✅ Route guard redirect về `/onboarding`.

### 12.4 Xin gia nhập đội mình là captain

Bob vào trang post `Tuyển hậu vệ` của chính đội FC Test Xanh (sau khi đã join):
✅ Button **Đăng ký** bị disable hoặc trả 400 với message `Bạn đã là thành viên`.

### 12.5 Yêu cầu thách đấu chính đội mình

Alice tạo match request cho FC Test Xanh, rồi đổi sang `/find-opponents` thử thách đấu chính trận đó:
✅ Server từ chối 400 hoặc UI không cho chọn FC Test Xanh làm đội thách đấu.

### 12.6 Form validation

Trên `/teams/new`, để trống tên team → Submit:
✅ React Hook Form hiện lỗi đỏ; không có request gửi đi.

---

## 12A. Chạy bộ test tự động

Không cần CSDL, không cần API/Web đang chạy — bộ test hiện chỉ phủ logic thuần.

**Thư mục: `ROOT/`**
```powershell
pnpm test
```

✅ `packages/shared` 37 test pass, `apps/api` 32 test pass, tổng **69 pass / 0 fail**.
✅ Chạy xong dưới 1 giây mỗi gói.
❌ Nếu lỗi `Cannot find package 'tsx'` → chạy `pnpm install` lại.

Chạy riêng một gói khi đang sửa:

```powershell
pnpm --filter @sfa/api test
pnpm --filter @sfa/shared test
```

Bộ test dùng `node --test` có sẵn trong Node 22, không có framework nào được cài thêm.
Nó **không thay thế** các phần thủ công ở trên: mọi luồng nhiều bước (đặt sân, duyệt đơn,
khoá tài khoản) vẫn phải chạy tay theo tài liệu này.

---

## 13. Test build production (smoke)

### 13.1 Typecheck toàn monorepo

**Thư mục: `ROOT/`**
```powershell
pnpm typecheck
```

✅ Cả `@sfa/api`, `@sfa/web`, `@sfa/shared` đều 0 lỗi.

### 13.2 Build production

**Thư mục: `ROOT/`**
```powershell
pnpm build
```

✅ Tạo `API/dist/`, `WEB/dist/`.
❌ Bất kỳ lỗi compile nào → fail.

### 13.3 Chạy API production

Dừng `pnpm dev:api` ở Terminal 2.

**Terminal 2 — thư mục: `API/`**
```powershell
pnpm start
```

✅ Server lên cổng 4000 từ build artifact.

### 13.4 Preview Web production

Dừng `pnpm dev:web` ở Terminal 3.

**Terminal 3 — thư mục: `WEB/`**
```powershell
pnpm preview
```

✅ Preview server hiện URL `http://localhost:4173` (hoặc tương tự). Mở → web hoạt động bình thường, gọi được API.

---

## 14. Dọn dẹp sau test

### 14.1 Reset database (xóa toàn bộ test data)

**Thư mục: `API/`**
```powershell
pnpm db:reset
```

⚠️ Lệnh này **xóa toàn bộ data** trong DB rồi re-apply migrations. Chỉ chạy ở dev.
✅ Tất cả user, team, post, match, notification biến mất; DB sạch.

### 14.2 Dừng tất cả tiến trình

- Terminal 2 (API): `Ctrl+C`
- Terminal 3 (Web): `Ctrl+C`
- Terminal 1 (Postgres Docker, nếu có): `docker stop sfa-pg`

### 14.3 (Tùy chọn) Xóa node_modules

**Thư mục: `ROOT/`**
```powershell
Remove-Item -Recurse -Force node_modules, apps\api\node_modules, apps\web\node_modules, packages\shared\node_modules
```

---

## Checklist tổng kết

| Phần | Mô tả | ✅ Pass |
|---|---|---|
| 0 | Yêu cầu môi trường | ☐ |
| 1 | Cài deps + env | ☐ |
| 2 | DB migrate | ☐ |
| 3 | API + Web up + smoke | ☐ |
| 4 | Đăng ký + onboarding Alice | ☐ |
| 5 | Logout / login / refresh token | ☐ |
| 6 | Teams CRUD | ☐ |
| 7 | Recruitment post tạo + list | ☐ |
| 8 | Match request tạo + list | ☐ |
| 9 | 2-user recruitment apply/accept + notif | ☐ |
| 9A | 2-user đội mời người chơi (accept/reject/cancel) | ☐ |
| 10 | 2-user match challenge accept + Match record | ☐ |
| 11 | Notifications poll + mark-read | ☐ |
| 11A | Admin panel: stats, users, khoá, bài đăng, báo cáo, nhật ký | ☐ |
| 11B | Sân bãi: đăng sân, lịch, đặt sân, duyệt, ghép đội, đánh giá, thống kê | ☐ |
| 12 | Edge cases & validation | ☐ |
| 12A | `pnpm test` — 69 test tự động pass | ☐ |
| 13 | Build production smoke | ☐ |
| 14 | Cleanup | ☐ |

---

## Phụ lục — bảng API endpoints

Hữu ích khi test thủ công bằng curl/Postman. **Tất cả endpoint dưới prefix `/api`** (mounted ở `app.ts: app.use('/api', apiRouter)`). Base URL = `http://localhost:4000/api`.

| Method | URL | Auth | Mô tả |
|---|---|---|---|
| GET    | `/api/health`                                  | — | Liveness |
| GET    | `/api/health/db`                               | — | DB readiness |
| POST   | `/api/auth/register`                           | — | Đăng ký |
| POST   | `/api/auth/login`                              | — | Đăng nhập |
| POST   | `/api/auth/refresh`                            | — | Refresh access token |
| POST   | `/api/auth/logout`                             | ✓ | Đăng xuất |
| GET    | `/api/auth/me`                                 | ✓ | User hiện tại |
| GET    | `/api/profile/me`                              | ✓ | Hồ sơ + sport prefs |
| PUT    | `/api/profile/me`                              | ✓ | Sửa hồ sơ |
| POST   | `/api/profile/me/onboarding`                   | ✓ | Hoàn tất onboarding |
| POST   | `/api/teams`                                   | ✓ | Tạo đội |
| GET    | `/api/teams/me`                                | ✓ | Đội của tôi |
| GET    | `/api/teams/:id`                               | ✓ | Detail đội |
| PUT    | `/api/teams/:id`                               | ✓ | Sửa đội (captain) |
| DELETE | `/api/teams/:id`                               | ✓ | Xóa đội (captain) |
| POST   | `/api/teams/:id/members`                       | ✓ | Thêm thành viên |
| PATCH  | `/api/teams/:id/members/:userId`               | ✓ | Đổi role / chuyển captain |
| DELETE | `/api/teams/:id/members/:userId`               | ✓ | Xóa thành viên |
| POST   | `/api/teams/:id/invites`                       | ✓ | Đội mời người chơi (captain/phó) |
| POST   | `/api/teams/invites/:inviteId/accept`          | ✓ | Người được mời đồng ý |
| POST   | `/api/teams/invites/:inviteId/reject`          | ✓ | Người được mời từ chối |
| POST   | `/api/teams/invites/:inviteId/cancel`          | ✓ | Đội rút lại lời mời |
| POST   | `/api/recruitment/posts`                       | ✓ | Đăng tin tuyển |
| GET    | `/api/recruitment/posts`                       | ✓ | List tin |
| GET    | `/api/recruitment/posts/:id`                   | ✓ | Detail tin |
| PATCH  | `/api/recruitment/posts/:id`                   | ✓ | Sửa tin |
| DELETE | `/api/recruitment/posts/:id`                   | ✓ | Xóa tin |
| POST   | `/api/recruitment/posts/:id/requests`          | ✓ | Gửi đơn xin gia nhập |
| POST   | `/api/recruitment/requests/:requestId/accept`  | ✓ | Captain duyệt |
| POST   | `/api/recruitment/requests/:requestId/reject`  | ✓ | Captain từ chối |
| POST   | `/api/recruitment/requests/:requestId/cancel`  | ✓ | Applicant tự hủy |
| POST   | `/api/matches/requests`                        | ✓ | Tạo yêu cầu trận |
| GET    | `/api/matches/requests`                        | ✓ | List yêu cầu |
| GET    | `/api/matches/requests/:id`                    | ✓ | Detail |
| PATCH  | `/api/matches/requests/:id`                    | ✓ | Sửa |
| DELETE | `/api/matches/requests/:id`                    | ✓ | Xóa |
| POST   | `/api/matches/requests/:id/challenges`         | ✓ | Gửi thách đấu |
| POST   | `/api/matches/challenges/:id/accept`           | ✓ | Chấp nhận thách đấu (atomic) |
| POST   | `/api/matches/challenges/:id/reject`           | ✓ | Từ chối |
| POST   | `/api/matches/challenges/:id/withdraw`         | ✓ | Đội thách đấu rút |
| GET    | `/api/matches/my`                              | ✓ | Trận đã ghép của tôi |
| GET    | `/api/notifications`                           | ✓ | List + unreadCount |
| POST   | `/api/notifications/mark-read`                 | ✓ | Đánh dấu đã đọc |
| GET    | `/api/admin/stats`                             | admin | Thống kê tổng quan (10.1) |
| GET    | `/api/admin/users`                             | admin | Danh sách người dùng (10.2) |
| PATCH  | `/api/admin/users/:id`                         | admin | Đổi vai trò / tên (10.2) |
| DELETE | `/api/admin/users/:id`                         | admin | Xoá tài khoản (10.2) |
| POST   | `/api/admin/users/:id/disable`                 | admin | Khoá tài khoản (10.7) |
| POST   | `/api/admin/users/:id/enable`                  | admin | Mở khoá tài khoản (10.7) |
| GET    | `/api/admin/posts`                             | admin | Danh sách bài đăng 3 loại (10.3) |
| POST   | `/api/admin/posts/:kind/:id/close`             | admin | Gỡ bài (10.3) |
| POST   | `/api/admin/posts/:kind/:id/reopen`            | admin | Khôi phục bài (10.3) |
| GET    | `/api/admin/reports`                           | admin | Danh sách báo cáo (10.6) |
| POST   | `/api/admin/reports/:id/resolve`               | admin | Kết luận báo cáo (10.6) |
| GET    | `/api/admin/logs`                              | admin | Nhật ký quản trị (10.8) |
| GET    | `/api/admin/venues`                            | admin | Danh sách sân (10.5) |
| POST   | `/api/admin/venues/:id/suspend`                | admin | Đình chỉ sân (10.5) |
| POST   | `/api/admin/venues/:id/activate`               | admin | Mở lại sân (10.5) |
| GET    | `/api/venues`                                  | ✓ | Danh sách sân + lọc (8.2) |
| POST   | `/api/venues`                                  | business | Đăng sân (8.2) |
| GET    | `/api/venues/me`                               | ✓ | Sân của tôi |
| GET    | `/api/venues/:id`                              | ✓ | Chi tiết + lịch + đánh giá |
| PATCH  | `/api/venues/:id`                              | chủ sân | Sửa thông tin / giá (8.4) |
| DELETE | `/api/venues/:id`                              | chủ sân | Xoá sân |
| POST   | `/api/venues/:id/photo`                        | chủ sân | Ảnh bìa (8.2) |
| POST   | `/api/venues/:id/slots`                        | chủ sân | Mở khung giờ (8.3) |
| PATCH  | `/api/venues/slots/:slotId`                    | chủ sân | Giá / đóng khung / ghép đội (8.4, 8.7) |
| DELETE | `/api/venues/slots/:slotId`                    | chủ sân | Xoá khung (8.3) |
| GET    | `/api/venues/slots/open`                       | ✓ | Khung cần ghép đội (8.7, 4.4) |
| POST   | `/api/venues/slots/:slotId/bookings`           | ✓ | Xin đặt sân (8.5) |
| GET    | `/api/venues/:id/bookings`                     | chủ sân | Hộp thư đơn (8.5) |
| GET    | `/api/venues/bookings/me`                      | ✓ | Đơn của tôi |
| POST   | `/api/venues/bookings/:id/confirm`             | chủ sân | Xác nhận (8.6) |
| POST   | `/api/venues/bookings/:id/reject`              | chủ sân | Từ chối (8.6) |
| POST   | `/api/venues/bookings/:id/cancel`              | người đặt | Tự huỷ |
| GET    | `/api/venues/:id/stats`                        | chủ sân | Thống kê (8.9) |
| POST   | `/api/venues/:id/reviews`                      | ✓ | Đánh giá sân (8.8) |

---

## Gotcha trên Windows

Nếu chạy `pnpm db:migrate` mà dev server đang chạy, có thể gặp lỗi file lock:
```
Error: EBUSY: resource busy or locked, rename ... query_engine-windows.dll.node
```

Khắc phục:
```powershell
Get-Process node | Where-Object { $_.Modules.FileName -like '*query_engine-windows*' } | Stop-Process -Force
```

Sau đó rerun `pnpm db:migrate`.
