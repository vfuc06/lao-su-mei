# 🇨🇳 Web Gia Sư Tiếng Trung Giao Tiếp (AI nói chuyện 1-1)

> **Dành cho Antigravity (AI coding agent):** Đây là bản đặc tả đầy đủ của dự án. Hãy đọc TOÀN BỘ file này trước khi viết code. Trước khi code, hãy tạo **Implementation Plan** ngắn gọn theo các Phase bên dưới để tôi duyệt. Sau đó làm lần lượt từng Phase, xong mỗi Phase phải chạy thử và báo cáo kết quả theo mục "Tiêu chí hoàn thành".
>
> **Về người dùng (tôi):** Tôi KHÔNG biết code, chỉ biết sử dụng. Hãy tự xử lý kỹ thuật, giải thích bằng tiếng Việt đơn giản, và mỗi khi cần tôi làm gì (ví dụ: dán API key, bấm deploy) thì hướng dẫn từng bước cụ thể.

---

## 1. Mục tiêu sản phẩm

Một website **học nói tiếng Trung giao tiếp hằng ngày** theo kiểu **gia sư AI 1-1**:

1. Người học **bấm nút mic và nói** (tiếng Trung, hoặc tiếng Việt khi chưa biết nói).
2. AI **nghe → hiểu → trả lời lại bằng giọng nói tiếng Trung**, đồng thời hiện chữ Hán + pinyin + nghĩa tiếng Việt.
3. AI **sửa lỗi nhẹ nhàng** (ngữ pháp, từ vựng, phát âm), gợi ý cách nói tự nhiên hơn, rồi **hỏi tiếp** để duy trì hội thoại.

**Chỉ tập trung vào NGHE – NÓI.** Không làm bài tập trắc nghiệm, không làm flashcard, không làm tính năng luyện viết. Giao diện càng đơn giản càng tốt.

**Đối tượng:** Người Việt mới học / học lại tiếng Trung, muốn nói được các tình huống đời thường. Sẽ gửi link cho bạn bè dùng chung.

---

## 2. Ràng buộc quan trọng (bắt buộc tuân thủ)

| # | Ràng buộc |
|---|-----------|
| 1 | **Dùng model có sẵn qua API** (Google Gemini từ Google AI Studio). **KHÔNG** huấn luyện / build model riêng. |
| 2 | **API key TUYỆT ĐỐI không được nằm trong code frontend.** Phải gọi Gemini thông qua **backend/serverless function**, key lưu trong biến môi trường (`GEMINI_API_KEY`). |
| 3 | Phải **deploy miễn phí** (ưu tiên **Vercel**, hoặc Netlify / Cloudflare Pages) và có link công khai gửi người khác dùng được. |
| 4 | **Mobile-first**: đa số người dùng sẽ mở bằng điện thoại. Nút mic phải to, dễ bấm bằng ngón cái. |
| 5 | Có **giới hạn tốc độ (rate limit)** để người lạ không làm cạn quota API miễn phí của tôi. |
| 6 | Giao diện **tiếng Việt**. Nội dung học là **tiếng Trung giản thể (简体)** + **pinyin có dấu thanh**. |
| 7 | Code sạch, có comment tiếng Việt ở các đoạn quan trọng, cấu trúc thư mục rõ ràng. |

---

## 3. Công nghệ đề xuất

> Antigravity được phép đề xuất thay đổi nếu có lý do tốt, nhưng phải giải thích ngắn gọn và chờ tôi đồng ý.

- **Frontend:** Vite + React + TypeScript + Tailwind CSS (hoặc Next.js nếu tiện deploy hơn trên Vercel).
- **Backend:** Serverless function (thư mục `/api` trên Vercel) làm proxy gọi Gemini.
- **AI hội thoại (não của gia sư):** Gemini API (Google AI Studio) — dùng bản **Flash mới nhất** (nhanh + rẻ/miễn phí). *Hãy tra tài liệu chính thức để lấy đúng tên model hiện hành, đừng đoán từ trí nhớ.* Dùng SDK chính thức `@google/genai`.
- **Nhận diện giọng nói (STT – Speech to Text):**
  - **MVP:** Web Speech API của trình duyệt (`SpeechRecognition`, `lang = "zh-CN"`) — miễn phí, độ trễ thấp.
  - **Fallback:** Nếu trình duyệt không hỗ trợ (ví dụ Firefox), gửi file ghi âm (MediaRecorder) lên backend để Gemini phiên âm.
