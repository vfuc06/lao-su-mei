import { GoogleGenAI, Type } from '@google/genai';
import { pinyin } from 'pinyin-pro';

// Danh sách tình huống đầy đủ (8 Đời sống + 10 Công sở)
const SCENARIO_ROLES: Record<string, { titleVi: string; role: string; mode: 'daily' | 'workplace'; goalVi: string }> = {
  // Đời sống
  greeting: { titleVi: 'Chào hỏi & giới thiệu', role: 'Một người bạn Trung Quốc mới gặp', mode: 'daily', goalVi: 'Biết cách chào, giới thiệu tên, tuổi và quê quán Việt Nam.' },
  restaurant: { titleVi: 'Gọi món ở nhà hàng', role: 'Nhân viên phục vụ quán ăn', mode: 'daily', goalVi: 'Gọi được món ăn, đồ uống và thanh toán.' },
  shopping: { titleVi: 'Mua sắm & mặc cả', role: 'Chủ cửa hàng quần áo / đồ lưu niệm', mode: 'daily', goalVi: 'Hỏi giá, chê đắt và mặc cả bớt.' },
  taxi: { titleVi: 'Đi taxi / hỏi đường', role: 'Tài xế taxi', mode: 'daily', goalVi: 'Nói địa điểm muốn đến, chỉ đường rẽ trái/phải.' },
  hotel: { titleVi: 'Nhận phòng khách sạn', role: 'Lễ tân khách sạn', mode: 'daily', goalVi: 'Check-in phòng đã đặt, hỏi wifi và ăn sáng.' },
  pharmacy: { titleVi: 'Đi khám / mua thuốc', role: 'Dược sĩ hiệu thuốc', mode: 'daily', goalVi: 'Mô tả triệu chứng đau đầu/sốt/đau bụng và hỏi liều dùng.' },
  coffee: { titleVi: 'Làm quen, trò chuyện đời thường', role: 'Bạn học / đồng nghiệp tại quán cà phê', mode: 'daily', goalVi: 'Hỏi sở thích, thói quen và hẹn gặp lại.' },
  free_talk: { titleVi: 'Nói chuyện tự do', role: 'Lão Sư Mei thân thiện', mode: 'daily', goalVi: 'Thoải mái trò chuyện về bất kỳ chủ đề nào.' },

  // Công sở
  colleague_meet: { titleVi: 'Gặp đồng nghiệp mới & giới thiệu bản thân', role: 'Đồng nghiệp cùng phòng ban', mode: 'workplace', goalVi: 'Giới thiệu tên, vị trí công việc, chào hỏi lịch sự ngày đầu nhận việc.' },
  meeting: { titleVi: 'Họp & thảo luận công việc', role: 'Trưởng nhóm / Chủ trì cuộc họp', mode: 'workplace', goalVi: 'Nêu ý kiến, đồng ý/từ chối lịch sự và hỏi rõ yêu cầu công việc.' },
  phone_call: { titleVi: 'Nghe / gọi điện thoại công ty', role: 'Khách hàng / Đối tác gọi tới công ty', mode: 'workplace', goalVi: 'Chào chuẩn mực, chuyển máy, ghi lại lời nhắn hoặc hẹn gọi lại.' },
  boss_report: { titleVi: 'Báo cáo tiến độ với sếp', role: 'Sếp / Quản lý trực tiếp', mode: 'workplace', goalVi: 'Báo cáo việc đã hoàn thành, việc đang làm và xin ý kiến chỉ đạo (dùng 您).' },
  leave_request: { titleVi: 'Xin nghỉ phép / đi muộn / đổi ca', role: 'Quản lý nhân sự / Trưởng phòng', mode: 'workplace', goalVi: 'Nêu lý do, thời gian xin nghỉ phép/đi muộn và cách bàn giao việc.' },
  job_interview: { titleVi: 'Phỏng vấn xin việc', role: 'Người phỏng vấn tuyển dụng (HR)', mode: 'workplace', goalVi: 'Trả lời kinh nghiệm làm việc, điểm mạnh và lý do ứng tuyển.' },
  quotation_negotiation: { titleVi: 'Báo giá, đàm phán với đối tác', role: 'Đại diện đối tác thương mại', mode: 'workplace', goalVi: 'Hỏi số lượng, trao đổi đơn giá, thời gian giao hàng và điều khoản.' },
  customer_complaint: { titleVi: 'Xử lý phàn nàn / sự cố của khách hàng', role: 'Khách hàng đang bức xúc về dịch vụ', mode: 'workplace', goalVi: 'Lắng nghe, xin lỗi chân thành, giải thích nguyên nhân và đưa phương án bù đắp.' },
  lunch_gathering: { titleVi: 'Ăn trưa, liên hoan cùng đồng nghiệp', role: 'Nhóm bạn đồng nghiệp trong công ty', mode: 'workplace', goalVi: 'Giao lưu gần gũi, nói chuyện sở thích, đồ ăn và văn hóa công ty.' },
  workplace_free: { titleVi: 'Công sở tự do', role: 'Cố vấn nghề nghiệp Trung Quốc', mode: 'workplace', goalVi: 'Thoải mái trò chuyện về mọi tình huống văn phòng, tiếng lóng công sở.' },
};

