Kanji Match — Ghép Kanji và Nghĩa

Mục tiêu
- Ứng dụng web nhỏ để ghép cột Kanji (trái) với nghĩa (phải).
- Dữ liệu lấy từ `data.json` (mảng object {kanji, meaning}).
- Mỗi trang hiển thị 30 bản ghi.
- Cho phép ghép (click trên Kanji, rồi click trên Nghĩa) và kiểm tra kết quả.

Chạy nhanh
1. Mở folder `App` trong VS Code hoặc file explorer.
2. Vì trình duyệt chặn fetch file://, nên khuyến nghị chạy server tĩnh nhanh. Ví dụ với Python 3:

```powershell
# từ thư mục App
python -m http.server 8000
# mở http://localhost:8000/index.htm
```

Hoặc cài `Live Server` extension trong VS Code và mở `index.htm`.

Ghi chú
- `data.json` chứa dữ liệu mẫu. Bạn có thể thay bằng JSON của riêng bạn theo định dạng [{"kanji":"日","meaning":"ngày"}, ...]
- Nút Shuffle hoán vị cột Nghĩa.
- Nút Check Matches sẽ đánh dấu đúng/sai.
- Mỗi lần chuyển trang (Prev/Next) sẽ reset các cặp trên trang đó.

Tôi đã tạo `index.htm`, `data.json`, và `README.md`.
