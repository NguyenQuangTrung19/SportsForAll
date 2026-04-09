# 📋 SRS - Software Requirements Specification
# SportsForAll (SFA)

**Phiên bản:** 1.0  
**Ngày tạo:** 2026-03-22  
**Tác giả:** SFA Development Team  
**Trạng thái:** Draft  

---

## 1. Giới thiệu

### 1.1 Mục đích tài liệu
Tài liệu SRS này mô tả chi tiết các yêu cầu chức năng và phi chức năng của hệ thống **SportsForAll** - nền tảng kết nối cộng đồng thể thao trực tuyến.

### 1.2 Phạm vi hệ thống
SportsForAll là ứng dụng web cho phép:
- Người chơi thể thao kết nối, tìm đồng đội và đối thủ
- Đội nhóm tuyển thành viên và tìm đối thủ
- Chủ sân bãi quản lý lịch sân và kết nối với người thuê
- Admin quản trị toàn bộ hệ thống

### 1.3 Thuật ngữ & Viết tắt

| Thuật ngữ | Định nghĩa |
|---|---|
| SFA | SportsForAll - tên viết tắt hệ thống |
| User | Người dùng thông thường (cá nhân/đội) |
| Business | Người dùng doanh nghiệp (chủ sân) |
| Admin | Quản trị viên hệ thống |
| Match | Trận đấu / Lượt thách đấu |
| Team | Đội / Nhóm thể thao |
| Venue | Sân bãi / Địa điểm thi đấu |
| Rating | Điểm uy tín / Đánh giá |

### 1.4 Tài liệu tham chiếu
- PROJECT_OVERVIEW.md
- ARCHITECTURE.md
- DATABASE_DESIGN.md
- API_DESIGN.md
- USER_STORIES.md

---

## 2. Mô tả tổng thể hệ thống

### 2.1 Bối cảnh sản phẩm
SFA là hệ thống web-based, hoạt động trên trình duyệt, responsive cho cả desktop và mobile. Hệ thống sử dụng kiến trúc Client-Server với REST API và WebSocket cho tính năng real-time.

### 2.2 Các bên liên quan (Stakeholders)

```
┌─────────────────────────────────────────────────────┐
│                   SportsForAll                       │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Người   │  │  Chủ sân │  │  Admin hệ thống  │  │
│  │  chơi    │  │  (Business│  │                  │  │
│  │  (User)  │  │   User)  │  │                  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Firebase │  │ Database │  │ External APIs    │  │
│  │ Auth     │  │ Server   │  │ (Maps, Payment)  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 2.3 Vai trò người dùng

#### 2.3.1 Người dùng thông thường (User)
- Đăng ký / Đăng nhập
- Quản lý profile cá nhân
- Chọn môn thể thao yêu thích
- Tìm đồng đội, tìm đối thủ
- Tạo/tham gia đội
- Đánh giá sau trận đấu
- Nhận thông báo

#### 2.3.2 Doanh nghiệp (Business User) 
*Kế thừa toàn bộ quyền của User, bổ sung thêm:*
- Đăng ký tài khoản doanh nghiệp
- Đăng thông tin sân bãi
- Quản lý lịch sân trống
- Tìm người thuê sân
- Nhận đặt sân từ người dùng

#### 2.3.3 Quản trị viên (Admin)
- Quản lý tất cả người dùng
- Duyệt/từ chối bài đăng
- Quản lý danh mục môn thể thao
- Xem thống kê & báo cáo
- Xử lý khiếu nại
- Quản lý nội dung hệ thống

---

## 3. Yêu cầu chức năng (Functional Requirements)

### FR-001: Đăng ký & Xác thực

| ID | Yêu cầu | Mức ưu tiên |
|---|---|---|
| FR-001.1 | Người dùng đăng ký bằng Email/Gmail (OAuth 2.0) | **Cao** |
| FR-001.2 | Người dùng đăng ký bằng Số điện thoại (OTP) | **Cao** |
| FR-001.3 | Đăng nhập bằng Email/Password | **Cao** |
| FR-001.4 | Đăng nhập bằng Google OAuth | **Cao** |
| FR-001.5 | Đăng nhập bằng Facebook OAuth | Trung bình |
| FR-001.6 | Quên mật khẩu / Đặt lại mật khẩu | **Cao** |
| FR-001.7 | Xác thực email sau đăng ký | **Cao** |
| FR-001.8 | Đăng xuất | **Cao** |
| FR-001.9 | Phiên đăng nhập tự động (Remember me) | Trung bình |

**Luồng đăng ký:**
```
Người dùng --> Chọn phương thức đăng ký
    ├── Email/Password --> Nhập thông tin --> Xác thực Email --> Chọn môn --> Điền profile --> Hoàn tất
    ├── Google OAuth --> Xác thực Google --> Chọn môn --> Điền profile --> Hoàn tất
    └── Số điện thoại --> Nhập SĐT --> Nhập OTP --> Chọn môn --> Điền profile --> Hoàn tất
