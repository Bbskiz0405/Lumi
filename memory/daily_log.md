# Daily Log

每次對話開始先讀此檔取得當前狀態。做完事後更新。Phase 完成後搬到 `project_status.md`，此檔只保留最近動態。

---

## 當前狀態 (2026-06-05)

**版號：0.4.57**

### 0.4.57 — 問 Lumi 鍵盤修正 (2026-06-05)
- 問題：「問 Lumi」(`app/ask.tsx`) 點輸入框後，Android 鍵盤蓋住輸入框，看不到打的字。
- 根因：`KeyboardAvoidingView` 的 `behavior` 只設了 iOS（`'padding'`），Android 給 `undefined` → 失效。
- 修：對齊 `FinanceAdvisor` 可動的寫法 `behavior={ios?'padding':'height'}`、`keyboardVerticalOffset={0}`。
- 備註：本次只 commit/push，**還沒重 build 推使用者本人手機**（之前那台 42231 是產學測試機，剛好插著被我裝了 Lumi，產學 app `com.chuanen.penpredswitcher` 未受影響）。

### 0.4.56 — 問 Lumi（ABD 差異化路線 D：記憶檢索）(2026-06-04)
ABD 三條差異化路線（見 `project_status.md` / auto-memory `project_differentiation_vision`）正式起步，先做 D。
- **共用基建** `services/eventStreamService.ts`：`getEventStream({start,end,types,query,limit})` → `UnifiedEvent[]`，攤平 tasks/transactions/notes/entries 成統一事件流。timestamp = created_at，task 另存 dueDate。A / B / D 三路線都吃這個，避免重複 SQL。
- **D 問 Lumi** `services/geminiService.ts` 新增 `askLumi(question, history)`：拉 eventStream（limit 250）→ 格式化成「記憶 context」→ 餵 AI 只根據紀錄回答（複用既有多 provider `callAI`，temp 0.3）。
- **UI** `app/ask.tsx`：聊天頁（建議問句 chips + 對話氣泡 + KeyboardAvoidingView）。`app/_layout.tsx` 註冊 `ask` Stack screen。首頁 (`app/(tabs)/index.tsx`) topRow 加放大鏡 `⌕` → `/ask`。
- **更新日誌補齊**：`SidebarDrawer` RELEASES 之前卡在 0.4.53、VERSION 卡 0.4.54，本次補上 0.4.54 / 0.4.55 / 0.4.56，VERSION → 0.4.56。
- 已本地 Gradle build（39s, APK 90 MB）+ `adb install -r` 推上實機（device 42231JEKB12273）。
- **v1 檢索限制**：目前抓最新 250 筆讓 AI 過濾。資料量大時「兩個月前的冷氣」可能落在窗外 → 之後改 query 關鍵字 + 日期窗。
- **下一步**：D 實機測 → A 個人時間軸敘事（吃同一 eventStream）→ B 行為迴路偵測。

### 0.4.55 — API 設定搬進 Sidebar (2026-06-01)
- 新元件：`components/ApiSettings.tsx`。供應商選擇（Gemini / OpenRouter / OpenAI）+ API key 輸入 + 更換 / 移除按鈕 + 取得 key 連結提示。Gemini 列為推薦。
- `SidebarDrawer` 「設定」section 改成內嵌 `<ApiSettings />`，從佔位變成可實際操作 UI。
- `FinanceAdvisor.tsx`：移除 header 的 `⚙` 齒輪按鈕（設定已搬到 sidebar），刪掉相關 `handleKeySettings` / 未用 imports（`Alert`、`removeApiConfig`）。
- 首次設定 UI 仍保留在 FinanceAdvisor 內（needsKey 分支），方便新使用者從顧問頁直接入門。設好後管理走 sidebar。

