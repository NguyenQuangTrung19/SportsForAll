# ROADMAP — Chức năng cần hoàn thiện

Đối chiếu từng mục trong [Idea.md](./Idea.md) với code thực tế trong repo.
Trạng thái được xác định bằng cách tra route, schema và model — không phải phỏng đoán.

**Ký hiệu:** `[x]` xong · `[~]` một phần · `[ ]` chưa làm

_Cập nhật lần cuối: 2026-09-30 — FR-001 xong 100%, thêm đặt mật khẩu lần đầu, đăng nhập bằng SĐT + mật khẩu, liên kết / gỡ Google & Facebook ở trang hồ sơ._

## Tổng quan

| Nhóm                        | Xong   | Một phần | Chưa   | Tổng   |
| --------------------------- | ------ | -------- | ------ | ------ |
| FR-001 Đăng ký & Xác thực   | 9      | 0        | 0      | 9      |
| FR-002 Hồ sơ cá nhân        | 12     | 0        | 0      | 12     |
| FR-003 Môn thể thao & Theme | 6      | 0        | 0      | 6      |
| FR-004 Trang chủ            | 9      | 0        | 0      | 9      |
| FR-005 Tìm đối thủ          | 11     | 0        | 0      | 11     |
| FR-006 Tìm thành viên       | 9      | 0        | 0      | 9      |
| FR-007 Quản lý đội          | 7      | 1        | 0      | 8      |
| FR-008 Quản lý sân bãi      | 9      | 0        | 0      | 9      |
| FR-009 Thông báo            | 4      | 0        | 2      | 6      |
| FR-010 Quản trị hệ thống    | 8      | 0        | 0      | 8      |
| **Tổng**                    | **84** | **1**    | **2**  | **87** |

**Tám nhóm đã xong 100%: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-008, FR-010.** FR-008 khép lại kéo theo
hai mục cuối cùng bị nó chặn: 4.4 (sân đang cần đội trên Trang chủ) và 10.5 (admin quản lý sân).

**FR-007** hết mục `[ ]`, chỉ còn `[~]` 7.6 (lịch sử trận theo từng đội).
**FR-002** khép lại với 2.12 (uy tín cá nhân) — xem ghi chú công thức ở mục FR-002.

Ba mục còn lại: **FR-007.6** (lịch sử trận theo đội, `[~]`) và **FR-009** (9.4 nhắc trận —
cần bộ hẹn giờ chạy nền; 9.6 Web Push). Không còn mục nào bị chặn bởi một FR khác hay bởi
dịch vụ ngoài.

---

## FR-001 — Đăng ký & Xác thực

- [x] 1.1 Đăng ký bằng Email/Gmail (OAuth 2.0) — _form email/mật khẩu, hoặc "Tiếp tục với
      Google" tạo tài khoản ngay lần đầu_
- [x] 1.2 Đăng ký bằng số điện thoại (OTP) — _`/phone-login`, một luồng cho cả đăng ký lẫn
      đăng nhập; mã 6 số, 5 phút, sai 5 lần là chết, 60 giây mới gửi lại_
- [x] 1.3 Đăng nhập Email/Password — _ô đăng nhập nhận cả **số điện thoại đã xác thực**_
- [x] 1.4 Đăng nhập Google OAuth
- [x] 1.5 Đăng nhập Facebook OAuth
- [x] 1.6 Quên mật khẩu / Đặt lại mật khẩu — _link 30 phút, dùng một lần; đặt lại xong thu
      hồi mọi phiên_
- [x] 1.7 Xác thực email sau đăng ký — _link 24 giờ; banner nhắc ở Trang chủ + Hồ sơ, không
      chặn dùng app_
- [x] 1.8 Đăng xuất — _thu hồi refresh token_
- [x] 1.9 Phiên tự động — _refresh token 30 ngày, xoay vòng khi refresh_