```

---

### FR-002: Quản lý hồ sơ cá nhân (Profile)

| ID | Yêu cầu | Mức ưu tiên |
|---|---|---|
| FR-002.1 | Hiển thị thông tin profile đầy đủ | **Cao** |
| FR-002.2 | Chỉnh sửa tên hiển thị | **Cao** |
| FR-002.3 | Upload/thay đổi ảnh đại diện | **Cao** |
| FR-002.4 | Chọn môn thể thao yêu thích (≥1) | **Cao** |
| FR-002.5 | Chọn vị trí chơi cho mỗi môn | **Cao** |
| FR-002.6 | Chọn trình độ cho mỗi môn (Mới chơi / Nghiệp dư / Trung bình / Khá / Chuyên nghiệp) | **Cao** |
| FR-002.7 | Nhập tuổi / Năm sinh | **Cao** |
| FR-002.8 | Nhập ghi chú / mô tả bản thân | Trung bình |
| FR-002.9 | Chọn khu vực sinh sống | **Cao** |
| FR-002.10 | Thay đổi mật khẩu | **Cao** |
| FR-002.11 | Thay đổi số điện thoại | Trung bình |
| FR-002.12 | Điểm uy tín (tự tính từ đánh giá) | **Cao** |

**Chi tiết trình độ theo môn:**

| Trình độ | Mô tả |
|---|---|
| ⭐ Mới chơi | Mới bắt đầu, chưa biết nhiều kỹ thuật |
| ⭐⭐ Nghiệp dư | Biết cơ bản, chơi vui |
| ⭐⭐⭐ Trung bình | Có kỹ thuật, chơi thường xuyên |
| ⭐⭐⭐⭐ Khá | Kỹ thuật tốt, có kinh nghiệm thi đấu |
| ⭐⭐⭐⭐⭐ Chuyên nghiệp | Thi đấu chuyên nghiệp, câu lạc bộ |

---

### FR-003: Chọn môn thể thao & Multi-theme

| ID | Yêu cầu | Mức ưu tiên |
|---|---|---|
| FR-003.1 | Hiển thị danh sách các môn thể thao | **Cao** |
| FR-003.2 | Mỗi môn có theme color riêng biệt | **Cao** |
| FR-003.3 | Chỉ xem được 1 môn tại 1 thời điểm | **Cao** |
| FR-003.4 | Chuyển đổi giữa các môn bằng sport selector | **Cao** |
| FR-003.5 | Giao diện thay đổi theme khi chuyển môn | **Cao** |
| FR-003.6 | Lưu môn thể thao cuối cùng người dùng xem | Trung bình |

**Mô tả chi tiết:**
- Khi chọn ⚽ Bóng đá → Toàn bộ giao diện chuyển theme xanh lá (#00C853)
- Khi chọn 🏀 Bóng rổ → Toàn bộ giao diện chuyển theme cam (#FF6D00)
- Dữ liệu hiển thị chỉ thuộc môn đang chọn

---

### FR-004: Trang chủ (Dashboard)

| ID | Yêu cầu | Mức ưu tiên |
|---|---|---|
| FR-004.1 | Hiển thị danh sách đội đang tuyển thành viên | **Cao** |
| FR-004.2 | Hiển thị danh sách đội đang tìm đối thủ | **Cao** |
| FR-004.3 | Hiển thị danh sách cá nhân đang tìm đội | **Cao** |
| FR-004.4 | Hiển thị sân đang có trận / cần tìm đội | **Cao** |
| FR-004.5 | Hiển thị thông tin cá nhân nhanh (mini profile) | **Cao** |
| FR-004.6 | Bộ lọc theo khu vực | Trung bình |
| FR-004.7 | Sắp xếp theo thời gian / uy tín | Trung bình |
| FR-004.8 | Phân trang / Infinite scroll | Trung bình |
| FR-004.9 | Thông báo mới (notification badge) | **Cao** |

---

### FR-005: Tìm đối thủ

| ID | Yêu cầu | Mức ưu tiên |
|---|---|---|
| FR-005.1 | Hiển thị danh sách các đội đang tìm trận | **Cao** |
| FR-005.2 | Lọc theo uy tín (Rating) | **Cao** |
| FR-005.3 | Lọc theo khu vực / quận / huyện | **Cao** |
| FR-005.4 | Lọc theo sân cụ thể | **Cao** |
| FR-005.5 | Lọc theo thời gian (sáng/chiều/tối) | Trung bình |
| FR-005.6 | Lọc theo trình độ | Trung bình |
| FR-005.7 | Xem chi tiết thông tin đội đối thủ | **Cao** |
| FR-005.8 | Gửi lời thách đấu | **Cao** |
| FR-005.9 | Chấp nhận / Từ chối lời thách đấu | **Cao** |
| FR-005.10 | Đánh giá uy tín sau trận | **Cao** |
| FR-005.11 | Báo cáo đội vi phạm | Trung bình |

**Luồng tìm đối thủ:**
```
Đội A đăng bài "Tìm đối thủ" 
    --> Chọn thời gian, sân, trình độ mong muốn
    --> Đội B xem và gửi thách đấu
    --> Đội A chấp nhận/từ chối
    --> Nếu chấp nhận → Tạo trận đấu
    --> Sau trận → Đánh giá lẫn nhau
