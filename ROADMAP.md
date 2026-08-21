# ROADMAP — Chức năng cần hoàn thiện

Đối chiếu từng mục trong [Idea.md](./Idea.md) với code thực tế trong repo.
Trạng thái được xác định bằng cách tra route, schema và model — không phải phỏng đoán.

**Ký hiệu:** `[x]` xong · `[~]` một phần · `[ ]` chưa làm

_Cập nhật lần cuối: 2026-08-21 — hoàn thành FR-005 (Tìm đối thủ)._

## Tổng quan

| Nhóm                        | Xong   | Một phần | Chưa   | Tổng   |
| --------------------------- | ------ | -------- | ------ | ------ |
| FR-001 Đăng ký & Xác thực   | 3      | 1        | 5      | 9      |
| FR-002 Hồ sơ cá nhân        | 11     | 1        | 0      | 12     |
| FR-003 Môn thể thao & Theme | 6      | 0        | 0      | 6      |
| FR-004 Trang chủ            | 8      | 0        | 1      | 9      |
| FR-005 Tìm đối thủ          | 11     | 0        | 0      | 11     |
| FR-006 Tìm thành viên       | 8      | 0        | 1      | 9      |
| FR-007 Quản lý đội          | 7      | 1        | 0      | 8      |
| FR-008 Quản lý sân bãi      | 0      | 0        | 9      | 9      |
| FR-009 Thông báo            | 4      | 0        | 2      | 6      |
| FR-010 Quản trị hệ thống    | 1      | 0        | 7      | 8      |
| **Tổng**                    | **59** | **3**    | **25** | **87** |

**FR-003** và **FR-005** đã xong 100%. **FR-007** hết mục `[ ]`, chỉ còn `[~]` 7.6 (lịch sử
trận theo từng đội). **FR-006** còn đúng 1 mục là 6.8 (đội mời người chơi).
**FR-002 chỉ còn 1 mục** (điểm uy tín cá nhân — model `Rating` chấm đội, chưa chấm người).
**FR-004 chỉ còn 1 mục** (sân bãi — chặn bởi trọn bộ FR-008).

**FR-008** vẫn chưa có dòng code nào và **FR-010** mới có 1/8 mục.
Đây là phần lớn nhất còn lại (16/25 mục chưa làm).

---

## FR-001 — Đăng ký & Xác thực

- [~] 1.1 Đăng ký bằng Email/Gmail (OAuth 2.0) — _email/mật khẩu xong, OAuth chưa_
- [ ] 1.2 Đăng ký bằng số điện thoại (OTP) — _User model chưa có trường phone_
- [x] 1.3 Đăng nhập Email/Password
- [ ] 1.4 Đăng nhập Google OAuth
- [ ] 1.5 Đăng nhập Facebook OAuth
- [ ] 1.6 Quên mật khẩu / Đặt lại mật khẩu
- [ ] 1.7 Xác thực email sau đăng ký — _cột `emailVerified` có sẵn nhưng không luồng nào set `true`_
- [x] 1.8 Đăng xuất — _thu hồi refresh token_
- [x] 1.9 Phiên tự động — _refresh token 30 ngày, xoay vòng khi refresh_

> **Chặn:** 1.6 và 1.7 cần hạ tầng gửi email. 1.1/1.4/1.5 cần đăng ký OAuth app.

## FR-002 — Hồ sơ cá nhân

- [x] 2.1 Hiển thị profile đầy đủ
- [x] 2.2 Chỉnh sửa tên hiển thị
- [x] 2.3 Ảnh đại diện — _upload JPG/PNG/WebP tối đa 2MB, ảnh cũ tự bị xoá_
- [x] 2.4 Chọn môn yêu thích (≥1)
- [x] 2.5 Vị trí chơi theo môn
- [x] 2.6 Trình độ theo môn
- [x] 2.7 Năm sinh
- [x] 2.8 Mô tả bản thân
- [x] 2.9 Khu vực sinh sống
- [x] 2.10 Đổi mật khẩu — _thu hồi toàn bộ refresh token đang sống_
- [x] 2.11 Số điện thoại — _`phone` unique, validate 0xxxxxxxxx / +84xxxxxxxxx_
- [~] 2.12 Điểm uy tín — _uy tín **đội** đã tính từ `Rating`; uy tín **người** vẫn bằng 0 vì
  phiếu chấm nhắm vào đội, chưa có quy tắc quy về từng cá nhân_

