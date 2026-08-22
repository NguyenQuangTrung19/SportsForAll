# DEPLOY — Đưa SportsForAll lên mạng

Từ máy local tới một đường link gửi được cho nhà tuyển dụng. Toàn bộ dùng gói miễn phí.

Chạy thử ở local: xem [RUNBOOK.md](./RUNBOOK.md).

## 0. Chọn chỗ đặt

| Phần        | Dịch vụ         | Vì sao chọn                                                          |
| ----------- | --------------- | -------------------------------------------------------------------- |
| PostgreSQL  | **Neon**        | Free tier không hết hạn. Postgres free của Render tự xoá sau 30 ngày. |
| API         | **Render**      | Web Service free, deploy thẳng từ GitHub, tự chạy lại khi push.       |
| Web         | **Vercel**      | Tối ưu cho Vite SPA, build từ monorepo được, CDN sẵn.                 |

Tổng chi phí: **0đ**. Đổi lại hai giới hạn phải biết trước — xem [mục 7](#7-ba-cạm-bẫy-của-repo-này).

**Thứ tự bắt buộc:** DB → API → Web → quay lại API sửa CORS. Web cần biết URL của API lúc
**build**, mà API lại cần biết URL của Web để mở CORS. Vòng lặp này gỡ ở [bước 4](#4-nối-hai-đầu-lại).

---

## 1. Tạo database trên Neon

1. Đăng ký ở [neon.tech](https://neon.tech) bằng chính tài khoản GitHub.
2. **Create project** → đặt tên `sportsforall`, chọn region **Singapore** (gần VN nhất).
3. Vào tab **Connection string**, bật **Connection pooling**, copy chuỗi dạng:

   ```
   postgresql://user:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

Giữ chuỗi này lại, các bước sau đều cần. Đây là `DATABASE_URL`.

> **Phải bật pooling.** Render free khởi động lại liên tục, mỗi lần Prisma mở một loạt
> kết nối mới. Không pooling thì Neon chạm trần kết nối và API trả `500` ngẫu nhiên.

---

## 2. Deploy API lên Render

### 2.1 Sinh khoá JWT

`env.ts` bắt secret tối thiểu 16 ký tự, sai là API thoát ngay lúc khởi động. Chạy hai lần
để lấy hai chuỗi **khác nhau**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.2 Tạo service

[render.com](https://render.com) → **New** → **Web Service** → chọn repo `SportsForAll`.

| Ô                  | Điền                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Language**       | `Node`                                                                                                                                     |
| **Region**         | `Singapore`                                                                                                                                |
| **Branch**         | `main`                                                                                                                                     |
| **Root Directory** | _(để trống — build cần cả monorepo)_                                                                                                       |
| **Build Command**  | `corepack enable && pnpm install && pnpm build:shared && pnpm --filter @sfa/api db:generate && pnpm --filter @sfa/api build && pnpm --filter @sfa/api exec prisma migrate deploy` |
| **Start Command**  | `pnpm --filter @sfa/api start`                                                                                                             |
| **Instance Type**  | `Free`                                                                                                                                     |

Ba chi tiết trong Build Command dễ bỏ sót:

- `pnpm build:shared` — `@sfa/shared` phải biên dịch ra `dist/` trước, vì API `import` từ đó.
- `db:generate` — repo không có `postinstall`, không tự sinh Prisma Client.
- `prisma migrate deploy` — **không** phải `migrate dev`. Bản `dev` sẽ hỏi tương tác và
  có thể xoá dữ liệu; trên máy chủ nó treo luôn.

`Start Command` chạy qua `--filter` chứ không phải `node apps/api/dist/index.js`, để thư mục
làm việc là `apps/api/`. Ảnh upload được lưu theo `process.cwd()`, chạy sai chỗ là ảnh rơi
vào thư mục khác.

### 2.3 Điền biến môi trường

Mục **Environment** → **Add Environment Variable**:

| Key                  | Value                                                     |
| -------------------- | --------------------------------------------------------- |
| `NODE_VERSION`       | `20`                                                      |
| `NODE_ENV`           | `production`                                              |
| `DATABASE_URL`       | _(chuỗi Neon ở bước 1)_                                   |
| `JWT_ACCESS_SECRET`  | _(chuỗi random thứ nhất)_                                 |
| `JWT_REFRESH_SECRET` | _(chuỗi random thứ hai)_                                  |
| `JWT_ACCESS_TTL`     | `15m`                                                     |
| `JWT_REFRESH_TTL`    | `30d`                                                     |
| `TRUST_PROXY`        | `1`                                                       |
| `LOG_LEVEL`          | `info`                                                    |
| `CORS_ORIGINS`       | `http://localhost:5173` _(tạm, sửa ở bước 4)_             |

> **`TRUST_PROXY=1` là bắt buộc**, không phải tuỳ chọn. Render đặt một proxy trước service.
> Để `0` thì `req.ip` của mọi người dùng đều ra IP của proxy, nên rate limiter gộp cả thế
> giới vào chung một hạn mức — vài người đăng nhập là tất cả bị khoá. Đặt `2` trở lên cũng
> sai theo hướng ngược lại: kẻ tấn công tự bịa `X-Forwarded-For` để vượt giới hạn.

**Create Web Service.** Lần build đầu mất 3–5 phút. Xong sẽ có URL dạng
`https://sportsforall-api.onrender.com` — copy lại.

### 2.4 Kiểm tra ngay

```bash
curl https://<api-cua-ban>.onrender.com/api/health
curl https://<api-cua-ban>.onrender.com/api/health/db
```

Phải thấy `{"status":"ok"}` và `{"status":"ok","db":"connected"}`. Nếu cái thứ hai lỗi thì
`DATABASE_URL` sai hoặc chưa bật pooling — quay lại bước 1.

---

## 3. Deploy Web lên Vercel

Repo đã có sẵn [`vercel.json`](./vercel.json) khai báo build command và output directory,
nên Vercel tự nhận. Không cần chỉnh gì trong phần Build Settings.

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import repo `SportsForAll`.
2. **Root Directory:** để trống (mặc định repo root).
3. Mở **Environment Variables**, thêm:

   | Key            | Value                                     |
   | -------------- | ----------------------------------------- |
   | `VITE_API_URL` | `https://<api-cua-ban>.onrender.com`      |

   **Không có dấu `/` ở cuối.** Axios ghép chuỗi thành `${VITE_API_URL}/api`, thừa một dấu
   gạch là mọi request thành `//api/...`.

4. **Deploy.** Xong sẽ có URL dạng `https://sportsforall.vercel.app`.

> `vercel.json` có `rewrites` trỏ mọi đường dẫn về `index.html`. Web dùng `BrowserRouter`,
> thiếu dòng này thì trang chủ vào được nhưng mở thẳng `/teams` hay F5 giữa chừng là **404**.
> Đây là lỗi hay gặp nhất khi deploy SPA, và nhà tuyển dụng gần như chắc chắn sẽ F5.

---

## 4. Nối hai đầu lại

Giờ đã có URL của Web, quay lại Render mở CORS cho nó:

**Render** → service API → **Environment** → sửa `CORS_ORIGINS` thành:

```
https://sportsforall.vercel.app
```

Không dấu `/` cuối. `env.ts` cắt chuỗi theo dấu phẩy rồi so khớp **chính xác** với header
`Origin`, thừa hay thiếu một ký tự là trình duyệt chặn toàn bộ request.

Lưu lại → Render tự deploy lại (~2 phút).

> **Mỗi preview deployment của Vercel là một tên miền khác** (`sportsforall-git-abc.vercel.app`)
> và sẽ bị CORS chặn. Muốn dùng preview thì thêm URL đó vào `CORS_ORIGINS`, cách nhau bằng dấu phẩy.

---

## 5. Nạp dữ liệu mẫu

Một demo trống là demo tệ. Render free không cho mở Shell, nên chạy seed **từ máy bạn** trỏ
thẳng vào Neon:

```bash
# Windows PowerShell
$env:DATABASE_URL = "postgresql://...neon.tech/neondb?sslmode=require"
pnpm --filter @sfa/api db:seed
```

```bash
# Bash
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" pnpm --filter @sfa/api db:seed
```

Seed viết theo kiểu idempotent, chạy lại nhiều lần không nhân bản dữ liệu.

Tài khoản demo sau khi seed — **để luôn vào CV / trang portfolio**, đừng bắt người xem tự đăng ký:

| Email         | Mật khẩu    |
| ------------- | ----------- |
| `an@demo.vn`  | `Demo1234!` |

---

## 6. Kiểm tra lần cuối

Mở URL Vercel và đi hết chuỗi này:

- [ ] Trang chủ hiện danh sách môn thể thao
- [ ] Đăng nhập bằng `an@demo.vn` / `Demo1234!`
- [ ] **F5 giữa một trang con** (ví dụ `/teams`) — phải load lại được, không ra 404
- [ ] Mở DevTools → Console: không có lỗi CORS
- [ ] Vào trang đội, danh sách hiện ra (chứng tỏ API + DB thông)

Lỗi hay gặp:

| Triệu chứng                          | Nguyên nhân                                                      |
| ------------------------------------ | ---------------------------------------------------------------- |
| `CORS policy` trong Console          | `CORS_ORIGINS` sai hoặc thừa dấu `/` cuối — xem bước 4            |
| Trang con F5 ra 404                  | Thiếu `vercel.json`, hoặc Vercel chưa nhận — deploy lại           |
| Mọi request `500`                    | `DATABASE_URL` sai, hoặc chưa chạy `migrate deploy`               |
| Đăng nhập báo `429` dù mới thử 1 lần | `TRUST_PROXY` chưa đặt `1`                                        |
| Lần đầu vào chờ ~50 giây             | Bình thường với Render free — xem mục 7                           |

---

## 7. Ba cạm bẫy của repo này

Ba điều dưới đây **không phải lỗi cấu hình**, mà là giới hạn thật của kiến trúc hiện tại.
Biết trước để không mất buổi tối đi tìm nguyên nhân — và để trả lời được nếu bị hỏi lúc phỏng vấn.

### 7.1 Ảnh upload sẽ biến mất

`lib/uploads.ts` lưu ảnh xuống đĩa cạnh API (`multer.diskStorage`). Đĩa của Render free là
**ephemeral**: mỗi lần service khởi động lại — sau mỗi lần deploy, và sau mỗi lần ngủ dậy —
thư mục `uploads/` trở về rỗng. Ảnh đại diện, ảnh sân, icon môn thể thao đều mất, còn URL
trong database thì vẫn trỏ vào file không còn tồn tại.

Ba đường xử lý:

| Cách                            | Công    | Kết quả                                       |
| ------------------------------- | ------- | --------------------------------------------- |
| Chấp nhận, coi là demo          | 0       | Ảnh mất sau vài giờ. Đủ để xem thử.           |
| Render **Persistent Disk**      | 5 phút  | Giải quyết triệt để, nhưng **mất phí**.       |
| Đổi sang **Cloudinary** (free)  | ~2 giờ  | Đúng cách làm production. Sửa `lib/uploads.ts`. |

Chính comment trong `uploads.ts` đã ghi _"đủ cho quy mô đồ án; lên production nên đổi sang
object storage"_ — nên nếu người phỏng vấn hỏi, câu trả lời có sẵn: bạn biết giới hạn đó
ngay từ lúc viết, và biết đường sửa.

### 7.2 Lần truy cập đầu tiên chờ ~50 giây

Render free cho service ngủ sau 15 phút không ai vào. Người tiếp theo phải chờ container
khởi động lại. Với một link trong CV thì đây là vấn đề thật — người xem tưởng trang hỏng và đóng tab.

Cách giảm thiệt hại: ghi thẳng dòng chữ _"lần đầu vào có thể mất ~50 giây do server free
đang ngủ"_ ngay cạnh link demo trên portfolio. Nói trước thì người ta chờ; không nói thì người ta bỏ đi.

### 7.3 `VITE_API_URL` bị nướng vào lúc build

Vite thay `import.meta.env.VITE_API_URL` bằng chuỗi thật **lúc build**, không đọc lúc chạy.
Nghĩa là sửa biến này trên Vercel **không có tác dụng gì** cho tới khi bạn **Redeploy**.
Đổi domain API thì nhớ bấm Redeploy, đừng ngồi đợi nó tự ăn.

---

## 8. Bảng biến môi trường đầy đủ

### API (Render)

| Biến                 | Bắt buộc | Giá trị production        | Ghi chú                                  |
| -------------------- | :------: | ------------------------- | ---------------------------------------- |
| `NODE_VERSION`       |    ✓     | `20`                      | Repo yêu cầu `>= 20`                     |
| `NODE_ENV`           |    ✓     | `production`              |                                          |
| `PORT`               |          | _(Render tự đặt)_         | Đừng khai báo tay                        |
| `DATABASE_URL`       |    ✓     | chuỗi Neon **có pooling** |                                          |
| `JWT_ACCESS_SECRET`  |    ✓     | random ≥ 16 ký tự         | Khác `REFRESH`                           |
| `JWT_REFRESH_SECRET` |    ✓     | random ≥ 16 ký tự         | Khác `ACCESS`                            |
| `JWT_ACCESS_TTL`     |          | `15m`                     |                                          |
| `JWT_REFRESH_TTL`    |          | `30d`                     |                                          |
| `CORS_ORIGINS`       |    ✓     | URL Vercel, **không** `/` | Nhiều URL cách nhau bằng dấu phẩy        |
| `TRUST_PROXY`        |    ✓     | `1`                       | Sai là rate limit tính nhầm IP           |
| `LOG_LEVEL`          |          | `info`                    |                                          |

### Web (Vercel)

| Biến           | Bắt buộc | Giá trị production          | Ghi chú                          |
| -------------- | :------: | --------------------------- | -------------------------------- |
| `VITE_API_URL` |    ✓     | URL Render, **không** `/`   | Đổi thì phải Redeploy (mục 7.3)  |

---

## 9. Sau khi deploy xong

- Thêm link demo vào `README.md` và vào phần dự án SportsForAll trong CV.
- Cả hai dịch vụ đều tự deploy lại mỗi khi push lên `main`.
- Migration mới sẽ tự chạy, vì `prisma migrate deploy` nằm trong Build Command.
