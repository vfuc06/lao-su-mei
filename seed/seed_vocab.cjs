const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

// Đọc service role key từ .env.local
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const SUPABASE_URL = env.SUPABASE_URL || 'https://lamhrbavfyhffeihyxdz.supabase.co';
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY || SERVICE_KEY.includes('dán_')) {
  console.error('Lỗi: Chưa có SUPABASE_SERVICE_ROLE_KEY trong .env.local');
  process.exit(1);
}

function getPinyin(text) {
  return pinyin(text, { toneType: 'symbol', type: 'string' });
}

async function run() {
  console.log('🚀 Bắt đầu nạp từ vựng vào Supabase...');

  const hskData = JSON.parse(fs.readFileSync(path.join(__dirname, 'vocab_hsk.json'), 'utf8'));
  const workplaceData = JSON.parse(fs.readFileSync(path.join(__dirname, 'vocab_workplace.json'), 'utf8'));

  const rows = [];

  // 1. Thêm bộ HSK
  hskData.forEach((item, idx) => {
    rows.push({
      deck: 'hsk',
      hsk_level: item.hsk_level,
      category: null,
      hanzi: item.hanzi,
      pinyin: item.pinyin || getPinyin(item.hanzi),
      vi: item.vi,
      example_hanzi: item.example_hanzi,
      example_pinyin: item.example_pinyin || (item.example_hanzi ? getPinyin(item.example_hanzi) : null),
      example_vi: item.example_vi,
      sort: idx + 1,
    });
  });

  // 2. Thêm bộ Công sở
  workplaceData.forEach((item, idx) => {
    rows.push({
      deck: 'workplace',
      hsk_level: null,
      category: item.category,
      hanzi: item.hanzi,
      pinyin: item.pinyin || getPinyin(item.hanzi),
      vi: item.vi,
      example_hanzi: item.example_hanzi,
      example_pinyin: item.example_pinyin || (item.example_hanzi ? getPinyin(item.example_hanzi) : null),
      example_vi: item.example_vi,
      sort: idx + 1,
    });
  });

  console.log(`📦 Tổng cộng ${rows.length} thẻ từ vựng (${hskData.length} HSK + ${workplaceData.length} Công sở).`);

  // Xóa sạch hoặc chèn upsert với on_conflict
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vocab_cards?on_conflict=deck,hanzi,pinyin`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('❌ Lỗi khi nạp vocab_cards:', res.status, errText);
    process.exit(1);
  }

  console.log('✅ Đã nạp thành công toàn bộ thẻ từ vựng vào Supabase!');
}

run().catch(console.error);