> **Chặn:** 2.3 cần chỗ lưu file. 2.12 cần quyết định: uy tín cá nhân lấy trung bình các đội
> mình thuộc về, hay cần một phiếu chấm riêng cho người chơi.

## FR-003 — Môn thể thao & Multi-theme

- [x] 3.1 Danh sách môn — _5 môn trong `SPORTS`_
- [x] 3.2 Theme màu riêng mỗi môn — _`SPORT_THEMES`_
- [x] 3.3 Xem một môn tại một thời điểm
- [x] 3.4 Sport selector
- [x] 3.5 Đổi theme khi chuyển môn — _`applySportTheme`_
- [x] 3.6 Nhớ môn xem cuối — _zustand persist `sfa.sport`_

> Nhóm duy nhất hoàn thành 100%.

## FR-004 — Trang chủ (Dashboard)

- [x] 4.1 Đội đang tuyển thành viên
- [x] 4.2 Đội đang tìm đối thủ
- [x] 4.3 Cá nhân đang tìm đội — _mục riêng ở dashboard + trang `/looking-for-team`_
- [ ] 4.4 Sân đang có trận / cần tìm đội — _phụ thuộc FR-008_
- [x] 4.5 Mini profile
- [x] 4.6 Lọc theo khu vực
- [x] 4.7 Sắp xếp theo thời gian / uy tín — _tham số `sort`, có khoá phụ `id` để cursor không sót bản ghi_
- [x] 4.8 Phân trang — _web dùng `useInfiniteQuery` + nút Tải thêm trên cả 3 danh sách_
- [x] 4.9 Notification badge

## FR-005 — Tìm đối thủ

- [x] 5.1 Danh sách đội đang tìm trận
- [x] 5.2 Lọc theo uy tín — _`reputationMin`, mốc sẵn 3.0 / 4.0 / 4.5 sao_
- [x] 5.3 Lọc theo khu vực
- [x] 5.4 Lọc theo sân cụ thể — _khớp một phần `venueName`, không phân biệt hoa thường;
      **không** phải chờ FR-008 vì lời mời đã tự ghi tên sân_
- [x] 5.5 Lọc theo buổi (sáng/chiều/tối) — _cột `timeSlot` suy ra từ `preferredTime` theo giờ
      Việt Nam lúc lưu; Prisma không lọc được theo giờ-trong-ngày nên phải lưu sẵn_
- [x] 5.6 Lọc theo trình độ — _`skillLevelMin`_
- [x] 5.7 Xem chi tiết đội đối thủ
- [x] 5.8 Gửi lời thách đấu
- [x] 5.9 Chấp nhận / từ chối thách đấu — _có transaction, tạo `Match` khi chấp nhận_
- [x] 5.10 Đánh giá uy tín sau trận — _model `Rating`, `POST /matches/:id/rating`, 1–5 sao,
      mỗi người một phiếu mỗi trận (sửa được, không cộng dồn); trung bình ghi vào
      `Team.reputation`_
- [x] 5.11 Báo cáo đội vi phạm — _model `Report`, `POST /reports`, 5 lý do; mỗi người chỉ giữ
      một báo cáo đang chờ cho mỗi đội_

> **Mốc đánh giá:** chưa có luồng "kết thúc trận" nên phần chấm điểm mở ra khi giờ đá đã trôi
> qua (hoặc trận được đánh dấu `completed`). Trận không hẹn giờ thì chưa chấm được — đây là lý
> do nên làm FR-007.6 (lịch sử trận theo đội) kèm nút kết thúc trận.

## FR-006 — Tìm thành viên & Đồng đội

- [x] 6.1 Đội đăng bài tuyển
- [x] 6.2 Chỉ định vị trí cần tuyển
- [x] 6.3 Yêu cầu trình độ
- [x] 6.4 Xem danh sách đội đang tuyển
- [x] 6.5 Gửi đơn xin gia nhập
- [x] 6.6 Duyệt / từ chối đơn
- [x] 6.7 Người chơi đăng bài "Tìm đội" — _model `LookingForTeamPost`, mỗi môn một bài đang mở_
- [ ] 6.8 Đội mời người chơi
- [x] 6.9 Lọc theo khu vực, vị trí, trình độ

