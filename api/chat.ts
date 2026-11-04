import { GoogleGenAI, Type } from '@google/genai';

// In-memory rate limiter: Giới hạn 30 requests / 10 phút trên mỗi IP
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 phút
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Xoá bớt các record cũ để tránh phình bộ nhớ
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count };
}

// Bảng mô tả 8 tình huống để đưa vào prompt
const SCENARIO_ROLES: Record<string, { titleVi: string; role: string }> = {
  greeting: { titleVi: 'Chào hỏi & giới thiệu bản thân', role: 'Một người bạn Trung Quốc mới gặp' },
  restaurant: { titleVi: 'Gọi món ở nhà hàng', role: 'Nhân viên phục vụ quán ăn' },
  shopping: { titleVi: 'Mua sắm & mặc cả', role: 'Chủ tiệm bán quần áo / đồ lưu niệm' },
  taxi: { titleVi: 'Đi taxi / hỏi đường', role: 'Bác tài xế taxi' },
  hotel: { titleVi: 'Nhận phòng khách sạn', role: 'Lễ tân khách sạn' },
  pharmacy: { titleVi: 'Đi khám / mua thuốc', role: 'Dược sĩ hiệu thuốc' },
  coffee: { titleVi: 'Làm quen, trò chuyện đời thường', role: 'Bạn học / đồng nghiệp tại quán cà phê' },
  free_talk: { titleVi: 'Nói chuyện tự do', role: 'Lão Sư Mei thân thiện' },
};

