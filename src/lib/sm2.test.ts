import { describe, it, expect } from 'vitest';
import { calculateSM2, getEstimatedIntervals } from './sm2';

describe('SM-2 Spaced Repetition Algorithm', () => {
  it('cho thẻ mới toanh khi đánh giá Good -> lặp lại sau 1 ngày', () => {
    const res = calculateSM2(null, 'good');
    expect(res.repetitions).toBe(1);
    expect(res.intervalDays).toBe(1);
    expect(res.ease).toBe(2.5);
    expect(res.lapses).toBe(0);
  });

  it('cho thẻ đã nhớ 1 lần khi đánh giá Good -> lặp lại sau 6 ngày', () => {
    const initial = {
      ease: 2.5,
      intervalDays: 1,
      repetitions: 1,
      lapses: 0,
      dueAt: new Date().toISOString(),
    };
    const res = calculateSM2(initial, 'good');
    expect(res.repetitions).toBe(2);
    expect(res.intervalDays).toBe(6);
    expect(res.ease).toBe(2.5);
  });

  it('cho thẻ đã nhớ 2 lần khi đánh giá Good -> nhân theo easeFactor (6 * 2.5 = 15 ngày)', () => {
    const initial = {
      ease: 2.5,
      intervalDays: 6,
      repetitions: 2,
      lapses: 0,
      dueAt: new Date().toISOString(),
    };
    const res = calculateSM2(initial, 'good');
    expect(res.repetitions).toBe(3);
    expect(res.intervalDays).toBe(15);
  });

  it('khi đánh giá Again (Quên) -> reset repetitions về 0, interval về 1 ngày, ease giảm và lapses tăng', () => {
    const initial = {
      ease: 2.5,
      intervalDays: 15,
      repetitions: 3,
      lapses: 0,
      dueAt: new Date().toISOString(),
    };
    const res = calculateSM2(initial, 'again');
    expect(res.repetitions).toBe(0);
    expect(res.intervalDays).toBe(1);
    expect(res.lapses).toBe(1);
    expect(res.ease).toBeLessThan(2.5);
  });

  it('ease không bao giờ giảm xuống dưới 1.3', () => {
    let progress = null;
    // Quên liên tục 15 lần
    for (let i = 0; i < 15; i++) {
      progress = calculateSM2(progress, 'again');
    }
    expect(progress?.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('getEstimatedIntervals trả về đầy đủ nhãn cho 4 mức độ', () => {
    const labels = getEstimatedIntervals(null);
    expect(labels.again).toBe('Ngày mai');
    expect(labels.good).toBe('Ngày mai');
    expect(labels.easy).toBe('3 ngày');
  });
});
