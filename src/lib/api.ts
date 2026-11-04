import { AIChatResponse, ChatApiRequest } from '../types';

export async function sendChatMessage(request: ChatApiRequest): Promise<AIChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Lỗi máy chủ (${response.status})`);
  }

  return data as AIChatResponse;
}

