# PhotoHub Web Admin (React.js + TailwindCSS)

Thư mục này chứa mã nguồn ứng dụng Web quản lý dành cho Studio Manager (Admin) của hệ sinh thái PhotoHub.

## Cấu trúc đề xuất
```text
web-admin/
├── public/
├── src/
│   ├── assets/         # Hình ảnh, icon, font
│   ├── components/     # UI Component dùng chung (Table, Button, Modal...)
│   ├── config/         # Cấu hình Supabase Client
│   ├── layouts/        # Layout chính (Sidebar, Header)
│   ├── pages/          # Các trang: Dashboard, Bookings, Equipment, Staff
│   ├── services/       # Lớp gọi API backend (Axios/Fetch)
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Các tính năng chính
- Thống kê doanh thu theo biểu đồ (Recharts).
- Quản lý CRUD thiết bị chụp (Máy ảnh, Ống kính, Đèn chiếu).
- Nhận diện và phê duyệt danh sách lịch đặt (Bookings) realtime.
