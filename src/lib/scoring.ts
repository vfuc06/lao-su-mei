import { pinyin } from 'pinyin-pro';
import { ScoreOutput, SyllableMatch } from '../types';

interface ParsedSyllable {
  char: string;
  pinyinWithTone: string;
  base: string;
  tone: string;
  full: string;
}

// Bỏ các ký tự dấu câu và khoảng trắng
export function cleanPunctuation(text: string): string {
  return text.replace(/[，。！？、,.!?:;'"“”‘’—…\s\-]/g, '');
}

// Phân tách câu chữ Hán thành mảng các âm tiết phân tích chi tiết
export function parseSyllables(text: string): ParsedSyllable[] {
  const cleaned = cleanPunctuation(text);
  if (!cleaned) return [];

  const pinyinNums = pinyin(cleaned, { toneType: 'num', type: 'array' });
  const pinyinTones = pinyin(cleaned, { toneType: 'symbol', type: 'array' });

  return cleaned.split('').map((char, i) => {
    const rawNum = pinyinNums[i] || '';
    const match = rawNum.match(/^([a-zü]+)(\d)?$/i);
    const base = match ? match[1].toLowerCase() : rawNum.toLowerCase();
    const tone = match && match[2] ? match[2] : '5'; // 5 là thanh nhẹ (neutral)

    return {
      char,
      pinyinWithTone: pinyinTones[i] || '',
      base,
      tone,
      full: `${base}${tone}`,
    };
  });
}

// Chấm điểm giữa 1 câu đích và 1 câu nhận diện được
function scoreSingle(targetText: string, heardText: string): {
  score: number;
  perSyllable: SyllableMatch[];
  extra: string[];
} {
  const target = parseSyllables(targetText);
  const heard = parseSyllables(heardText);

  if (target.length === 0) {
    return { score: 0, perSyllable: [], extra: [] };
  }

  if (heard.length === 0) {
    return {
      score: 0,
      perSyllable: target.map((t) => ({
        target: `${t.char} (${t.pinyinWithTone})`,
        heard: '',
        status: 'missing',
      })),
      extra: [],
    };
  }

  const n = target.length;
  const m = heard.length;

  // Ma trận quy hoạch động Levenshtein
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 0; i <= n; i++) dp[i][0] = i * 1.0;
  for (let j = 0; j <= m; j++) dp[0][j] = j * 0.5;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const t = target[i - 1];
      const h = heard[j - 1];

      let matchCost = 1.0; // Mặc định sai âm
      if (t.full === h.full) {
        matchCost = 0.0; // Đúng hoàn toàn cả âm và thanh
      } else if (t.base === h.base) {
        matchCost = 0.5; // Đúng âm nhưng sai thanh
      }

      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + matchCost, // Căn chỉnh
        dp[i - 1][j] + 1.0,           // Thiếu âm tiết đích
        dp[i][j - 1] + 0.5            // Thừa âm tiết người nói
      );
    }
  }

  // Truy vết ngược tìm căn chỉnh tối ưu
  let i = n;
  let j = m;
  const targetAlign: Array<{ heardIdx: number | null; cost: number }> = Array(n).fill(null);
  const usedHeard = new Set<number>();

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const t = target[i - 1];
      const h = heard[j - 1];
      let matchCost = 1.0;
      if (t.full === h.full) matchCost = 0.0;
      else if (t.base === h.base) matchCost = 0.5;

      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + matchCost)) < 0.0001) {
        targetAlign[i - 1] = { heardIdx: j - 1, cost: matchCost };
        usedHeard.add(j - 1);
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + 1.0)) < 0.0001) {
      targetAlign[i - 1] = { heardIdx: null, cost: 1.0 };
      i--;
      continue;
    }

    if (j > 0) {
      j--;
      continue;
    }

    break;
  }

  // Tổng hợp điểm từng âm tiết đích
  let totalPoints = 0;
  const perSyllable: SyllableMatch[] = target.map((t, idx) => {
    const align = targetAlign[idx];
    const targetLabel = `${t.char} (${t.pinyinWithTone})`;

    if (!align || align.heardIdx === null) {
      return {
        target: targetLabel,
        heard: '',
        status: 'missing',
      };
    }

    const h = heard[align.heardIdx];
    const heardLabel = `${h.char} (${h.pinyinWithTone})`;

    if (align.cost === 0.0) {
      totalPoints += 1.0;
      return { target: targetLabel, heard: heardLabel, status: 'ok' };
    } else if (align.cost === 0.5) {
      totalPoints += 0.5;
      return { target: targetLabel, heard: heardLabel, status: 'tone' };
    } else {
      return { target: targetLabel, heard: heardLabel, status: 'wrong' };
    }
  });

  // Tìm các âm tiết thừa
  const extra: string[] = [];
  for (let idx = 0; idx < m; idx++) {
    if (!usedHeard.has(idx)) {
      const h = heard[idx];
      extra.push(`${h.char} (${h.pinyinWithTone})`);
    }
  }

  // Trừ điểm âm tiết thừa: 0.1 mỗi âm tiết thừa, tối đa trừ 0.3
  const extraPenalty = Math.min(extra.length * 0.1, 0.3);
  const netPoints = Math.max(0, totalPoints - extraPenalty);

  const rawScore = (netPoints / n) * 100;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return { score, perSyllable, extra };
}

// Chấm điểm toàn diện, hỗ trợ nhiều biến thể hợp lệ (acceptableVariants)
export function evaluatePronunciation(
  targetText: string,
  recognizedText: string,
  acceptableVariants: string[] = [],
  passThreshold: number = 80
): ScoreOutput {
  const allTargets = [targetText, ...acceptableVariants].filter(Boolean);

  let bestResult: { score: number; perSyllable: SyllableMatch[]; extra: string[] } | null = null;

  for (const t of allTargets) {
    const res = scoreSingle(t, recognizedText);
    if (!bestResult || res.score > bestResult.score) {
      bestResult = res;
    }
  }

  const finalRes = bestResult || { score: 0, perSyllable: [], extra: [] };

  return {
    score: finalRes.score,
    perSyllable: finalRes.perSyllable,
    extra: finalRes.extra,
    passed: finalRes.score >= passThreshold,
  };
}