- **Phát giọng nói (TTS – Text to Speech):**
  - **MVP:** `speechSynthesis` của trình duyệt (`lang = "zh-CN"`), có chọn tốc độ chậm / thường.
  - **Nâng cấp (Phase 5):** Gemini TTS để giọng tự nhiên hơn.
- **Nâng cấp tùy chọn (Phase 6):** Gemini Live API (hội thoại audio thời gian thực, có thể ngắt lời). Cần dùng **ephemeral token** để không lộ key.

---

## 4. Trải nghiệm người dùng (UX) — GIAO DIỆN ĐƠN GIẢN

### 4.1 Màn hình 1: Chọn tình huống (Home)
- Tiêu đề + 1 dòng mô tả.
- Chọn **trình độ**: `Mới bắt đầu (HSK1)` · `Cơ bản (HSK2)` · `Trung cấp (HSK3)`.
- Lưới các **tình huống** (mỗi cái là 1 thẻ có emoji + tên):
  - 👋 Chào hỏi & giới thiệu bản thân
  - 🍜 Gọi món ở nhà hàng
  - 🛒 Mua sắm & mặc cả
  - 🚕 Đi taxi / hỏi đường
  - 🏨 Nhận phòng khách sạn
  - 🏥 Đi khám / mua thuốc
  - ☕ Làm quen, trò chuyện đời thường
  - 💬 **Nói chuyện tự do** (không kịch bản)
- Lưu lựa chọn gần nhất vào `localStorage`.

### 4.2 Màn hình 2: Phòng hội thoại (Màn hình chính — quan trọng nhất)
Bố cục dọc, gọn như một app chat:

```
┌──────────────────────────────┐
│ ← Quay lại   Gọi món ăn  ⚙️  │  (header nhỏ)
├──────────────────────────────┤
│                              │
│  🤖 你好!欢迎光临!            │
│     Nǐ hǎo! Huānyíng guānglín!│
│     Xin chào! Chào mừng quý khách│
│     [🔊 nghe lại] [🐢 chậm]   │
│                              │
│              你好,我要一杯咖啡 │  👤 (bạn)
│                              │
│  🤖 好的!...                  │
│     💡 Nói tự nhiên hơn: ...  │
│                              │
├──────────────────────────────┤
│  [Gợi ý câu trả lời 💡]       │
│                              │
│          ( 🎤 )               │  ← NÚT MIC TO Ở GIỮA DƯỚI
│   Bấm để nói / Đang nghe...   │
│   Không nói được? [Gõ chữ ⌨️] │
└──────────────────────────────┘
```

**Hành vi chi tiết:**
1. **Nút mic lớn** (tối thiểu 72px). Bấm 1 lần để bắt đầu nghe, bấm lần nữa (hoặc tự dừng khi im lặng ~1.5s) để gửi. Có hiệu ứng sóng âm / nhấp nháy khi đang nghe.
2. Trong khi nói, hiện **chữ nhận diện được theo thời gian thực** (interim results) để người học thấy mình nói gì.
3. Sau khi gửi: hiện trạng thái "AI đang suy nghĩ…" (loading dạng 3 chấm).
4. AI trả lời → **tự động đọc to bằng giọng tiếng Trung** (có thể tắt auto-play trong cài đặt).
5. Mỗi tin nhắn AI có: **Hán tự** (to) / **pinyin** / **nghĩa tiếng Việt**. Có công tắc bật/tắt hiển thị pinyin và nghĩa (mặc định bật cả hai, để người học có thể che đi tự kiểm tra).
6. Nút **🔊 nghe lại** và **🐢 nghe chậm** cho từng câu của AI.
7. Nút **💡 Gợi ý**: khi người học bí, AI đưa 2–3 câu trả lời mẫu (Hán tự + pinyin + nghĩa) để họ đọc theo.
8. Nút **⌨️ Gõ chữ**: dự phòng khi mic không dùng được / ồn.
9. Nút **Tiếng Việt cũng được**: nếu người học nói tiếng Việt (ví dụ "cho tôi hỏi giá bao nhiêu nói sao"), AI hiểu ý, dạy câu tiếng Trung tương ứng, rồi **bảo họ nói lại bằng tiếng Trung**.
10. Mỗi vài lượt, AI hiện **thẻ nhận xét nhỏ** (xem mục 6).

