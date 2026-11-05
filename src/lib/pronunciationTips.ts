// Bảng mẹo thanh điệu & âm khó đối chiếu với tiếng Việt (chạy cục bộ 100%, không tốn quota AI)

export interface PronunciationTip {
  pattern: RegExp;
  title: string;
  tip: string;
}

export const PRONUNCIATION_TIPS: PronunciationTip[] = [
  // Thanh điệu
  {
    pattern: /4$/,
    title: 'Thanh 4 (Thanh rơi dứt khoát)',
    tip: 'Phát âm dứt khoát từ cao xuống thấp nhất, không ngân dài, giống như đang ra lệnh hoặc nói chữ "Hạ!" dứt khoát trong tiếng Việt.',
  },
  {
    pattern: /3$/,
    title: 'Thanh 3 (Thanh trầm uốn)',
    tip: 'Hạ giọng xuống thật trầm rồi hơi hất nhẹ lên. Trong giao tiếp nhanh, chỉ cần đọc phần trầm (nửa thanh 3), giống dấu huyền rất nặng.',
  },
  {
    pattern: /2$/,
    title: 'Thanh 2 (Thanh đi lên)',
    tip: 'Bắt đầu từ tông giọng vừa và vuốt thẳng lên cao, tương tự dấu sắc trong tiếng Việt nhưng mượt mà hơn.',
  },
  {
    pattern: /1$/,
    title: 'Thanh 1 (Thanh cao bằng)',
    tip: 'Giữ đều giọng ở mức cao nhất, ngân dài phẳng lặng như nốt Son, không được để giọng bị rớt xuống.',
  },

  // Phụ âm bật hơi & uốn lưỡi
  {
    pattern: /^(zh|ch|sh|r)/i,
    title: 'Nhóm âm uốn lưỡi (zh, ch, sh, r)',
    tip: 'Uốn cong đầu lưỡi chạm vào vòm họng trên. Riêng âm "ch" cần bật mạnh luồng hơi qua kẽ răng.',
  },
  {
    pattern: /^(j|q|x)/i,
    title: 'Nhóm âm mặt lưỡi (j, q, x)',
    tip: 'Mặt lưỡi áp sát ngạc cứng. Riêng âm "q" đọc giống chữ "ch" nhưng bật hơi thật mạnh qua môi mỉm cười.',
  },
  {
    pattern: /^(z|c|s)/i,
    title: 'Nhóm âm đầu lưỡi răng (z, c, s)',
    tip: 'Đầu lưỡi chạm mặt trong răng cửa trên. Âm "c" bật hơi mạnh như tiếng xì ga, không uốn lưỡi.',
  },
  {
    pattern: /^p/i,
    title: 'Âm bật hơi "p"',
    tip: 'Khép chặt 2 môi rồi bật mạnh luồng hơi ra, giống như thổi tắt ngọn nến. Phân biệt với "b" (không bật hơi).',
  },
  {
    pattern: /^t/i,
    title: 'Âm "t" (đọc là "th")',
    tip: 'Chữ "t" trong tiếng Trung đọc giống chữ "th" bật hơi trong tiếng Việt (ví dụ: tā = tha).',
  },
  {
    pattern: /^d/i,
    title: 'Âm "d" (đọc là "t")',
    tip: 'Chữ "d" trong tiếng Trung đọc giống chữ "t" trong tiếng Việt (ví dụ: dào = tào, không bật hơi).',
  },
];

// Lấy mẹo phù hợp nhất cho 1 âm tiết bị sai
export function getTipForSyllable(syllable: string): string {
  const clean = syllable.toLowerCase().trim();
  for (const item of PRONUNCIATION_TIPS) {
    if (item.pattern.test(clean)) {
      return `💡 ${item.title}: ${item.tip}`;
    }
  }
  return '💡 Mẹo: Nghe lại phát âm mẫu ở tốc độ chậm (nút 🐢) và chú ý mở khẩu hình miệng to, rõ ràng hơn.';
}

