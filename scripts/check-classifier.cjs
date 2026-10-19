// Offline accuracy check for the local (non-AI) classifier on everyday Taiwanese inputs.
// Usage: node scripts/check-classifier.cjs [--report]   (--report prints misses without failing)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, Date, Math, Number, RegExp, Error, require: name => {
    if (name === 'expo-crypto') return { randomUUID: () => 'x' };
    if (name === './db') return { getDb: async () => { throw Error('no db in classifier check'); } };
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts')));
    throw Error('Unexpected dependency: ' + name);
  } }, { filename });
  return exports;
}
const classifier = load('services/classificationService.ts');

// [input, type, category (expense) | 'income', amount, dayOffset]
const E = (input, category, amount, dayOffset = 0) => ({ input, type: 'FINANCE', category, amount, dayOffset });
const I = (input, amount, incomeKind) => ({ input, type: 'FINANCE', category: 'income', amount, incomeKind });
const T = input => ({ input, type: 'TASK' });
const N = input => ({ input, type: 'IDEA' });
const CASES = [
  E('午餐 120', 'food', 120), E('早餐蛋餅 45', 'food', 45), E('星巴克 拿鐵 135', 'food', 135),
  E('麥當勞 189', 'food', 189), E('全家 咖啡 55', 'food', 55), E('uber eats 280', 'food', 280),
  E('foodpanda 晚餐 230', 'food', 230), E('珍奶 60', 'food', 60), E('手搖飲 55', 'food', 55),
  E('火鍋 680', 'food', 680), E('鹹酥雞 150', 'food', 150), E('買水果 200', 'food', 200),
  E('醬油 49', 'daily', 49), E('全聯 買衛生紙 199', 'daily', 199), E('洗衣精 250', 'daily', 250),
  E('屈臣氏 320', 'daily', 320), E('寶雅 180', 'daily', 180), E('垃圾袋 99', 'daily', 99),
  E('加油 1200', 'transport', 1200), E('高鐵 1490', 'transport', 1490), E('捷運 30', 'transport', 30),
  E('悠遊卡儲值 500', 'transport', 500), E('youbike 10', 'transport', 10), E('台鐵 180', 'transport', 180),
  E('計程車 250', 'transport', 250), E('停車費 60', 'transport', 60), E('機票 8500', 'transport', 8500),
  E('機車保養 1500', 'transport', 1500), E('uber 320', 'transport', 320), E('客運 120', 'transport', 120),
  E('房租 12,000', 'housing', 12000), E('電費 860', 'housing', 860), E('水費 300', 'housing', 300),
  E('管理費 1500', 'housing', 1500), E('瓦斯 450', 'housing', 450),
  E('電話費 599', 'communication', 599), E('中華電信 499', 'communication', 499), E('手機費 399', 'communication', 399),
  E('網路費 699', 'communication', 699),
  E('netflix 390', 'entertainment', 390), E('電影 320', 'entertainment', 320), E('KTV 450', 'entertainment', 450),
  E('演唱會門票 3800', 'entertainment', 3800), E('spotify 149', 'entertainment', 149), E('出去玩 門票 250', 'entertainment', 250),
  E('steam 遊戲 590', 'interest', 590), E('扭蛋 300', 'interest', 300), E('漫畫 140', 'interest', 140),
  E('模型 1800', 'interest', 1800), E('健身房 999', 'interest', 999),
  E('看醫生 150', 'medical', 150), E('牙醫 300', 'medical', 300), E('感冒藥 180', 'medical', 180),
  E('掛號費 150', 'medical', 150), E('眼鏡 2500', 'medical', 2500),
  E('補習費 6000', 'education', 6000), E('買書 380', 'education', 380), E('文具 85', 'education', 85),
  E('線上課程 1990', 'education', 1990),
  // Amount formats and dates
  E('房租 1.2萬', 'housing', 12000), E('機票 8千', 'transport', 8000), E('$85 咖啡', 'food', 85),
  E('咖啡85元', 'food', 85), E('午餐NT$150', 'food', 150), E('晚餐 1,050', 'food', 1050),
  E('昨天晚餐 250', 'food', 250, -1), E('前天 計程車 300', 'transport', 300, -2),
  // Income
  I('薪水 42000', 42000, 'fixed'), I('薪水 42,000', 42000, 'fixed'), I('獎金 5000', 5000, 'extra'),
  I('發票中獎 200', 200, 'extra'), I('收到紅包 2000', 2000, 'extra'), I('接案收入 8000', 8000, 'extra'),
  I('利息 35', 35, 'extra'), I('退款 499', 499, 'extra'),
  // Not finance
  T('明天要交報告'), T('記得繳電話費'), T('下週三開會'), T('提醒我買牛奶'), T('後天下午3點看牙醫'),
  N('今天心情很好'), N('會議紀錄：討論預算分配'), N('想學吉他'),
];