## FR-007 — Quản lý đội

- [x] 7.1 Tạo đội
- [x] 7.2 Sửa thông tin đội
- [x] 7.3 Thêm / xoá thành viên
- [x] 7.4 Phân quyền captain / co-captain / member — _có kiểm tra quyền đầy đủ, chuyển captain atomic_
- [x] 7.5 Xem danh sách thành viên
- [~] 7.6 Lịch sử trận đấu — _`GET /matches/my` trả theo người dùng, chưa có theo từng đội_
- [x] 7.7 Điểm uy tín đội — _trung bình các phiếu `Rating`, cập nhật ngay khi có người chấm_
- [x] 7.8 Giải tán đội

## FR-008 — Quản lý sân bãi (Business) — **chưa bắt đầu**

- [ ] 8.1 Đăng ký tài khoản doanh nghiệp — _enum `UserRole.business` có sẵn nhưng không code nào dùng_
- [ ] 8.2 Đăng thông tin sân
- [ ] 8.3 Quản lý lịch sân trống
- [ ] 8.4 Cập nhật giá thuê
- [ ] 8.5 Nhận yêu cầu đặt sân
- [ ] 8.6 Xác nhận / từ chối đặt sân
- [ ] 8.7 Đăng bài tìm đội cho sân trống
- [ ] 8.8 Người dùng đánh giá sân
- [ ] 8.9 Thống kê đặt sân

> Cần model mới: `Venue`, `VenueSlot`, `Booking`, `VenueReview`.

## FR-009 — Thông báo

- [x] 9.1 Thông báo thách đấu mới
- [x] 9.2 Thông báo duyệt/từ chối đơn
- [x] 9.3 Thông báo có người xin gia nhập
- [ ] 9.4 Nhắc trận sắp diễn ra — _cần bộ hẹn giờ chạy nền_
- [x] 9.5 Thông báo khi được đánh giá — _`rating_received`, chỉ báo lần chấm đầu để sửa điểm
      không làm phiền lại_
- [ ] 9.6 Web Push — _ưu tiên Thấp_

> Hiện thông báo lấy bằng polling 30 giây. Socket.IO đã gỡ vì không dùng tới.

## FR-010 — Quản trị hệ thống — **chưa bắt đầu**

- [ ] 10.1 Dashboard thống kê
- [ ] 10.2 CRUD người dùng
- [ ] 10.3 Duyệt bài đăng
- [x] 10.4 Quản lý danh mục môn — _admin thêm/sửa/xoá môn và đặt ảnh nền cho từng môn_
- [ ] 10.5 Quản lý sân đăng ký — _phụ thuộc FR-008_
- [ ] 10.6 Xử lý báo cáo — _bảng `Report` đã có dữ liệu, còn thiếu màn hình duyệt của admin_
- [ ] 10.7 Khoá / mở khoá tài khoản
- [ ] 10.8 Xem log hoạt động

> Đã có middleware `requireRole('admin')` — kiểm vai trò từ CSDL chứ không tin token — và
> trang `/admin/landing`. `Sport` đã chuyển từ enum Postgres sang bảng nên danh mục môn
> quản lý được lúc chạy. Bảy mục còn lại dùng lại được middleware này.

---

## Ngoài SRS — đã làm thêm

Những thứ Idea.md không liệt kê nhưng đã có trong code. Ghi lại để lần sau
không dựng lại từ đầu.

- [x] **Trang chủ cá nhân hoá** — `GET /dashboard` gộp ba truy vấn (trận kế tiếp,
      đơn xin vào đội đang chờ, lời thách đấu đang chờ) vào một lượt gọi vì cả ba
      đều xuất phát từ cùng danh sách đội của người dùng. Chỉ captain/phó thấy
      phần đơn và thách đấu — khớp với ràng buộc quyền ở chỗ duyệt.
- [x] **Điểm danh trận** — model `MatchAttendance` (`going` / `not_going`,
      unique theo `matchId + userId`), `POST /matches/:id/attendance`. "Chưa trả
      lời" tính bằng sĩ số đội trừ số người đã trả lời nên thêm/bớt thành viên là
      con số tự đúng.