### 4.3 Cài đặt (⚙️ — dạng bottom sheet đơn giản)
- Tốc độ giọng đọc (Chậm / Vừa / Thường)
- Tự động đọc câu trả lời (bật/tắt)
- Hiện pinyin (bật/tắt) · Hiện nghĩa tiếng Việt (bật/tắt)
- Mức độ sửa lỗi: `Nhẹ nhàng` (sửa lúc cuối) / `Sửa ngay` (sửa từng câu)
- Chọn giọng đọc (liệt kê các giọng zh-CN có trong thiết bị)
- Nút "Bắt đầu lại hội thoại"

### 4.4 Phong cách thiết kế
- Sạch, nhiều khoảng trắng, màu chủ đạo đỏ-vàng nhẹ (gợi văn hoá Trung Hoa nhưng không sến), font dễ đọc, Hán tự cỡ lớn (≥ 22px).
- Hỗ trợ **dark mode** theo hệ thống.
- Không có quảng cáo, không đăng ký tài khoản, **vào là dùng ngay**.

---

## 5. Kiến trúc & luồng xử lý

```
[Mic] → Web Speech API (STT) → text
   → POST /api/chat  (kèm lịch sử hội thoại, trình độ, tình huống, cài đặt)
   → Serverless: gắn System Prompt + gọi Gemini (trả JSON có cấu trúc)
   → JSON về frontend
   → Hiển thị bubble (Hán tự/pinyin/nghĩa) + đọc to bằng TTS
```

### 5.1 Cấu trúc thư mục gợi ý
```
/
├── README.md
├── .env.example            # GEMINI_API_KEY=your_key_here
├── api/
│   └── chat.ts             # serverless proxy gọi Gemini + rate limit
├── src/
│   ├── components/         # MicButton, ChatBubble, SettingsSheet, ScenarioCard...
│   ├── hooks/              # useSpeechRecognition, useSpeechSynthesis
│   ├── lib/                # prompts.ts, scenarios.ts, api.ts
│   ├── pages/              # Home, Conversation
│   └── main.tsx
└── package.json
```

### 5.2 API `/api/chat`
**Request:**
```json
{
  "scenarioId": "restaurant",
  "level": "HSK1",
  "correctionMode": "gentle",
  "history": [{"role":"user","text":"你好"},{"role":"ai","text":"你好!"}],
  "userInput": "我要一杯咖啡",
  "inputLang": "zh"
}
```

**Response (BẮT BUỘC là JSON hợp lệ — dùng `responseMimeType: "application/json"` + `responseSchema` của Gemini):**
```json
{
  "reply": {
    "hanzi": "好的!请问要热的还是冰的?",
    "pinyin": "Hǎo de! Qǐngwèn yào rè de háishi bīng de?",
    "vietnamese": "Được ạ! Cho hỏi bạn muốn nóng hay đá?"
  },
  "feedback": {
    "hasMistake": true,
    "userSaid": "我要一杯咖啡",
    "better": "我想要一杯咖啡",
    "explanation": "Dùng 想要 nghe lịch sự và mềm hơn 要 khi gọi món.",
    "pronunciationTip": "Chú ý thanh 3 của 咖啡 kā fēi → kā là thanh 1."
  },
  "suggestions": [
    {"hanzi":"要热的。","pinyin":"Yào rè de.","vietnamese":"Cho nóng."},
    {"hanzi":"我要冰的。","pinyin":"Wǒ yào bīng de.","vietnamese":"Tôi lấy đá."}
  ],
  "newWords": [
    {"hanzi":"热","pinyin":"rè","vietnamese":"nóng"}
  ]
}
```