> **Không thêm thư viện nào.** Resend (email), Twilio (SMS), Google, Facebook đều gọi thẳng
> HTTP bằng `fetch` có sẵn của Node — `lib/outbox.ts`, `lib/oauth.ts`. Cả bốn là **tuỳ
> chọn**: thiếu khoá thì lúc dev email/OTP in ra terminal, còn production tắt chức năng đó
> và giao diện ẩn nút (`GET /auth/providers`). Cách lấy khoá: RUNBOOK mục 7.
>
> **Một bảng cho mọi mã dùng một lần** — `AuthToken` (link email, OTP, mã đổi phiên OAuth),
> chỉ lưu SHA-256. Phát mã mới là vô hiệu mã cũ cùng mục đích; tiêu mã bằng `updateMany`
> có điều kiện `usedAt: null` để hai request cùng lúc chỉ một cái thắng.
>
> **`User.email` thành không bắt buộc** — tài khoản tạo bằng số điện thoại không có email.
> Số điện thoại chuẩn hoá về `0xxxxxxxxx` (migration đổi luôn dữ liệu cũ dạng `+84`), để
> `+84912...` và `0912...` không thành hai tài khoản.
>
> **Các quyết định bảo mật:**
> - **Quên mật khẩu luôn trả 204**, có tài khoản hay không, và không chờ gửi mail xong mới
>   trả — trả lời khác nhau hay chậm khác nhau đều là cách dò email nào đã đăng ký.
> - **Số tự gõ vào hồ sơ không đăng nhập được bằng OTP.** Ai cũng gõ được số người khác vào
>   hồ sơ mình; nếu OTP mở tài khoản đó thì người cầm SIM vào được tài khoản của người gõ.
>   Chỉ số tạo qua OTP (`phoneVerified`) mới đăng nhập được. Số bị người khác gõ nhầm thì
>   người cầm SIM được tài khoản mới, số bị gỡ khỏi hồ sơ kia. Số đã xác thực bị khoá ở form
>   hồ sơ — đổi ở đó là mất đường vào.
> - **Google/Facebook gộp vào tài khoản cũ cùng email chỉ khi nhà cung cấp xác nhận email.**
>   Nếu tài khoản cũ chưa từng xác thực email thì **xoá mật khẩu và thu hồi phiên** của nó:
>   rất có thể ai đó đã đăng ký trước bằng email của chủ thật (chiếm trước tài khoản).
> - **OAuth có `state` trong cookie httpOnly** — callback không mang đúng cookie là bị từ chối,
>   nên không ép được người khác đăng nhập vào tài khoản của mình.
> - **Token không đi trên URL.** Callback OAuth trả một mã dùng một lần sống 60 giây, đặt
>   sau dấu `#` (không gửi lên server, không lọt vào log hay Referer); trang web đổi mã lấy
>   phiên qua `POST /auth/oauth/exchange`.
> - **Rate limit riêng cho từng loại:** gửi email 5 lần / 15 phút, gửi OTP 5 lần / giờ,
>   nhập OTP 10 lần sai / 15 phút — tách khỏi đăng nhập mật khẩu để nhập sai OTP không khoá
>   luôn đăng nhập thường.
>
> **Kiểm bằng HTTP thật trên Postgres tạm:** 37 bước cho email / quên mật khẩu / OTP /
> OAuth start, và 10 bước cho luồng Google đầy đủ (giả lập hai endpoint của Google) — gồm
> cả kịch bản chiếm trước tài khoản. Script không nằm trong repo vì cần CSDL; kịch bản tay
> nằm ở TEST_PLAN mục 5A.
>
> **Mọi tài khoản đều quản lý được cách đăng nhập của mình** (trang Hồ sơ):
> - **Đặt mật khẩu lần đầu** (`POST /auth/set-password`) cho tài khoản tạo bằng
>   Google/Facebook/OTP — thẻ Mật khẩu tự đổi thành "Đặt mật khẩu", không hỏi mật khẩu cũ.
>   Từ chối nếu tài khoản không có email hay số đã xác thực: mật khẩu không có gì đi kèm để
>   gõ vào ô đăng nhập thì vô dụng.
> - **Đăng nhập bằng số điện thoại + mật khẩu** — cần cho tài khoản OTP (không có email).
>   Chỉ số `phoneVerified`; số tự gõ vào hồ sơ không phải định danh đăng nhập.
> - **Liên kết / gỡ Google, Facebook** — thẻ "Tài khoản liên kết". Liên kết vào tài khoản
>   chưa có email thì tài khoản nhận luôn email đã được nhà cung cấp xác nhận (nếu chưa ai
>   dùng), nhờ đó mở được "Quên mật khẩu". Mỗi nhà cung cấp một tài khoản; Google đã gắn với
>   người khác thì từ chối.
> - **Không gỡ được đường vào cuối cùng** (`LAST_LOGIN_METHOD`): phải còn mật khẩu (kèm
>   email / số để gõ), số đã xác thực, hoặc nhà cung cấp khác.
> - **Mã liên kết đi bằng form POST, không trên URL.** Trình duyệt phải chuyển cả trang sang
>   Google nên không gửi được header đăng nhập; mã (sống 10 phút, dùng một lần, gắn đúng
>   người + đúng nhà cung cấp) thay cho header. Để trên URL thì mã nằm trong log truy cập, và
>   ai đọc được log là gắn được Google **của họ** vào tài khoản người khác. GET `/start` bỏ
>   qua tham số `link` hoàn toàn.
>
> Kiểm bằng HTTP thật: thêm 24 bước (đặt mật khẩu, đăng nhập SĐT, liên kết, liên kết trùng,
> dùng lại mã, gỡ đường vào cuối).
>
> **Trần đã biết:** đặt mật khẩu lần đầu chỉ cần phiên đang đăng nhập, không bắt đăng nhập
> lại — ai cầm được phiên của tài khoản chưa có mật khẩu thì đặt được mật khẩu cho nó. Thêm
> bước xác nhận lại (OTP / đăng nhập lại Google) nếu thấy cần.

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
- [x] 2.12 Điểm uy tín — _tự tính từ phiếu chấm đội ở các trận mình đã báo "Có đi";
      `apps/api/src/lib/reputation.ts`, trang hồ sơ hiện kèm "từ N trận"_

