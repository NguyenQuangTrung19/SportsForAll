# ROADMAP — Chức năng cần hoàn thiện

Đối chiếu từng mục trong [Idea.md](./Idea.md) với code thực tế trong repo.
Trạng thái được xác định bằng cách tra route, schema và model — không phải phỏng đoán.

**Ký hiệu:** `[x]` xong · `[~]` một phần · `[ ]` chưa làm

## Tổng quan

| Nhóm                        | Xong   | Một phần | Chưa   | Tổng   |
| --------------------------- | ------ | -------- | ------ | ------ |
| FR-001 Đăng ký & Xác thực   | 3      | 1        | 5      | 9      |
| FR-002 Hồ sơ cá nhân        | 11     | 1        | 0      | 12     |
| FR-003 Môn thể thao & Theme | 6      | 0        | 0      | 6      |
| FR-004 Trang chủ            | 8      | 0        | 1      | 9      |
| FR-005 Tìm đối thủ          | 6      | 0        | 5      | 11     |
| FR-006 Tìm thành viên       | 8      | 0        | 1      | 9      |
| FR-007 Quản lý đội          | 6      | 2        | 0      | 8      |
| FR-008 Quản lý sân bãi      | 0      | 0        | 9      | 9      |
| FR-009 Thông báo            | 3      | 0        | 3      | 6      |
| FR-010 Quản trị hệ thống    | 1      | 0        | 7      | 8      |
| **Tổng**                    | **52** | **4**    | **31** | **87** |

**FR-002 chỉ còn 1 mục** (điểm uy tín — chặn bởi model `Rating`).
**FR-004 chỉ còn 1 mục** (sân bãi — chặn bởi trọn bộ FR-008).

Hai nhóm **FR-008** và **FR-010** vẫn chưa có dòng code nào — không model, không route.
Đây là phần lớn nhất còn lại (17/32 mục chưa làm).

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
- [~] 2.12 Điểm uy tín — _cột `reputation` tồn tại nhưng luôn bằng 0, chưa có nguồn tính_

> **Chặn:** 2.3 cần chỗ lưu file. 2.12 phụ thuộc FR-005.10 (đánh giá sau trận).

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
- [ ] 5.2 Lọc theo uy tín
- [x] 5.3 Lọc theo khu vực
- [ ] 5.4 Lọc theo sân cụ thể — _phụ thuộc FR-008_
- [ ] 5.5 Lọc theo buổi (sáng/chiều/tối)
- [x] 5.6 Lọc theo trình độ — _`skillLevelMin`_
- [x] 5.7 Xem chi tiết đội đối thủ
- [x] 5.8 Gửi lời thách đấu
- [x] 5.9 Chấp nhận / từ chối thách đấu — _có transaction, tạo `Match` khi chấp nhận_
- [ ] 5.10 Đánh giá uy tín sau trận — _chưa có model Rating_
- [ ] 5.11 Báo cáo đội vi phạm — _chưa có model Report_

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
- [~] 7.7 Điểm uy tín đội — _cột có, chưa tính; phụ thuộc FR-005.10_
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
- [ ] 9.5 Thông báo khi được đánh giá — _phụ thuộc FR-005.10_
- [ ] 9.6 Web Push — _ưu tiên Thấp_

> Hiện thông báo lấy bằng polling 30 giây. Socket.IO đã gỡ vì không dùng tới.

## FR-010 — Quản trị hệ thống — **chưa bắt đầu**

- [ ] 10.1 Dashboard thống kê
- [ ] 10.2 CRUD người dùng
- [ ] 10.3 Duyệt bài đăng
- [x] 10.4 Quản lý danh mục môn — _admin thêm/sửa/xoá môn và đặt ảnh nền cho từng môn_
- [ ] 10.5 Quản lý sân đăng ký — _phụ thuộc FR-008_
- [ ] 10.6 Xử lý báo cáo — _phụ thuộc FR-005.11_
- [ ] 10.7 Khoá / mở khoá tài khoản
- [ ] 10.8 Xem log hoạt động

> Đã có middleware `requireRole('admin')` — kiểm vai trò từ CSDL chứ không tin token — và
> trang `/admin/landing`. `Sport` đã chuyển từ enum Postgres sang bảng nên danh mục môn
> quản lý được lúc chạy. Bảy mục còn lại dùng lại được middleware này.

---

## Hạ tầng phải dựng trước

Nhiều mục trên bị chặn bởi cùng một thứ. Làm hạ tầng trước sẽ mở khoá nhiều FR cùng lúc.

| Hạ tầng                           | Mở khoá                        | Ghi chú                                                    |
| --------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| Gửi email                         | 1.6, 1.7                       | Lúc dev có thể in link ra console, không cần dịch vụ ngoài |
| Lưu file / ảnh                    | 2.3, 8.2                       | Local disk cho đồ án là đủ                                 |
| Model `Rating`                    | 5.10, 2.12, 7.7, 9.5           | Một model mở khoá 4 mục                                    |
| Bộ hẹn giờ chạy nền               | 9.4                            | Cũng dùng được để dọn bài hết hạn                          |
| Middleware `requireRole('admin')` | Toàn bộ FR-010                 | Nhỏ, làm trước khi dựng admin                              |
| Nhóm model sân bãi                | Toàn bộ FR-008, 4.4, 5.4, 10.5 | Khối lớn nhất                                              |

## Nợ kỹ thuật (không thuộc FR)

- [ ] Chưa có test nào — 0 file test, không có script `test`
- [ ] Web chưa code-split — 15 trang gộp một chunk 458 KB, ảnh hưởng NFR-001.1 (<3s)
- [ ] Refresh token lưu `localStorage`, TTL 30 ngày
- [ ] Rate limit dùng MemoryStore — sai số khi chạy nhiều instance
- [ ] Repo chưa sạch Prettier toàn bộ

## Thứ tự đề xuất

1. **Model `Rating`** — nhỏ, mở khoá 4 mục, làm cho điểm uy tín (đang luôn bằng 0) có ý nghĩa
2. **Đổi mật khẩu + quên mật khẩu + xác thực email** — 3 mục Cao của FR-001, dùng lại hạ tầng token đã có
3. **Phân trang ở web + sắp xếp** — API đã sẵn sàng, chỉ thiếu phía giao diện
4. **Bài "Tìm đội" của cá nhân** (6.7) + hiển thị ở dashboard (4.3)
5. **Admin panel** — cần `requireRole('admin')` trước
6. **Sân bãi** — khối lớn nhất, để cuối