### 5.3 Backend phải có
- Validate input (giới hạn độ dài `userInput` ≤ 300 ký tự, `history` ≤ 20 lượt gần nhất để tiết kiệm token).
- **Rate limit** theo IP (ví dụ 30 request / 10 phút). Dùng giải pháp miễn phí đơn giản (in-memory hoặc Upstash Redis free tier). Trả lỗi 429 với thông báo tiếng Việt thân thiện: *"Bạn nói nhiều quá, nghỉ 1 chút rồi thử lại nhé!"*
- Xử lý lỗi: API lỗi / hết quota / timeout → trả message tiếng Việt dễ hiểu, frontend hiện nút "Thử lại".
- Bật CORS đúng cách, không log nội dung nhạy cảm.

---

## 6. SYSTEM PROMPT cho gia sư AI (đặt trong `src/lib/prompts.ts` hoặc `api/`)

> Antigravity: hãy dùng nguyên văn prompt dưới đây làm system instruction cho Gemini, chỉ thay các biến `{{...}}` bằng giá trị thực tế.

```
Bạn là "Lão Sư Mei" (美老师) — một gia sư tiếng Trung giao tiếp thân thiện, kiên nhẫn, vui tính, dạy 1-1 cho người Việt Nam.

# MỤC TIÊU
Giúp học viên NÓI và NGHE tiếng Trung giao tiếp hằng ngày một cách tự nhiên. Học viên không cần giỏi ngữ pháp — cần nói được, dám nói, và nói đúng dần.

# THÔNG TIN HIỆN TẠI
- Trình độ học viên: {{level}}  (HSK1 = chỉ dùng ~150 từ cơ bản, câu rất ngắn; HSK2 = ~300 từ; HSK3 = ~600 từ)
- Tình huống đang luyện: {{scenario}}  (vai của bạn trong tình huống: {{aiRole}})
- Chế độ sửa lỗi: {{correctionMode}}

# QUY TẮC HỘI THOẠI
1. Nhập vai theo tình huống một cách tự nhiên (ví dụ: nhân viên nhà hàng). Luôn nói chuyện như người thật, không như sách giáo khoa.
2. Câu trả lời tiếng Trung PHẢI NGẮN: 1–2 câu, tối đa ~20 chữ Hán. Dùng đúng từ vựng trong phạm vi trình độ {{level}}. Nếu bắt buộc dùng từ khó hơn, hãy đưa vào "newWords".
3. Mỗi lượt kết thúc bằng MỘT câu hỏi hoặc lời mời để học viên nói tiếp. Không hỏi dồn nhiều câu cùng lúc.
4. Dùng tiếng Trung giản thể + pinyin có dấu thanh chuẩn (nǐ hǎo, không dùng nhi3 hao3).
5. Phần giải thích, nhận xét, "nghĩa tiếng Việt" viết bằng tiếng Việt, ngắn gọn, dễ hiểu, giọng khích lệ.
6. Nếu học viên nói TIẾNG VIỆT: hiểu ý họ, đưa ra câu tiếng Trung tương ứng ở phần "suggestions", rồi trong "reply" hãy mời họ thử nói lại bằng tiếng Trung (vẫn giữ mạch nhập vai).
7. Nếu học viên nói sai/thiếu: KHÔNG bỏ qua hội thoại để giảng bài dài dòng. Hãy tiếp tục câu chuyện bình thường trong "reply", và đặt phần sửa lỗi vào "feedback".
   - Chế độ "gentle": chỉ sửa lỗi quan trọng nhất (tối đa 1 lỗi/lượt), giữ tinh thần tích cực.
   - Chế độ "immediate": sửa mọi lỗi đáng kể, giải thích ngắn.
8. Văn bản nhận từ nhận diện giọng nói có thể sai chính tả/đồng âm. Nếu câu nghe vô nghĩa, hãy đoán ý hợp lý nhất theo ngữ cảnh; nếu thật sự không hiểu, nhẹ nhàng nhờ họ nói lại (bằng tiếng Trung đơn giản + giải thích tiếng Việt). Không trách học viên.
9. "pronunciationTip": chỉ đưa khi có từ dễ phát âm sai (thanh điệu, âm uốn lưỡi zh/ch/sh/r, phân biệt j/q/x, z/c/s...). Mẹo phải ngắn, dùng so sánh với tiếng Việt nếu giúp được.
10. Luôn khích lệ. Khen cụ thể khi học viên nói đúng ("Câu này tự nhiên lắm!").
11. Không nói chuyện ngoài chủ đề học tiếng; nếu học viên hỏi việc khác (chính trị, nội dung nhạy cảm, nhờ làm việc không liên quan), nhẹ nhàng đưa lại về luyện nói.
12. Nếu học viên yêu cầu "nói chậm hơn / đơn giản hơn / giải thích thêm" thì làm theo ngay.

# ĐỊNH DẠNG ĐẦU RA
Chỉ trả về JSON hợp lệ đúng schema được cung cấp. Không thêm markdown, không thêm giải thích ngoài JSON.
- "reply": câu nói của bạn (hanzi, pinyin, vietnamese).
- "feedback": nhận xét về câu của học viên (hasMistake=false thì các trường còn lại để rỗng hoặc là lời khen ngắn).
- "suggestions": 2–3 câu học viên có thể nói tiếp (từ dễ → khó nhẹ).
- "newWords": 0–3 từ mới đáng học trong lượt này.
```

