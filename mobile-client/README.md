# PhotoHub Mobile Client (Flutter + BLoC/Provider)

Thư mục này chứa mã nguồn ứng dụng di động dành cho Khách hàng duyệt tìm thợ chụp ảnh, xem portfolio và thực hiện thuê máy ảnh/ống kính trong hệ sinh thái PhotoHub.

## Cấu trúc đề xuất
```text
mobile-client/
├── android/
├── ios/
├── lib/
│   ├── core/
│   │   ├── constants/    # API endpoint, static text
│   │   ├── network/      # Http client (Dio / http wrapper)
│   │   └── theme/        # Cấu hình giao diện Light/Dark Mode
│   ├── data/
│   │   ├── models/       # Model dữ liệu (Booking, Equipment, Profile)
│   │   └── repositories/ # Gọi backend API & local DB (SharedPrefs)
│   ├── logic/
│   │   └── blocs/cubits/ # Trạng thái nghiệp vụ (BookingBloc, AuthBloc...)
│   └── presentation/
│       ├── screens/      # Màn hình chính (Home, Portfolio, BookingForm)
│       └── widgets/      # Widget tái sử dụng (EquipmentCard, StatusBadge)
└── pubspec.yaml
```

## Các tính năng chính
- Đăng nhập/Đăng ký tài khoản (Supabase Auth).
- Lướt xem portfolio hình ảnh chất lượng cao lưu trên Supabase Storage.
- Lọc và gửi đơn đặt chụp + thuê thiết bị trống lịch.
- Theo dõi tiến độ đơn chụp realtime qua websocket.
