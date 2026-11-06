const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

function getPinyin(text) {
  return pinyin(text, { toneType: 'symbol', type: 'string' });
}

// 1. Đọc dữ liệu HSK & Workplace vocab
const hskVocab = JSON.parse(fs.readFileSync(path.join(__dirname, 'vocab_hsk.json'), 'utf8'));
const wpVocab = JSON.parse(fs.readFileSync(path.join(__dirname, 'vocab_workplace.json'), 'utf8'));

let cardId = 1;
const initialVocabCards = [];

hskVocab.forEach((item, idx) => {
  initialVocabCards.push({
    id: cardId++,
    deck: 'hsk',
    hskLevel: item.hsk_level,
    hanzi: item.hanzi,
    pinyin: item.pinyin || getPinyin(item.hanzi),
    vi: item.vi,
    exampleHanzi: item.example_hanzi,
    examplePinyin: item.example_pinyin || (item.example_hanzi ? getPinyin(item.example_hanzi) : undefined),
    exampleVi: item.example_vi,
    sort: idx + 1
  });
});

wpVocab.forEach((item, idx) => {
  initialVocabCards.push({
    id: cardId++,
    deck: 'workplace',
    category: item.category,
    hanzi: item.hanzi,
    pinyin: item.pinyin || getPinyin(item.hanzi),
    vi: item.vi,
    exampleHanzi: item.example_hanzi,
    examplePinyin: item.example_pinyin || (item.example_hanzi ? getPinyin(item.example_hanzi) : undefined),
    exampleVi: item.example_vi,
    sort: idx + 1
  });
});

// 2. Đọc dữ liệu Mẫu câu
const dailyGroups = JSON.parse(fs.readFileSync(path.join(__dirname, 'phrases_daily.json'), 'utf8'));
const wpGroups = JSON.parse(fs.readFileSync(path.join(__dirname, 'phrases_workplace.json'), 'utf8'));

// Trích xuất translations từ seed_phrases.cjs
const seedContent = fs.readFileSync(path.join(__dirname, 'seed_phrases.cjs'), 'utf8');
const match = seedContent.match(/const TRANSLATIONS = ({[\s\S]*?});/);
let translations = {};
if (match) {
  try {
    eval('translations = ' + match[1]);
  } catch (e) {
    console.error('Eval translations error:', e);
  }
}

let groupId = 1;
let pairId = 1;
const initialGroups = [];
const initialPairs = [];

dailyGroups.forEach((g) => {
  const curGroupId = groupId++;
  initialGroups.push({
    id: curGroupId,
    kind: 'daily',
    slug: g.slug,
    emoji: g.emoji,
    titleVi: g.titleVi,
    sort: g.sort,
    totalCount: g.pairs.length
  });

  g.pairs.forEach((p, idx) => {
    initialPairs.push({
      id: pairId++,
      groupId: curGroupId,
      slug: g.slug,
      sort: idx + 1,
      qHanzi: p.q,
      qPinyin: getPinyin(p.q),
      qVi: translations[p.q] || p.q,
      aHanzi: p.a,
      aPinyin: getPinyin(p.a),
      aVi: translations[p.a] || p.a,
      noteVi: p.note
    });
  });
});

wpGroups.forEach((g) => {
  const curGroupId = groupId++;
  initialGroups.push({
    id: curGroupId,
    kind: 'workplace',
    slug: g.slug,
    emoji: g.emoji,
    titleVi: g.titleVi,
    sort: g.sort,
    totalCount: g.pairs.length
  });

  g.pairs.forEach((p, idx) => {
    initialPairs.push({
      id: pairId++,
      groupId: curGroupId,
      slug: g.slug,
      sort: idx + 1,
      qHanzi: p.q,
      qPinyin: getPinyin(p.q),
      qVi: translations[p.q] || p.q,
      aHanzi: p.a,
      aPinyin: getPinyin(p.a),
      aVi: translations[p.a] || p.a,
      noteVi: p.note
    });
  });
});

const fileOutput = `import { PhraseGroup, PhrasePair, VocabCard } from '../types';

export const INITIAL_PHRASE_GROUPS: PhraseGroup[] = ${JSON.stringify(initialGroups, null, 2)};

export const INITIAL_PHRASE_PAIRS: (PhrasePair & { slug: string })[] = ${JSON.stringify(initialPairs, null, 2)};

export const INITIAL_VOCAB_CARDS: VocabCard[] = ${JSON.stringify(initialVocabCards, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/lib/initialData.ts'), fileOutput, 'utf8');
console.log(`✅ Đã tạo thành công src/lib/initialData.ts với ${initialGroups.length} nhóm, ${initialPairs.length} mẫu câu, ${initialVocabCards.length} từ vựng!`);