### 6.1 Prompt mở đầu mỗi tình huống
Khi vào phòng hội thoại, frontend gửi một request "khởi động" để AI **là người nói trước** (ví dụ nhân viên nhà hàng chào khách), kèm gợi ý câu trả lời đầu tiên. Học viên không phải suy nghĩ "nói gì đây".

### 6.2 Dữ liệu tình huống (`scenarios.ts`)
Mỗi tình huống gồm: `id`, `emoji`, `titleVi`, `aiRole`, `goalVi` (mục tiêu buổi học, vd: "Gọi được 1 món và hỏi giá"), và `openingHint`. Cho 8 tình huống ở mục 4.1.

---

## 7. LỘ TRÌNH THỰC HIỆN (làm tuần tự, mỗi Phase phải chạy được rồi mới sang Phase sau)

### Phase 0 — Khởi tạo
- Tạo project, cài thư viện, tạo `.env.example`, `.gitignore` (có `.env*`).
- Hướng dẫn tôi lấy **Gemini API key** tại `https://aistudio.google.com/apikey` và đặt vào file `.env.local`.
- ✅ **Hoàn thành khi:** `npm run dev` chạy được, hiện trang trống có tiêu đề.

### Phase 1 — Backend chat (chưa có giọng nói)
- Viết `/api/chat` gọi Gemini với system prompt (mục 6) + JSON schema (mục 5.2).
- Tạo trang test tạm: gõ chữ → hiện phản hồi.
- ✅ **Hoàn thành khi:** gõ "你好" ra JSON đúng schema, có pinyin + nghĩa Việt; key không xuất hiện trong bundle frontend (kiểm tra bằng cách tìm chuỗi key trong thư mục build).

### Phase 2 — Giao diện hội thoại bằng chữ
- Màn Home (chọn trình độ + tình huống) và màn Conversation (bubble chat, hiển thị Hán tự/pinyin/nghĩa, thẻ feedback, gợi ý).
- AI nói trước khi vào tình huống.
- ✅ **Hoàn thành khi:** trò chuyện trọn 1 tình huống bằng gõ chữ, giao diện đẹp trên khung điện thoại 375px.

