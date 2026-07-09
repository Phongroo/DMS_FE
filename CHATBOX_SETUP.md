# OpenAI Chatbox Integration

Hướng dẫn cấu hình chatbox AI với OpenAI API - **Không cần Socket.io**.

## 📋 Yêu cầu

- OpenAI API key (lấy từ https://platform.openai.com/api-keys)

## ⚙️ Cấu hình

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Tạo file `.env` 
Sao chép từ `.env.example`:
```bash
cp .env.example .env
```

### 3. Thêm OpenAI API Key
Mở file `.env` và thay thế:
```
OPENAI_API_KEY=sk-...your_key_here...
```

### 4. Khởi động server
```bash
npm run serve
```

## 🚀 Sử dụng

1. Mở ứng dụng, chatbox sẽ xuất hiện ở góc dưới phải
2. Click vào nút 💬 để mở chat
3. Gõ tin nhắn và nhấn Enter hoặc click "Gửi"
4. AI sẽ xử lý và trả lời bằng HTTP API

## 🎯 Chi tiết kỹ thuật

### Frontend
- **ChatBox.jsx**: Gửi tin nhắn bằng `fetch` đến endpoint `/api/chat`
- Không dùng Socket.io cho chat (đơn giản, nhanh)
- Hỗ trợ timeout warning (>5s)

### Backend
- **POST /api/chat**: Nhận tin nhắn, gọi OpenAI API, trả lời
- Endpoint được bảo vệ (không cần auth nhưng có thể thêm)
- API key lưu trữ an toàn ở server

## 🤖 AI Model

- Model: GPT-3.5 Turbo (OpenAI)
- Ngôn ngữ: Tiếng Việt
- Max tokens: 1024
- Timeout: 30 giây (mặc định fetch)

## ⚠️ Lưu ý

- Đảm bảo `.env` file có trong `.gitignore` để không leak API key ✅ (đã setup)
- Kiểm tra quota và giới hạn API của OpenAI account
- Mỗi tin nhắn sẽ tính phí theo usage của OpenAI
- Rate limit: Nên thêm nếu dùng trong production

## 🔧 Troubleshooting

### Chatbox không hoạt động
- Kiểm tra OpenAI API key đã thiết lập đúng trong `.env`
- Kiểm tra server đang chạy: `npm run serve`
- Kiểm tra frontend kết nối được `http://localhost:4000`

### Lỗi "API key not set"
- Tạo file `.env` nếu chưa có
- Thêm `OPENAI_API_KEY` vào file
- Restart server sau khi thay đổi

### Lỗi "fetch error" hoặc timeout
- Kiểm tra CORS settings (đã mở rộng `*`)
- Kiểm trace logs server để xem error
- Kiểm tra API key còn hạn không

## 📝 API Endpoint

**POST** `http://localhost:4000/api/chat`

Request:
```json
{
  "message": "Xin chào"
}
```

Response:
```json
{
  "message": "Xin chào! Tôi có thể giúp gì cho bạn?",
  "timestamp": "2026-06-15T10:30:00.000Z"
}
```

