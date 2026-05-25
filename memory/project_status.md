# Project Status

已完成 Phase 的歸檔、架構決策、UI 慣例。需要歷史細節時才讀。

---

## 專案概覽

Expo 55 + React Native 0.83 + TypeScript + SQLite + Expo Router
目標平台：Android。純本地，不需登入。
PRD：`Lumi_PRD.md`

---

## 已完成 Phase

### Phase 1 — 日曆 & 任務清單 ✅

**建立的檔案：**
- `services/db.ts` — SQLite 初始化，8 張表（entries/tasks/notes/transactions/budgets/goals/goal_milestones/goal_tasks）
- `services/taskService.ts` — 完整 CRUD（getAllTasks, getTodayTasks, getTasksForDate, getTaskById, createTask, updateTask, toggleTaskComplete, deleteTask, getDatesWithTasks）
- `app/(tabs)/index.tsx` — 首頁：日期顯示、快速文字輸入（直接建任務）、4 個模組格
- `app/(tabs)/calendar.tsx` — 自製月曆 grid（不用 react-native-calendars），點選日期顯示當天任務
- `app/(tabs)/tasks.tsx` — 任務列表 + bottom sheet Modal 新增
- `app/task/[id].tsx` — 任務詳情編輯頁
- `components/tasks/TaskCard.tsx` — checkbox、優先度、tag、deadline 倒數
- `components/tasks/TaskForm.tsx` — 標題、日期、優先度、tag
- `components/tasks/PriorityBadge.tsx`
- `components/modules/ModuleCard.tsx` — 首頁模組格底層元件
- `components/modules/TasksModule.tsx` — 顯示待辦數 + 即將到期
- `components/modules/CalendarModule.tsx`
- `components/modules/GoalsModule.tsx`（佔位）
- `app/(tabs)/_layout.tsx` — 底部 tab bar（首頁/月曆/任務/財務/目標）

**關鍵決策：**
- 月曆自製，不用 react-native-calendars（省依賴，控制更細）
- 首頁輸入框 Phase 1 直接建任務，Phase 2 改接 Gemini 分流

---

### Phase 4 — 財務記帳 ✅（跳過 Phase 2, 3 先做）

**建立的檔案：**
- `types/finance.ts` — Transaction, Budget, CreateTransactionInput
- `services/financeService.ts` — getTransactionsForMonth, createTransaction, deleteTransaction, getMonthSummary, getBudgetsForMonth, upsertBudget, getExpenseByCategory
- `components/finance/TransactionCard.tsx` — 左側 3px 色條（綠/紅）、刪除按鈕
- `components/finance/BudgetMeter.tsx` — 進度條、未設上限提示、點擊彈 dialog 設定上限
- `app/(tabs)/finance/index.tsx` — 月份導覽、收支結餘三格、4類預算條（餐飲/興趣/交通/其他）、記錄列表、新增 Modal（支出/收入切換）
- `components/modules/FinanceModule.tsx` — 首頁格顯示本月結餘

**關鍵決策：**
- 第一個月純記錄，不設預算上限干預；第二個月起手動設上限（Gemini 建議留到 Phase 2 後）
- 用 `strftime('%Y-%m', created_at)` 篩月份
- 月份導覽：year/month state + `useFocusEffect(useCallback([currentMonth]))`

---

## 架構慣例

```
Service 層：getDb() → getAllAsync / getFirstAsync / runAsync
ID：Crypto.randomUUID()（同步，不 await）
時間：new Date().toISOString()
月份字串格式：'YYYY-MM'
Modal：bottom sheet 樣式（justifyContent: 'flex-end'）
```

## 尚未開始

- Phase 2：Gemini 分流（`geminiService.ts` 空白）
- Phase 3：Dashboard
- Phase 5：目標規劃器
- `components/shared/QuickInput.tsx`（Phase 2 核心元件）
- `components/shared/UncertainQueue.tsx`（Phase 2 待確認清單）
- `services/noteService.ts`、`services/goalService.ts`（骨架）