```

---

### FR-006: Tìm thành viên & Đồng đội

| ID | Yêu cầu | Mức ưu tiên |
|---|---|---|
| FR-006.1 | Đội đăng bài tuyển thành viên | **Cao** |
| FR-006.2 | Chỉ định vị trí cần tuyển | **Cao** |
| FR-006.3 | Chỉ định yêu cầu trình độ | Trung bình |
| FR-006.4 | Người chơi xem danh sách đội đang tuyển | **Cao** |
| FR-006.5 | Người chơi gửi đơn xin gia nhập | **Cao** |
| FR-006.6 | Đội duyệt / từ chối đơn xin gia nhập | **Cao** |
| FR-006.7 | Người chơi đăng bài "Tìm đội" | **Cao** |
| FR-006.8 | Đội mời người chơi tham gia | Trung bình |
| FR-006.9 | Lọc theo khu vực, vị trí, trình độ | **Cao** |

---

### FR-007: Quản lý đội (Team Management)

| ID | Yêu cầu | Mức ưu tiên |
|---|---|---|
| FR-007.1 | Tạo đội mới | **Cao** |
| FR-007.2 | Chỉnh sửa thông tin đội (tên, mô tả, logo) | **Cao** |
| FR-007.3 | Thêm/xóa thành viên | **Cao** |
| FR-007.4 | Phân quyền trong đội (Đội trưởng, Phó, Thành viên) | Trung bình |
| FR-007.5 | Xem danh sách thành viên | **Cao** |
| FR-007.6 | Lịch sử trận đấu của đội | Trung bình |
| FR-007.7 | Điểm uy tín đội (trung bình từ thành viên + đánh giá) | **Cao** |
| FR-007.8 | Giải tán đội | Thấp |

---

### FR-008: Quản lý sân bãi (Venue Management - Business)

| ID | Yêu cầu | Mức ưu tiên |
|---|---|---|
| FR-008.1 | Đăng ký tài khoản doanh nghiệp | **Cao** |
| FR-008.2 | Đăng thông tin sân (tên, địa chỉ, ảnh, mô tả) | **Cao** |
| FR-008.3 | Quản lý lịch sân trống | **Cao** |
| FR-008.4 | Cập nhật giá thuê sân | **Cao** |
| FR-008.5 | Nhận yêu cầu đặt sân | **Cao** |
| FR-008.6 | Xác nhận / Từ chối đặt sân | **Cao** |
| FR-008.7 | Đăng bài tìm đội cho sân trống | Trung bình |
| FR-008.8 | Người dùng đánh giá sân | **Cao** |
| FR-008.9 | Xem thống kê đặt sân | Trung bình |

---

### FR-009: Thông báo (Notifications)

| ID | Yêu cầu | Mức ưu tiên |
|---|---|---|
| FR-009.1 | Thông báo khi có lời thách đấu mới | **Cao** |
| FR-009.2 | Thông báo khi đơn gia nhập đội được duyệt/từ chối | **Cao** |
| FR-009.3 | Thông báo khi có thành viên mới xin gia nhập | **Cao** |
| FR-009.4 | Thông báo nhắc trận đấu sắp diễn ra | Trung bình |
| FR-009.5 | Thông báo khi được đánh giá | Trung bình |
| FR-009.6 | Push notification (Web Push API) | Thấp |

---

### FR-010: Quản trị hệ thống (Admin Panel)

| ID | Yêu cầu | Mức ưu tiên |
|---|---|---|
| FR-010.1 | Dashboard thống kê tổng quan | **Cao** |
| FR-010.2 | Quản lý danh sách người dùng (CRUD) | **Cao** |
| FR-010.3 | Duyệt bài đăng (tuyển thành viên, tìm đối thủ) | **Cao** |
| FR-010.4 | Quản lý danh mục môn thể thao | **Cao** |
| FR-010.5 | Quản lý sân bãi đăng ký | **Cao** |
| FR-010.6 | Xử lý báo cáo / khiếu nại | Trung bình |
| FR-010.7 | Khóa / mở khóa tài khoản | **Cao** |
| FR-010.8 | Xem log hoạt động | Thấp |

---

## 4. Yêu cầu phi chức năng (Non-Functional Requirements)

### NFR-001: Hiệu năng (Performance)

| ID | Yêu cầu | Chỉ tiêu |
|---|---|---|
| NFR-001.1 | Thời gian tải trang | < 3 giây |
| NFR-001.2 | Thời gian phản hồi API | < 500ms |
| NFR-001.3 | Hỗ trợ người dùng đồng thời | ≥ 1,000 |
| NFR-001.4 | Uptime | ≥ 99.5% |

### NFR-002: Bảo mật (Security)

| ID | Yêu cầu |
|---|---|
| NFR-002.1 | Mã hóa mật khẩu (bcrypt / argon2) |
| NFR-002.2 | HTTPS bắt buộc |
| NFR-002.3 | JWT Token với refresh token |
| NFR-002.4 | Rate limiting API |
| NFR-002.5 | Input validation & sanitization |
| NFR-002.6 | CORS policy |
| NFR-002.7 | SQL Injection prevention (Prisma ORM) |
| NFR-002.8 | XSS prevention |

### NFR-003: Khả năng mở rộng (Scalability)

| ID | Yêu cầu |
|---|---|
| NFR-003.1 | Kiến trúc modular, dễ thêm môn thể thao mới |
| NFR-003.2 | Database indexing cho tìm kiếm nhanh |
| NFR-003.3 | Caching (Redis) cho dữ liệu thường xuyên truy cập |
| NFR-003.4 | Pagination cho tất cả danh sách |

### NFR-004: Khả năng sử dụng (Usability)

| ID | Yêu cầu |
|---|---|
| NFR-004.1 | Responsive design (Mobile / Tablet / Desktop) |
| NFR-004.2 | Hỗ trợ tiếng Việt đầy đủ |
| NFR-004.3 | UI/UX thân thiện, trực quan |
| NFR-004.4 | Thời gian học sử dụng < 5 phút |
| NFR-004.5 | Hỗ trợ trình duyệt Chrome, Firefox, Safari, Edge |

### NFR-005: Tính sẵn sàng (Availability)

| ID | Yêu cầu |
|---|---|
| NFR-005.1 | Hệ thống hoạt động 24/7 |
| NFR-005.2 | Backup dữ liệu hàng ngày |
| NFR-005.3 | Disaster recovery plan |

---

## 5. Ràng buộc hệ thống (Constraints)

| # | Ràng buộc |
|---|---|
| 1 | Sử dụng JavaScript/TypeScript cho cả Frontend và Backend |
| 2 | Database quan hệ (PostgreSQL) |
| 3 | Tuân thủ GDPR / PDPA về bảo vệ dữ liệu cá nhân |
| 4 | API theo chuẩn RESTful |
| 5 | Responsive design bắt buộc |

---

## 6. Use Case Diagrams

### 6.1 Use Case tổng quát

```
                        ┌──────────────────────────────────────────┐
                        │          SportsForAll System              │
                        │                                           │
    ┌────────┐         │  ┌─────────────────────────────────────┐  │
    │  User  │────────►│  │  UC-001: Đăng ký / Đăng nhập       │  │
    │        │         │  │  UC-002: Quản lý Profile             │  │
    │        │         │  │  UC-003: Chọn môn thể thao          │  │
    │        │         │  │  UC-004: Xem Dashboard               │  │
    │        │         │  │  UC-005: Tìm đối thủ                │  │
    │        │         │  │  UC-006: Tìm đồng đội               │  │
    │        │         │  │  UC-007: Quản lý đội                │  │
    │        │         │  │  UC-008: Gửi/nhận thách đấu         │  │
    │        │         │  │  UC-009: Đánh giá                   │  │
    └────────┘         │  └─────────────────────────────────────┘  │
                        │                                           │
    ┌────────┐         │  ┌─────────────────────────────────────┐  │
    │Business│────────►│  │  UC-010: Đăng ký doanh nghiệp      │  │
    │  User  │         │  │  UC-011: Đăng sân bãi               │  │
    │        │         │  │  UC-012: Quản lý lịch sân           │  │
    │        │────────►│  │  UC-013: Nhận đặt sân               │  │
    └────────┘         │  │  + Tất cả UC của User               │  │
                        │  └─────────────────────────────────────┘  │
                        │                                           │
    ┌────────┐         │  ┌─────────────────────────────────────┐  │
    │ Admin  │────────►│  │  UC-014: Quản lý người dùng        │  │
    │        │         │  │  UC-015: Duyệt bài đăng            │  │
    │        │         │  │  UC-016: Quản lý môn thể thao      │  │
    │        │         │  │  UC-017: Xem thống kê              │  │
    │        │         │  │  UC-018: Xử lý khiếu nại           │  │
    └────────┘         │  └─────────────────────────────────────┘  │
                        └──────────────────────────────────────────┘
