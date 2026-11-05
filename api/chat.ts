import { GoogleGenAI, Type } from '@google/genai';
import { pinyin } from 'pinyin-pro';

// Danh sách tình huống đầy đủ (8 Đời sống + 10 Công sở)
const SCENARIO_ROLES: Record<string, { titleVi: string; role: string; mode: 'daily' | 'workplace'; goalVi: string }> = {
  // Đời sống
  greeting: { titleVi: 'Chào hỏi & giới thiệu', role: 'Một người bạn Trung Quốc mới gặp', mode: 'daily', goalVi: 'Biết cách chào, giới thiệu tên, tuổi và quê quán Việt Nam.' },
  restaurant: { titleVi: 'Gọi món ở nhà hàng', role: 'Nhân viên phục vụ nhà hàng', mode: 'daily', goalVi: 'Gọi được món ăn, đồ uống và thanh toán.' },
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
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dailyQuota = parseInt(process.env.DAILY_AI_QUOTA || '80', 10);

  let verifiedUserId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ') && supabaseUrl) {
    const token = authHeader.replace('Bearer ', '').trim();
    try {
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': serviceKey || process.env.VITE_SUPABASE_ANON_KEY || '',
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
  if (serviceKey && supabaseUrl) {
    try {
      const actRes = await fetch(
        `${supabaseUrl}/rest/v1/daily_activity?user_id=eq.${verifiedUserId}&day=eq.${todayVn}&select=ai_turns`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
        }
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
    strictness = 'strict', // 'strict' | 'relaxed'
    history = [],
    userInput = '',
    inputLang = 'zh', // 'zh' | 'vi'
    correctedSentence = '', // Dùng cho action 'resume'
    hintLevel = 1, // 1 | 2 | 3 cho action 'hint'
  } = body;

  const scenarioMeta = SCENARIO_ROLES[scenarioId] || SCENARIO_ROLES.greeting;
  const isWorkplace = scenarioMeta.mode === 'workplace';

  // 4. Xây dựng System Instruction & Prompt theo action
  const systemInstruction = `Bạn là "Lão Sư Mei" (美老师) — gia sư tiếng Trung giao tiếp thông minh, nghiêm khắc nhưng kiên nhẫn, dạy 1-1 cho học viên người Việt Nam.

# NGUYÊN TẮC CỐT LÕI (GIA SƯ NGHIÊM):
1. Học giao tiếp mà nói sai thì KHÔNG BAO GIỜ được ậm ừ cho qua.
2. Khi học viên nói tiếng Trung:
   - Nếu câu nói CÓ LỖI (sai ngữ pháp, sai trật tự từ, sai lượng từ, dùng sai từ trong ngữ cảnh, hoặc nói tiếng Việt khi đang luyện tiếng Trung):
     + Đặt verdict = "needs_correction".
     + Giải thích ngắn gọn lỗi sai bằng tiếng Việt trong "explanationVi" (tối đa 2 câu: sai ở đâu, vì sao sai).
     + Hướng dẫn cách người bản xứ nói tự nhiên trong "directionVi".
     + Đưa ra câu chuẩn học viên BẮT BUỘC PHẢI NÓI trong "correctSentence" (Hán tự giản thể, pinyin có thanh điệu, dịch nghĩa tiếng Việt).
     + Tách câu chuẩn thành các cụm 2-3 chữ trong "chunks" để học viên dễ nhại lại.
     + Ở chế độ "strict" (nghiêm), KHÔNG trả lời tiếp câu chuyện (để reply = null hoặc để trống), BUỘC học viên phải sửa đúng mới được đi tiếp.
   - Nếu câu nói ĐÚNG VÀ TỰ NHIÊN:
     + Đặt verdict = "correct".
     + Khen ngợi ngắn gọn bằng tiếng Việt trong "praiseVi".
     + Nhập vai "${scenarioMeta.role}" trả lời tiếp câu chuyện trong "reply" (1-2 câu ngắn, tự nhiên) và HỎI TIẾP một câu để học viên phản xạ.
3. NGỮ CẢNH CÔNG SỞ:
   - Nếu là tình huống Công sở (${isWorkplace ? 'ĐÚNG' : 'KHÔNG'}): BẮT BUỘC dùng kính ngữ (您, 请问, 麻烦您) với sếp, đối tác và khách hàng.
4. LUÔN TRẢ VỀ JSON HỢP LỆ THEO SCHEMA. Chữ Hán BẮT BUỘC là CHỮ HÁN GIẢN THỂ (简体字).`;

  let promptText = '';

  if (action === 'start') {
    promptText = `[BẮT ĐẦU BUỔI HỌC]
Tình huống: "${scenarioMeta.titleVi}".
Vai của bạn: "${scenarioMeta.role}".
Mục tiêu bài học: "${scenarioMeta.goalVi}".
Hãy chủ động mở lời chào đón học viên bằng 1 câu tiếng Trung tự nhiên phù hợp với vai diễn, và hỏi 1 câu mở màn ngắn gọn.
Đồng thời đưa ra 2-3 câu gợi ý trả lời (suggestions) để học viên tham khảo.`;
  } else if (action === 'resume') {
    promptText = `[HỌC VIÊN VỪA SỬA LỖI XONG VÀ ĐÃ NÓI ĐÚNG CÂU CHUẨN]
Câu học viên vừa nói đúng: "${correctedSentence}".
Tình huống: "${scenarioMeta.titleVi}" (Vai của bạn: "${scenarioMeta.role}").
Hãy:
1. Đặt praiseVi = một lời khen ngắn ngọn khích lệ ("Chuẩn rồi! Đi tiếp nhé 🎉" hoặc "Rất tốt! Phát âm chuẩn lắm.").
2. Nhập vai "${scenarioMeta.role}", coi như học viên vừa nói xong câu trên, trả lời tiếp 1-2 câu tiếng Trung ngắn và HỎI TIẾP một câu mới để học viên nói tiếp.
3. Đưa ra 2-3 câu gợi ý trả lời (suggestions).`;
  } else if (action === 'hint') {
    promptText = `[GỢI Ý KHI BÍ TỪ - CẤP ${hintLevel}]
Tình huống: "${scenarioMeta.titleVi}".
Lịch sử trao đổi gần nhất:
${(history || []).slice(-4).map((h: any) => `${h.role}: ${h.text}`).join('\n')}
Yêu cầu:
- Nếu cấp 1: Gợi ý 1-2 từ khóa then chốt nên dùng.
- Nếu cấp 2: Gợi ý khung câu có chỗ trống (vd: 我想...，请...).
- Nếu cấp 3: Gợi ý một câu hoàn chỉnh mẫu.`;
  } else {
    // action === 'turn'
    const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
    let histStr = '';
    for (const turn of recentHistory) {
      histStr += `${turn.role === 'user' ? 'Học viên' : 'Lão Sư Mei'}: ${turn.text}\n`;
    }

    promptText = `--- LỊCH SỬ TRAO ĐỔI GẦN ĐÂY ---
${histStr}---------------------------------

Học viên vừa nói câu: "${userInput.trim()}".
Ngôn ngữ nhận diện: ${inputLang === 'vi' ? 'TIẾNG VIỆT' : 'TIẾNG TRUNG'}.
Chế độ nghiêm khắc: ${strictness}.
Tình huống: "${scenarioMeta.titleVi}". Vai của bạn: "${scenarioMeta.role}".

Hãy phân tích và trả về JSON:
- Nếu học viên nói tiếng Việt hoặc hỏi cách diễn đạt: xem đây là lỗi vietnamese_input, dạy câu tiếng Trung chuẩn xác tương ứng trong correctSentence.
- Nếu học viên nói tiếng Trung: kiểm tra ngữ pháp, từ vựng, trật tự câu, lượng từ và kính ngữ.
- Quyết định verdict = "correct" hoặc "needs_correction".`;
  }

  // 5. Gọi Gemini Flash Lite API
  try {
    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
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
                verdict: {
                  type: Type.STRING,
                  description: '"correct" | "needs_correction"',
                },
                errorType: {
                  type: Type.STRING,
                  description: '"grammar" | "word_choice" | "word_order" | "measure_word" | "register" | "vietnamese_input"',
                },
                wrongPart: {
                  type: Type.STRING,
                  description: 'Phần câu nói bị sai',
                },
                explanationVi: {
                  type: Type.STRING,
                  description: 'Giải thích ngắn gọn lỗi sai bằng tiếng Việt',
                },
                directionVi: {
                  type: Type.STRING,
                  description: 'Hướng dẫn cách nói tự nhiên của người bản xứ',
                },
                correctSentence: {
                  type: Type.OBJECT,
                  description: 'Câu tiếng Trung chuẩn xác học viên cần nói lại',
                  properties: {
                    hanzi: { type: Type.STRING },
                    pinyin: { type: Type.STRING },
                    vietnamese: { type: Type.STRING },
                  },
                },
                chunks: {
                  type: Type.ARRAY,
                  description: 'Tách câu chuẩn thành các cụm 2-3 chữ để dễ nhại lại',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      hanzi: { type: Type.STRING },
                      pinyin: { type: Type.STRING },
                    },
                  },
                },
                praiseVi: {
                  type: Type.STRING,
                  description: 'Lời khen ngắn gọn khi nói đúng',
                },
                reply: {
                  type: Type.OBJECT,
                  description: 'Câu nói của AI tiếp nối câu chuyện (null nếu needs_correction ở chế độ strict)',
                  properties: {
                    hanzi: { type: Type.STRING },
                    pinyin: { type: Type.STRING },
                    vietnamese: { type: Type.STRING },
                  },
                },
                suggestions: {
                  type: Type.ARRAY,
                  description: '2-3 câu gợi ý cho học viên nói tiếp',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      hanzi: { type: Type.STRING },
                      pinyin: { type: Type.STRING },
                      vietnamese: { type: Type.STRING },
                    },
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
                  },
                },
              },
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
      // Auto-repair JSON thiếu ngoặc
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
    if (parsedResult.correctSentence?.hanzi && !parsedResult.correctSentence.pinyin) {
      parsedResult.correctSentence.pinyin = getSafePinyin(parsedResult.correctSentence.hanzi);
    }
    if (parsedResult.reply?.hanzi && !parsedResult.reply.pinyin) {
      parsedResult.reply.pinyin = getSafePinyin(parsedResult.reply.hanzi);
    }
    if (parsedResult.chunks && Array.isArray(parsedResult.chunks)) {
      parsedResult.chunks.forEach((chunk: any) => {
        if (chunk.hanzi && !chunk.pinyin) {
          chunk.pinyin = getSafePinyin(chunk.hanzi);
        }
      });
    }

    // Tăng daily_activity.ai_turns cho người dùng trong Supabase
    if (verifiedUserId && serviceKey && supabaseUrl) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/increment_daily_activity`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_user_id: verifiedUserId,
            p_day: todayVn,
            p_column: 'ai_turns',
          }),
        });
      } catch (incErr) {
        // Fallback upsert
        fetch(`${supabaseUrl}/rest/v1/daily_activity`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
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
