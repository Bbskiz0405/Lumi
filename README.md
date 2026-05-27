# Lumi

極低摩擦的 Android 個人管理 App。單一入口輸入，系統自動分類並整理至對應模組。

## 技術棧

- **Framework**: Expo 55 + React Native 0.83
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **Storage**: Expo SQLite (純本地，不需登入)
- **AI**: Gemini / OpenRouter / OpenAI (多供應商支援)
- **Charts**: react-native-svg
- **Platform**: Android

## 功能

### 智慧輸入 (首頁)

單一輸入框，自動分類 + 自學習：

| 輸入範例 | 分類結果 |
|----------|----------|
| 午餐 80 | 記帳 (支出 $80, 餐飲) |
| 飲料60 便當50 | 自動拆成兩筆記帳 |
| 記得交報告 | 任務 |
| VTuber 新企劃想法 | 筆記 |

- **三層自學習**：精確匹配 → Bigram 相似度 → 短文字包含
- 高信心自動存，低信心才跳選擇器
- 時間詞偵測（晚上8點不會誤判為金額）
- 使用者修正後記錄，越用越準

### 共享日曆系統

行事曆和財務共享同一個日曆，切換 tab 時日曆不動：

- **行事曆 tab**：日曆 + 藍點標記 + 當天任務列表
- **財務 tab**：同一日曆 + 綠點標記 + 月統計 + 圓餅圖 + 交易記錄
- 日期狀態透過 React Context 共享

### 任務管理

- 任務清單：依優先度排序
- 新增/編輯/完成/刪除
- 優先度 (高/中/低)、標籤、截止日期
- 「已完成」收折區

### 財務記帳

- 月/年/全部三模式切換
- 支出分佈甜甜圈圓餅圖
- 交易記錄列表，點擊可編輯
- 嵌入式計算機 (+-×÷)
- 多筆自動拆分
- 動態分類標籤 (10 個預設 + 自訂新增)
- 一鍵重置

### AI 財務顧問

嵌入財務 tab 的專業分析助手：

- **多供應商**：Gemini / OpenRouter / OpenAI
- **角色鎖定**：只回答財務相關問題
- **數據驅動**：自動載入當月交易記錄
- 消費行為分析、預算建議、一鍵快速分析

### 筆記

- 筆記列表 + 點擊編輯
- 使用者自訂標籤 (預設「目標」)
- 新增/長按刪除標籤

## 資料庫

SQLite 純本地儲存，共 9 張表：

| 表名 | 用途 |
|------|------|
| entries | 原始輸入 + 分類記錄（自學習用） |
| tasks | 任務 |
| notes | 筆記 |
| transactions | 收支交易 |
| budgets | 預算上限 |
| goals | 長期目標 |
| goal_milestones | 目標里程碑 |
| goal_tasks | 目標產生的任務 |
| settings | 設定 (API config, 自訂標籤等) |

## 專案結構

```
app/
  (tabs)/
    index.tsx          # 首頁 (智慧輸入 + 模組格 + 最近動態)
    calendar.tsx       # 行事曆 (共享日曆 + 任務)
    finance/index.tsx  # 財務 (共享日曆 + 記帳 + 圓餅圖 + AI)
    tasks.tsx          # 任務列表 + 已完成區
    notes.tsx          # 筆記 + 自訂標籤
  task/[id].tsx        # 任務詳情

components/
  shared/
    CalendarGrid.tsx   # 共享日曆元件
  tasks/               # TaskCard, TaskForm, PriorityBadge
  finance/             # TransactionCard, ExpensePieChart, Calculator, FinanceAdvisor
  modules/             # ModuleCard, TasksModule, CalendarModule, FinanceModule, NotesModule

contexts/
  CalendarContext.tsx   # 共享日曆狀態

services/
  db.ts                # SQLite 初始化
  taskService.ts       # 任務 CRUD
  noteService.ts       # 筆記 CRUD + 自訂標籤
  financeService.ts    # 財務 CRUD + 動態分類
  classificationService.ts  # 三層自學習分類
  geminiService.ts     # 多供應商 AI API
  recentService.ts     # 最近動態

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
| 次文字 | `#666666` |
| 收入 | `#55DDAA` |
| 支出 | `#FF6655` |
| 任務 | `#FF9944` |
| 筆記 | `#88AAFF` |

Tab 順序：首頁 / 行事曆 / 財務 / 任務 / 筆記

## 開發

```bash
# 安裝依賴
npm install

# 開發 (Metro)
npx expo start

# 本地 Build APK
npx expo export --platform android --output-dir android/app/src/main/assets
copy android\app\src\main\assets\_expo\static\js\android\*.hbc android\app\src\main\assets\index.android.bundle
android\gradlew.bat -p android app:assembleDebug -x lint -x test
# APK: android/app/build/outputs/apk/debug/app-debug.apk

# EAS Cloud Build (每月 15 次免費)
npx eas-cli build --platform android --profile preview

# 安裝到手機
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

環境需求：Android Studio + JDK (JBR 21) + Gradle 8.13

## 開發階段

| Phase | 狀態 | 內容 |
|-------|------|------|
| 1 | ✅ 完成 | 日曆 & 任務清單 |
| 2 | ✅ 大致完成 | 智慧分流 + AI 整合 |
| 3 | ⬜ 未開始 | Dashboard 總覽 |
| 4 | ✅ 完成 | 財務記帳 |
| 5 | — | 融入筆記標籤 |
