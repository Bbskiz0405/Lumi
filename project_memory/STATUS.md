# STATUS — 現在的狀態與下一步

> 唯一的「現在」。歷史實測與舊版細節見 LOG.md。
> 最後更新：2026-10-18

## 🚀 下一步（開工第一件事）

1. **v3 已於 10/1 20:58 裝上 S26 Ultra**（資料保留、冷啟動正常）。如需重裝：`adb -s R5GL75NTH4Y install -r C:\Users\Brayden\Desktop\Lumi-0.4.81-module-insights-v3.apk`（36,804,522 bytes，SHA256 `9F8FBE30D2DE49696E150929A66DC0706E2610CF8CB7ED309E23223540306B8A`）。舊的 `-module-insights.apk`（v1）已被取代。
2. **實機驗收（先提醒使用者）**（v1–v3 已安裝未驗收；10/1 首次 AI 設計遇 Google 503，未建立模組，重試即可）：
   - 自訂模組輸入「月經紀錄，想推算下次和排卵期」→ AI 產出 cycle＋duration → 預覽調區間、選「前 1 天」提醒 → 建立時跳通知權限。
   - 記 3～4 筆過去開始日 → 模組頁推算卡（下次日期、倒數、排卵／易孕期、提醒設定、免責說明）。
   - 日曆預測日與區間出現空心紫點，點當日有推算卡片可跳模組；首頁 14 天內出現提示；問 Lumi「下次月經什麼時候」會引用推算。
   - 提醒：把開始日安排到讓提醒落在近期，確認 09:00 通知、鎖定畫面不顯示內容、點通知開模組。鍵盤、大字體一併看。
3. ⚠️ **使用者要求：開工時先提醒他做這項實機測試。** 程式已於 10/18 推上 GitHub（`23ab263`），驗收有問題再另外提交修正。

## 目前階段

- 版號 **0.4.81**（未 bump），DB v9、backup schema 7。未升版累積改動七批：① 可收合共用月曆；② 記帳／財務分析拆頁＋財務中心；③ 目前存款與對帳；④ 首頁智慧記帳本機補分類；⑤ AI 建立自訂財務分類；⑥ AI 自訂追蹤模組 v1＋r2；⑦ **自訂模組推算積木 v1–v3（9/29–9/30，10/1 已安裝、未驗收）**。
- **推算積木**：`cycle`／`duration`／`trend` 積木，AI 只挑選、手機本機計算（`services/trackerInsightService.ts`）。v2：日曆空心紫點＋當日卡片、首頁提示、問 Lumi 引用推算。v3：週期提醒（使用者設定、09:00、鎖屏隱藏內容，`syncTrackerReminders`）。計畫 `plans/plan_20260929_tracker_insights.md`。已知未修：事件流遇損壞模組紀錄會 throw。
- S26 Ultra 目前安裝 `Lumi-0.4.81-module-insights-v3.apk`（10/1），含之前全部改動＋推算 v1–v3。
- 模型分流：分類／新分類建議／模組紀錄帶入 2.5 Flash-Lite；分析／問 Lumi／月回顧／模組設計 3.8。分類 12 秒、深度 65 秒最多 3 次，不跨模型備援。3.8 請求無 temperature，thinkingLevel=LOW。
- 測試：`npm.cmd run check`、`npm.cmd run check:tracker`（42 組）、`npm.cmd run check:gemini`（8 組）、`node scripts/check-tracker-editor.cjs`／`check-ask-layout.cjs`／`check-calendar-grid.cjs`。
- GitHub 最新同步：推算 v1–v3 功能提交 `23ab263`（10/18，未實機驗收）。本地 release APK 仍用 debug keystore。

## 待辦

- [ ] **後續待驗收**：推算積木 v1–v3（見下一步）；日曆紀念日實機新增／編輯／刪除與鍵盤；自訂模組建立／CRUD／首頁帶入／備份；財務分析真實數據正確性；首頁寵物等新分類重用；舊機匯入／財務期間預算儲蓄對帳。
- [ ] **不靠 AI 建立模組**：模組建立完全依賴 AI，503 時無法建立；建議錯誤時提供空白範本，或內建月經／體重等範本（待使用者決定）。
- [ ] **事件流容錯**：單一模組紀錄損壞時 `getEventStream` 整個 throw，時間軸／問 Lumi 會失敗；應改為略過該筆。
- [ ] **換裝置資料遷移（上架 v1 blocker）**：JSON export/import 已完成（schema 7），剩換機實測，並決定 v2 是否雲端同步。
- [ ] **差異化路線 A/B/D**：D 問 Lumi、A 時間軸程式碼已落地未完整驗收；**B 行為迴路偵測未動**。共用 `services/eventStreamService.ts`。
- [ ] **財務進階規劃**：儲蓄目標／固定 vs 額外收入／緩衝區／反推月存額已做，待實機驗收與使用回饋。
- [ ] **雙平台上架（最終目標）**：正式 keystore、bundle ID（仍 `com.anonymous.lumi`，**必改**）、iOS EAS build、隱私政策（需涵蓋經期等健康紀錄、推算送 AI 與通知的揭露）。

## 已砍

- Phase 3 Dashboard、Phase 5 目標規劃器（退化為筆記標籤「目標」）。