> **Công thức uy tín cá nhân (2.12).** Không thêm phiếu chấm riêng — SRS ghi "tự tính từ
> đánh giá", và bắt mỗi người chấm từng cầu thủ đối thủ thì chẳng ai chấm. Ba quy tắc:
>
> 1. **Chỉ tính trận mình báo "Có đi"** (`MatchAttendance.status = going`). Vắng mặt thì
>    không ăn theo điểm tốt của đội, cũng không gánh điểm xấu. Không báo gì = không tính.
> 2. **Mỗi trận gộp thành một điểm** = trung bình các phiếu đối thủ chấm đội mình trận đó.
>    Đối thủ 12 người chấm không nặng ký hơn đối thủ 5 người.
> 3. **Trung bình Bayes**: `(3×3 + tổng điểm các trận) / (3 + số trận)`. Một phiếu 1★ cay cú
>    ở trận đầu chỉ kéo về 2.5 chứ không phải 1.0; một phiếu 5★ nhờ vả chỉ lên 3.5. Chơi 30
>    trận toàn 5★ thì được ~4.8 — càng nhiều trận, điểm càng là của chính mình.
>
> Điểm từng trận nằm trong sổ `PlayerMatchScore` (một dòng mỗi người mỗi trận); uy tín tính
> từ sổ này, không phải từ `Rating`.
>
> 0 nghĩa là "chưa có trận nào được chấm" (hiện là "—"), cùng quy ước với `Team.reputation`.
>
> **Hai lỗ hổng phải bịt để công thức đứng vững:**
> - **Khoá điểm danh sau giờ đá** (`MATCH_PLAYED`). Không có dòng này thì ai cũng xem phiếu
>   chấm xong rồi mới chọn "Có đi" (được 5★) hoặc "Không đi" (bị 1★).
> - **`MatchAttendance.teamId`** lưu đội mình ra sân cho. Rời đội thì `TeamMember` mất, mà
>   lịch sử trận vẫn phải biết mình đá cho ai. Migration suy cột này từ thành viên hiện tại;
>   dòng của người đã rời cả hai đội bị xoá (vốn đã bị `summarizeAttendance` bỏ qua), rồi tính
>   lại uy tín cho mọi người từ dữ liệu cũ.
>
> - **Giải tán đội không xoá được lịch sử.** Giải tán là xoá cứng: `Match`, `Rating`,
>   `MatchAttendance` đi theo dây chuyền. Nếu uy tín tính thẳng từ `Rating`, thành viên đội
>   giải tán lẫn đối thủ của họ sẽ mất trận đã đá — và captain giải tán đội là xoá sạch phiếu
>   1★ cho cả đội. Vì thế `PlayerMatchScore.matchId` **cố ý không có khoá ngoại**: trận mất,
>   sổ vẫn còn. Chọn cách này thay vì xoá mềm đội vì xoá mềm phải thêm bộ lọc ở ~19 truy vấn.
>
> - **Uy tín đội cũng thế** — sổ `TeamMatchScore` (cùng lý do, cùng cách không khoá ngoại tới
>   trận). Đổi luôn cách tính: trước là trung bình **mọi phiếu**, giờ là trung bình **điểm các
>   trận**, nên đối thủ đông người không át đối thủ ít người. Migration tính lại cho dữ liệu cũ
>   — số uy tín đội hiện có sẽ nhích (ví dụ trận A 2 phiếu 5★ + trận B 1 phiếu 2★: 4.0 → 3.5).
>   Đội **không** dùng Bayes: bộ lọc "từ 3.0 / 4.0 / 4.5 sao" ở FR-005.2 đang dựa vào thang cũ.
>
> **Trần đã biết:** chưa có trọng số theo thời gian — trận 2 năm
> trước nặng ngang trận tuần trước; thêm khi có người phàn nàn.

