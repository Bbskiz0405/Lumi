# Widget / 通知記帳 / Google 整合 — 實作計畫

> 2026-06-26 規劃。實驗室電腦接手用。此檔自包含，不需外部 plan 檔。
> 開工順序：**Phase 1（桌面 widget）→ Phase 2（通知記帳）→ Phase 3（Google 整合）**。

## 背景 / 動機
使用者想「不打開 App 就能看資料、快速記帳」，靈感來自 iOS 快速記帳捷徑（控制中心 / widget / Apple Pay 一鍵記帳）。
平台現實（Android, Expo 55 / RN 0.83，package `com.anonymous.lumi`，`android/` 已 commit）：
- 鎖屏 widget：Android 手機基本做不到 → **不做**。
- Quick Settings 磚（下拉那些圓角按鈕）：系統 UI，**磚內無法打字**，點一下只能跳 App → **不做**。
- 桌面 widget：可行，用 `react-native-android-widget`（0.20.3，支援 Expo ≥54，已用 RN 0.83 / React 19.2 測過）。
- 「下拉直接打字、不開 App」：真正可行的是 **常駐通知 + 行內回覆（RemoteInput / direct reply）**，非 QS 磚。

## 已確認決策
1. 先做桌面小工具。
2. 通知行內記帳：文字**自動判斷分類**（重用 `services/classificationService.ts`）。
3. 不做 QS 磚、不做鎖屏 widget。
4. 產品方向：**與 Google 整合**（非取代）；記帳→Sheets「之後再說」暫緩。
5. 本地 AI：Pixel 8a Tensor G3 TPU 只能推論不能訓練；現有 `classifyWithHabits` 已是夠用的本地學習，Gemini Nano 本地推論列未來選項。

---

## Phase 1：桌面小工具（先做）

### 套件 / 設定
- `npm install react-native-android-widget`
- `app.json` 的 `plugins` 加入（與既有 `expo-router`、`expo-sqlite` 並列）：
  ```json
  ["react-native-android-widget", {
    "widgets": [{
      "name": "LumiOverview",
      "label": "Lumi 總覽",
      "minWidth": "180dp", "minHeight": "110dp",
      "targetCellWidth": 4, "targetCellHeight": 2,
      "description": "本月收支 + 今日任務",
      "previewImage": "./assets/widget-preview/overview.png",
      "updatePeriodMillis": 1800000
    }]
  }]
  ```

### 新增檔案
- `widgets/LumiOverviewWidget.tsx` — 用 `FlexWidget` / `TextWidget` 畫 UI。沿用色系（背景 `#0F0F0F`、卡片 `#111111`、收入 `#55DDAA`、支出 `#FF6655`、任務 `#FF9944`、fontWeight `'300'`）。
  - 內容：日期標頭（例 6/26 週五）／本月 收入·支出·結餘／今日任務 N 件 + 前 1–2 筆標題／按鈕 `＋記一筆`、`＋任務`。
  - 點擊用 `clickAction` + `clickActionData` 帶 deep link。
- `widgets/widgetTaskHandler.tsx` — `registerWidgetTaskHandler` 的 async 處理函式。
  - `WIDGET_ADDED` / `WIDGET_UPDATE` / `WIDGET_RESIZED` → 取資料 → `props.renderWidget(<LumiOverviewWidget .../>)`。
  - `WIDGET_CLICK` → 依 `clickAction` 開 deep link。
- `services/widgetService.ts` — `updateLumiWidget()`：呼叫 `requestWidgetUpdate({ widgetName: 'LumiOverview', renderWidget, widgetNotFound })`。
- `assets/widget-preview/overview.png` — 預覽圖（先放暫用圖即可）。

### 修改檔案
- `index.ts`（main entry，package.json main）：在 expo-router 入口前 `registerWidgetTaskHandler(widgetTaskHandler)`。
- `app.json`：加 plugin（如上）。
- `app/(tabs)/(calendar-finance)/finance.tsx`：用 `useLocalSearchParams` 讀 `add` 參數，為 `1` 時自動 `openModal()`（對應 widget「＋記一筆」一鍵直達輸入）。

