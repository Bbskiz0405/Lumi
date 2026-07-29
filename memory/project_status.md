# Project Status

已完成 Phase 的歸檔、架構決策、UI 慣例。需要歷史細節時才讀。**新 AI 接手時請務必先閱讀此檔與 `daily_log.md`。**

---

## v0.4.68 — 外部行程單日修正與任務分類（2026-07-29）

- 修正月曆已有外部行程標點，點進當日卻讀不到全天、跨日或部分重複事件：單日議程改為取得同月事件實例，再用事件與當日時間重疊篩選。
- 月曆外部行程標點改為涵蓋事件跨越的每一天，不只標記開始日；換日期時來源與分類篩選會回到「全部」，避免殘留篩選造成看似空白。
- 任務由四個固定標籤擴充為十個常用分類：工作、學校、研究、申請、生活、健康、家庭、社交、雜務、重要日。
- 支援自訂任務分類；自訂值存於非敏感 settings 並會進入備份。分類顏色會顯示於任務卡、月曆任務標點與單日分類篩選。
- TypeScript、diff check、arm64 release build 均通過；`0.4.68 (68)` 已覆蓋安裝至 Pixel 8a，冷啟動正常且未命中 AndroidRuntime／ReactNativeJS／ExpoModulesCore／SQLite fatal error。

---

## v0.4.67 — 手機日曆連動與行事曆 UX（2026-07-29）

- 採用 `expo-calendar` 連接手機系統日曆；Android 使用者可選擇已同步到手機的 Google 日曆，不需在 Lumi 再登入一次 Google 或保存 OAuth token。
- 同步規則刻意保持單向：有日期的 Lumi 任務可自動建立／更新日曆行程；外部行程在 Lumi 只讀顯示，不會自動轉成任務。
- Lumi 只刪除自己建立且有 link 紀錄的行程；外部行程不修改、不刪除，也不會送進 AI。
- SQLite 升至 `user_version = 3`，新增 `calendar_event_links` 防止重複建立；日曆 ID、權限與連動 link 屬於裝置狀態，不放進 JSON 備份。
- 新增日曆連動設定、權限說明、可寫入日曆選擇、自動同步開關，以及由使用者主動觸發的「同步目前未完成任務」。
- 月曆固定為六週高度，加入「今天」快捷鍵、科技風換月圖示與任務／外部行程／記帳圖例；單日議程可切換全部、任務或行程，並能開回系統日曆。
- Expo config、TypeScript、arm64 release build 與 APK manifest 驗證通過，產出 `0.4.67 (67)`；APK 已覆蓋安裝至 Pixel 8a，冷啟動與程序狀態正常，未命中 AndroidRuntime／ReactNativeJS／ExpoModulesCore／SQLite fatal error。
- 首次啟動不會主動要求日曆權限；Google 帳號日曆選擇與建立／改期／刪除真實同步仍待使用者手動驗收。

---

## v0.4.66 — 筆記長內容閱讀與安全區（2026-07-29）

- 既有筆記採閱讀優先模式，打開後不再自動 focus 多行輸入框，長內容可正常上下滑動。
- 使用者按「編輯」後才進入輸入狀態；輸入框固定 240px 高並可內部捲動。
- 取消編輯會還原原始內容與標籤；新增筆記取消則直接關閉。
- 底部操作列移出 ScrollView 並套用 safe-area，Modal 使用 KeyboardAvoidingView 處理鍵盤版面。
- typecheck、diff check、arm64 release build 與 Pixel 8a 冷啟動均通過，使用者已實機驗收。

---

## v0.4.65 — 深色極簡科技 UI（2026-07-27）

- 以 `react-native-svg` 自製 `TechIcon` 圖示系統，避開 Android icon font 打包失效問題。
- 新增共用 `IconButton`，統一 36px、8px 低圓角、細邊框與深色表面。
- 重整底部導覽、首頁快捷鍵、模組卡、財務工具列、任務、筆記、時間軸、AI 顧問與側欄圖示。
- 保留原深色配色，不使用可愛元素、霓虹效果或裝飾性動畫；選中狀態只以細線與亮度呈現。
- typecheck、diff check、arm64 release build 均通過，並已於 Pixel 8a 實機確認 SVG 圖示正常。