> **Chặn:** 2.3 cần chỗ lưu file.

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
- [x] 4.4 Sân đang có trận / cần tìm đội — _mục "Sân đang cần đội" trên Trang chủ, đọc từ
      khung có cờ `openForTeams`_
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
- [x] 6.8 Đội mời người chơi — _model `TeamInvite`, mời từ trang "Tìm đội", người nhận
      bấm đồng ý mới vào đội_
- [x] 6.9 Lọc theo khu vực, vị trí, trình độ

## FR-007 — Quản lý đội

- [x] 7.1 Tạo đội
- [x] 7.2 Sửa thông tin đội
- [x] 7.3 Thêm / xoá thành viên
- [x] 7.4 Phân quyền captain / co-captain / member — _có kiểm tra quyền đầy đủ, chuyển captain atomic_
- [x] 7.5 Xem danh sách thành viên
- [~] 7.6 Lịch sử trận đấu — _`GET /matches/my` trả theo người dùng, chưa có theo từng đội_
- [x] 7.7 Điểm uy tín đội — _trung bình điểm các trận trong sổ `TeamMatchScore` (mỗi trận =
      trung bình phiếu trận đó), cập nhật ngay khi có người chấm; đối thủ giải tán không mất phiếu_
- [x] 7.8 Giải tán đội

## FR-008 — Quản lý sân bãi (Business)

- [x] 8.1 Đăng ký tài khoản doanh nghiệp — _chọn "Chủ sân" ngay ở form đăng ký; enum
      `UserRole.business` có sẵn từ đầu, giờ mới có đường vào_
- [x] 8.2 Đăng thông tin sân — _model `Venue`, ảnh bìa nén còn 1600px_
- [x] 8.3 Quản lý lịch sân trống — _model `VenueSlot`, chặn khung chồng lấn_
- [x] 8.4 Cập nhật giá thuê — _giá niêm yết ở sân, giá thật ở từng khung_
- [x] 8.5 Nhận yêu cầu đặt sân — _model `Booking`, nhiều người xin chung một khung được_
- [x] 8.6 Xác nhận / từ chối đặt sân — _xác nhận một đơn là tự động từ chối các đơn còn lại_
- [x] 8.7 Đăng bài tìm đội cho sân trống — _cờ `openForTeams` trên khung, không thêm model_
- [x] 8.8 Người dùng đánh giá sân — _model `VenueReview`, chỉ người đã thuê thật mới chấm_
- [x] 8.9 Thống kê đặt sân — _`GET /venues/:id/stats`, kèm doanh thu dự kiến_

> **8.7 không có "bài đăng".** SRS ghi "đăng bài tìm đội cho sân trống", nhưng một bài đăng
> riêng sẽ là bản sao của khung giờ đã có, cộng thêm việc phải giữ hai thứ đồng bộ. Thay vào
> đó là một cờ `openForTeams` ngay trên khung: bật lên thì khung hiện ở mục "Sân đang cần đội"
> trên Trang chủ (FR-004.4), tắt đi thì biến mất. Một nguồn sự thật, không có gì để lệch.
>
> **Giá khung không đổi theo giá niêm yết.** Sửa giá sân chỉ ảnh hưởng khung mở sau đó — khung
> đã đăng là một lời chào giá, sửa ngược lại sau lưng người đang xem là chuyện khác hẳn.
>
> **Khung chồng lấn bị chặn ở tầng ứng dụng.** Postgres không có ràng buộc nào diễn tả được
> "hai khoảng thời gian giao nhau" (cần `EXCLUDE USING gist`, phải bật extension), nên phép
> kiểm nằm trong route tạo khung. Hai request tạo khung cùng lúc trên cùng một sân về lý
> thuyết vẫn lọt — chủ sân tự thao tác trên sân của mình nên xác suất thực tế bằng 0.
>
> **Chưa có thanh toán.** SRS không nhắc tới, và "doanh thu dự kiến" ở phần thống kê chỉ là
> tổng giá các khung đã xác nhận, không phải tiền đã thu.

