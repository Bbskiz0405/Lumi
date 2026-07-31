# Project Status

已完成 Phase 的歸檔、架構決策、UI 慣例。需要歷史細節時才讀。**新 AI 接手時請務必先閱讀此檔與 `daily_log.md`。**

---

## v0.4.81 — 標準工時＋固定休息制度（2026-07-31）

- 固定休息回歸工時制度設定，不需逐日輸入；預設標準 8:00／休息 60 分，並提供常用快捷。
- 預計達標、下班提醒與完成後有效工時均依標準工時及固定休息計算。
- 儲存制度會套用目前上班中與未來紀錄，已完成紀錄維持原值；月摘要仍只結算已下班資料。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.81 (81)` 已覆蓋安裝 Pixel 8a。

---

## v0.4.80 — 工時流程簡化與摘要修正（2026-07-31）

- 依使用者實際公司流程移除休息時間，實際工時直接以上班到下班計算；舊欄位僅為資料相容保留。
- 月摘要只納入已下班紀錄，沒有完成紀錄時顯示尚未結算，修正上班中卻誤顯示剛好達標。
- 上班中顯示預計達標時間與剩餘時間；標準工時改為頁首精簡入口與常用時數快捷。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.80 (80)` 已覆蓋安裝 Pixel 8a，既有上班中紀錄保留。

---

## v0.4.79 — 工時預設與休息計算 UX（2026-07-31）

- 工時頁新增可見的偏好設定，支援自訂每日標準工時與預設休息分鐘；新打卡／補登自動帶入，單日仍可覆寫。
- 單日完成紀錄顯示休息扣除算式，補登／編輯 bottom sheet 可捲動，休息欄位不再容易被遮住。
- 工時頁以「工時結餘／多做／少做／剛好達標」取代容易和金額混淆的「差額」。
- 尚未下班提醒時間改為該筆標準工時加休息時間，不再固定多加一小時。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.79 (79)` 已覆蓋安裝 Pixel 8a，設定卡實機顯示正常。

---

## v0.4.78 — Google 日曆回前景同步修正（2026-07-30）

- 修正從 Google 行事曆 App 切回 Lumi 時，外部行程可能停留在上一次查詢結果的問題。
- 新增前景恢復後的短期複查機制，讓 Android Calendar Provider 稍晚完成的同步能自動反映。
- 當日列表與月份標點使用請求序號避免舊查詢覆蓋新資料。
- `0.4.78 (78)` 已完成 TypeScript、Expo config 與 diff check；依使用者要求不做額外實機功能測試，由使用者自行驗收同步結果。

---

## v0.4.77 — 任務時間與本機提醒（2026-07-30）

- 新增 `expo-notifications 55.0.25` 與 Android 任務／工時通知頻道；本機提醒不依賴 Google 日曆或網路服務。
- 任務 schema 新增 `due_time`、`reminder_minutes`，建立與編輯支援時間快捷及準時／10 分／30 分／1 小時前提醒。
- 任務提醒以固定 ID 管理，建立、修改、完成、取消完成與刪除均同步排程或取消；通知點擊可直達任務詳情。
- 上班打卡依標準工時加一小時安排尚未下班提醒，下班、完整補登或刪除時取消；通知點擊直達工時頁。
- SQLite 最新版為 v6；備份 schema v4 並將舊備份任務的新增欄位正規化為 `null`。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.77 (77)` 已覆蓋安裝 Pixel 8a，通知權限宣告與兩個頻道存在，冷啟動正常且未命中 fatal error。

---

## v0.4.76 — 日曆動畫偶發閃爍修正（2026-07-30）

- 工作區轉場改為單一 `WorkspaceTransition` 狀態，原子地保存唯一序號、來源、目標及該次專用的 `Animated.Value`。
- 新轉場不再重用上一段原生透明度；舊動畫立即停止，過期完成回呼須通過序號比對才能清理資料層，消除快速切換與收尾交界的競態。
- TypeScript、diff check 與 arm64 release build 通過；`0.4.76 (76)` 已覆蓋安裝 Pixel 8a，冷啟動及連續 12 次工作區路徑切換正常，未命中應用程式 fatal error。

---

## v0.4.75 — 日曆標點雙層交叉淡化（2026-07-30）

- 上方共用月曆恢復動畫，但改用兩個重疊資料層：舊標點淡出與新標點淡入同步進行，不再先清空整片標點。
- 日期、選中框、格線與月曆版面保持靜止；圖例共用 180ms ease-in-out 過渡，工作區指示線動畫維持獨立。
- 快速切換會停止前一段動畫並從目前指定工作區重新交叉淡化，完成後移除舊資料層。
- TypeScript、diff check 與 arm64 release build 通過；`0.4.75 (75)` 已覆蓋安裝 Pixel 8a，冷啟動正常且未命中應用程式 fatal error。

---

## v0.4.74 — 日曆標點閃爍修正（2026-07-30）

