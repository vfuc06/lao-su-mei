import { supabase } from './supabase';

export interface ChatApiRequest {
  action?: 'start' | 'turn' | 'resume' | 'hint';
  scenarioId?: string;
  strictness?: 'strict' | 'relaxed';
  level?: string;
  history?: Array<{ role: 'user' | 'ai'; text: string }>;
  userInput?: string;
  inputLang?: 'zh' | 'vi';
  correctedSentence?: string;
  hintLevel?: number;
}

export async function sendChatMessage(request: ChatApiRequest): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    // Lấy Supabase session token để gửi kèm trong Authorization header
    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token;
    } catch (e) {}

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Lỗi máy chủ (${response.status})`);
    }

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Kết nối mạng hơi chậm. Bạn hãy bấm "Thử lại" bên trên để gửi lại nhé!');
    }
    throw err;
  }
}
