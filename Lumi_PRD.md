# Lumi - 個人 OS App 開發需求書

## 專案定位
打造一個「極低摩擦」的 Android 個人管理 App。
使用者在單一入口輸入碎片化資訊，系統自動分類並整理至對應模組。

---

## 技術棧
- Framework: Expo (React Native) + TypeScript
- UI: React Native Paper (Material Design 3)
- 導航: Expo Router (file-based routing)
- 本地儲存: Expo SQLite
- AI 分流: Gemini Flash API (免費額度)
- 目標平台: Android 為主

---

## 架構原則
- 模組化：每個功能獨立，可單獨開發與測試，不互相干擾
- 低摩擦：輸入要快，步驟越少越好
- 純本地：不需登入，資料存在裝置上
- 可擴充：未來新增模組只需新增資料表與對應畫面，不動現有邏輯

---

## 資料庫架構 (SQLite)

### entries（Gemini 分流前的原始輸入）
- id TEXT PRIMARY KEY
- raw_input TEXT          -- 使用者輸入的原始字串
- classified_type TEXT    -- 'TASK' | 'IDEA' | 'FINANCE' | 'GOAL' | 'PROGRESS' | 'UNCERTAIN'
- created_at TEXT

### tasks（任務）
- id TEXT PRIMARY KEY
- entry_id TEXT           -- 關聯 entries.id
- title TEXT NOT NULL
- due_date TEXT
- priority TEXT           -- 'high' | 'medium' | 'low'
- tag TEXT                -- 'research' | 'school' | 'application' | 'life'
- source TEXT             -- 'manual' | 'goal'（標記任務來源）
- completed INTEGER DEFAULT 0
- created_at TEXT

### notes（靈感筆記）
- id TEXT PRIMARY KEY
- entry_id TEXT
- content TEXT
- category TEXT           -- 'vtuber' | 'cardgame' | 'tech' | 'life'
- tag TEXT
- created_at TEXT

### transactions（收支記帳）
- id TEXT PRIMARY KEY
- entry_id TEXT
- type TEXT               -- 'income' | 'expense'
- item TEXT
- amount REAL
- category TEXT           -- 'food' | 'interest' | 'transport' | 'other'（expense 才有）
- created_at TEXT

### budgets（動態預算建議）
- id TEXT PRIMARY KEY
- category TEXT
- limit_amount REAL       -- 根據當月收入動態計算
- month TEXT              -- 格式 'YYYY-MM'
- is_ai_generated INTEGER DEFAULT 0

### goals（長期目標）
- id TEXT PRIMARY KEY
- title TEXT              -- '學日文'
- description TEXT
- status TEXT             -- 'active' | 'paused' | 'completed'
- created_at TEXT

### goal_milestones（階段里程碑）
- id TEXT PRIMARY KEY
- goal_id TEXT            -- 關聯 goals.id
- title TEXT              -- '背完五十音'
- order_index INTEGER
- completed INTEGER DEFAULT 0

### goal_tasks（目標產生的任務）
- id TEXT PRIMARY KEY
- goal_id TEXT            -- 關聯 goals.id
- task_id TEXT            -- 關聯 tasks.id
- is_recurring INTEGER DEFAULT 0  -- 是否為重複性任務

---

## Gemini Dispatcher 規格

### System Prompt 設計要求
- 使用 Few-shot prompting 確保分類穩定
- 輸入：單一自然語言字串
- 輸出：嚴格 JSON 格式，禁止多餘文字
- 模糊輸入一律導向 UNCERTAIN，不強行分類

### 輸出格式範例

TASK：
```json
{
  "type": "TASK",
  "title": "仁寶報告",
  "due_date": "2025-01-17",
  "priority": "high",
  "tag": "school"
}
```

IDEA：
```json
{
  "type": "IDEA",
  "content": "Miku 剪輯靈感",
  "category": "vtuber"
}
```

FINANCE（支出）：
```json
{
  "type": "FINANCE",
  "transaction_type": "expense",
  "item": "午餐",
  "amount": 120,
  "category": "food"
}
```

FINANCE（收入）：
```json
{
  "type": "FINANCE",
  "transaction_type": "income",
  "item": "RA 薪水",
  "amount": 8000,
  "category": null
}
```

GOAL：
```json
{
  "type": "GOAL",
  "title": "學日文",
  "description": "想從零開始學到可以看懂動漫"
}
```

