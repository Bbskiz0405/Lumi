# Lumi

> 極低摩擦的個人管理 App。**一個輸入框寫所有東西**，AI 自動分類到任務、記帳、筆記。

寫一句「買午餐 100」自動成記帳；寫「5/30 要出去」自動成行事曆任務；寫想法就成筆記。不用挑模組、不用切頁面、不用按按鈕。

**當前版本：0.4.62** · Android 開發中 · 終極目標：App Store + Google Play 雙平台上架

---

## 設計理念

一般 App 為了功能完整，先讓使用者選「我要記什麼」，再要你填表單。Lumi 反過來 —— **先寫，再讓系統猜你寫的是什麼**。

- 高信心 → 直接存，不打擾。
- 低信心 → 跳分類選擇器讓你一鍵改。
- 使用者每次修正會被記下來，**越用越懂你**。

---

## 核心功能

### 🧠 智慧分流（首頁）
- **AI 優先**：偵測到 API key 就先送 LLM 分類（Gemini 2.5 Flash Lite / OpenAI / OpenRouter），6 秒 timeout，失敗 fallback 本地。
- **本地分類**：keyword + bigram 相似度 + 短文字包含三層。
- **日期自動抽取**：「5/30 要出去」→ TASK + `dueDate: 2026-05-30` → 自動同步行事曆。
- **多筆拆分**：「飲料 60 便當 50」→ 自動拆兩筆記帳。
- **時間 vs 金額不混淆**：「晚上 8 點」不會被誤判為金額 8。

| 輸入 | 自動分類 |
|---|---|
| 午餐 80 | 記帳（支出 $80，餐飲） |
| 飲料 60 便當 50 | 兩筆記帳 |
| 5/30 要出去 | 任務（截止 5/30，進行事曆） |
| 記得交報告 | 任務 |
| VTuber 新企劃想法 | 筆記 |

### 📅 共享日曆
行事曆 / 財務共用同一個月曆元件，切 tab 不重繪、不抖動：
- **行事曆 tab**：藍點任務標記 + 當天任務清單
- **財務 tab**：綠點記帳標記 + 月統計 + 圓餅圖 + 交易列表
- 透過 `CalendarContext` 共享選中日期

### ✅ 任務
- 依優先度（高/中/低）+ 截止日倒數排序
- 詳情頁：完成 / 編輯 / 刪除
- 已完成收折區
- 自訂標籤

### 💰 財務記帳
- 月 / 年 / 全部三模式
- 收支甜甜圈圓餅圖
- 嵌入式計算機（+−×÷）
- 動態分類標籤
- 編輯 modal 含刪除

### ✧ AI 財務顧問
- 多供應商：Gemini / OpenRouter / OpenAI（使用者自填 key）
- 自動載入當月交易做為 context
- 角色鎖定，只回答財務相關
- 一鍵快速分析按鈕

### ✎ 筆記
- 純文字 + 自訂標籤
- 標籤過濾

---

## 技術棧

| 項目 | 內容 |
|---|---|
| Framework | Expo 55 + React Native 0.83 |
| Language | TypeScript |
| Navigation | Expo Router（file-based）+ 自製 `CustomTabBar` |
| Storage | Expo SQLite（純本地，不需登入） |
| AI | Gemini 2.5 Flash Lite（預設）/ OpenRouter / OpenAI |
| Charts | react-native-svg |
| Icons | **Unicode 純文字符號**（棄用字體 icon，避免打包失效） |

---

## 專案結構

