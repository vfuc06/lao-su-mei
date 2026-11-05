import { AIChatResponse, ChatApiRequest } from '../types';

export async function sendChatMessage(request: ChatApiRequest): Promise<AIChatResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 giây timeout tối đa

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Lỗi máy chủ (${response.status})`);
    }

    return data as AIChatResponse;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Kết nối mạng hơi chậm. Bạn hãy bấm "Thử lại" bên trên để gửi lại nhé!');
    }
    throw err;
  }
}