PROGRESS（目標進度更新）：
```json
{
  "type": "PROGRESS",
  "goal_title": "學日文",
  "milestone_hint": "背單字",
  "note": "今天背了 20 個單字"
}
```

UNCERTAIN（無法判斷時）：
```json
{
  "type": "UNCERTAIN",
  "raw": "原始輸入內容"
}
```

---

## 財務預算邏輯
- 收入與支出都透過 Gemini 分流或手動輸入
- 第一個月：純記錄收支，不干預
- 第二個月起：Gemini 根據當月總收入，動態建議各支出類別的預算上限
  - 收入高的月份 → 建議上限較寬鬆
  - 收入低或無收入的月份 → 建議上限保守
- 超標時 UI 切換警告模式（紅色高亮）
- 使用者可手動調整 AI 建議的預算上限

---

## 模組與開發順序

### Phase 1｜📅 日曆 & 任務清單
- 首頁顯示今日任務列表
- 月曆視圖（react-native-calendars）
- 點擊日期顯示當天任務
- 新增任務：標題、截止日期、優先度、標籤
- 任務可完成、編輯、刪除
- Deadline 距今天倒數顯示

### Phase 2｜📝 快速筆記 + Gemini 分流輸入
- 單一全能輸入框（app 主要入口）
- 輸入送出後呼叫 Gemini API 進行意圖分類
- 自動分流至 tasks、notes、goals、transactions
- UNCERTAIN 進入待確認清單，讓使用者手動分類
- Markdown 筆記支援標籤與分類

### Phase 3｜📊 Dashboard 總覽
- 今日任務完成率
- 即將到來的 Deadline 列表
- 研究 vs 生活任務比例圖
- 本月收支概況與預算水位（若財務模組已啟用）
- 各目標進度條（若目標模組已啟用）

### Phase 4｜💰 財務記帳
- 透過 Gemini 分流自動辨識收入或支出
- 手動新增收支
- 第一個月純記錄
- 第二個月起根據當月收入動態建議預算
- 超標警告（紅色高亮）

### Phase 5｜🎯 目標規劃器
- 輸入長期目標（學日文、練畫圖、做音樂）
- Gemini 追問：目前程度？每週可投入幾小時？
- Gemini 產出：階段性里程碑 + 每週建議任務
- 重複性任務（is_recurring = 1）自動定期排進任務清單
- 使用者可手動調整里程碑與任務頻率
- 輸入進度更新（如「今天背了 20 個單字」）→ 自動勾選對應里程碑
- Dashboard 顯示各目標進度條

---

## 資料夾結構

```
/app
  index.tsx              ← 今日任務首頁
  calendar.tsx           ← 月曆視圖
  dashboard.tsx          ← 總覽
  task/[id].tsx          ← 任務詳情與編輯
  note/[id].tsx          ← 筆記詳情
  finance/index.tsx      ← 財務記帳
  goals/index.tsx        ← 目標列表
  goals/[id].tsx         ← 目標詳情與里程碑

/components
  /tasks
    TaskCard.tsx
    TaskForm.tsx
    PriorityBadge.tsx
  /notes
    NoteCard.tsx
    NoteForm.tsx
  /finance
    TransactionCard.tsx
    BudgetMeter.tsx
  /goals
    GoalCard.tsx
    MilestoneList.tsx
    ProgressBar.tsx
  /shared
    QuickInput.tsx       ← 全能輸入框（核心元件）
    UncertainQueue.tsx   ← 待確認分類清單

/services
  db.ts                  ← SQLite 初始化與所有資料表建立
  taskService.ts
  noteService.ts
  financeService.ts
  goalService.ts
  geminiService.ts       ← Gemini API 呼叫與 Prompt 管理

/types
  task.ts
  note.ts
  finance.ts
  goal.ts
  entry.ts
```

---

## 啟動指令（直接貼給 Claude Code 開始 Phase 1）

請依照以下順序開始實作 Phase 1：

1. 建立完整資料夾結構與所有空白檔案
2. 實作 services/db.ts，初始化 SQLite 並建立所有資料表（包含 Phase 2-5 的表，但對應功能先不實作）
3. 實作 services/taskService.ts，包含 CRUD 操作
4. 實作 TaskCard、TaskForm、PriorityBadge 元件
5. 實作首頁 app/index.tsx（今日任務列表）
6. 實作 app/calendar.tsx（月曆視圖，使用 react-native-calendars）
7. 底部導覽列預留所有模組的 tab（Phase 2-5 先佔位不實作）

Phase 2 以後等 Phase 1 完成再另行啟動。