### 資料橋接（關鍵）
Widget 在獨立 headless JS task 跑，讀不到 RN 畫面狀態。採**直接讀 SQLite**：
- handler 內重用既有 service：`getMonthSummary(month)` / `getExpenseByCategory(month)`（`services/financeService.ts`）、`getTodayTasks()`（`services/taskService.ts`）。`getDb()` 的 `initDb` 是 `CREATE TABLE IF NOT EXISTS`，headless 重入安全。
- App 內資料變動即時刷新：在現有 `bumpRefresh()` 觸發點（finance 的 `handleSubmit` / `handleSaveEdit` / `handleDelete`、calendar/tasks/task[id] 的 CRUD）後一併呼叫 `updateLumiWidget()`。
- `updatePeriodMillis`（30 分）作為 App 沒開時的週期 fallback。
- **備援**（若 headless 讀 `lumi.db` 有問題）：改用 `expo-sqlite/kv-store` 存一份 widget 摘要 JSON，App 變動時寫入、handler 只讀這份。先走直接讀，build 後驗證。

### Deep link（scheme 已是 `lumi`）
- `＋記一筆` → `lumi://finance?add=1`（finance 自動開新增 modal）。
- `＋任務` → `lumi://tasks?add=1`（後續處理）。
- 點 widget 主體 → `lumi://`（開首頁）。

### Build（實驗室電腦執行；沿用本地 Gradle，非 EAS）
1. `npm install react-native-android-widget`
2. 改 `app.json` plugin
3. `npx expo prebuild -p android`（`android/` 已 commit，需 review diff；portrait/splash 來自 app.json，理論可安全重生）
4. 本地 Gradle build / `npx expo run:android`（無法用 Expo Go）

---

## Phase 2：常駐通知 + 行內記帳（之後）

- 套件：`expo-notifications`（+ 可能 `expo-task-manager` 做背景處理）。
- 常駐（ongoing）通知：標題「🌙 Lumi · 記一筆」，內文顯示本月支出摘要。
- category `LUMI_QUICK_ADD` + `textInput` action：`buttonTitle:'記一筆'`、`textInput:{ submitButtonTitle:'記', placeholder:'例：午餐 120' }`、`options:{ opensAppToForeground:false }` → 下拉就地打字、不開 App。
- 背景處理回覆：`Notifications.registerTaskAsync` / TaskManager 接收 → 跑分類 → 寫 DB → 重貼通知「已記錄 ✓ 午餐 −120」。
- 分類重用（不重寫）：`parseMultipleTransactions(text)` / `classifyWithHabits(text)` + `guessExpenseCategory`（`services/classificationService.ts`）。FINANCE → `createTransaction`（`services/financeService.ts`）；可選 TASK → `createTask`。寫入後呼叫 `updateLumiWidget()` 一併刷新 widget。
- 注意：部分 OEM 背景限制（常駐通知有助維持進程）；iOS 不支援真背景文字輸入（App 本就以 Android 為主）。記帳時間沿用本地時間格式（**勿再加 `Z`**，見今日 timezone 修正）。

---

## Phase 3：Google 整合（策略方向，使用者選定）

動機：四個痛點（行事曆 / 待辦 / 跨裝置同步 / 隨手記）都會跑回 Google。
**關鍵洞察：接 Google Calendar/Tasks ＝ 免費拿到跨裝置同步**（Google 自己同步到電腦/網頁）。

| 情境 | 方案 | 可行性 |
|---|---|---|
| 行事曆 / 提醒 | Google Calendar API（任務 due_date ↔ 日曆事件，雙向） | ✅ 順便得到 Google 準時通知 |
| 待辦 | Google Tasks API（Lumi 任務 ↔ Google Tasks） | ✅ |
| 跨裝置同步 | 靠上面兩個自然得到 | ✅ |
| 隨手記 / 筆記 | **Google Keep 無公開 API** | ❌ 改 Drive/Docs 或維持本地 |
| 記帳 | Google Sheets API（電腦可看 + 備份，呼應 iOS 捷徑） | ✅ 但**使用者選「之後再說」暫緩** |

- Auth：`expo-auth-session` OAuth；個人用走「測試模式」+ 自己帳號（braydenwu.tw@gmail.com），免送 Google 審核。
- 工程量不小（Google Cloud 專案、OAuth、同步邏輯、衝突處理），分模組做。**進入此階段前需再細規劃。**

---

## 風險彙整
- 需原生 build，不能 Expo Go。
- `android/` 已 commit → prebuild 會產生 diff，需檢視。
- Widget headless 讀 SQLite 需 build 後實測；有 kv-store 備援。
- Phase 2 背景回覆在少數機型可靠度看 OEM。

## 驗證
1. Build 後把「Lumi 總覽」加到桌面 → 顯示本月收支 + 今日任務 + 日期。
2. App 內記一筆 → widget 即時更新（`requestWidgetUpdate`）。
3. 點 widget「＋記一筆」→ App 開到 finance 新增 modal。
4. Phase 2：下拉通知 → 點「記一筆」→ 打「午餐 120」送出 → 交易建立、通知更新成「已記錄」、App 沒開啟。