```

### 6.2 Activity Diagram - Tìm đối thủ

```
┌─────────────┐
│   Bắt đầu   │
└──────┬──────┘
       ▼
┌─────────────────┐
│ Chọn môn thể    │
│ thao             │
└──────┬──────────┘
       ▼
┌─────────────────┐
│ Đặt bộ lọc      │
│ (khu vực, uy    │
│ tín, sân, ...)  │
└──────┬──────────┘
       ▼
┌─────────────────┐
│ Xem danh sách   │
│ đội phù hợp     │
└──────┬──────────┘
       ▼
┌─────────────────┐    Không
│ Tìm thấy đội   │──────────► Quay lại đặt bộ lọc
│ phù hợp?        │
└──────┬──────────┘
       │ Có
       ▼
┌─────────────────┐
│ Gửi lời thách   │
│ đấu              │
└──────┬──────────┘
       ▼
┌─────────────────┐    Từ chối
│ Đội đối thủ     │──────────► Thông báo từ chối
│ phản hồi?       │
└──────┬──────────┘
       │ Chấp nhận
       ▼
┌─────────────────┐
│ Tạo trận đấu   │
│ (ngày, giờ, sân)│
└──────┬──────────┘
       ▼
┌─────────────────┐
│ Sau trận:        │
│ Đánh giá lẫn    │
│ nhau             │
└──────┬──────────┘
       ▼