### 0.4.54 — 首頁右上側邊選單 (2026-06-01)
- 新元件：`components/SidebarDrawer.tsx`。Modal + Animated 從右側滑入（DRAWER_WIDTH = min(320, 螢幕寬 82%)）。
- 首頁 (`app/(tabs)/index.tsx`) 日期文字右側加 `≡` 圓鈕，點開 drawer。
- Drawer 三段：
  - **設定**：佔位（目前 AI 設定還在財務頁 ✧ 按鈕，後續搬過來集中管理）。
  - **更新日誌**：硬編碼 0.4.47–0.4.53 release notes。
  - **關於**：版號 + GitHub 連結 (`Linking.openURL`) + 簡介。
- 後續：設定要把 AI 供應商 / API key 管理 UI 從 FinanceAdvisor 搬進來；資料匯出 / 匯入按鈕加在這裡（對應 v1 上架 blocker）。

### 0.4.53 — Task detail 閃退 hotfix (2026-06-01)
- 問題：0.4.52 後點任務詳情頁立刻閃退。
- 根因：`task/[id].tsx` 在 `(tabs)` 路由群組「外」，但 `CalendarProvider` 只包在 `(tabs)/_layout.tsx`。0.4.52 改 `task/[id].tsx` 用 `useCalendar()` 來叫 `bumpRefresh()` → 找不到 provider → throw。
- 修：把 `CalendarProvider` 升到 root `app/_layout.tsx`，移除 `(tabs)/_layout.tsx` 內的重複 wrapper（避免兩層獨立 state）。

### 0.4.52 — 行事曆 dot 即時刷新 (2026-06-01)
- 問題：新增 / 刪除任務或記帳時，行事曆上的綠點 / 藍點要切換月份再切回來才會更新。
- 根因：`PersistentCalendar` 的 `loadDates` deps 只有 `[year, month]`，沒在 CRUD 後重新跑。
- 修：`CalendarContext` 加 `refreshKey` + `bumpRefresh()`；`PersistentCalendar` deps 加 `refreshKey`；所有 CRUD 入口在動 DB 後呼叫 `bumpRefresh()`：
  - `app/(tabs)/(calendar-finance)/finance.tsx`：create / edit / delete transaction。
  - `app/(tabs)/(calendar-finance)/calendar.tsx`：create / toggle task。
  - `app/task/[id].tsx`：update / delete / toggle complete。
  - `app/(tabs)/tasks.tsx`：create task / toggle complete。
  - `app/(tabs)/index.tsx`：智慧分流 doSave 結束時。
- 順手：`_layout.tsx` 移除沒在用的 `MaterialCommunityIcons` import。

### 0.4.51 — 記帳 timezone 修正 + 刪除確認 + 圖示修 (2026-05-31)
1. **記帳日期 timezone bug**：原本 `new Date().toISOString()` 走 UTC，台灣 UTC+8 在午夜前後、或從行事曆指定其他天時會把記帳算到 UTC 日期而非使用者看到的 local 日期 → 綠點跑掉 / 算到「下一天」。
   - 修：`services/financeService.ts` `nowISO()` 改成把 local 年月日時分秒組成 ISO（fake-UTC，後綴仍 `Z` 但內容是 local）。
   - 修：`app/(tabs)/(calendar-finance)/finance.tsx` `handleSubmit` 無論今天 / 其他天，一律用 `selectedDate + local 時間` 組 `created_at`，移除原本的「今天 → undefined」分支。
   - **注意**：舊資料仍是真 UTC，會顯示在 UTC 日期上；新資料起一致。
2. **記帳刪除按鈕 `?`**：`components/finance/TransactionCard.tsx` 還用 `MaterialCommunityIcons name="close"` → 改 Unicode `×`。
3. **刪除加二次確認**：`handleDelete` 加 `Alert.alert` 確認框，避免誤刪。
4. **任務頁面平行檢查**：任務列表頁沒有直接刪除 UI（刪除走詳情頁，已有 Alert 確認）、`due_date` 用 YYYY-MM-DD（無 timezone bug）、icon 已在 0.4.49 全換 Unicode。**任務面無需修正**。

