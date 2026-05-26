# Daily Log

每次對話開始先讀此檔取得當前狀態。做完事後更新。Phase 完成後搬到 `project_status.md`，此檔只保留最近動態。

---

## 當前狀態 (2026-05-26)

**版號：0.3.0**
Phase 1（任務/月曆）✅ 完成
Phase 4（財務記帳）✅ 完成
Phase 2（智慧分流 + AI）✅ 大致完成（API 待使用者設定）
Phase 5（目標）— 融入筆記標籤
Phase 3（Dashboard）⬜ 未開始

## 最近完成 (2026-05-26)

### 行事曆雙模式滑動
- 任務/財務共享同一日曆 grid
- PanResponder 左右滑動切換模式，日曆固定不動
- 日期同時顯示藍點（任務）+綠點（財務）
- 任務模式：當天任務列表
- 財務模式：月摘要三格 + 當天交易記錄

### 多筆記帳拆分
- 「飲料60 便當50」→ 自動拆成兩筆，各自判斷分類
- parseMultipleTransactions() regex 匹配 item+amount pairs

### 嵌入式計算機
- Calculator.tsx — 支援 +-×÷、即時預覽結果、退格
- 財務新增/編輯金額欄旁加計算機按鈕，底部滑出

### 多 API 供應商
- 支援 Gemini / OpenRouter / OpenAI 三種
- 各自用正確 API 格式（Gemini 原生、OpenRouter/OpenAI 用 OpenAI 格式）
- 供應商選擇 UI + API key 持久化

### 動態標籤系統
- 記帳：10 個預設分類 + 使用者自訂新增
- 筆記：使用者自訂標籤（預設「目標」），可新增/長按刪除

### 智慧分流 + 自學習
- 三層匹配：精確→Bigram 相似度→短文字
- 高信心自動存，低信心才跳選擇器
- 時間詞偵測、欠還分類
- Enter 改為換行

### 筆記/記帳編輯
- 點擊筆記/交易卡 → 編輯 modal
- updateTransaction() / updateNote()

### UI 修復
- 全局色彩對比度提升（20 檔 66 處）
- ‹› 換成 chevron icon
- AI 頁面 SafeAreaView + KeyboardAvoidingView
- 記帳 Modal 從上方出現
- Tab 順序：首頁/行事曆/財務/任務/筆記
- 月曆改名「行事曆」

### 其他
- 版號改為 0.3.0 語意化版本
- README.md
- task/[id].tsx 腳本覆蓋修復

## 待辦

- Gemini API 排查（使用者確認 billing）
- 筆記頁無法直接新增
- 財務補記日期
- Phase 3 Dashboard

### 財務進階規劃（朋友回饋）

**儲蓄目標：** 設定月存金額 → 從收入扣除 → 固定支出扣除 → 剩餘按比例分配各類上限
**收入分類：** 固定（薪水）vs 額外（股票/獎金）→ 額外收入可選歸類或存起來
**緩衝區：** 未分配額外收入 → 可抵消任何類別超標
**長期目標：** 設定幾月/幾年存多少 → 用歷史平均反推月存額