```
app/
  (tabs)/
    index.tsx                          # 首頁（智慧輸入 + 模組格 + 最近動態）
    tasks.tsx                          # 任務列表 + 已完成收折
    notes.tsx                          # 筆記 + 標籤過濾
    (calendar-finance)/                # 巢狀路由：行事曆 ⇄ 財務 共享日曆
      _layout.tsx                      # PersistentCalendar + SubTabBar
      calendar.tsx                     # 行事曆視角
      finance.tsx                      # 財務視角
  task/[id].tsx                        # 任務詳情頁

components/
  shared/CalendarGrid.tsx              # 自製月曆 grid（不用 react-native-calendars）
  tasks/                               # TaskCard, TaskForm, PriorityBadge
  finance/                             # TransactionCard, ExpensePieChart, Calculator, FinanceAdvisor
  modules/                             # 首頁四個模組格

contexts/CalendarContext.tsx           # 共享日期狀態

services/
  db.ts                                # SQLite 初始化（9 張表）
  classificationService.ts             # 本地三層分類 + 多筆拆分
  geminiService.ts                     # 多供應商 AI（chat / quick analysis / classifyTextWithAI）
  taskService.ts / noteService.ts / financeService.ts
  recentService.ts                     # 首頁最近動態
```

---

## 開發

**環境**：Node 20+、Android Studio + JBR 21、Gradle 8.13、Windows / macOS / Linux

```bash
npm install

# 開發 (Metro + Expo Dev Client)
npx expo start

# 本地 release APK（PowerShell on Windows）
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\Brayden\AppData\Local\Android\Sdk"
cd android
.\gradlew.bat assembleRelease --no-daemon
# 產出：android/app/build/outputs/apk/release/app-release.apk

# 安裝到手機
adb install -r path\to\app-release.apk
```

`android/local.properties` 需含：
```
sdk.dir=C:\\Users\\<USER>\\AppData\\Local\\Android\\Sdk
```

---

## UI 設計（極簡 / 深色）

| 元素 | 色碼 |
|---|---|
| 背景 | `#0F0F0F` |
| 卡片 | `#111111` |
| 輸入框 / 次要卡片 | `#161616` |
| 主文字 | `#FFFFFF` |
| 次文字 | `#666666` |
| 收入 accent | `#55DDAA` |
| 支出 accent | `#FF6655` |
| 任務 accent | `#FF9944` |
| 筆記 accent | `#88AAFF` |

`fontWeight: '300'` 為主基調。Modal 一律 bottom sheet（`justifyContent: 'flex-end'`）。

Tab 順序：**首頁 · 行事曆 · 財務 · 任務 · 筆記**

---

## 開發階段

| Phase | 狀態 | 內容 |
|---|---|---|
| 1 | ✅ | 自製月曆 + 任務清單 |
| 2 | ✅ | 智慧分流（本地 + AI）+ AI 財務顧問 |
| 3 | ⬜ | Dashboard 總覽 |
| 4 | ✅ | 財務記帳（含圓餅圖、計算機） |
| 5 | 🔄 | 目標規劃器（融入筆記標籤） |

---

## Roadmap to v1（上架前必做）

1. Bundle ID `com.anonymous.lumi` → 正式 reverse-domain
2. Release keystore（產 + 備份；目前 debug keystore）
3. iOS 首次 build（EAS Cloud 或 Mac + Xcode）
4. Google Play 改打 `.aab`（`bundleRelease`）
5. 隱私政策 URL（揭露 AI 呼叫送資料給 Google / OpenAI）
6. App icon / splash 全尺寸符規
7. **換裝置資料遷移**：v1 走 JSON export / import via `expo-sharing`
8. Apple Developer $99/yr + Google Play Console $25

**規劃順序**：Android internal testing → Apple TestFlight → 雙平台正式發佈。

---

## 設計細則

- 不用 `react-native-calendars`，月曆自製 `CalendarGrid`。
- `Crypto.randomUUID()` 同步，**不需 await**。
- ID 統一用 `Crypto.randomUUID()`，時間統一用 `new Date().toISOString()`。
- 頁面重入 + 狀態變更用 `useFocusEffect + useCallback`。
- **不引入字體 icon 套件**，全 App 用 Unicode 符號（`✎` `[ ]` `$` `[v]` `!` `+` `x` `↻` `↑` `✓` `<` `>` ⋯）。

---

## License

MIT
