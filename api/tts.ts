export default async function handler(req: any, res: any) {
  // Cho phép CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { text } = req.query || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Thiếu tham số text' });
    return;
  }

  const cleanText = text.trim().slice(0, 300); // Giới hạn tối đa 300 ký tự

  try {
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=${encodeURIComponent(
      cleanText
    )}`;

    // Gọi Google TTS từ server mà KHÔNG gửi header Referer của website để tránh bị Google chặn 404
    const audioRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'audio/mpeg, audio/*;q=0.9, */*;q=0.8',
      },
    });

    if (!audioRes.ok) {
      throw new Error(`Google TTS trả về mã lỗi: ${audioRes.status}`);
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Cache tại trình duyệt và Vercel Edge CDN trong 7 ngày
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800, immutable');

    res.status(200).send(buffer);
  } catch (error: any) {
    console.error('Lỗi proxy TTS:', error);
    res.status(500).json({ error: error?.message || 'Không thể tạo âm thanh' });
  }
}