// Held-out inputs written after tuning; reported only, so the number stays an honest estimate.
const HOLDOUT = [
  E('紅茶拿鐵 65', 'food', 65), E('便利商店 早餐 89', 'food', 89), E('胖老爹 炸雞 320', 'food', 320),
  E('吃到飽 799', 'food', 799), E('貓砂 450', 'other', 450), E('洗面乳 260', 'daily', 260),
  E('沐浴乳 189', 'daily', 189), E('高速公路 ETC 85', 'transport', 85), E('一卡通 加值 300', 'transport', 300),
  E('Gogoro 電池 299', 'transport', 299), E('包場唱歌 1200', 'entertainment', 1200), E('迪士尼 門票 2400', 'entertainment', 2400),
  E('YouTube Premium 199', 'entertainment', 199), E('Switch 卡帶 1490', 'interest', 1490), E('瑜珈課 600', 'interest', 600),
  E('第四台 600', 'housing', 600), E('冷氣維修 1500', 'housing', 1500), E('遠傳 月租 599', 'communication', 599),
  E('診所 掛號 200', 'medical', 200), E('隱形眼鏡 1200', 'medical', 1200), E('考試報名費 1500', 'education', 1500),
  E('筆記本 60', 'education', 60), E('10/15 午餐 120', 'food', 120, -4), E('上週 聚餐 1,580', 'food', 1580),
  I('年終 3萬', 30000, 'extra'), I('月薪入帳 38000', 38000, 'fixed'), I('發票 中了 1000', 1000, 'extra'),
  T('週五前要繳學費'), T('明天繳房租 12000'), N('今天的想法：多存錢'),
];
const report = process.argv.includes('--report');
let typeOk = 0, catOk = 0, catTotal = 0, amountOk = 0, amountTotal = 0, dateOk = 0, dateTotal = 0, kindOk = 0, kindTotal = 0;
const misses = [];
const now = new Date(2026, 9, 19, 20, 0);
for (const c of CASES) {
  const result = classifier.classifyByKeywords(c.input, now);
  const parsed = result.parsed ?? {};
  if (result.type === c.type) typeOk++; else misses.push(`type  ${c.input} → ${result.type} (want ${c.type})`);
  if (c.type !== 'FINANCE') continue;
  catTotal++;
  const gotCat = parsed.transactionType === 'income' ? 'income' : parsed.category;
  if (gotCat === c.category) catOk++; else misses.push(`cat   ${c.input} → ${gotCat} (want ${c.category})`);
  amountTotal++;
  if (parsed.amount === c.amount) amountOk++; else misses.push(`amt   ${c.input} → ${parsed.amount} (want ${c.amount})`);
  if (c.dayOffset !== undefined) {
    dateTotal++;
    const want = new Date(now); want.setDate(want.getDate() + c.dayOffset);
    const wantDay = `${want.getFullYear()}-${String(want.getMonth() + 1).padStart(2, '0')}-${String(want.getDate()).padStart(2, '0')}`;
    const gotDay = parsed.date ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (gotDay === wantDay) dateOk++; else misses.push(`date  ${c.input} → ${gotDay} (want ${wantDay})`);
  }
  if (c.incomeKind) {
    kindTotal++;
    if (parsed.incomeKind === c.incomeKind) kindOk++; else misses.push(`kind  ${c.input} → ${parsed.incomeKind} (want ${c.incomeKind})`);
  }
}
let holdOk = 0;
const holdMisses = [];
for (const c of HOLDOUT) {
  const result = classifier.classifyByKeywords(c.input, now);
  const parsed = result.parsed ?? {};
  const gotCat = parsed.transactionType === 'income' ? 'income' : parsed.category;
  const ok = result.type === c.type && (c.type !== 'FINANCE' || (gotCat === c.category && parsed.amount === c.amount));
  if (ok) holdOk++; else holdMisses.push(`${c.input} → ${result.type}/${gotCat}/${parsed.amount}`);
}
const pct = (ok, total) => `${ok}/${total} (${Math.round(ok / total * 100)}%)`;
console.log(`type ${pct(typeOk, CASES.length)} · category ${pct(catOk, catTotal)} · amount ${pct(amountOk, amountTotal)} · date ${pct(dateOk, dateTotal)} · income kind ${pct(kindOk, kindTotal)}`);
if (report || misses.length) misses.forEach(line => console.log('  MISS ' + line));
console.log(`held-out (not tuned on, reported only): ${pct(holdOk, HOLDOUT.length)}`);
if (report) holdMisses.forEach(line => console.log('  HOLDOUT MISS ' + line));
if (!report) {
  assert.equal(misses.length, 0, misses.length + ' classifier misses');
  console.log('PASS local classifier handles all ' + CASES.length + ' everyday inputs');
}
