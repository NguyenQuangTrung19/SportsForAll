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

> **Build hỏng với `P1012 ... the URL must start with the protocol postgresql://`?**
> `DATABASE_URL` tồn tại nhưng giá trị rỗng hoặc sai định dạng — hầu như luôn là một
> trong ba lỗi dán:
>
> - Bấm **Create Web Service** trước khi kịp **Save** biến môi trường → lần build đầu chạy
>   với giá trị rỗng. Thêm biến rồi **Manual Deploy → Deploy latest commit**.
> - Copy nguyên khối lệnh của Neon: `psql 'postgresql://...'`. Chỉ lấy phần trong nháy đơn.
> - Có nháy `"` `'` bao ngoài, hoặc thừa khoảng trắng/xuống dòng ở cuối. Render lưu
>   nguyên văn, không tự bóc nháy.
>
> Giá trị đúng bắt đầu bằng đúng 11 ký tự `postgresql://`. Muốn xem Render thực sự nhận
> được gì mà không lộ mật khẩu, chèn tạm vào đầu **Build Command**:
>
> ```bash
> node -e "const u=process.env.DATABASE_URL||'';console.log('len',u.length,'head',JSON.stringify(u.slice(0,13)))" &&
> ```
>
> Log phải in `head "postgresql://"`. Ra `len 0` là biến chưa lưu; ra `head "psql 'postg"`
> là dán dư lệnh `psql`.

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
2. **Root Directory:** để trống (mặc định repo root). Trỏ nhầm vào `apps/api` là hỏng kép:
   Vercel cài nhầm dependency của API, và bỏ qua luôn `vercel.json` ở gốc (nó chỉ đọc file
   này bên trong Root Directory).
3. **Framework Preset:** `Vite`. Nếu bước 2 từng trỏ nhầm vào `apps/api`, Vercel đã thấy
   `express` và tự đặt preset thành Node — sửa Root Directory **không** gỡ preset đó, build
   vẫn chết ở `No entrypoint found in output directory: "apps/web/dist"` (nó đi tìm
   `server.js` để chạy thay vì phục vụ file tĩnh). `vercel.json` đã khai `"framework": "vite"`
   và khai báo trong file thắng cấu hình dashboard, nên chỉ cần deploy lại là xong.
4. Mở **Environment Variables**, thêm:

   | Key            | Value                                     |
   | -------------- | ----------------------------------------- |
   | `VITE_API_URL` | `https://<api-cua-ban>.onrender.com`      |

   **Không có dấu `/` ở cuối.** Axios ghép chuỗi thành `${VITE_API_URL}/api`, thừa một dấu
   gạch là mọi request thành `//api/...`.

5. **Deploy.** Xong Vercel cấp một domain — xem ở tab **Domains** của project. Tên thật
   thường có hậu tố (`sportsforall-xxxx.vercel.app`), bước 4 cần đúng chuỗi này.

> `vercel.json` có `rewrites` trỏ mọi đường dẫn về `index.html`. Web dùng `BrowserRouter`,
> thiếu dòng này thì trang chủ vào được nhưng mở thẳng `/teams` hay F5 giữa chừng là **404**.
> Đây là lỗi hay gặp nhất khi deploy SPA, và nhà tuyển dụng gần như chắc chắn sẽ F5.

---

## 4. Nối hai đầu lại

Giờ đã có URL của Web, quay lại Render mở CORS cho nó:

URL thật của bạn lấy ở **Vercel → project → Domains**, dòng trên cùng. Nó **không** phải
`sportsforall.vercel.app` — Vercel gắn thêm hậu tố khi tên đã có người lấy, nên tên thật
thường dạng `sportsforall-xxxx.vercel.app` hoặc kèm tên tài khoản. Cách chắc chắn nhất:
mở web lên, copy nguyên phần domain trên thanh địa chỉ.

**Render** → service API → **Environment** → sửa `CORS_ORIGINS` thành đúng domain đó:

```
https://<domain-vercel-cua-ban>.vercel.app
```

Không dấu `/` cuối. `env.ts` cắt chuỗi theo dấu phẩy rồi so khớp **chính xác** với header
`Origin`, thừa hay thiếu một ký tự là trình duyệt chặn toàn bộ request.

Muốn chạy được cả ở local thì liệt kê cả hai, ngăn bằng dấu phẩy:

```
https://<domain-vercel-cua-ban>.vercel.app,http://localhost:5173
```

Lưu lại → Render tự deploy lại (~2 phút).

> **Mỗi preview deployment của Vercel là một tên miền khác** (`sportsforall-git-abc.vercel.app`)
> và sẽ bị CORS chặn. Muốn dùng preview thì thêm URL đó vào `CORS_ORIGINS`, cách nhau bằng dấu phẩy.

---

## 5. Nạp dữ liệu mẫu

Một demo trống là demo tệ. Render free không cho mở Shell, nên chạy seed **từ máy bạn** trỏ
thẳng vào Neon. Seed idempotent — chạy lại nhiều lần không nhân bản dữ liệu.

### 5.1 Điều kiện trước

