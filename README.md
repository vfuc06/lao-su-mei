# 🇨🇳 Lão Sư Mei (美老师) — Web Gia Sư Tiếng Trung Giao Tiếp (Bản 2)

> **Website học nói tiếng Trung giao tiếp 1-1 cho người Việt: Nghe – Nói phản xạ, Gia sư nghiêm khắc, Shadowing chuẩn âm, Flashcard ngắt quãng SM-2 và Kho mẫu câu hỏi–đáp.**

Production URL: [https://lao-su-mei.vercel.app](https://lao-su-mei.vercel.app)

---

## 🌟 4 Chức năng chính (4 Tab)

| # | Tab | Mô tả chi tiết |
|---|-----|----------------|
| 1 | 💬 **Nói với AI** | Trò chuyện giọng nói 1-1 với Lão Sư Mei (18 tình huống: 8 Đời sống + 10 Công sở). **Cơ chế Gia sư nghiêm:** nói sai thì cuộc trò chuyện tạm dừng, hiện **Thẻ Sửa Lỗi** (❌ bạn nói / 💡 vì sao sai / ✅ câu chuẩn). Bắt buộc nhại lại câu chuẩn đạt ≥ 80% (chấm điểm âm tiết tại máy, 0 tốn quota) mới được đi tiếp. Có gợi ý bí từ 3 cấp (từ khóa, khung câu, nguyên câu) và tự điều chỉnh độ khó (Dễ hơn / Khó hơn). |
| 2 | 🎧 **Shadowing** | Luyện nhại theo câu mẫu và đối đáp phản xạ. Chấm điểm phát âm từng âm tiết bằng thuật toán so khớp Levenshtein (chính xác thanh điệu, thanh nhẹ, phụ âm zh/ch/sh/r). Có vòng tròn điểm số trực quan và mẹo khẩu hình tiếng Việt. |
| 3 | 🗂 **Từ vựng (Flashcard)** | 2 bộ thẻ: **Giao tiếp HSK 1–4** và **Từ vựng Công sở**. Ứng dụng thuật toán **Lặp lại ngắt quãng (SM-2)** chuẩn. 2 chế độ ôn tập: **Lật thẻ truyền thống** và **Đọc to (nói để lật)**. |
| 4 | 📖 **Mẫu câu** | Tuyển tập 57+ cặp hỏi–đáp thông dụng hằng ngày và công sở. Câu hỏi ở trên, câu trả lời chuẩn ngay bên dưới. Hỗ trợ nút **Che đáp án** để tự kiểm tra và nút **🎤 Luyện câu này** để chuyển thẳng vào chế độ Shadowing. |

---

## 🛠 Công nghệ & Kiến trúc

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Backend:** Vercel Serverless Functions (`/api/chat.ts`).
- **AI Model:** Google Gemini `gemini-3.1-flash-lite` (tốc độ siêu nhanh 1.6s – 2.1s, structured JSON output).
- **Phát âm & Nhận diện:** Web Speech API (`SpeechRecognition` & `speechSynthesis` zh-CN).
- **Chấm điểm âm tiết:** `pinyin-pro` + Levenshtein Dynamic Programming alignment với trọng số thanh điệu.
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Email OTP 6 chữ số).

---

## 🔑 Cấu hình Biến môi trường (Environment Variables)

Khi triển khai trên **Vercel** (`Project Settings` → `Environment Variables`), cần cấu hình các biến sau:

| Tên biến | Phạm vi | Mô tả |
|----------|---------|-------|
| `GEMINI_API_KEY` | Server | API Key lấy miễn phí từ Google AI Studio (`aistudio.google.com`). |
| `SUPABASE_URL` | Server | URL project Supabase (vd: `https://lamhrbavfyhffeihyxdz.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Secret key của Supabase (dùng trong backend và seed scripts). |
| `VITE_SUPABASE_URL` | Frontend | URL kết nối Supabase từ trình duyệt. |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Publishable Anon Key Supabase. |
| `DAILY_AI_QUOTA` | Server | Hạn mức số lượt AI mỗi người dùng trong một ngày (mặc định: `80`). |

---

## ⚡ Hướng dẫn cài đặt & chạy thử máy cá nhân (Local Development)

```bash
# 1. Cài đặt các thư viện
npm install

# 2. Chạy kiểm thử tự động (Unit Tests)
npm test

# 3. Nạp dữ liệu mẫu câu & từ vựng vào Supabase
node seed/seed_phrases.cjs
node seed/seed_vocab.cjs

# 4. Khởi chạy môi trường phát triển
npm run dev
```

---

## 🔄 Tự động Giữ ấm Supabase (Supabase Keep-Alive)

Để tránh trường hợp Supabase miễn phí tự động tạm dừng (pause) sau 7 ngày không có hoạt động, dự án đã cài sẵn GitHub Actions:
- **Tập tin:** `.github/workflows/keep_alive.yml`
- **Tần suất:** Tự động gửi ping nhẹ đọc dữ liệu mỗi 3 ngày một lần.
- Không phát sinh bất kỳ chi phí nào!