### Phase 3 — Giọng nói (TÍNH NĂNG CỐT LÕI)
- Hook `useSpeechRecognition` (zh-CN, interim results, tự dừng khi im lặng, xử lý lỗi quyền mic bị từ chối với hướng dẫn tiếng Việt).
- Hook `useSpeechSynthesis` (đọc zh-CN, tốc độ chậm/thường, nút nghe lại/nghe chậm, tự chọn giọng zh-CN tốt nhất có sẵn).
- Nút mic lớn với animation, luồng: nói → gửi → AI trả lời → tự đọc.
- Phát hiện trình duyệt không hỗ trợ → hiện thông báo gợi ý dùng Chrome/Safari mới + vẫn cho gõ chữ.
- ✅ **Hoàn thành khi:** trên điện thoại thật (Chrome Android hoặc Safari iOS), nói 1 câu tiếng Trung → nghe AI trả lời bằng giọng Trung, không cần gõ gì.

### Phase 4 — Trải nghiệm gia sư
- Gợi ý 💡, chế độ tiếng Việt, thẻ nhận xét cuối buổi (tóm tắt: số lượt nói, từ mới, 1–2 lỗi hay gặp, lời khen).
- Cài đặt (mục 4.3) lưu trong `localStorage`.
- Danh sách "từ mới đã gặp" trong buổi (hiện cuối buổi, cho phép nghe lại).
- ✅ **Hoàn thành khi:** 1 buổi luyện hoàn chỉnh từ chọn tình huống → hội thoại ~10 lượt → màn tổng kết.

### Phase 5 — Chất lượng & an toàn
- Rate limit (mục 5.3), xử lý lỗi tiếng Việt, nút thử lại, loading mượt.
- Giảm độ trễ: tối ưu độ dài prompt, giới hạn lịch sử, dùng streaming nếu hợp lý.
- (Tuỳ chọn) Nâng giọng đọc bằng Gemini TTS, có fallback về giọng trình duyệt.
- ✅ **Hoàn thành khi:** không còn lỗi console, thử cố tình spam → bị giới hạn lịch sự, thử tắt mạng → hiện thông báo rõ ràng.

### Phase 6 — Deploy miễn phí & chia sẻ
- Hướng dẫn **từng bước** tôi: đẩy code lên GitHub → kết nối **Vercel** → thêm biến môi trường `GEMINI_API_KEY` → Deploy.
- Cung cấp link dạng `ten-du-an.vercel.app`; thêm favicon, tiêu đề, ảnh preview (Open Graph) để khi gửi link qua Zalo/Messenger hiện đẹp.
- Thêm **PWA** cơ bản (manifest + icon) để người dùng có thể "Thêm vào màn hình chính".
- ✅ **Hoàn thành khi:** tôi mở link công khai trên điện thoại khác và nói chuyện được.

### Phase 7 — (Tuỳ chọn, sau khi MVP ổn) Nâng cấp
- **Gemini Live API** để hội thoại audio thời gian thực, cho phép ngắt lời tự nhiên (dùng ephemeral token, không lộ key).
- Chấm điểm phát âm chi tiết hơn (so sánh câu mẫu với bản nhận diện).
- Lưu lịch sử luyện tập (cần đăng nhập/DB — chỉ làm khi tôi yêu cầu).

---

## 8. Checklist kiểm thử cuối cùng