## FR-009 — Thông báo

- [x] 9.1 Thông báo thách đấu mới
- [x] 9.2 Thông báo duyệt/từ chối đơn
- [x] 9.3 Thông báo có người xin gia nhập
- [ ] 9.4 Nhắc trận sắp diễn ra — _cần bộ hẹn giờ chạy nền_
- [x] 9.5 Thông báo khi được đánh giá — _`rating_received`, chỉ báo lần chấm đầu để sửa điểm
      không làm phiền lại_
- [ ] 9.6 Web Push — _ưu tiên Thấp_

> Hiện thông báo lấy bằng polling 30 giây. Socket.IO đã gỡ vì không dùng tới.
>
> Ngoài 6 mục trên còn 3 loại `team_invite_*` (từ 6.8) và 4 loại `booking_*` (từ FR-008) —
> không phải mục SRS riêng nên không tính vào bảng đếm.
>
> Ngoài 6 mục trên còn 3 loại `team_invite_received` / `_accepted` / `_rejected` sinh ra từ
> 6.8 — không phải mục SRS riêng nên không tính vào bảng đếm.

## FR-010 — Quản trị hệ thống

- [x] 10.1 Dashboard thống kê — _`GET /admin/stats`, 11 con số đếm thẳng từ CSDL_
- [x] 10.2 CRUD người dùng — _tìm/lọc, đổi vai trò, đổi tên, xoá. **Không** có tạo tài khoản:
      đã có luồng đăng ký, admin tạo hộ là thêm một đường vào hệ thống không ai cần_
- [x] 10.3 Duyệt bài đăng — _hậu kiểm, xem ghi chú bên dưới_
- [x] 10.4 Quản lý danh mục môn — _admin thêm/sửa/xoá môn và đặt ảnh nền cho từng môn_
- [x] 10.5 Quản lý sân đăng ký — _tab Sân bãi trong `/admin`: tìm, đình chỉ, mở lại_
- [x] 10.6 Xử lý báo cáo — _duyệt / bỏ qua kèm ghi chú; mỗi báo cáo chỉ kết luận một lần_
- [x] 10.7 Khoá / mở khoá tài khoản — _`User.disabledAt`, khoá là thu hồi sạch refresh token_
- [x] 10.8 Xem log hoạt động — _model `AdminAction`, ghi mọi thao tác quản trị làm đổi dữ liệu_

> **Duyệt bài là hậu kiểm, không phải tiền kiểm.** Bài vẫn lên thẳng như trước; admin gỡ bằng
> cách đặt lại `status`. Chọn thế vì mọi danh sách công khai đã lọc `status: 'open'` sẵn — gỡ
> bài là bài biến mất ngay mà không phải sửa một truy vấn nào, không thêm cột `hidden`, và gỡ
> nhầm thì khôi phục lại được. Muốn tiền kiểm thì phải đổi mặc định của cả ba loại bài và
> dựng thêm hàng đợi chờ duyệt — tách thành mục riêng nếu thật sự cần.
>
> **Khoá tài khoản có trần 15 phút.** Khoá xong refresh token bị thu hồi hết, nhưng access
> token người đó đang cầm vẫn sống tới lúc hết hạn vì `requireAuth` không đọc CSDL. Muốn cắt
> tức thì phải thêm một lượt đọc CSDL vào `requireAuth` — đổi lấy một truy vấn cho **mọi**
> request.
>
> Trang quản trị ở `/admin` (tổng quan · người dùng · bài đăng · báo cáo · môn & ảnh nền ·
> nhật ký), vào bằng nút "Quản trị" trên header Trang chủ — chỉ admin thấy nút này.

---

## Ngoài SRS — đã làm thêm

Những thứ Idea.md không liệt kê nhưng đã có trong code. Ghi lại để lần sau
không dựng lại từ đầu.