### 0.4.50 — 筆記新增按鈕 + AI 分類 TASK vs IDEA 修正 (2026-05-29)
1. **筆記頁加新增按鈕**：原本只有「+」新增標籤、沒有獨立新增筆記入口。
   - `app/(tabs)/notes.tsx` 標題右側加 `+` 按鈕 → 開 modal「新增筆記」（內容 + 標籤）。
   - 重用 edit modal：新增 `addingNote` state，modal title / button label 隨 mode 切換。
2. **修 AI 把「會議紀錄」誤判為 TASK**：CLASSIFY_PROMPT 加入關鍵判斷規則「TASK 是未來要做的動作，IDEA 是紀錄/想法」+ 多個對比範例（「明天開會」TASK vs 「會議紀錄」IDEA、「上課筆記」IDEA、「讀書心得」IDEA）。
**Build 方式：** 本地 Gradle build（不靠 EAS）
**環境：** Android Studio JBR 21 + Gradle 8.13
**主分支：** `master`（已合併 `release/v0.4.45`）

### Phase 狀態
- Phase 1（任務 / 月曆）✅
- Phase 4（財務記帳）✅
- Phase 2（智慧分流 + AI）✅ 大致完成
- Phase 5（目標）— 融入筆記標籤
- Phase 3（Dashboard）⬜

### 0.4.45 → 0.4.49 Release 時間軸 (2026-05-29)

**0.4.45** — 5-Tab 巢狀導覽 + Unicode icons + AI fixes（首次 release APK 86.2 MB，4 ABI + Hermes 齊全）。
**0.4.46** — `gemini-1.5-flash` 已從 v1beta API 下架（2025/09）→ 改 `gemini-2.0-flash`；順手修 `setGeminiApiKey` provider hardcode bug。
**0.4.47** — `gemini-2.0-flash` free tier RPD 被砍極低 → 改 `gemini-2.5-flash-lite`（2025/07 stable，free tier 高、1M context、智能更強）。**首次實機驗證通過。**
**0.4.48** — (1) 任務詳情頁加「完成 / 取消完成」按鈕；(2) 記帳編輯 Modal 加「刪除」按鈕；(3) 首頁智慧分流改 AI 優先（`classifyTextWithAI`：6 秒 timeout，無 key / 失敗則 fallback 本地 `classifyWithHabits`；Gemini 用 `responseMimeType: application/json`，OpenAI/OpenRouter 用 `response_format: json_object`）。
**0.4.49** — (1) AI 分類 loading：送出按鈕 swap `ActivityIndicator`；(2) AI 抽 `dueDate`：CLASSIFY_PROMPT 注入今天日期 + 範例，TASK 類別回 `dueDate` (YYYY-MM-DD) → 進行事曆；(3) 修任務打勾 icon `?`：`MaterialCommunityIcons.ttf` 已刪 → MCI 全變問號；`TaskCard` 改自製圓圈 + Unicode `✓`，`index.tsx` 殘留 MCI 全換 Unicode (`↑` / `[v]` / `$` / `!`)。

### 環境變數 / 安裝流程備忘
- adb 路徑：`C:\Users\Brayden\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- 直接安裝：`adb install -r <apk>`（`-r` 保留資料覆蓋升級，因 keystore 相同）。
- Build 必須在 PowerShell 同 session 內設：
  - `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"`
  - `$env:ANDROID_HOME = "C:\Users\Brayden\AppData\Local\Android\Sdk"`
- `android\local.properties` 需寫入 `sdk.dir=C\:\\Users\\Brayden\\AppData\\Local\\Android\\Sdk`。
- `react-native-screens` 的 `R.jar` 鎖檔 → `Stop-Process java,javaw` + 刪 `node_modules\react-native-screens\android\build` 後重跑。
- Release APK 86.2 MB 正常（4 ABI + Hermes + R8 minify）。比舊 debug 180 MB 小是因為 R8 + .so 壓縮。

---

## 先前完成 (2026-05-28 下半場)

