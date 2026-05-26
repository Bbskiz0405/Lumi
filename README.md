# Lumi

極低摩擦的 Android 個人管理 App。單一入口輸入，系統自動分類並整理至對應模組。

## 技術棧

- **Framework**: Expo 55 + React Native 0.83
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **Storage**: Expo SQLite (純本地，不需登入)
- **AI**: Gemini 2.0 Flash API (財務顧問)
- **Platform**: Android

## 功能

### 智慧輸入 (首頁)

單一輸入框，打字送出後自動分類：

| 輸入範例 | 分類結果 |
|----------|----------|
| 午餐 80 | 記帳 (支出 $80, 餐飲) |
| 記得交報告 | 任務 |
| VTuber 新企劃想法 | 筆記 |

- 關鍵字 + 金額偵測自動判斷
- 使用者可修正分類，app 記錄修正結果逐漸學習
- 分類後一鍵確認儲存至對應模組

### 任務管理

- 任務清單：依優先度排序，支援完成/刪除
- 任務詳情：標題、截止日期、優先度 (高/中/低)、標籤
- 首頁模組卡顯示待辦數量與即將到期任務

### 月曆

- 自製月曆 grid（不依賴第三方套件）
- 有任務的日期標記藍點
- 點選日期查看當天任務
- 月份左右切換導覽

### 財務記帳

- 月份導覽，收入/支出/結餘三格摘要
- 4 類預算管理：餐飲、興趣、交通、其他
  - 進度條顯示花費比例
  - 超過 80% 橘色警告，超標紅色警告
  - 點擊設定預算上限
- 交易記錄列表，支援刪除
- 手動新增收支（支出/收入切換 + 分類選擇）
- 一鍵重置所有記帳資料

### AI 財務顧問

基於 Gemini 2.0 Flash 的嵌入式財務分析助手。

- **角色鎖定**：只回答財務相關問題，拒答其他話題
- **數據驅動**：自動載入當月交易記錄進行分析
- **功能**：
  - 消費行為模式分析
  - 預算規劃建議
  - 財務問答（如「我這個月餐飲花太多嗎？」）
  - 一鍵快速分析本月消費
- **隱私**：API Key 存本地 SQLite，資料不上傳第三方

### 筆記

- 後端 CRUD 完成，支援分類（vtuber/cardgame/tech/life）
- 頁面 UI 待開發

### 目標規劃器

- Tab 已佔位，功能待開發

## 資料庫

SQLite 純本地儲存，共 9 張表：

| 表名 | 用途 |
|------|------|
| entries | 原始輸入 + 分類記錄（習慣學習用） |
| tasks | 任務 |
| notes | 筆記 |
| transactions | 收支交易 |
| budgets | 預算上限 |
| goals | 長期目標 |
| goal_milestones | 目標里程碑 |
| goal_tasks | 目標產生的任務 |
| settings | 設定 (API Key 等) |

## 專案結構

```
app/
  (tabs)/
    index.tsx          # 首頁 (智慧輸入 + 模組格)
    calendar.tsx       # 月曆
    tasks.tsx          # 任務列表
    finance/index.tsx  # 財務記帳 + AI 顧問
    goals/index.tsx    # 目標 (佔位)
  task/[id].tsx        # 任務詳情

components/
  tasks/               # TaskCard, TaskForm, PriorityBadge
  finance/             # TransactionCard, BudgetMeter, FinanceAdvisor
  modules/             # ModuleCard, TasksModule, CalendarModule, FinanceModule, GoalsModule

services/
  db.ts                # SQLite 初始化
  taskService.ts       # 任務 CRUD
  noteService.ts       # 筆記 CRUD
  financeService.ts    # 財務 CRUD + 重置
  classificationService.ts  # 智慧分類 (關鍵字 + 習慣學習)
  geminiService.ts     # Gemini API 整合

types/
  task.ts, note.ts, finance.ts, goal.ts, entry.ts
```

## UI 設計

深色主題，極簡風格：

| 元素 | 色碼 |
|------|------|
| 背景 | `#0F0F0F` |
| 卡片 | `#111111` |
| 輸入框 | `#161616` |
| 主文字 | `#FFFFFF` |
| 次文字 | `#444444` |
| 收入 | `#55DDAA` |
| 支出 | `#FF6655` |
| 任務 | `#FF9944` |

字重以 `'300'` 為主基調。Modal 一律 bottom sheet 樣式。

## 開發

```bash
# 安裝依賴
npm install

# 開發
npx expo start

# 建置 APK (EAS Cloud Build)
npx eas-cli build --platform android --profile preview
```

## 開發階段

| Phase | 狀態 | 內容 |
|-------|------|------|
| 1 | ✅ 完成 | 日曆 & 任務清單 |
| 2 | 🔄 進行中 | 智慧分流 + Gemini 整合 |
| 3 | ⬜ 未開始 | Dashboard 總覽 |
| 4 | ✅ 完成 | 財務記帳 |
| 5 | ⬜ 未開始 | 目標規劃器 |