- [x] **Trang chủ cá nhân hoá** — `GET /dashboard` gộp bốn truy vấn (trận kế tiếp,
      đơn xin vào đội đang chờ, lời thách đấu đang chờ, lời mời vào đội) vào một
      lượt gọi vì cả bốn đều xuất phát từ cùng danh sách đội của người dùng. Chỉ
      captain/phó thấy phần đơn và thách đấu — khớp với ràng buộc quyền ở chỗ duyệt.
      Riêng lời mời truy vấn ngoài nhánh "chưa có đội nào", vì người hay được mời
      chính là người chưa thuộc đội nào cả.
- [x] **Điểm danh trận** — model `MatchAttendance` (`going` / `not_going`,
      unique theo `matchId + userId`), `POST /matches/:id/attendance`. "Chưa trả
      lời" tính bằng sĩ số đội trừ số người đã trả lời nên thêm/bớt thành viên là
      con số tự đúng.
- [x] **Danh mục môn là dữ liệu** — `Sport` chuyển từ enum Postgres sang bảng,
      admin thêm/sửa/xoá môn kèm icon và ảnh nền (FR-010.4).
- [x] **`PageShell` / `AdminShell`** — khung header + tiêu đề dùng chung. Rút ra khi trang thứ
      tư chép lại đúng khối đó. Trang chủ và trang giới thiệu cố ý không dùng — hai trang đó có
      bố cục riêng.
- [x] **`formatVnd()` / `formatSlotRange()`** — `apps/web/src/lib/format.ts`. Tiền và khung giờ
      qua `Intl`, không tự nối chuỗi.
- [x] **`paginate()` / `cursorArgs()`** — `apps/api/src/lib/paginate.ts`. Đuôi phân trang
      cursor trước đó chép tay ở 4 route; code quản trị mới dùng helper này.
- [x] **`apiMessage()`** — `apps/web/src/lib/api.ts`. Trước đó cùng một đoạn bóc message lỗi
      axios nằm rải rác 15 file dưới 3 cái tên khác nhau.
- [x] **Ponytail (công cụ, không phải tính năng)** — plugin Claude Code "lazy senior"
      cài ở phạm vi project, khai báo trong `.claude/settings.json` nên đi kèm repo.
      Bắt chạy thang quyết định (YAGNI → dùng lại → stdlib → nền tảng → dep sẵn có →
      một dòng) trước khi viết code mới. Lệnh: `/ponytail [lite|full|ultra|off]`,
      `/ponytail-review`, `/ponytail-audit`.

> `MatchAttendance` là nền sẵn cho 9.4 (nhắc trận sắp diễn ra): đã biết ai đi,
> chỉ còn thiếu bộ hẹn giờ.

---

## Hạ tầng phải dựng trước

Nhiều mục trên bị chặn bởi cùng một thứ. Làm hạ tầng trước sẽ mở khoá nhiều FR cùng lúc.

| Hạ tầng                           | Mở khoá                        | Ghi chú                                                    |
| --------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| ~~Gửi email~~                     | ~~1.6, 1.7~~                   | Xong 2026-09-30 — Resend qua `fetch`, dev in ra terminal   |
| Lưu file / ảnh                    | 2.3, 8.2                       | Local disk cho đồ án là đủ                                 |
| ~~Model `Rating`~~                | ~~5.10, 7.7, 9.5, 2.12~~       | Xong 2026-08-21; 2.12 xong 2026-09-30                      |
| Bộ hẹn giờ chạy nền               | 9.4                            | Cũng dùng được để dọn bài hết hạn                          |
| Luồng "kết thúc trận"             | 7.6, mốc chấm điểm chặt hơn    | Nhỏ — một cột trạng thái + nút cho captain                 |
| ~~Middleware `requireRole('admin')`~~ | ~~Toàn bộ FR-010~~         | Xong — chỉ còn 10.5 chờ FR-008                             |
| ~~Nhóm model sân bãi~~            | ~~FR-008, 4.4, 10.5~~          | Xong 2026-08-22 — `Venue`, `VenueSlot`, `Booking`, `VenueReview` |

## Nợ kỹ thuật (không thuộc FR)

- [x] ~~Web chưa code-split~~ — mỗi trang một chunk qua `React.lazy`, chunk vào cổng còn
      **315 KB / 98,5 KB gzip** (trước: 614 KB một cục). Không thêm dependency nào; Vite tự
      tách vì `import()` động là điểm cắt.
- [~] Bộ test đầu tiên — **84 test** chạy bằng `node --test` sẵn có trong Node, `pnpm test`,
      không cần CSDL. Xem mục "Bộ test hiện phủ gì" bên dưới.
