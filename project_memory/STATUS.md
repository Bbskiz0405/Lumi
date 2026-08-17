# STATUS — 現在的狀態與下一步

> 唯一的「現在」。收工時直接覆寫本檔（歷史去 `LOG.md`）。
> 最後更新：2026-08-17

## 🚀 下一步（開工第一件事）

- **實機驗收記帳／財務分析拆頁**（未 bump 版號；程式碼已 push，APK 已裝進 Pixel 8a）：
  - 底部五格是否為 首頁｜日曆｜財務｜任務｜筆記，「日曆」高光涵蓋 行事曆／工時／記帳 三子頁。
  - 財務分析頁：期間切換（月／年／全部＋前後箭頭）、儲蓄目標新增與編輯、預算上限點擊設定、六月趨勢柱、分類排行、TOP 5。
  - 記帳頁：新增分類的「＋」按鈕、收入的固定／額外標記、日期欄現在打得出 `-`、「全部」模式捲動是否順。
  - **DB migration v7 會在裝完後第一次開啟時跑**（加 `transactions.income_kind` 與 `savings_goals` 表）：先確認舊的記帳／任務／工時資料都在，再到設定頁跑一次匯出／匯入。
- 驗收通過再決定升版。

## 目前階段

- 版號 **0.4.81 — 標準工時＋固定休息制度**（未 bump）。
- master 與 GitHub 同步於 `7b04674`。
- 手機上跑的是 2026-08-17 的 arm64 release（含拆頁改動）；桌面舊檔 `Lumi-0.4.81-calendar-scroll.apk` 是**拆頁之前**的 build，已過時。
- 未升版累積中的改動有兩批，都在這顆 APK 裡：① 可收合共用月曆＋底部歸屬；② 記帳／財務分析拆頁＋完整財務中心。兩批都還沒實機驗收。
- 本地 Gradle release APK 仍用 debug keystore；正式上架一次性處理延後。

## 待辦

- [ ] **換裝置資料遷移（上架 v1 blocker）**：JSON export/import **已完成**（`services/backupService.ts` + `components/DataSettings.tsx`，schema 5）。剩驗收：換機實測一次，並決定 v2 要不要做雲端同步。
- [ ] **差異化路線 A/B/D**：D 問 Lumi（`app/ask.tsx`）與 A 時間軸敘事（`app/timeline.tsx` + `narrativeService.ts`）程式碼已落地，**未實機驗收**；**B 行為迴路偵測未動**。三條共用 `services/eventStreamService.ts`。
- [ ] **財務進階規劃**（朋友回饋）：儲蓄目標／固定 vs 額外收入／緩衝區／反推月存額 **本次已做**，待實機驗收與使用回饋。
- [ ] **雙平台上架（最終目標）**：正式 keystore、bundle ID（目前仍是 `com.anonymous.lumi`，**必改**）、iOS EAS build、隱私政策。每次動 build config／加外部依賴時以「能否雙平台上架」為前提。

## 已砍

- Phase 3 Dashboard、Phase 5 目標規劃器（`services/goalService.ts` 不做，退化為筆記標籤「目標」）。