Bảng phải tồn tại rồi. Render đã chạy `prisma migrate deploy` trong Build Command, nên nếu
build ở bước 2 xanh thì xong. Không chắc thì kiểm ở 5.3.

### 5.2 Trỏ terminal vào Neon

Chuỗi cần dán là **`DATABASE_URL` của Neon ở [bước 1](#1-tạo-database-trên-neon)** — đúng
cái đã điền vào Render ở [bước 2.3](#23-điền-biến-môi-trường), không phải chuỗi nào khác.
Lấy lại nó ở một trong hai chỗ:

- **Neon** → project `sportsforall` → **Connection string** → bật **Connection pooling** →
  chọn định dạng **Prisma** hoặc **Connection string** (đừng chọn **psql**, nó thêm cả lệnh
  `psql '...'` vào chuỗi) → **Copy**.
- **Render** → service API → **Environment** → dòng `DATABASE_URL` → biểu tượng con mắt để
  hiện giá trị → copy.

Mở PowerShell **ở thư mục gốc repo**, thay cả chuỗi trong nháy đơn bằng giá trị vừa copy:

```powershell
$env:DATABASE_URL = 'postgresql://user:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
```

`user`, `password`, `ep-xxx` ở trên chỉ là chỗ giữ chỗ — chuỗi thật của bạn có tên tài khoản
và mật khẩu Neon sinh sẵn, dài hơn nhiều. Giữ nguyên `?sslmode=require` ở cuối, Neon bắt buộc TLS.

> **Nháy đơn, không phải nháy kép.** Mật khẩu Neon hay có ký tự `$`; trong nháy kép
> PowerShell hiểu `$abc` là tên biến và nuốt mất đoạn đó, chuỗi kết nối sai âm thầm.

Biến này chỉ sống trong cửa sổ terminal đang mở — đóng đi là mất, không ghi vào đâu cả.
Nó **đè lên** `apps/api/.env` (Postgres localhost), nên seed chạy đúng vào Neon.

Kiểm lại trước khi chạy tiếp:

```powershell
$env:DATABASE_URL.Substring(0,13)   # phải in: postgresql://
```

### 5.3 Kiểm tra migration (bỏ qua được nếu build Render đã xanh)

```powershell
pnpm --filter @sfa/api exec prisma migrate status
```

`Database schema is up to date!` là ổn. Báo còn migration chưa áp thì chạy:

```powershell
pnpm --filter @sfa/api exec prisma migrate deploy
```

> Vướng lỗi advisory lock ở bước này thì tạm dùng chuỗi **direct** của Neon (bản không có
> `-pooler` trong hostname) — PgBouncer không hợp với migration. Seed thì dùng pooler bình thường.

### 5.4 Chạy seed

```powershell
pnpm --filter @sfa/api db:seed
```

Chạy khoảng 5–10 giây (argon2 băm mật khẩu chậm có chủ đích). Xong sẽ in:

```
Seed xong: 4 người dùng + 1 admin + 1 chủ sân, 2 đội, 1 bài tuyển, 1 kèo, 3 bài tìm đội, 1 sân với 3 khung giờ.
Đăng nhập thử: an@demo.vn / Demo1234!
```

### 5.5 Tài khoản demo

Tất cả dùng chung mật khẩu `Demo1234!`. **Để luôn vào CV / trang portfolio**, đừng bắt
người xem tự đăng ký:

| Email             | Vai trò   | Xem được gì                                      |
| ----------------- | --------- | ------------------------------------------------ |
| `an@demo.vn`      | user      | Luồng chính: đội, kèo, tuyển quân, tìm đội        |
| `binh@demo.vn`    | user      | Góc nhìn người thứ hai (đội khác, bài tìm đội)    |
| `cuong@demo.vn`   | user      | —                                                 |
| `dung@demo.vn`    | user      | —                                                 |
| `admin@demo.vn`   | admin     | Trang quản trị: người dùng, bài viết, sân, báo cáo |
| `sanbong@demo.vn` | business  | Trang chủ sân: 1 sân + 3 khung giờ đã mở          |

Ba khung giờ của sân được sinh theo **thời điểm chạy seed** (19h ba ngày kế tiếp). Để lâu
chúng thành quá khứ và biến khỏi trang đặt sân — trước buổi phỏng vấn cứ chạy lại seed một
lần cho lịch tươi.

### 5.6 Dọn sau khi xong

```powershell
Remove-Item Env:DATABASE_URL
```

Hoặc đơn giản là đóng cửa sổ terminal.

**Lỗi hay gặp:**

| Báo lỗi                                    | Nguyên nhân                                              |
| ------------------------------------------ | -------------------------------------------------------- |
| `P1001: Can't reach database server`       | Sai host, hoặc thiếu `?sslmode=require`                   |
| `The table ... does not exist`             | Chưa chạy migration — quay lại 5.3                        |
| `must start with the protocol postgresql://` | Biến rỗng hoặc dán dư `psql '...'` — xem lại 5.2         |
| Treo im ở `db:seed`                        | Neon project đang ngủ; chờ ~10 giây rồi chạy lại          |

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