- [ ] Chưa có test nào chạm CSDL hay HTTP — mọi luồng nhiều bước (đặt sân, duyệt đơn, khoá
      tài khoản) vẫn chỉ kiểm bằng tay theo `TEST_PLAN.md`
- [ ] Refresh token lưu `localStorage`, TTL 30 ngày
- [ ] Rate limit dùng MemoryStore — sai số khi chạy nhiều instance
- [ ] Repo chưa sạch Prettier toàn bộ
- [ ] Còn 4 bản chép tay của đuôi phân trang cursor và 12 chỗ bóc message lỗi axios inline —
      helper dùng chung đã có (`paginate()`, `apiMessage()`), chỉ còn việc thay thế

### Bộ test hiện phủ gì

Chọn theo một tiêu chí: logic thuần, không cần CSDL, mà sai thì hỏng lặng lẽ.

| Chỗ | Vì sao đáng test |
| --- | --- |
| `paginate()` / `cursorArgs()` | 8 endpoint dùng chung; lệch một đơn vị là mất hoặc lặp bản ghi |
| `uploadedFileName()` | Đường path traversal — chỗ duy nhất quyết định file nào bị xoá |
| `playerReputation()` | Công thức uy tín cá nhân; sai là xếp hạng người chơi sai mà không ai thấy |
| `ttlToMs()` | Bộ phân tích; TTL sai cú pháp mà vẫn khởi động được là phiên sai âm thầm |
| `hasBeenPlayed()` | Mốc mở phần chấm điểm, 5 nhánh |
| Schema `venue` / `auth` / `admin` | Xác thực ở biên tin cậy: giá, giờ, giới hạn trang, ranh giới vai trò |

> **Test đầu tiên bắt được một lỗi thật.** `uploadedFileName` cắt đường dẫn bằng
> `path.posix.basename`, chỉ tách ở dấu `/`. Chuỗi `"/uploads/..\..\windows\system32"` đi
> qua nguyên vẹn, và trên Windows `path.join` lại coi `\` là dấu phân cách — tức là thoát
> được ra ngoài `UPLOAD_DIR`. Đã chặn mọi tên còn dấu phân cách.
>
> **Hai chỗ phải tách ra mới test được**, cả hai đều đáng tách vì lý do riêng: `ttlToMs` rời
> `jwt.ts` (file đó nạp `config/env.ts`, mà file đó `process.exit(1)` khi thiếu `.env` — một
> hàm phân tích chuỗi không nên đòi cả file cấu hình mới chạy), và `uploadedFileName` rời
> `uploads.ts` (file đó `mkdirSync` ngay lúc nạp).
>
> **Test nằm trong `tsconfig`** nên eslint và `tsc` phủ luôn chúng; đổi lại vài file
> `.test.js` nằm trong `dist` mà không ai import. Rẻ hơn nhiều so với dựng một
> `tsconfig.build.json` riêng cho mỗi package.

## Thứ tự đề xuất

Tám nhóm đã xong 100%. Ba mục còn lại, xếp theo thứ tự nên làm:

1. **Luồng kết thúc trận + lịch sử theo đội** (7.6) — nhỏ, và làm mốc chấm điểm chặt hơn thay
   vì chỉ dựa vào "đã qua giờ đá".
2. **Bộ hẹn giờ chạy nền** (9.4) — dữ liệu điểm danh đã có; cũng dùng lại được để dọn bài
   tuyển/tìm trận hết hạn **và nhắc chủ sân đơn đặt sắp tới giờ**.
3. **Web Push** (9.6) — ưu tiên Thấp, để cuối.

Hai món nợ kỹ thuật lớn nhất đã trả xong (code-split, bộ test đầu tiên). Món tiếp theo đáng
chen vào giữa danh sách trên: **test chạm CSDL cho luồng đặt sân** — đó là chỗ nhiều nhánh
trạng thái nhất trong repo (open → pending → confirmed, kèm nhánh tự động từ chối các đơn còn
lại và nhánh huỷ mở khung ra lại), và hiện chỉ được kiểm bằng tay.

## Cách cập nhật file này

Làm xong việc gì thì sửa ngay ở đây: đổi `[ ]` / `[~]` thành `[x]`, cập nhật
bảng Tổng quan, và viết lại phần "Thứ tự đề xuất" nếu thứ tự đã đổi. Việc nằm
ngoài Idea.md thì ghi vào mục "Ngoài SRS — đã làm thêm".