- 移除共用月曆日期標點與圖例的整片透明度動畫；切換工作區時直接呈現正確資料，避免資訊區域看起來像閃爍或重畫。
- 動態回饋改放在工作區選中指示線，使用 160ms 淡入與輕微水平展開，日曆本體維持穩定。
- UI 原則補充：資訊密集的月曆資料層不做整批亮滅；動畫應集中在頁籤、按鈕等操作回饋。
- TypeScript、diff check 與 arm64 release build 通過；`0.4.74 (74)` 已覆蓋安裝 Pixel 8a，冷啟動正常且未命中應用程式 fatal error。

---

## v0.4.73 — 月曆標點切換動畫修正（2026-07-30）

- 工作區一切換就立即套用對應的行事曆／工時／財務標點，只對新標點與圖例做 120ms ease-out 淡入。
- 移除原本 90ms 舊標點淡出、日期格標點下移及延後換資料的流程，避免整片閃動與上下工作區不同步。
- TypeScript、diff check 與 arm64 release build 通過；`0.4.73 (73)` 已覆蓋安裝 Pixel 8a，冷啟動及 work deep link 正常，未命中應用程式 fatal error。

---

## v0.4.72 — 工時工作區與情境月曆（2026-07-30）

- 共用月曆下方由兩個工作區擴充為「行事曆｜工時｜財務」；工時歸在時間與財務之間，不冒充任務或一般行程。
- 月曆依目前工作區只顯示相關標點與圖例，切換時以 90ms 淡出＋150ms 淡入及微位移更新，保留極簡科技風且避免整個月曆跳動。
- 工時支援即時上下班、手動補登、跨午夜、休息分鐘、標準工時、備註、修改與刪除；日期格區分上班中、超時、剛好與不足。
- 工時單日卡顯示上下班、進度、實際工時與差額；月摘要顯示完成天數、累計工時及差額。
- SQLite 最新版本升為 `user_version = 5`；備份 schema 升為 v3 並向下相容，新增 `work_records` 的統計、匯出、合併與取代。
- 薪資、法定加班倍率、多段班與 CSV 報表未納入第一版；須先取得實際公司規則與朋友試用回饋。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.72 (72)` 已覆蓋安裝 Pixel 8a，既有 DB 升級與 work deep link 正常，未命中 React Native／Expo／SQLite fatal error。

---

## v0.4.71 — 行事曆主動健檢第一批改善（2026-07-30）

- 依建立、查看、修改、提醒、重複、搜尋、同步與刪除的完整流程重新健檢，結果見 `memory/calendar_ux_audit_2026-07-30.md`。
- 完成任務時移除 Lumi 建立的手機日曆項目，避免已完成內容繼續佔用日曆；取消完成可重新同步。
- Lumi 行程支援開始／結束日期不同的跨日與過夜情境，提供同日／隔天與常用時長快捷。
- 任務提供今天／明天／無日期快捷；今天的新行程預設到下一個半小時。
- Lumi 與外部行程在單日議程合併按時間排列，顯示完整時段、跨日日期、同步狀態與外部讀取錯誤。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.71 (71)` 已覆蓋安裝 Pixel 8a，冷啟動程序正常且未命中 React Native／Expo／SQLite fatal error。

---

## v0.4.70 — Lumi 原生行程（2026-07-29）

- 行事曆新增建立類型選擇：任務保留完成狀態／優先度；行程使用開始結束時間且不需完成。
- 新增行程支援全天、時間、地點、分類、提醒、備註，以及 Lumi 內編輯／刪除。
- 行程先存本機 SQLite，再以 best-effort 寫入選定的手機／Google 日曆；日曆連動設定可補同步既有未來任務與行程。
- 同步的 Lumi 行程以 external event ID 去重，不會同時出現在 Lumi 行程與外部唯讀行程。
- 月曆、單日議程、資料筆數與 JSON 備份都納入行程；裝置 calendar ID 與 external event ID 不進可攜式備份。
- SQLite 最新版本升為 `user_version = 4`；備份 schema 升為 v2，匯入 schema v1 時自動視為沒有 Lumi 行程。
- 提醒採任務／行程的屬性模型，不增加第三種近似資料類型；第一版提醒由連動的手機日曆發出。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.70 (70)` 已覆蓋安裝 Pixel 8a，冷啟動程序正常且未命中 AndroidRuntime／ReactNativeJS／ExpoModulesCore／SQLite fatal error。

---

## v0.4.69 — 全天行程時區修正（2026-07-29）

- 修正 Google／Android 全天事件因 UTC 結束時間轉成台灣時間後，在隔天多出標點及內容。
- 全天事件採日期語意：開始日包含、結束日不包含；定時事件才使用本地時間重疊判斷。
- 產品模型確認：提醒是任務或行程上的通知能力，不新增第三種近似資料；任務有完成狀態，行程則有開始／結束時間且不需勾選完成。
- v0.4.69 已覆蓋安裝至 Pixel 8a，冷啟動與 fatal log 檢查正常；全天事件是否只顯示單日待使用者以原行程驗收。

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