function getSafePinyin(text: string): string {
  if (!text) return '';
  return pinyin(text, { toneType: 'symbol', type: 'string' });
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }

  // 1. Kiểm tra API Key Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    return res.status(500).json({
      error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ!',
    });
  }

  // 2. Xác thực người dùng qua Supabase Token & Kiểm tra Quota
  const authHeader = req.headers['authorization'];
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://lamhrbavfyhffeihyxdz.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f8W4S8FpFM2YZcA8zeryjQ_I_hC9JsI';
  const dailyQuota = parseInt(process.env.DAILY_AI_QUOTA || '80', 10);

  let verifiedUserId: string | null = null;
  let userToken: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ') && supabaseUrl) {
    userToken = authHeader.replace('Bearer ', '').trim();
    try {
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'apikey': serviceKey || anonKey,
        },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        verifiedUserId = userData?.id || null;
      }
    } catch (e) {
      console.warn('Lỗi xác thực token Supabase:', e);
    }
  }

  // Ràng buộc 5: Tính năng AI bắt buộc đăng nhập
  if (!verifiedUserId) {
    return res.status(401).json({
      error: 'Bạn cần đăng nhập để trò chuyện với Lão Sư Mei (để lưu tiến trình và sử dụng hạn mức mỗi ngày).',
    });
  }

  // Kiểm tra hạn mức ngày (Daily Quota)
  const todayVn = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  if (supabaseUrl && (serviceKey || userToken)) {
    try {
      const quotaHeaders: Record<string, string> = {
        'apikey': serviceKey || anonKey,
        'Authorization': serviceKey ? `Bearer ${serviceKey}` : `Bearer ${userToken}`,
      };
      const actRes = await fetch(
        `${supabaseUrl}/rest/v1/daily_activity?user_id=eq.${verifiedUserId}&day=eq.${todayVn}&select=ai_turns`,
        { headers: quotaHeaders }
      );
      if (actRes.ok) {
        const rows = await actRes.json();
        const currentTurns = rows?.[0]?.ai_turns || 0;
        if (currentTurns >= dailyQuota) {
          return res.status(429).json({
            error: `Hôm nay bạn đã dùng hết hạn mức ${dailyQuota} lượt hội thoại với AI. Hãy quay lại vào ngày mai nhé! 🎉`,
          });
        }
      }
    } catch (quotaErr) {
      console.warn('Lỗi kiểm tra hạn mức ngày:', quotaErr);
    }
  }

  // 3. Đọc dữ liệu đầu vào
  const body = req.body || {};
  const {
    action = 'turn', // 'start' | 'turn' | 'resume' | 'hint'
    scenarioId = 'greeting',
    history = [],
    userInput = '',
    inputLang = 'zh', // 'zh' | 'vi'
    hintLevel = 1,
  } = body;

  const scenarioMeta = SCENARIO_ROLES[scenarioId] || SCENARIO_ROLES.greeting;
  const isWorkplace = scenarioMeta.mode === 'workplace';

  // 4. Xây dựng System Instruction & Prompt
  const systemInstruction = `Bạn là "Lão Sư Mei" (美老师) — gia sư tiếng Trung giao tiếp thân thiện, thông minh, tận tâm dạy 1-1 cho người Việt Nam.

# NGUYÊN TẮC HỘI THOẠI 1-1 BẮT BUỘC:
1. LUÔN LUÔN DUY TRÌ ĐỐI THOẠI:
   - Dù học viên nói đúng hay nói sai, bạn LUÔN LUÔN NHẬP VAI "${scenarioMeta.role}" đáp lại câu chuyện và HỎI TIẾP MỘT CÂU MỚI để học viên có cái nói tiếp! KHÔNG BAO GIỜ im lặng hoặc dừng cuộc trò chuyện.
2. BẮT BUỘC ĐÁNH GIÁ & SỬA LỖI CÂU HỌC VIÊN NÓI (TRONG TRƯỜNG "evaluation"):
   - Mọi lượt học viên nói, bạn BẮT BUỘC phải phân tích kỹ câu nói của học viên:
     + Nếu học viên nói sai ngữ pháp, sai từ vựng, sai thanh điệu hoặc dùng từ gượng gạo:
       * Đặt evaluation.type = "needs_correction".
       * BẮT BUỘC giải thích chi tiết lỗi sai bằng tiếng Việt trong "praiseOrCorrectionVi" (sai ở đâu, vì sao sai và nên nói thế nào).
       * Cung cấp câu tiếng Trung chuẩn xác trong "correctedHanzi", "correctedPinyin", "correctedVietnamese".
     + Nếu học viên nói tiếng Trung đúng và tự nhiên:
       * Đặt evaluation.type = "correct".
       * Khen ngợi cụ thể bằng tiếng Việt trong "praiseOrCorrectionVi" (ví dụ: "Rất chuẩn! Bạn dùng từ rất đúng ngữ cảnh.").
     + Nếu học viên nói tiếng Việt hoặc hỏi cách diễn đạt:
       * Đặt evaluation.type = "vietnamese_help".
       * Hướng dẫn câu tiếng Trung tương đương trong "correctedHanzi" và giải thích nghĩa tiếng Việt.
3. PHẢN HỒI CỦA MEI (trong "reply"):
   - Nhập vai "${scenarioMeta.role}" trả lời bằng 1-2 câu tiếng Trung ngắn gọn, tự nhiên.
   - BẮT BUỘC dịch toàn bộ câu nói của Mei sang tiếng Việt trong "reply.vietnamese".
   - BẮT BUỘC HỎI TIẾP một câu hỏi để học viên phản xạ trả lời tiếp.
   - Nếu là tình huống Công sở (${isWorkplace ? 'ĐÚNG' : 'KHÔNG'}): dùng kính ngữ lịch sự (您, 请问, 麻烦您).
4. GỢI Ý CÂU TRẢ LỜI (trong "suggestions"):
   - Luôn đưa ra 2-3 câu gợi ý trả lời cho câu hỏi mới để học viên có thể bấm nghe hoặc nói theo.
5. LUÔN TRẢ VỀ JSON HỢP LỆ THEO SCHEMA. Chữ Hán BẮT BUỘC là CHỮ HÁN GIẢN THỂ (汉字).`;

  let promptText = '';

  if (action === 'start') {
    promptText = `[BẮT ĐẦU BUỔI HỌC]
Tình huống: "${scenarioMeta.titleVi}".
Vai của bạn: "${scenarioMeta.role}".
Mục tiêu bài học: "${scenarioMeta.goalVi}".
Hãy chào học viên thân thiện bằng 1 câu tiếng Trung tự nhiên phù hợp với vai diễn, và hỏi 1 câu mở màn ngắn gọn.
Đồng thời đưa ra 2-3 câu gợi ý trả lời (suggestions).`;
  } else if (action === 'hint') {
    promptText = `[GỢI Ý KHI BÍ TỪ - CẤP ${hintLevel}]
Tình huống: "${scenarioMeta.titleVi}".
Lịch sử trao đổi gần nhất:
${(history || []).slice(-4).map((h: any) => `${h.role}: ${h.text}`).join('\n')}
Hãy gợi ý:
- Cấp 1: 1-2 từ khóa then chốt nên dùng.
- Cấp 2: Khung câu có chỗ trống (vd: 我想...，请...).
- Cấp 3: Một câu hoàn chỉnh mẫu.`;
  } else {
    // action === 'turn' hoặc 'resume'
    const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
    let histStr = '';
    for (const turn of recentHistory) {
      histStr += `${turn.role === 'user' ? 'Học viên' : 'Lão Sư Mei'}: ${turn.text}\n`;
    }

    promptText = `--- LỊCH SỬ TRAO ĐỔI GẦN ĐÂY ---
${histStr}---------------------------------

Học viên vừa nói câu: "${userInput.trim()}".
Ngôn ngữ nhận diện: ${inputLang === 'vi' ? 'TIẾNG VIỆT' : 'TIẾNG TRUNG'}.
Tình huống: "${scenarioMeta.titleVi}". Vai của bạn: "${scenarioMeta.role}".

YÊU CẦU:
1. Đánh giá câu nói của học viên (khen ngợi nếu đúng, chỉ ra lỗi và câu chuẩn nếu sai, hoặc dạy câu tiếng Trung nếu nói tiếng Việt).
2. NHẬP VAI "${scenarioMeta.role}", TRẢ LỜI CÂU CHUYỆN VÀ HỎI TIẾP MỘT CÂU TIẾNG TRUNG MỚI để học viên tiếp tục đối thoại 1-1!
3. Đưa ra 2-3 câu gợi ý trả lời cho câu hỏi mới.`;
  }

  // 5. Gọi Gemini Flash Lite API
  try {
    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-flash-lite-latest',
      'gemini-2.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ].filter(Boolean) as string[];

    let responseText: string | null = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const callPromise = ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            maxOutputTokens: 900,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                evaluation: {
                  type: Type.OBJECT,
                  description: 'Đánh giá câu nói của học viên: đúng/sai, sửa lỗi hoặc dịch câu tiếng Việt',
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: '"correct" | "needs_correction" | "vietnamese_help" | "initial_greeting"',
                    },
                    praiseOrCorrectionVi: {
                      type: Type.STRING,
                      description: 'Nhận xét tiếng Việt: Khen ngợi nếu đúng; Chỉ rõ lỗi và cách sửa nếu sai',
                    },
                    correctedHanzi: {
                      type: Type.STRING,
                      description: 'Câu tiếng Trung chuẩn xác bằng chữ Hán giản thể',
                    },
                    correctedPinyin: {
                      type: Type.STRING,
                      description: 'Pinyin có dấu thanh của câu chuẩn',
                    },
                    correctedVietnamese: {
                      type: Type.STRING,
                      description: 'Nghĩa tiếng Việt của câu chuẩn',
                    },
                  },
                  required: ['type', 'praiseOrCorrectionVi'],
                },
                reply: {
                  type: Type.OBJECT,
                  description: 'Câu nói của Lão Sư Mei tiếp nối cuộc trò chuyện và HỎI TIẾP một câu',
                  properties: {
                    hanzi: { type: Type.STRING, description: 'Chữ Hán giản thể' },
                    pinyin: { type: Type.STRING, description: 'Pinyin có dấu thanh' },
                    vietnamese: { type: Type.STRING, description: 'Nghĩa tiếng Việt' },
                  },
                  required: ['hanzi', 'pinyin', 'vietnamese'],
                },
                suggestions: {
                  type: Type.ARRAY,
                  description: '2-3 câu gợi ý cho học viên trả lời câu hỏi tiếp theo',
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
                  description: 'Từ vựng đáng chú ý trong lượt này',
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
              required: ['evaluation', 'reply', 'suggestions'],
            },
          },
        });

        // Timeout 7.5s
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout quá 7.5s với model ${modelName}`)), 7500)
        );

        const response = await Promise.race([callPromise, timeoutPromise]);
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (e: any) {
        lastError = e;
        console.warn(`[Model ${modelName} error, fallback next]:`, e?.message);
      }
    }

    if (!responseText) {
      throw lastError || new Error('Không nhận được phản hồi từ AI');
    }

    // Làm sạch JSON
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(cleanJson);
    } catch (parseErr) {
      let repaired = cleanJson;
      const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) repaired += '"';
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
      for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
      parsedResult = JSON.parse(repaired);
    }

    // Chuẩn hóa pinyin bằng pinyin-pro để đảm bảo không bị thiếu dấu
    if (parsedResult.reply?.hanzi && !parsedResult.reply.pinyin) {
      parsedResult.reply.pinyin = getSafePinyin(parsedResult.reply.hanzi);
    }
    if (parsedResult.evaluation?.correctedHanzi && !parsedResult.evaluation.correctedPinyin) {
      parsedResult.evaluation.correctedPinyin = getSafePinyin(parsedResult.evaluation.correctedHanzi);
    }
    if (parsedResult.suggestions && Array.isArray(parsedResult.suggestions)) {
      parsedResult.suggestions.forEach((s: any) => {
        if (s.hanzi && !s.pinyin) s.pinyin = getSafePinyin(s.hanzi);
      });
    }

    // Tăng daily_activity.ai_turns cho người dùng trong Supabase
    if (verifiedUserId && supabaseUrl && (serviceKey || userToken)) {
      const incHeaders: Record<string, string> = {
        'apikey': serviceKey || anonKey,
        'Authorization': serviceKey ? `Bearer ${serviceKey}` : `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      };
      try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/increment_daily_activity`, {
          method: 'POST',
          headers: incHeaders,
          body: JSON.stringify({
            p_user_id: verifiedUserId,
            p_day: todayVn,
            p_column: 'ai_turns',
          }),
        });
      } catch (incErr) {
        fetch(`${supabaseUrl}/rest/v1/daily_activity`, {
          method: 'POST',
          headers: {
            ...incHeaders,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            user_id: verifiedUserId,
            day: todayVn,
            ai_turns: 1,
          }),
        }).catch(() => {});
      }
    }

    return res.status(200).json(parsedResult);
  } catch (err: any) {
    console.error('[Gemini API Call Failed]:', err);
    return res.status(500).json({
      error: 'Lão Sư Mei đang bận một chút: ' + (err?.message || 'Vui lòng bấm Thử lại sau ít giây!'),
    });
  }
}