- [ ] Nói câu tiếng Trung đúng → AI hiểu và trả lời hợp ngữ cảnh.
- [ ] Nói câu sai ngữ pháp → có feedback nhẹ nhàng, hội thoại không bị gián đoạn.
- [ ] Nói tiếng Việt → AI dạy lại câu tiếng Trung tương ứng.
- [ ] Nhận diện sai (đồng âm) → AI đoán đúng ý hoặc nhờ nói lại lịch sự.
- [ ] Nút nghe lại / nghe chậm hoạt động trên iOS Safari và Android Chrome.
- [ ] Từ chối quyền mic → có hướng dẫn bật lại, vẫn dùng được bằng gõ chữ.
- [ ] Bật/tắt pinyin và nghĩa Việt hoạt động.
- [ ] Không tìm thấy API key trong mã nguồn phía trình duyệt.
- [ ] Rate limit hoạt động, thông báo thân thiện.
- [ ] Giao diện không bị vỡ ở 360px – 430px và trên desktop.
- [ ] Link công khai mở được trên máy khác, không cần đăng nhập.

---

## 9. Quy tắc làm việc dành cho Antigravity

1. **Plan trước, code sau.** Đưa Implementation Plan để tôi duyệt, rồi mới làm.
2. Làm **từng Phase**, sau mỗi Phase tóm tắt bằng tiếng Việt: đã làm gì, cách tôi tự kiểm tra, có vấn đề gì không.
3. **Không tự ý thêm tính năng** ngoài đặc tả (không flashcard, không quiz, không đăng nhập) trừ khi tôi yêu cầu.
4. Khi cần tôi can thiệp (lấy key, bấm nút trên Vercel…), ghi rõ **"👉 VIỆC BẠN CẦN LÀM:"** kèm các bước đánh số.
5. Nếu thấy tên model / API của Gemini khác với đặc tả, **tra tài liệu chính thức** và báo tôi, đừng tự đoán.
6. Ưu tiên **đơn giản, chạy ổn định, độ trễ thấp** hơn là nhiều tính năng.
7. Cuối cùng, tạo mục "Hướng dẫn sử dụng & bảo trì" ngắn gọn trong README này (cách đổi API key, cách xem quota, cách cập nhật nội dung tình huống).

---

## 10. Hướng dẫn sử dụng & bảo trì

### 10.1 Cách đổi API Key
- **Khi chạy trên máy tính (Local):**
  1. Mở file `.env.local` ở thư mục gốc của dự án.
  2. Thay đổi giá trị: `GEMINI_API_KEY=your_new_key_here`.
  3. Khởi động lại server: bấm `Ctrl + C` rồi chạy lại `npm run dev`.
- **Khi đã deploy lên Vercel:**
  1. Đăng nhập vào [Vercel Dashboard](https://vercel.com).
  2. Chọn dự án `web-chinese-tutor` → vào tab **Settings** → chọn **Environment Variables**.
  3. Tìm biến `GEMINI_API_KEY` và chỉnh sửa giá trị key mới.
  4. Vào tab **Deployments**, chọn ba chấm `...` ở bản deploy mới nhất → chọn **Redeploy**.

### 10.2 Cách kiểm tra Quota sử dụng của Gemini API
1. Truy cập [Google AI Studio](https://aistudio.google.com/).
2. Đăng nhập tài khoản Google của bạn.
3. Vào mục **API Keys** hoặc [Google Cloud Console Billing / Quotas](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas) để theo dõi số lượt request đã gọi trong ngày và trong tháng (gói miễn phí của Google AI Studio thường cấp ~15 request/phút và 1.500 request/ngày, hoàn toàn đủ cho nhu cầu học tập cá nhân và bạn bè).

### 10.3 Cách cập nhật hoặc thêm tình huống mới
1. Mở file `src/lib/scenarios.ts`.
2. Trong mảng `SCENARIOS`, bạn có thể sửa đổi nội dung tiếng Việt của các tình huống có sẵn hoặc thêm tình huống mới theo cấu trúc:
```ts
{
  id: 'ten_tinh_huong_khong_dau',
  emoji: '☕',
  titleVi: 'Tên tình huống hiển thị',
  aiRole: 'Vai của Lão Sư Mei (ví dụ: Người bán trà sữa)',
  goalVi: 'Mục tiêu bạn muốn đạt được',
  openingHint: 'Gợi ý mở đầu khi vừa vào phòng'
}
```
3. Lưu file và ứng dụng sẽ tự động cập nhật ngay lập tức!

