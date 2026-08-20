# Ảnh cho trang giới thiệu

Thả **5 ảnh gốc** vào thư mục này, đặt đúng tên (phần mở rộng `.jpg` hay `.png` đều được):

| Tên file         | Môn         |
| ---------------- | ----------- |
| `football.jpg`   | Bóng đá     |
| `basketball.jpg` | Bóng rổ     |
| `badminton.jpg`  | Cầu lông    |
| `volleyball.jpg` | Bóng chuyền |
| `tennis.jpg`     | Tennis      |

## Yêu cầu ảnh

- **Tỉ lệ ngang**, 16:9 hoặc 3:2. Bề ngang tối thiểu 2560px (4K càng tốt — sẽ được thu nhỏ lại).
- **Chủ thể lệch phải.** Nửa trái sẽ bị chữ tiêu đề đè lên, cần khoảng trống hoặc vùng ít chi tiết ở đó.
- **Ảnh động tác**, không phải ảnh tĩnh chụp quả bóng. Người đang chơi, đang chạy, đang ăn mừng.
- Bối cảnh Việt Nam thì tốt nhất — sân phủi, sân 7, nhà thi đấu quen thuộc. Ảnh stock kiểu sân vận động châu Âu sẽ lệch tông với nội dung.
- Ảnh hơi tối hoặc tương phản cao sẽ hợp hơn, vì trên ảnh còn phủ lớp xanh thông.

## Ảnh gốc không nằm trong git

`*.png` / `*.jpg` trong thư mục này bị `.gitignore` bỏ qua — mỗi tấm ~2MB, để trong
git là repo phình vĩnh viễn. **Chỉ bản `.webp` dẫn xuất được commit**, vì
`src/lib/sport-images.ts` import trực tiếp: thiếu chúng là build vỡ.

Hệ quả: người clone mới **không có ảnh gốc**. Muốn nén lại với thông số khác thì
phải xin lại ảnh gốc từ người giữ. Nếu chỉ cần đổi ảnh thì không cần đụng tới đây —
dùng trang quản trị (mục dưới).

## Đổi ảnh mà không cần build lại

Đăng nhập tài khoản admin rồi vào `/admin/landing`. Ảnh tải lên ở đó được server
cắt thành ba bản y hệt quy trình dưới đây, lưu vào `apps/api/uploads/` và ghi đè
ảnh mặc định lúc chạy. Cách này không cần chạm vào mã nguồn.

Thư mục này chỉ còn là **ảnh mặc định dự phòng** — dùng khi CSDL chưa có bản ghi nào.

## Trạng thái hiện tại

Đang dùng **ảnh mẫu sinh bằng chương trình** (gradient theo màu môn + hình học sân).
Bố cục và luồng chuyển ảnh đã là thật — chỉ thiếu ảnh chụp.

File đang được dùng:

```
football-1920.webp    football-960.webp
basketball-1920.webp  basketball-960.webp
badminton-1920.webp   badminton-960.webp
volleyball-1920.webp  volleyball-960.webp
tennis-1920.webp      tennis-960.webp
```

Thả ảnh gốc `<môn>.jpg` vào đây rồi báo, các file `-1920.webp` / `-960.webp` sẽ được
sinh lại đè lên. **Không phải sửa dòng code nào** — `src/lib/sport-images.ts` trỏ theo tên cố định.

## Ảnh gốc để nguyên, không cần xử lý gì

Quy trình xử lý sẽ:

1. Thu nhỏ về 1920px và 960px (hai cỡ cho màn hình thường và mobile)
2. Chuyển sang WebP, chất lượng ~78
3. Sinh `srcset` để trình duyệt tự chọn cỡ
4. Chỉ tải sẵn ảnh đầu tiên, bốn ảnh còn lại tải lười

Ảnh gốc 4K **không** đưa vào bundle — chỉ bản đã nén mới được dùng.