- [x] **Danh mục môn là dữ liệu** — `Sport` chuyển từ enum Postgres sang bảng,
      admin thêm/sửa/xoá môn kèm icon và ảnh nền (FR-010.4).

> `MatchAttendance` là nền sẵn cho 9.4 (nhắc trận sắp diễn ra): đã biết ai đi,
> chỉ còn thiếu bộ hẹn giờ.

---

## Hạ tầng phải dựng trước

Nhiều mục trên bị chặn bởi cùng một thứ. Làm hạ tầng trước sẽ mở khoá nhiều FR cùng lúc.

| Hạ tầng                           | Mở khoá                        | Ghi chú                                                    |
| --------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| Gửi email                         | 1.6, 1.7                       | Lúc dev có thể in link ra console, không cần dịch vụ ngoài |
| Lưu file / ảnh                    | 2.3, 8.2                       | Local disk cho đồ án là đủ                                 |
| ~~Model `Rating`~~                | ~~5.10, 7.7, 9.5~~             | Xong 2026-08-21 — còn 2.12 chờ quyết định quy tắc          |
| Bộ hẹn giờ chạy nền               | 9.4                            | Cũng dùng được để dọn bài hết hạn                          |
| Luồng "kết thúc trận"             | 7.6, mốc chấm điểm chặt hơn    | Nhỏ — một cột trạng thái + nút cho captain                 |
| Middleware `requireRole('admin')` | Toàn bộ FR-010                 | Nhỏ, làm trước khi dựng admin                              |
| Nhóm model sân bãi                | Toàn bộ FR-008, 4.4, 5.4, 10.5 | Khối lớn nhất                                              |

## Nợ kỹ thuật (không thuộc FR)

- [ ] Chưa có test nào — 0 file test, không có script `test`
- [ ] Web chưa code-split — 15 trang gộp một chunk 458 KB, ảnh hưởng NFR-001.1 (<3s)
- [ ] Refresh token lưu `localStorage`, TTL 30 ngày
- [ ] Rate limit dùng MemoryStore — sai số khi chạy nhiều instance
- [ ] Repo chưa sạch Prettier toàn bộ

## Thứ tự đề xuất

FR-005 đã xong trọn bộ (2026-08-21), kéo theo 7.7 và 9.5. Còn lại:

1. **Quên mật khẩu + xác thực email** (1.6, 1.7) — hai mục Cao còn lại của FR-001, dùng lại
   hạ tầng token đã có. Lúc dev in link ra console là đủ, chưa cần dịch vụ gửi mail ngoài.
2. **Admin panel phần còn lại** (10.1, 10.2, 10.3, 10.7, 10.8) — middleware `requireRole('admin')`
   đã sẵn. Làm 10.6 trước cũng được vì bảng `Report` đã có dữ liệu thật để duyệt.
3. **Luồng kết thúc trận + lịch sử theo đội** (7.6) — nhỏ, và làm mốc chấm điểm chặt hơn thay
   vì chỉ dựa vào "đã qua giờ đá".
4. **Bộ hẹn giờ chạy nền** (9.4) — dữ liệu điểm danh đã có; cũng dùng lại được để dọn bài
   tuyển/tìm trận hết hạn.
5. **Uy tín cá nhân** (2.12) — cần chốt quy tắc trước khi code, xem ghi chú ở FR-002.
6. **Đội mời người chơi** (6.8) — chiều ngược lại của 6.5, dùng lại luồng `JoinRequest`.
7. **Sân bãi** (toàn bộ FR-008, kéo theo 4.4, 10.5) — khối lớn nhất, cần 4 model mới, để cuối.

Nợ kỹ thuật nên chen vào sớm: **code-split trang web** (chunk 458 KB đang phá vỡ NFR-001.1)
và **dựng bộ test đầu tiên** — hiện 0 file test.

## Cách cập nhật file này

Làm xong việc gì thì sửa ngay ở đây: đổi `[ ]` / `[~]` thành `[x]`, cập nhật
bảng Tổng quan, và viết lại phần "Thứ tự đề xuất" nếu thứ tự đã đổi. Việc nằm
ngoài Idea.md thì ghi vào mục "Ngoài SRS — đã làm thêm".
