/** 金額一律不顯示小數：記帳的單位是元，分位只會讓數字更難掃讀。 */
export function formatAmount(value: number): string {
  return Math.round(value).toLocaleString('zh-TW');
}

/** 大數字在窄卡片裡會擠壓版面，超過一萬改用「萬」。 */
export function formatCompactAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000) {
    const inTenThousand = value / 10000;
    return `${inTenThousand.toFixed(abs >= 100000 ? 0 : 1)}萬`;
  }
  return formatAmount(value);
}

/** ratio 為 0–1 的比例。null 代表無法計算（例如沒有收入），交給呼叫端顯示破折號。 */
export function formatPercent(ratio: number | null, digits = 1): string | null {
  if (ratio === null || !Number.isFinite(ratio)) return null;
  return `${(ratio * 100).toFixed(digits)}%`;
}

/**
 * 期間比較用的增減標示。上升的好壞要看指標：收入變多是好事，支出變多不是，
 * 所以由呼叫端指定，不在這裡猜。
 */
export function formatChange(
  ratio: number | null,
  upIsGood = false
): { text: string; color: string } | null {
  if (ratio === null || !Number.isFinite(ratio)) return null;
  const pct = ratio * 100;
  if (Math.abs(pct) < 0.5) return { text: '持平', color: '#6D737A' };
  const isUp = pct > 0;
  return {
    text: `${isUp ? '↑' : '↓'}${Math.abs(pct).toFixed(0)}%`,
    color: isUp === upIsGood ? '#55DDAA' : '#FF6655',
  };
}