┌─────────────┐
│   Kết thúc   │
└─────────────┘
```

### 6.3 Activity Diagram - Tuyển thành viên

```
┌─────────────┐
│   Bắt đầu   │
└──────┬──────┘
       ▼
┌────────────────────┐
│ Đội trưởng tạo    │
│ bài tuyển thành    │
│ viên                │
└──────┬─────────────┘
       ▼
┌────────────────────┐
│ Chọn vị trí cần   │
│ tuyển, trình độ    │
│ yêu cầu            │
└──────┬─────────────┘
       ▼
┌────────────────────┐
│ Bài đăng hiển thị │
│ trên Dashboard &   │
│ Trang tìm đồng đội│
└──────┬─────────────┘
       ▼
┌────────────────────┐
│ Người chơi xem    │
│ và gửi đơn ứng    │
│ tuyển               │
└──────┬─────────────┘
       ▼
┌────────────────────┐     Từ chối
│ Đội trưởng duyệt  │──────────► Thông báo cho người chơi
│ đơn ứng tuyển      │
└──────┬─────────────┘
       │ Chấp nhận
       ▼
┌────────────────────┐
│ Thêm vào đội,     │
│ thông báo cho      │
│ người chơi          │
└──────┬─────────────┘
       ▼
┌─────────────┐
│   Kết thúc   │
└─────────────┘
```

---

## 7. Ma trận truy xuất yêu cầu (Traceability Matrix)

| Use Case | Functional Req | NFR | Ưu tiên |
|---|---|---|---|
| UC-001: Đăng ký/Đăng nhập | FR-001 | NFR-002 | **Cao** |
| UC-002: Quản lý Profile | FR-002 | NFR-004 | **Cao** |
| UC-003: Chọn môn | FR-003 | NFR-004 | **Cao** |
| UC-004: Dashboard | FR-004 | NFR-001 | **Cao** |
| UC-005: Tìm đối thủ | FR-005 | NFR-001, NFR-003 | **Cao** |
| UC-006: Tìm đồng đội | FR-006 | NFR-001, NFR-003 | **Cao** |
| UC-007: Quản lý đội | FR-007 | NFR-004 | **Cao** |
| UC-008: Thách đấu | FR-005 | NFR-001, NFR-009 | **Cao** |
| UC-009: Đánh giá | FR-005.10 | NFR-004 | **Cao** |
| UC-010: Đăng ký DN | FR-008.1 | NFR-002 | **Cao** |
| UC-011: Đăng sân | FR-008.2 | NFR-004 | **Cao** |
| UC-012: Lịch sân | FR-008.3 | NFR-001 | **Cao** |
| UC-013: Đặt sân | FR-008.5-6 | NFR-001, NFR-009 | **Cao** |
| UC-014: QL người dùng | FR-010.2 | NFR-002 | **Cao** |
| UC-015: Duyệt bài | FR-010.3 | NFR-004 | **Cao** |