---

## v0.4.64 — UX 安全修補（2026-07-27）

- 換月同步選取日並防快速連按競態；交易新增／編輯可直接修改與驗證日期。
- 修正記帳雙重刪除確認、任務真實日期驗證與單日優先度排序。
- 智慧輸入新增 8 秒 Undo，多筆記帳強制先預覽；復原採 exclusive transaction。
- 任務、行事曆、筆記、財務及首頁模組開始區分讀取錯誤與空資料，主要表單防連點。
- 問 Lumi 可直達 AI 設定並顯示資料傳送範圍；AI 財務顧問／月度回顧補透明提示，一般 AI 呼叫加入 20 秒 timeout。
- 底部 tab 改用 navigate，主要操作補 accessibility label／state 與較大觸控範圍。
- production Hermes export 1240 modules、arm64 release build、typecheck 均通過。
- 最終 APK 已安裝至 Pixel 8a，確認 `0.4.64 (64)` 冷啟動 339 ms，無 AndroidRuntime／ReactNativeJS／SQLite fatal error。

---

## v0.4.63 — 信任層（2026-07-27）

- 新增「資料與備份」：JSON 匯出、匯入預覽、合併與完全取代。
- API Key 永不寫入備份；完全取代時仍保留 SecureStore／SQLite fallback key。
- 匯入採單一 exclusive transaction，失敗時不留下半套資料。
- SQLite 初始化改為循序 migration，目前最新 `user_version = 2`。
- 完整後續規劃見 `memory/product_roadmap.md`。
- `npm run check`、production Hermes export 與 arm64 release build 已通過。
- 最終 APK 已安裝至 Pixel 8a，確認 `0.4.63 (63)` 可冷啟動（354 ms）、既有 DB 可升級，且無 AndroidRuntime／ReactNativeJS／SQLite fatal error。
- Gradle release build 的 Metaspace 已由 512m 調至 1024m，避免新增 Expo 原生模組後建置耗盡。
- 為避免改動手機真實資料，匯出、合併、完全取代與錯誤檔 rollback 仍列為手動驗證。

---

## 專案概覽

- **Framework**: Expo 55 + React Native 0.83 + TypeScript + Expo Router
- **Database**: SQLite (純本地，不需登入)
- **AI Integration**: OpenRouter / Gemini (使用者自填 API Key)
- **目標平台**：Android（開發中）+ iOS（未 build）→ **最終目標：雙平台正式上架 App Store + Google Play**
- **PRD**：`Lumi_PRD.md`

## 最終目標：雙平台上架 (2026-05-29 決策)

所有架構決策需以雙平台上架為前提。上架前 blocker 清單：

1. Bundle ID `com.anonymous.lumi` → 正式 reverse-domain（Apple 拒收 anonymous）。
2. Debug keystore → 正式 release keystore（Google Play 拒收 debug 簽）。
3. iOS 從未 build → 需 EAS Build 雲端或 macOS Xcode。
4. Google Play 要 `.aab`（`bundleRelease`），不是 APK。
5. 隱私政策 URL（揭露 AI 呼叫送輸入給 Google/OpenAI）。
6. App icon / splash 全尺寸符規。
7. Apple Developer $99/yr + Google Play Console $25。

**規劃順序**：Android internal testing → Apple TestFlight → 雙平台正式發佈。

**政策風險**：AI Key BYOK 可能被 Apple 質疑，預留後端代理 / first-party key 切換點。

**換裝置資料遷移（上架 v1 必做）**：SQLite 純本地，使用者換手機會掉資料。v1 至少要做 JSON export / import（設定頁按鈕 + `expo-sharing`）。v2 視反饋再評估雲端同步（Firebase / Supabase）。

---

## 核心架構與 UI 慣例 (極度重要)

