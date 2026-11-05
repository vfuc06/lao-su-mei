import { describe, it, expect } from 'vitest';
import { evaluatePronunciation } from './scoring';

describe('Thuật toán chấm điểm phát âm tiếng Trung (scoring.ts)', () => {
  const target = '我要去超市买东西';

  it('1. Trùng khớp hoàn toàn -> Điểm đạt 100', () => {
    const res = evaluatePronunciation(target, '我要去超市买东西');
    expect(res.score).toBe(100);
    expect(res.passed).toBe(true);
    expect(res.perSyllable.every((s) => s.status === 'ok')).toBe(true);
  });

  it('2. Thừa 1 âm tiết ("...了") -> Điểm trừ nhẹ khoảng 95-99', () => {
    const res = evaluatePronunciation(target, '我要去超市买东西了');
    expect(res.score).toBeGreaterThanOrEqual(95);
    expect(res.score).toBeLessThanOrEqual(99);
    expect(res.passed).toBe(true);
    expect(res.extra.length).toBe(1);
  });

  it('3. Đồng âm khác thanh ("超市" chāo-shì thành "超时" chāo-shí) -> Điểm khoảng ~94', () => {
    const res = evaluatePronunciation(target, '我要去超时买东西');
    expect(res.score).toBeGreaterThanOrEqual(90);
    expect(res.score).toBeLessThanOrEqual(96);
    expect(res.passed).toBe(true);
    // Âm tiết thứ 5 (市 vs 时) phải bị đánh dấu tone
    const toneMistake = res.perSyllable.find((s) => s.status === 'tone');
    expect(toneMistake).toBeDefined();
  });

  it('4. Thiếu 2 âm tiết ("我要去买东西" thiếu "超市") -> Điểm khoảng ~75 (Dưới ngưỡng 80)', () => {
    const res = evaluatePronunciation(target, '我要去买东西', [], 80);
    expect(res.score).toBeGreaterThanOrEqual(70);
    expect(res.score).toBeLessThanOrEqual(79);
    expect(res.passed).toBe(false);
    const missingCount = res.perSyllable.filter((s) => s.status === 'missing').length;
    expect(missingCount).toBe(2);
  });

  it('5. Khác hoàn toàn ("你好吗") -> Điểm rất thấp < 30', () => {
    const res = evaluatePronunciation(target, '你好吗');
    expect(res.score).toBeLessThan(30);
    expect(res.passed).toBe(false);
  });
});
