# STATUS — 現在的狀態與下一步

> 唯一的「現在」。收工時直接覆寫本檔（歷史去 `LOG.md`）。
> 最後更新：2026-07-31

## 🚀 下一步（開工第一件事）

- 工時模組已收斂至 v0.4.81（標準工時＋固定休息制度），實機已覆蓋安裝 Pixel 8a。
- 續推差異化路線，建議順序 **D → A → B**（詳見 `plans/`）；或先做上架 blocker「換裝置資料遷移」。

## 目前階段

- 版號 **0.4.81 — 標準工時＋固定休息制度**：休息屬公司制度而非每日輸入，預設標準 8:00／休息 60 分；預計達標、下班提醒、有效工時皆依標準工時＋固定休息計算，月摘要只結算已下班紀錄。
- 本地 Gradle release APK（debug keystore）持續測試中；正式上架相關一次性處理延後。

## 待辦

- [ ] **換裝置資料遷移（上架 v1 blocker）**：SQLite 純本地，換機/重裝會掉全部資料。v1 先做 JSON export/import（設定頁匯出 → dump 全表 → `expo-sharing`；新裝置匯入讀回），v2 視反饋加雲端同步。
- [ ] **差異化路線 A/B/D**：A 個人時間軸敘事（Lifeline）、B 行為迴路偵測、D 問 Lumi 任何事；三條共用 `services/eventStreamService.ts` 統一事件流。建議 D → A → B。
- [ ] **財務進階規劃**（朋友回饋）：儲蓄目標、固定 vs 額外收入分類、緩衝區、長期目標反推月存額。
- [ ] **雙平台上架（最終目標）**：正式 keystore、bundle ID、iOS EAS build、隱私政策 一次性處理；每次動 build config／加外部依賴時以「能否雙平台上架」為前提。

## 已砍

- Phase 3 Dashboard、Phase 5 目標規劃器（`services/goalService.ts` 不做，退化為筆記標籤「目標」）。
