# 📸 PhotoHub Studio Booking & Management System

PhotoHub là một hệ thống đặt lịch chụp ảnh và thuê thiết bị studio hiện đại, hoạt động thời gian thực (Real-time). Dự án được thiết kế chuyên nghiệp, hướng tới trải nghiệm người dùng tối giản, cao cấp và vận hành tự động hóa cao.

---

## ✨ Các Tính Năng Nổi Bật

### 1. Đặt Lịch Studio & Thuê Thiết Bị Thời Gian Thực
* **Lịch Chụp Đa Năng:** Đặt lịch linh hoạt cho thợ chụp ảnh (`Photographer`) và các trang thiết bị máy ảnh (`Equipment`).
* **Tránh Trùng Lặp (Double-booking Prevention):** Sử dụng hệ thống khóa phân tán **Redis Distributed Locks** ở Backend kết hợp với kiểm tra xung đột thời gian thực để ngăn chặn tình trạng hai khách đặt cùng một lịch/thiết bị tại một thời điểm.
* **Hiển thị Ngày Bận (Busy Dates):** Tự động truy vấn và hiển thị danh sách các ngày mà nhiếp ảnh gia hoặc thiết bị đã được đặt trước ngay dưới lịch chọn ngày, giúp người dùng dễ dàng chọn ngày trống.

### 2. Giỏ Hàng Đa Năng & Thanh Toán Đồng Thời (Batch Checkout)
* **Giỏ Hàng Đặt Lịch:** Thêm nhiều dịch vụ thợ chụp ảnh và trang thiết bị khác nhau với các khung thời gian riêng biệt vào giỏ hàng.
* **Thanh Toán Nhóm (Batch Payments):** Cho phép tích chọn và thanh toán đồng thời nhiều đơn hàng. Hệ thống tự động tạo mã thanh toán nhóm duy nhất (ví dụ: `PHABCD`) và đồng bộ duyệt trạng thái của tất cả các đơn trong nhóm khi nhận được giao dịch.
* **Định Dạng Tiền Tệ VNĐ:** Đổi toàn bộ các giá trị tiền tệ sang Việt Nam Đồng (VNĐ > 0) định dạng rõ ràng (ví dụ: `1.500.000 đ`) nhất quán từ danh mục sản phẩm, biểu phí giỏ hàng đến cổng đối soát thanh toán.

### 3. Xác Thực Mã OTP Tiện Lợi & Bảo Mật (Supabase OTP)
* **Xác minh đăng ký:** Gửi mã xác thực OTP 6 số qua email ngay khi tạo tài khoản. Chỉ khi nhập đúng OTP thì tài khoản mới được kích hoạt.
* **Đăng nhập không mật khẩu:** Tính năng nhận mã OTP qua hòm thư để đăng nhập tức thì mà không cần ghi nhớ mật khẩu thông thường.
* **Tự động phân quyền:** Phân chia rõ ràng vai trò **Khách hàng** (`client`) và **Nhiếp ảnh gia** (`photographer`).

### 4. Cổng Thanh Toán SePay (Cổng Chuyển Khoản Tự Động)
* **Tự động nhận diện chuyển khoản (SePay IPN):** Khi khách hàng chuyển khoản quét mã VietQR, webhook của SePay sẽ gọi về backend để tự động chuyển đơn sang trạng thái `approved` (Đã duyệt) trong chưa đầy 1 giây.
* **Đóng gói mã hóa VietQR:** Hỗ trợ quét mã thanh toán VietQR đồng thời cho cả đơn hàng đơn lẻ (sử dụng mã đơn hàng `PH...`) và đơn hàng giỏ hàng nhóm (sử dụng mã nhóm `PH...`).
* **Đếm ngược thanh toán (Countdown Timer):** Khách hàng có 1 phút (hoặc 15 phút cấu hình) đếm ngược thời gian thực trên giao diện để hoàn thành thanh toán. Hết giờ, Slot đặt lịch tự động giải phóng.
* **Nút Hủy Thủ Công:** Cho phép hủy đơn nhanh để trả lại slot chụp cho người khác.
* **Thanh toán tiền mặt:** Lựa chọn thanh toán tại quầy linh hoạt để duyệt slot lập tức.

### 5. Bảng Điều Khiển Cho Nhiếp Ảnh Gia (Photographer Workspace)
* **Thiết lập Hồ sơ Dịch vụ:** Cập nhật giá thuê (theo đơn vị VNĐ), năm kinh nghiệm, bio phong cách chụp, avatar để tự động hiển thị lên danh mục tìm kiếm của khách hàng.
* **Thống kê Tài chính:** Theo dõi doanh thu tích lũy (đã hoàn thành), doanh thu dự kiến (đang hoạt động) bằng VNĐ và số lượng đơn hàng trực quan.
* **Lịch trình Timeline:** Hiển thị danh sách khách hàng và thời gian lịch chụp sắp tới theo trình tự thời gian.
* **Trò chuyện trực tuyến (Real-time Chat):** Kênh liên lạc trực tiếp thời gian thực với khách hàng cho từng đơn đặt lịch cụ thể.

### 6. Hệ Thống Email Gửi Thật (Real SMTP Email Transporter)
* Tự động gửi email định dạng HTML chuẩn sang trọng qua Gmail SMTP của cửa hàng khi:
  * Đơn hàng được khởi tạo (`pending`) kèm thông tin hướng dẫn thanh toán.
  * Đơn hàng thanh toán thành công (`approved`).
  * Đơn hàng bị hủy do hết hạn hoặc khách hàng chủ động hủy (`cancelled`).

---

## 🛠️ Công Nghệ Sử Dụng

* **Frontend:** React.js, TypeScript, Vite, Tailwind CSS, Lucide Icons, Supabase Real-time.
* **Backend:** Node.js (Express), TypeScript, BullMQ (Hàng đợi xử lý tiến trình ngầm), Nodemailer (Gửi email).
* **Database & Auth:** Supabase (PostgreSQL), Redis (Quản lý khóa phân tán & Hàng đợi timeout).

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Chuẩn Bị File Cấu Hình `.env`

Tạo file `.env` ở thư mục **backend** và **web-client** tương ứng với các trường khóa sau:

#### Cho Backend (`backend/.env`):
```env
PORT=3000
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_HOST=localhost
REDIS_PORT=6379

# Cấu hình thanh toán SePay
SEPAY_API_KEY=your-sepay-key
SEPAY_SUCCESS_URL=http://localhost:5173/payment/result

# Cấu hình SMTP Email gửi thật
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nguyentruong09102002@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_SENDER="PhotoHub Studio <nguyentruong09102002@gmail.com>"
```

#### Cho Web Client (`web-client/.env`):
```env
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:3000
```

### 2. Khởi Chạy Bằng Docker (Redis & Cơ sở dữ liệu)
Đảm bảo bạn đã cài đặt Docker và chạy lệnh sau ở thư mục gốc để khởi tạo Redis:
```bash
docker-compose up -d
```

### 3. Khởi Chạy Backend
```bash
cd backend
npm install
npm run dev
```

### 4. Khởi Chạy Web Client
```bash
cd ../web-client
npm install
npm run dev
```

Truy cập website tại địa chỉ mặc định: [http://localhost:5173](http://localhost:5173).

---

## 👥 Đóng Góp Phát Triển
* Dự án được xây dựng và tối ưu liên tục nhằm mang lại giải pháp quản trị studio ảnh tốt nhất.
* Mọi đóng góp xin gửi về địa chỉ Email: `nguyentruong09102002@gmail.com`.