### 導覽架構 (Custom Nested Routing)
由於原生 `MaterialTopTabs` 有字體裁切與佈局問題，我們採用了高度客製化的導覽結構：
1. **外層 (`app/(tabs)/_layout.tsx`)**:
   - 使用自製 `CustomTabBar` 取代預設的 Bottom Tab Bar。
   - 包含 5 個主要入口：首頁(`index`)、行事曆/財務容器(`(calendar-finance)`)、任務(`tasks`)、筆記(`notes`)。
   - **請勿使用負 margin 或 padding 來排版 Tab Bar 文字，請依賴 Flexbox (`alignItems: 'center'`)。**
2. **內層 (`app/(tabs)/(calendar-finance)/_layout.tsx`)**:
   - 包含共用的 `PersistentCalendar` (不會因滑動而重繪)。
   - 使用自製 `SubTabBar` 在「行事曆」與「財務」間切換。

### UI 風格（Dark Minimal Tech）
- **禁用 Icon Font**：Android 實機曾發生 `MaterialCommunityIcons` 字型漏包。圖示一律使用 `components/ui/TechIcon.tsx` 的 `react-native-svg` 幾何線框，不使用 Unicode 假圖示。
- **圖示規格**：一般 18–22px、線寬約 1.7px、圓角端點；選中時可提高至 1.9px，但不使用填滿、發光或彈跳效果。
- **按鈕規格**：優先使用共用 `IconButton`，預設 36px、8px 低圓角、`#121417` 表面與 `#2B2F34` 邊框。
- **視覺原則**：保留深色底與現有語意色；選中狀態只使用細線、邊框或亮度差。不要加入可愛插圖、膠囊化、霓虹漸層或非必要動畫。
- **新增圖示**：先擴充 `TechIconName` 與對應 SVG path，確保全 App 的線條語言一致，不要臨時塞文字代號。

### 資料狀態管理
- **Silent Refresh**: 避免使用 `ActivityIndicator` 造成畫面切換閃爍。在 `useFocusEffect` 中使用 `hasLoaded` 鎖定初始加載，後續切換僅在背景靜默更新 `state`。

---

## 已完成 Phase

### Phase 1 — 日曆 & 任務清單 ✅
- 自製月曆 Grid (`components/shared/CalendarGrid.tsx`)。
- 任務列表 (`app/(tabs)/tasks.tsx`) 支援優先度、標籤、到期日倒數。

### Phase 2 — 智慧分流 & AI 財務顧問 ✅
- `services/geminiService.ts` 負責處理 AI 邏輯。
- 支援 Gemini (`gemini-2.5-flash-lite`，預設) 與 OpenRouter (`openrouter/free` 自動選可用免費模型)。
- **Gemini model 注意**：`gemini-1.5-flash` 已於 2025/09 下架，v1beta API 會回 404。現以 `gemini-2.0-flash` 為穩定免費預設。若再失效，改用 `gemini-flash-latest`。
- AI 財務顧問 (`FinanceAdvisor.tsx`) 實作了鍵盤防擋 (`KeyboardAvoidingView`) 與 API Key 儲存機制。

### Phase 4 — 財務記帳 ✅
- 包含收支明細、圓餅圖統計、手動輸入與計算機功能。

### 筆記模組 (取代 Dashboard) ✅
- `app/(tabs)/notes.tsx` 提供標籤過濾與純文字筆記功能。

---

## 待完成 / 開發中

- 財務進階規劃：儲蓄目標、固定/額外收入分類。

## 差異化方向：A + B + D (2026-05-29 決策)

砍 Phase 3 Dashboard + Phase 5 簡化（退化為筆記標籤「目標」）。改做三條備審導向 + 市場差異化路線：

- **A — 個人時間軸敘事 (Lifeline)**：tasks/finance/notes/entries 按時序合一 + 月底 LLM narrative。取代 Dashboard。
- **B — 行為迴路偵測**：本地演算法找週期/連鎖/未完成規律，AI 翻譯成首頁推送。
- **D — 問 Lumi 任何事**：全文檢索 + AI 整理。最快出成果（1–2 天）。

共用基建：`services/eventStreamService.ts` 統一事件流（避免三條各寫 SQL）。

**建議順序**：D → A → B。詳細見 auto-memory `project_differentiation_vision.md`。
