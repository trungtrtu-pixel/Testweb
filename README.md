# Free Drop – Tự động upload lên Netlify

## Cách dùng (tự động hoàn toàn)

### 1. Lấy Netlify Token (làm 1 lần)
1. Vào https://app.netlify.com → đăng nhập
2. Avatar → User settings → Applications → Personal access tokens
3. New access token → Generate → Copy token

### 2. Chạy tool
- Mở index.html hoặc chạy `python app.py`
- Bấm biểu tượng ⚙️ → dán Token → Lưu

### 3. Deploy
- Chọn file HTML / ZIP
- Đặt tên
- Bấm **Deploy ngay**
- Tool sẽ tự upload lên Netlify và trả link công khai

Nếu chưa có Token thì tool sẽ tải ZIP về và hướng dẫn kéo vào Netlify Drop.