export default async function handler(req: any, res: any) {
  // Bật CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }

  // 1. Kiểm tra Rate Limit theo IP
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'anonymous';

  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Bạn nói nhiều quá rồi nè! Hãy nghỉ ngơi uống ngụm nước rồi thử lại sau ít phút nhé. 😊'
    });
  }

  // 2. Kiểm tra API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    return res.status(500).json({
      error: 'Chưa cấu hình GEMINI_API_KEY! Hãy mở file .env.local và dán Gemini API Key của bạn vào nhé.'
    });
  }

  // 3. Đọc và kiểm tra dữ liệu đầu vào
  const body = req.body || {};
  const {
    scenarioId = 'greeting',
    level = 'HSK1',
    correctionMode = 'gentle',
    history = [],
    userInput = '',
    inputLang = 'zh'
  } = body;

  // Giới hạn độ dài input tránh lạm dụng token
  if (typeof userInput === 'string' && userInput.length > 300) {
    return res.status(400).json({
      error: 'Câu nói quá dài (tối đa 300 ký tự). Vui lòng chia ngắn câu nói để luyện tập hiệu quả hơn nhé!'
    });
  }

  const scenarioMeta = SCENARIO_ROLES[scenarioId] || SCENARIO_ROLES.greeting;

  // 4. Xây dựng System Instruction cho Lão Sư Mei
  const systemInstruction = `Bạn là "Lão Sư Mei" (美老师) — một gia sư tiếng Trung giao tiếp thân thiện, kiên nhẫn, vui tính, dạy 1-1 cho người Việt Nam.

# MỤC TIÊU
Giúp học viên NÓI và NGHE tiếng Trung giao tiếp hằng ngày một cách tự nhiên. Học viên không cần giỏi ngữ pháp — cần nói được, dám nói, và nói đúng dần.

# THÔNG TIN HIỆN TẠI
- Trình độ học viên: ${level} (HSK1 = chỉ dùng ~150 từ cơ bản, câu rất ngắn; HSK2 = ~300 từ; HSK3 = ~600 từ)
- Tình huống đang luyện: ${scenarioMeta.titleVi} (vai của bạn trong tình huống: ${scenarioMeta.role})
- Chế độ sửa lỗi: ${correctionMode === 'gentle' ? 'Nhẹ nhàng (khích lệ là chính, tối đa 1 lỗi/lượt)' : 'Sửa ngay mọi lỗi'}
- Ngôn ngữ học viên vừa nói: ${inputLang === 'vi' ? 'Tiếng Việt' : 'Tiếng Trung'}

# QUY TẮC HỘI THOẠI
1. Nhập vai theo tình huống một cách tự nhiên. Luôn nói chuyện như người thật, không như sách giáo khoa.
2. Câu trả lời tiếng Trung PHẢI NGẮN: 1–2 câu, tối đa ~20 chữ Hán. Dùng đúng từ vựng trong phạm vi trình độ ${level}. Nếu bắt buộc dùng từ khó hơn, hãy đưa vào "newWords".
3. Mỗi lượt kết thúc bằng MỘT câu hỏi hoặc lời mời để học viên nói tiếp. Không hỏi dồn nhiều câu cùng lúc.
4. Dùng tiếng Trung giản thể (简体) + pinyin có dấu thanh chuẩn (nǐ hǎo, không dùng số nhi3 hao3).
5. Phần giải thích, nhận xét, "nghĩa tiếng Việt" viết bằng tiếng Việt, ngắn gọn, dễ hiểu, giọng khích lệ.
6. Nếu học viên nói TIẾNG VIỆT: hiểu ý họ, đưa ra câu tiếng Trung tương ứng ở phần "suggestions", rồi trong "reply" hãy mời họ thử nói lại bằng tiếng Trung (vẫn giữ mạch nhập vai).
7. Nếu học viên nói sai/thiếu: KHÔNG bỏ qua hội thoại để giảng bài dài dòng. Hãy tiếp tục câu chuyện bình thường trong "reply", và đặt phần sửa lỗi vào "feedback".
   - Chế độ "gentle": chỉ sửa lỗi quan trọng nhất (tối đa 1 lỗi/lượt), giữ tinh thần tích cực.
   - Chế độ "immediate": sửa mọi lỗi đáng kể, giải thích ngắn.
8. Văn bản nhận từ nhận diện giọng nói có thể sai chính tả/đồng âm. Nếu câu nghe vô nghĩa, hãy đoán ý hợp lý nhất theo ngữ cảnh; nếu thật sự không hiểu, nhẹ nhàng nhờ họ nói lại (bằng tiếng Trung đơn giản + giải thích tiếng Việt). Không trách học viên.
9. "pronunciationTip": chỉ đưa khi có từ dễ phát âm sai (thanh điệu, âm uốn lưỡi zh/ch/sh/r, phân biệt j/q/x, z/c/s...). Mẹo phải ngắn, dùng so sánh với tiếng Việt nếu giúp được.
10. Luôn khích lệ. Khen cụ thể khi học viên nói đúng ("Câu này tự nhiên lắm!").
11. Không nói chuyện ngoài chủ đề học tiếng; nếu học viên hỏi việc khác, nhẹ nhàng đưa lại về luyện nói.
12. Nếu đây là lượt mở đầu (người dùng chưa nói gì hoặc bắt đầu tình huống), bạn HÃY LÀ NGƯỜI CHỦ ĐỘNG CHÀO HỎI TRƯỚC theo đúng vai của mình và hỏi một câu mở màn thật ngắn gọn, kèm 2-3 gợi ý câu trả lời.

# ĐỊNH DẠNG ĐẦU RA
Chỉ trả về JSON hợp lệ theo đúng schema được cung cấp.`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Cắt giảm lịch sử hội thoại: chỉ giữ 10 lượt gần nhất
    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
    
    let promptText = '';
    if (recentHistory.length > 0) {
      promptText += 'LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ:\n';
      for (const turn of recentHistory) {
        promptText += `${turn.role === 'user' ? 'Học viên' : 'Lão Sư Mei'}: ${turn.text}\n`;
      }
      promptText += '\n';
    }

    if (!userInput || userInput.trim() === '' || userInput === '__INIT__') {
      promptText += 'Học viên vừa bước vào tình huống. Hãy bắt đầu câu chuyện bằng một lời chào và hỏi mở đầu.';
    } else {
      promptText += `Học viên vừa nói: "${userInput.trim()}" (ngôn ngữ: ${inputLang === 'vi' ? 'Tiếng Việt' : 'Tiếng Trung'}).`;
    }

    // Danh sách model ưu tiên
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
    ].filter(Boolean) as string[];

    let lastError: any = null;
    let responseText: string | null = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.OBJECT,
                  properties: {
                    hanzi: { type: Type.STRING },
                    pinyin: { type: Type.STRING },
                    vietnamese: { type: Type.STRING },
                  },
                  required: ['hanzi', 'pinyin', 'vietnamese'],
                },
                feedback: {
                  type: Type.OBJECT,
                  properties: {
                    hasMistake: { type: Type.BOOLEAN },
                    userSaid: { type: Type.STRING },
                    better: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    pronunciationTip: { type: Type.STRING },
                  },
                  required: ['hasMistake'],
                },
                suggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      hanzi: { type: Type.STRING },
                      pinyin: { type: Type.STRING },
                      vietnamese: { type: Type.STRING },
                    },
                    required: ['hanzi', 'pinyin', 'vietnamese'],
                  },
                },
                newWords: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      hanzi: { type: Type.STRING },
                      pinyin: { type: Type.STRING },
                      vietnamese: { type: Type.STRING },
                    },
                    required: ['hanzi', 'pinyin', 'vietnamese'],
                  },
                },
              },
              required: ['reply', 'feedback', 'suggestions', 'newWords'],
            },
          },
        });

        if (response.text) {
          responseText = response.text;
          break; // Gọi thành công
        }
      } catch (callErr: any) {
        lastError = callErr;
        console.warn(`[Model ${modelName} failed, trying next]:`, callErr?.message);
      }
    }

    if (!responseText) {
      throw lastError || new Error('Không thể kết nối với Gemini AI');
    }

    // Làm sạch chuỗi trước khi parse JSON (phòng hờ trường hợp có bọc markdown)
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    const jsonResult = JSON.parse(cleanJson);
    return res.status(200).json(jsonResult);
  } catch (err: any) {
    console.error('[Gemini API Call Failed]:', err);
    return res.status(500).json({
      error: 'Lão Sư Mei đang bận một chút hoặc có sự cố kết nối: ' + (err?.message || 'Vui lòng thử lại sau giây lát!')
    });
  }
}
