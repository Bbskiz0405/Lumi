# STATUS — 現在的狀態與下一步

> 唯一的「現在」。歷史實測與舊版細節見 LOG.md。
> 最後更新：2026-10-19

## 🚀 下一步（開工第一件事）

1. ⚠️ **先提醒使用者做實機測試**（他要求的）。S26 Ultra 目前裝的是 10/1 的 v3 版；最新版還沒裝：`adb -s R5GL75NTH4Y install -r C:\Users\Brayden\Desktop\Lumi-0.4.81-keyboard-sheets.apk`（36,815,590 bytes，SHA256 `2F1AE207139AA9804E99AE193B74DDE8538CDC5038DA13F9F750FCE5668DA35D`，含範本／摘要／點選日期＋鍵盤修正）。注意：ADB 上的 `850000409002517` 是 Digital Paper，不要裝到那台。
   - **鍵盤**：記帳新增／編輯點金額、儲蓄目標、預算、對帳、任務、行程、工時、筆記、紀念日、模組記錄，輸入框都要在鍵盤上方；收起鍵盤後 sheet 要回到原位、不能推兩次。
2. **實機驗收（新流程，應該 3 下內完成）**：
   - 自訂模組 → 快速建立「月經紀錄」→ 看摘要是否易懂 → 確認建立（需要提醒的話，在「調整細節」裡選）。
   - 新增紀錄：開始日用點選（今天／昨天／月曆），其他留空；記 2 筆過去日期 → 模組頁推算卡出現。
   - 日曆空心紫點與當日卡片、首頁提示、問 Lumi 引用推算、09:00 提醒在鎖定畫面不顯示內容。
   - AI 設計路徑（503 時可改用範本）。鍵盤、大字體一併看。
3. 好上手改版（`b526484`）與鍵盤修正已在本機 commit，尚未 push。

## 目前階段

- 版號 **0.4.81**（未 bump），DB v9、backup schema 7。未升版累積改動七批：① 可收合共用月曆；② 記帳／財務分析拆頁＋財務中心；③ 目前存款與對帳；④ 首頁智慧記帳本機補分類；⑤ AI 建立自訂財務分類；⑥ AI 自訂追蹤模組 v1＋r2；⑦ **自訂模組推算積木 v1–v3（10/1 已安裝、未驗收）＋好上手改版：範本／摘要／點選日期＋全 App 鍵盤遮擋修正（10/19，未安裝）**。
- **推算積木**：`cycle`／`duration`／`trend` 積木，AI 只挑選、手機本機計算（`services/trackerInsightService.ts`）。v2：日曆空心紫點＋當日卡片、首頁提示、問 Lumi 引用推算。v3：週期提醒（使用者設定、09:00、鎖屏隱藏內容，`syncTrackerReminders`）。計畫 `plans/plan_20260929_tracker_insights.md`。已知未修：事件流遇損壞模組紀錄會 throw。
- S26 Ultra 目前安裝 `Lumi-0.4.81-module-insights-v3.apk`（10/1），含之前全部改動＋推算 v1–v3。
- 模型分流：分類／新分類建議／模組紀錄帶入 2.5 Flash-Lite；分析／問 Lumi／月回顧／模組設計 3.8。分類 12 秒、深度 65 秒最多 3 次，不跨模型備援。3.8 請求無 temperature，thinkingLevel=LOW。
- 測試：`npm.cmd run check`、`npm.cmd run check:tracker`（43 組）、`npm.cmd run check:gemini`（8 組）、`node scripts/check-tracker-editor.cjs`／`check-keyboard-sheet.cjs`／`check-ask-layout.cjs`／`check-calendar-grid.cjs`。
- GitHub 最新同步：推算 v1–v3 功能提交 `23ab263`（10/18，未實機驗收）；好上手改版 `b526484` 僅本機。本地 release APK 仍用 debug keystore。

## 待辦

- [ ] **後續待驗收**：推算積木 v1–v3（見下一步）；日曆紀念日實機新增／編輯／刪除與鍵盤；自訂模組建立／CRUD／首頁帶入／備份；財務分析真實數據正確性；首頁寵物等新分類重用；舊機匯入／財務期間預算儲蓄對帳。
- [ ] **其他日期輸入改點選**：紀念日、任務到期日仍是手打 YYYY-MM-DD，可改用 `components/ui/DateField.tsx`。
- [ ] **事件流容錯**：單一模組紀錄損壞時 `getEventStream` 整個 throw，時間軸／問 Lumi 會失敗；應改為略過該筆。
- [ ] **換裝置資料遷移（上架 v1 blocker）**：JSON export/import 已完成（schema 7），剩換機實測，並決定 v2 是否雲端同步。
- [ ] **差異化路線 A/B/D**：D 問 Lumi、A 時間軸程式碼已落地未完整驗收；**B 行為迴路偵測未動**。共用 `services/eventStreamService.ts`。
- [ ] **財務進階規劃**：儲蓄目標／固定 vs 額外收入／緩衝區／反推月存額已做，待實機驗收與使用回饋。
- [ ] **雙平台上架（最終目標）**：正式 keystore、bundle ID（仍 `com.anonymous.lumi`，**必改**）、iOS EAS build、隱私政策（需涵蓋經期等健康紀錄、推算送 AI 與通知的揭露）。

## 已砍

- Phase 3 Dashboard、Phase 5 目標規劃器（退化為筆記標籤「目標」）。