### 導覽架構與 UI 重構
- **自製 5-Tab 主導覽** (`CustomTabBar`)：底部「首頁 / 行事曆 / 財務 / 任務 / 筆記」。
- **雙層滑動**：「行事曆」「財務」進入 `(calendar-finance)` 巢狀導覽，`SubTabBar` 切換，`PersistentCalendar` 固定不抖。
- **`hasLoaded` 鎖**：避免切 Tab 重複觸發 `ActivityIndicator` 閃爍。

### 終極 Icon 解決方案 (Kaomoji / Unicode)
- 棄用 `MaterialCommunityIcons`（打包失效）→ 全改 Unicode：Tab `✎ [ ] $ [v] !`，操作 `+ x v > ^ ↻ [=] ✧`，月曆切換 `< >`。
- **注意**：刪 `.ttf` 後仍殘留 MCI 引用會顯示 `?`。0.4.49 已掃掉 TaskCard / index.tsx；finance.tsx / TransactionCard / ModuleCard / CalendarGrid / `_layout.tsx` 可能尚有殘留，看到 `?` 再修。

### Metro Bundler 快取
- 編譯前強制清 `.expo` 否則改的代碼進不去 APK。

---

## 待解決問題

### 財務進階規劃（朋友回饋）
- 儲蓄目標：月存金額 → 從收入扣 → 固定支出扣 → 剩餘比例分配各類上限。
- 收入分類：固定 vs 額外 → 額外可選歸類或存起來。
- 緩衝區：未分配額外收入 → 抵消超標。
- 長期目標：幾月/幾年存多少 → 歷史平均反推月存額。

### Phase 5：目標規劃器（**砍掉**）
- 原 `services/goalService.ts` 計畫不做了。差異化不足。
- 退化為「筆記標籤『目標』」即可。

### 差異化方向：A + B + D（2026-05-29 決策，取代 Phase 3 / 5）
備審導向，市面上沒人做過 + 對使用者有實際價值。三條共用 `eventStreamService` 統一事件流。

- **A — 個人時間軸敘事 (Lifeline)**：tasks/finance/notes/entries 按時序合一 + 月底 LLM narrative summary（"這個月你過得怎樣"）。取代 Phase 3 Dashboard。工時 3–4 天。
- **B — 行為迴路偵測**：本地演算法找週期性 / 連鎖性 / 未完成規律 → 首頁 "Lumi 觀察" card。備審研究角度（可量化準確率）。工時 4–5 天。
- **D — 問 Lumi 任何事**：全文檢索 + AI 整理回答（"兩個月前冷氣多少"）。工時 1–2 天，**最快出成果**。

**建議順序：** D → A → B（簡 → 中 → 難）。或 A 先（UI 先有可丟備審 demo）→ D → B。

詳細見 auto-memory `project_differentiation_vision.md`。

### 換裝置資料遷移（上架 v1 blocker）
SQLite 純本地，使用者換手機 / 重裝 App 會掉所有資料（任務 / 記帳 / 筆記 / entries / AI 學習）。**上架前必須有方案**。候選：
1. **JSON export / import**（最簡單，v1 推薦）— 設定頁「匯出」→ dump 全表 JSON → `expo-sharing` 分享；新裝置「匯入」讀回。
2. iCloud / Google Drive 自動備份 — 平台差異大。
3. 雲端帳號同步（Firebase / Supabase）— UX 最佳，要寫後端、加登入、處理 conflict、付雲端費。
4. QR / Wi-Fi Direct 點對點 — 零後端，實作較複雜。

**策略：** v1 先做 #1（JSON），v2 視反饋加 #3。

---

## 最終目標：雙平台上架 (2026-05-29 決策)

設定最終目標為 **App Store + Google Play 雙平台正式上架**。詳細 blocker 清單見 `project_status.md`。

**現階段不立即動，但每次設計新功能 / 動到 build config / 加外部依賴時，需以「能否雙平台上架」為前提考量**。

短期內仍以本地 Gradle release APK 持續測試新版（debug keystore 簽）。正式上架前再一次性處理 bundle ID + 正式 keystore + iOS EAS build + 隱私政策。
