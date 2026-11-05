export type CardRating = 'again' | 'hard' | 'good' | 'easy';

export interface SM2Progress {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt?: string;
}

export interface SM2CalculationResult {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  nextIntervalLabel: string;
}

/**
 * Thuật toán SuperMemo-2 (SM-2) chuẩn hóa cho việc học từ vựng tiếng Trung
 *
 * Ratings:
 * - 'again' (Quên): q = 1 -> Lặp lại sau 1 ngày (hoặc trong phiên), ease giảm 0.2
 * - 'hard'  (Khó):  q = 3 -> Khoảng cách tăng chậm hơn, ease giảm nhẹ 0.15
 * - 'good'  (Tốt):  q = 4 -> Khoảng cách tăng bình thường (1 ngày -> 6 ngày -> * ease)
 * - 'easy'  (Dễ):   q = 5 -> Khoảng cách tăng nhanh hơn, ease tăng
 */
export function calculateSM2(
  current: SM2Progress | null | undefined,
  rating: CardRating
): SM2CalculationResult {
  const currentEase = current?.ease ?? 2.5;
  const currentInterval = current?.intervalDays ?? 0;
  const currentReps = current?.repetitions ?? 0;
  const currentLapses = current?.lapses ?? 0;

  let quality: number;
  switch (rating) {
    case 'again':
      quality = 1;
      break;
    case 'hard':
      quality = 3;
      break;
    case 'good':
      quality = 4;
      break;
    case 'easy':
      quality = 5;
      break;
  }

  let newEase = currentEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEase < 1.3) newEase = 1.3;
  // Làm tròn 2 chữ số thập phân
  newEase = Math.round(newEase * 100) / 100;

  let newReps = currentReps;
  let newInterval = currentInterval;
  let newLapses = currentLapses;

  if (quality < 3) {
    // Quên: reset số lần nhớ liên tiếp, khoảng cách về 1 ngày
    newReps = 0;
    newInterval = 1;
    newLapses = currentLapses + 1;
  } else {
    // Nhớ được (hard, good, easy)
    if (currentReps === 0) {
      newInterval = rating === 'easy' ? 3 : 1;
    } else if (currentReps === 1) {
      newInterval = rating === 'easy' ? 8 : (rating === 'hard' ? 3 : 6);
    } else {
      let multiplier = newEase;
      if (rating === 'hard') multiplier = 1.2;
      else if (rating === 'easy') multiplier = newEase * 1.3;
      newInterval = Math.max(currentInterval + 1, Math.round(currentInterval * multiplier));
    }
    newReps = currentReps + 1;
  }

  const now = new Date();
  const nextDueDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

  let nextIntervalLabel = `${newInterval} ngày`;
  if (newInterval === 1) nextIntervalLabel = 'Ngày mai';
  else if (newInterval >= 30) nextIntervalLabel = `${Math.round(newInterval / 30)} tháng`;

  return {
    ease: newEase,
    intervalDays: newInterval,
    repetitions: newReps,
    lapses: newLapses,
    dueAt: nextDueDate.toISOString(),
    nextIntervalLabel,
  };
}

/**
 * Trả về nhãn khoảng cách ước tính cho 4 nút đánh giá để người dùng dễ nhìn
 */
export function getEstimatedIntervals(progress: SM2Progress | null | undefined): Record<CardRating, string> {
  const again = calculateSM2(progress, 'again').nextIntervalLabel;
  const hard = calculateSM2(progress, 'hard').nextIntervalLabel;
  const good = calculateSM2(progress, 'good').nextIntervalLabel;
  const easy = calculateSM2(progress, 'easy').nextIntervalLabel;

  return { again, hard, good, easy };
}

