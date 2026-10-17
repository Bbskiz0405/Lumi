# 自訂模組推算積木 v1（2026-09-29）

## 目標
自訂模組除了記錄，還能做「本機、確定性」的推算（例：月經週期預測、排卵／易孕期、經期天數、體重趨勢）。

## 原則
- 延續 9/15 ⭐定案：AI 只產生資料結構，不產生程式／公式／SQL。推算只能從固定積木清單選，參數由本機驗證。
- 推算全在手機計算，不打 API、結果可重現。
- 推算是衍生資料，不改變紀錄意義 → 既有模組可自由新增／改名／刪除推算。

## 積木（v1）
| type | 參數 | 輸出 |
|---|---|---|
| `cycle` | `field`（日期欄位）、`offsets[]`（相對預測日的區間，天） | 平均／最短／最長週期、下次預測日 ± 標準差、倒數、各區間日期 |
| `duration` | `start`、`end`（兩個日期欄位） | 最近一次與平均持續天數（含首尾） |
| `trend` | `field`（數字欄位）、`window`（3–30 筆） | 最近 N 筆線性回歸每週變化、首尾差 |

限制：每模組 0–4 個推算；每個 cycle 0–3 個 offset，from/to 介於 −60…60 且 from ≤ to。

## 儲存
- `schema_json` 無推算時照舊存欄位陣列；有推算時存 `{"fields":[...],"insights":[...]}`。讀取兩種都接受。
- 不改 DB（仍 v9）、不改 backup schema（仍 7）。舊版 App 匯入含推算的新備份會拒絕該模組（格式有誤），已知限制。
- 備份合併只比對 `fields`，推算差異不擋合併（保留本機版本）。

## 改動
1. `types/trackerModule.ts`：`TrackerInsight` 型別、definition 加 `insights`。
2. `services/trackerModuleService.ts`：驗證 insights（欄位存在且型別對）、讀寫新格式。
3. `services/trackerInsightService.ts`（新）：純函式計算。
4. `services/geminiService.ts`：模組設計 prompt 認識積木，月經範例。
5. `components/TrackerDefinitionEditor.tsx`：顯示／改名／移除／新增推算（新舊模組皆可）。
6. `app/module/[id].tsx`：推算卡片＋「僅供參考，不能作為避孕或醫療判斷」。
7. `scripts/check-tracker.cjs`：計算、驗證、儲存相容、備份測試。

## v2（2026-09-30 完成，未實機）
- 日曆：週期推算往後投影 3 個週期（預測日 ± 誤差、各區間），月曆空心紫點 `#C9A0FF`，當日列表出現推算卡片可跳模組。最新紀錄當天及以前不標。
- 首頁：14 天內到期、已過預測日（45 天內）或今天落在區間時顯示一行提示。
- 問 Lumi：附「自訂模組推算」本機計算摘要，system prompt 要求引用、不自行重算；隱私說明已更新。

## v3（2026-09-30 完成，未實機）
- 週期推算可選提醒：不提醒／當天／前 1–3 天（驗證 0–14），當天 09:00，只排下一次。
- 使用者設定，不交給 AI。獨立 channel `lumi-tracker-reminders`，鎖定畫面 PRIVATE 隱藏內容。
- `syncTrackerReminders()`：先取消所有 `lumi-tracker-` 開頭排程再重排，序列化、不詢問權限；在 App 啟動、模組頁每次載入（含每次變更後）、刪模組、備份匯入時呼叫。開啟提醒並儲存時才詢問權限，拒絕仍可存。
