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

  if (typeof userInput === 'string' && userInput.length > 300) {
    return res.status(400).json({
      error: 'Câu nói quá dài (tối đa 300 ký tự). Vui lòng chia ngắn câu nói để luyện tập hiệu quả hơn nhé!'
    });
  }

  const scenarioMeta = SCENARIO_ROLES[scenarioId] || SCENARIO_ROLES.greeting;
  const isInitial = !userInput || userInput.trim() === '' || userInput === '__INIT__';

  // 4. Xây dựng System Instruction cho Lão Sư Mei
  const systemInstruction = `Bạn là "Lão Sư Mei" (美老师) — một gia sư tiếng Trung giao tiếp thân thiện, kiên nhẫn, vui tính, dạy 1-1 cho người Việt Nam.

# MỤC TIÊU CỐT LÕI:
Người học cần:
1. Khi nói tiếng Trung: ĐƯỢC KIỂM TRA ĐÚNG HOẶC SAI TRƯỚC. Nếu sai ngữ pháp / dùng từ chưa chuẩn, Lão Sư Mei PHẢI SỬA LỖI TRƯỚC, rồi sau đó mới tiếp tục câu chuyện và hỏi tiếp.
2. Khi nói tiếng Việt (hỏi cách nói / bí từ): Lão Sư Mei PHẢI DẠY CÂU TIẾNG TRUNG TƯƠNG ỨNG, hướng dẫn phát âm để học viên đọc theo.

# THÔNG TIN BỐI CẢNH:
- Trình độ học viên: ${level} (HSK1 = ~150 từ, HSK2 = ~300 từ, HSK3 = ~600 từ)
- Tình huống: ${scenarioMeta.titleVi} (Vai của bạn: ${scenarioMeta.role})
- Chế độ sửa lỗi: ${correctionMode === 'gentle' ? 'Nhẹ nhàng (sửa lỗi quan trọng nhất, giọng khích lệ)' : 'Sửa chi tiết mọi lỗi'}

# ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Chỉ trả về JSON theo đúng schema.
- "hanzi" và "correctedHanzi": BẮT BUỘC là CHỮ HÁN GIẢN THỂ (汉字 - chữ tượng hình, ví dụ: 好的，没问题！). TUYỆT ĐỐI KHÔNG để pinyin hoặc chữ La-tinh vào các trường này.
- "pinyin" và "correctedPinyin": Phiên âm pinyin có dấu thanh chuẩn (Nǐ hǎo!).
- "vietnamese": Dịch nghĩa tiếng Việt tự nhiên.`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Cắt giảm lịch sử hội thoại: chỉ giữ 10 lượt gần nhất
    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
    
    let promptText = '';
    if (recentHistory.length > 0) {
      promptText += '--- LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ ---\n';
      for (const turn of recentHistory) {
        promptText += `${turn.role === 'user' ? 'Học viên' : 'Lão Sư Mei'}: ${turn.text}\n`;
      }
      promptText += '---------------------------------\n\n';
    }

    if (isInitial) {
      promptText += `[LƯỢT MỞ ĐẦU TÌNH HUỐNG]\n`;
      promptText += `Học viên vừa bước vào tình huống "${scenarioMeta.titleVi}". Bạn đóng vai "${scenarioMeta.role}".\n`;
      promptText += `Hãy đặt evaluation.type = "initial_greeting".\n`;
      promptText += `Trong "reply", hãy chủ động chào đón học viên và hỏi một câu mở màn ngắn gọn (kèm 2-3 câu gợi ý cho học viên trả lời).`;
    } else {
      promptText += `[YÊU CẦU BẮT BUỘC: ĐÂY KHÔNG PHẢI LÀ LƯỢT MỞ ĐẦU!]\n`;
      promptText += `Học viên vừa nói câu: "${userInput.trim()}".\n`;
      promptText += `Ngôn ngữ học viên đã nói: ${inputLang === 'vi' ? 'TIẾNG VIỆT' : 'TIẾNG TRUNG'}.\n\n`;

      promptText += `BẠN BẮT BUỘC XỬ LÝ 2 BƯỚC:\n`;
      promptText += `BƯỚC 1 - ĐÁNH GIÁ (trong đối tượng "evaluation"):\n`;

      if (inputLang === 'vi') {
        promptText += `- Học viên đang nói tiếng Việt: "${userInput.trim()}".\n`;
        promptText += `- Đặt evaluation.type = "vietnamese_help".\n`;
        promptText += `- Dạy học viên câu tiếng Trung tương ứng:\n`;
        promptText += `  + "correctedHanzi": Câu tiếng Trung chuẩn bằng chữ Hán giản thể.\n`;
        promptText += `  + "correctedPinyin": Pinyin có dấu thanh chuẩn.\n`;
        promptText += `  + "correctedVietnamese": Nghĩa tiếng Việt.\n`;
        promptText += `  + "praiseOrCorrectionVi": Giải thích ngắn gọn cách nói câu này bằng tiếng Việt.\n\n`;
        promptText += `BƯỚC 2 - PHẢN HỒI (trong đối tượng "reply"):\n`;
        promptText += `- Trong "reply", Lão Sư Mei hãy mời học viên thử bấm mic tiếng Trung và đọc lại câu tiếng Trung mẫu vừa được dạy.\n`;
      } else {
        promptText += `- Học viên vừa nói câu tiếng Trung: "${userInput.trim()}".\n`;
        promptText += `- Hãy nhận xét trực tiếp vào câu "${userInput.trim()}":\n`;
        promptText += `  + NẾU CÂU CÓ LỖI HOẶC CHƯA TỰ NHIÊN (ví dụ sai trật tự từ, thiếu lượng từ, dùng từ chưa chuẩn):\n`;
        promptText += `    * Đặt evaluation.type = "needs_correction".\n`;
        promptText += `    * "praiseOrCorrectionVi": Giải thích cụ thể lỗi sai của câu "${userInput.trim()}" bằng tiếng Việt và hướng dẫn cách sửa.\n`;
        promptText += `    * "correctedHanzi": Viết lại câu hoàn chỉnh, chuẩn xác nhất (bằng chữ Hán giản thể).\n`;
        promptText += `    * "correctedPinyin": Pinyin có dấu thanh của câu chuẩn.\n`;
        promptText += `    * "correctedVietnamese": Nghĩa tiếng Việt của câu chuẩn.\n`;
        promptText += `  + NẾU CÂU ĐÃ ĐÚNG VÀ TỰ NHIÊN:\n`;
        promptText += `    * Đặt evaluation.type = "correct".\n`;
        promptText += `    * "praiseOrCorrectionVi": Khen ngợi cụ thể bằng tiếng Việt (ví dụ: "Rất chuẩn! Câu này bạn nói hoàn toàn chính xác."). \n`;
        promptText += `    * "correctedHanzi": Trùng với câu học viên đã nói (chữ Hán).\n\n`;
        promptText += `BƯỚC 2 - TIẾP TỤC HỘI THOẠI (trong đối tượng "reply"):\n`;
        promptText += `- Dù học viên nói đúng hay sai, sau khi đã đánh giá ở Bước 1, Lão Sư Mei hãy nhập vai "${scenarioMeta.role}" trả lời tiếp câu chuyện bằng 1-2 câu tiếng Trung ngắn gọn và HỎI TIẾP MỘT CÂU để học viên nói tiếp.\n`;
      }
    }

    // Danh sách model thế hệ mới ưu tiên
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
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
                evaluation: {
                  type: Type.OBJECT,
                  description: 'Kiểm tra đúng/sai trước, sửa lỗi hoặc hướng dẫn dịch câu tiếng Việt',
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: '"correct" | "needs_correction" | "vietnamese_help" | "initial_greeting"',
                    },
                    praiseOrCorrectionVi: {
                      type: Type.STRING,
                      description: 'Nhận xét bằng tiếng Việt: Khen ngợi nếu đúng; Chỉ rõ lỗi và cách sửa nếu sai; Hoặc chỉ cách dịch nếu nói tiếng Việt',
                    },
                    correctedHanzi: {
                      type: Type.STRING,
                      description: 'Câu tiếng Trung chuẩn xác bằng chữ Hán giản thể',
                    },
                    correctedPinyin: {
                      type: Type.STRING,
                      description: 'Pinyin có dấu thanh của câu tiếng Trung chuẩn',
                    },
                    correctedVietnamese: {
                      type: Type.STRING,
                      description: 'Nghĩa tiếng Việt của câu tiếng Trung chuẩn',
                    },
                  },
                  required: ['type', 'praiseOrCorrectionVi'],
                },
                reply: {
                  type: Type.OBJECT,
                  description: 'Câu nói của Lão Sư Mei tiếp nối cuộc trò chuyện',
                  properties: {
                    hanzi: { type: Type.STRING, description: 'BẮT BUỘC là CHỮ HÁN GIẢN THỂ (汉字)' },
                    pinyin: { type: Type.STRING, description: 'Phiên âm pinyin có dấu thanh chuẩn' },
                    vietnamese: { type: Type.STRING, description: 'Nghĩa tiếng Việt tự nhiên' },
                  },
                  required: ['hanzi', 'pinyin', 'vietnamese'],
                },
                suggestions: {
                  type: Type.ARRAY,
                  description: '2-3 câu gợi ý cho học viên nói tiếp',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      hanzi: { type: Type.STRING, description: 'Chữ Hán giản thể' },
                      pinyin: { type: Type.STRING, description: 'Pinyin có dấu' },
                      vietnamese: { type: Type.STRING, description: 'Nghĩa tiếng Việt' },
                    },
                    required: ['hanzi', 'pinyin', 'vietnamese'],
                  },
                },
                newWords: {
                  type: Type.ARRAY,
                  description: 'Các từ mới đáng học trong lượt này',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      hanzi: { type: Type.STRING, description: 'Chữ Hán giản thể của từ' },
                      pinyin: { type: Type.STRING, description: 'Pinyin của từ' },
                      vietnamese: { type: Type.STRING, description: 'Nghĩa tiếng Việt của từ' },
                    },
                    required: ['hanzi', 'pinyin', 'vietnamese'],
                  },
                },
              },
              required: ['evaluation', 'reply', 'suggestions', 'newWords'],
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

    // Làm sạch chuỗi trước khi parse JSON
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    const jsonResult = JSON.parse(cleanJson);

    if (jsonResult.evaluation && !jsonResult.feedback) {
      jsonResult.feedback = {
        hasMistake: jsonResult.evaluation.type === 'needs_correction',
        userSaid: userInput,
        better: jsonResult.evaluation.correctedHanzi,
        explanation: jsonResult.evaluation.praiseOrCorrectionVi,
      };
    }

    return res.status(200).json(jsonResult);
  } catch (err: any) {
    console.error('[Gemini API Call Failed]:', err);
    return res.status(500).json({
      error: 'Lão Sư Mei đang bận một chút hoặc có sự cố kết nối: ' + (err?.message || 'Vui lòng thử lại sau giây lát!')
    });
  }
}
