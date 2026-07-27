# Lumi 產品與技術 Roadmap

> 建立日期：2026-07-27  
> 基準版本：v0.4.63  
> 核心定位：極低摩擦地收集生活資料，再把任務、記帳、筆記串成可理解、可行動的個人脈絡。

---

## 產品原則

Lumi 不以增加更多獨立頁面為目標，而是持續強化這個循環：

1. **快速輸入**：一句話、不必先選模組。
2. **可靠整理**：本地優先，AI 輔助，失敗時不遺失原文。
3. **主動回饋**：把跨模組資料轉成有證據的觀察與下一步。
4. **使用者掌控**：本地資料可匯出、AI 傳送範圍透明、重要動作可復原。

不優先做通用型目標管理器。原本 Phase 5 Goals 已取消；若重新使用 goals 資料表，必須服務於 Lumi 的跨資料洞察，而不是複製市面上的目標 App。

完整的逐功能使用者體驗健檢見 `memory/ux_audit_2026-07-27.md`。在 v0.5 前先完成該文件的 v0.4.64「UX 安全修補」：日期正確性、分類後 Undo、錯誤／空狀態區分、表單防連點與主要控制項無障礙。

---

## 版本規劃

### v0.4.63 — 信任層（本輪）

- [x] SQLite 逐版 migration，`user_version` 從單次初始化改為循序升級。
- [x] JSON 備份：entries、tasks、notes、transactions、budgets、goals 與非敏感 settings。
- [x] API Key 明確排除，不從 SecureStore 或 settings 匯出。
- [x] 匯入前顯示版本、日期與各類資料筆數。
- [x] 匯入模式：
  - 合併：保留本機資料，相同 ID 略過。
  - 取代：清除本機資料後完整還原，API Key 保留。
- [x] 整批 transaction；任一資料錯誤時全部回滾。
- [x] 修正 `.gitignore` 全面忽略 PNG/JPG，讓正式 App 圖片資產可被追蹤。
- [ ] 實機驗證匯出、合併、取代與錯誤檔回滾。

### v0.5 — Lumi 觀察＋每週回顧

目標：讓 Lumi 從「記錄工具」變成「理解生活規律的工具」。

第一版只用本地演算法產生候選觀察，再選擇性請 AI 改寫文字：

- 任務：
  - 重複延後的星期、標籤與優先度。
  - 長期未完成、完成時間集中、過度安排。
- 財務：
  - 每週／每月類別變化。
  - 異常支出、固定支出、可能的訂閱。
- 筆記：
  - 重複主題。
  - 多次記錄但尚未轉為任務的想法。
- 跨資料：
  - 忙碌日與支出變化。
  - 某類任務未完成後反覆出現的筆記主題。

每一則觀察都必須具備：

- 證據範圍與資料筆數。
- 可信度，避免把相關性說成因果。
- 「有幫助／不準／不要再顯示」回饋。
- 可點回原始任務、記帳或筆記。

每週回顧建議固定包含：

1. 本週完成與未完成任務。
2. 支出與預算差異。
3. 筆記主題摘要。
4. 一至三則 Lumi 觀察。
5. 一個可直接建立的下週行動。

### v0.6 — Android 快速入口

依 `memory/widget_plan.md` 實作：

- 桌面 Widget：本月收支、今日任務、快速新增。
- Deep link 直達記帳／任務新增。
- App 資料變動後即時刷新 Widget。
- 第二階段評估常駐通知＋行內輸入。

先做 Pixel／原生 Android 實機可靠度測試，再決定 iOS 對應 UX；不要為了功能對稱強迫兩平台使用相同實作。

### v0.7 — 問 Lumi：檢索與證據

目前 `askLumi` 會取最近事件送給 LLM。下一版改為 retrieval-first：

- SQLite FTS5 索引 tasks、notes、transactions 的文字欄位。
- 本機先找最相關的 10–20 筆，再送給 AI。
- 支援日期、類型與金額篩選。
- 回答顯示引用來源與日期，可點回原始紀錄。
- 顯示本次送給 AI 的資料類型與筆數。
- 提供排除財務／筆記等隱私選項。
- 無 API Key 時仍提供本機搜尋結果。

### v0.8 — 週期性資料與同步

先做本地週期性項目：

- 每週／每月任務。
- 固定收入、固定支出與訂閱提醒。
- 由歷史資料建議週期，但需使用者確認後才自動建立。

Google Calendar／Tasks 同步放在資料 migration、備份與衝突模型穩定之後。同步設計必須先定義：

- Lumi 與 Google 哪一邊是來源。
- 同時修改如何處理。
- 刪除是否雙向。
- 離線修改與重試。

---

## 技術優化清單

### P0 — 資料正確性

- [x] 真正的 SQLite migration runner。
- [x] 備份匯入使用 exclusive transaction。
- [ ] 首頁「entry＋對應任務／記帳／筆記」改成同一個 DB transaction，取代應用層 rollback。
- [ ] 統一 timestamp 儲存規格與 local-date 工具。
- [ ] 修正 event stream 在「日期範圍＋limit」同時使用時，可能先截斷再篩選而漏資料的語意。
- [ ] 為備份格式建立 fixture 與向後相容測試。

### P1 — 搜尋與效能

- [ ] FTS5 全文索引。
- [ ] Timeline 分頁，不固定一次讀 300 筆。
- [ ] Ask Lumi 使用 top-k retrieval，不固定傳 250 筆。
- [ ] 行為觀察使用聚合 SQL 與可重現的 confidence 計算。
- [ ] 集中管理 domain query／loading／error，減少各畫面重複邏輯。

### P1 — 測試與 CI

- [ ] 中文分類語料測試：任務、記帳、筆記、模糊句、複數記帳。
- [ ] 日期測試：午夜、月底、跨年與時區。
- [ ] 財務測試：合計、分類、非法金額、固定支出。
- [ ] migration／backup／restore 整合測試。
- [ ] GitHub Actions：typecheck、測試、Android release build。
- [ ] 加入不會破壞 Expo 相容性的 lint／format 檢查。

### P1 — UX 與無障礙

- [ ] 集中色彩、字級、間距與共用按鈕樣式。
- [ ] Unicode 圖示補 `accessibilityLabel` 與 `accessibilityRole`。
- [ ] 觸控區至少 44px。
- [ ] 檢查 11px 小字與灰色文字對比。
- [ ] 全域 Error Boundary 與可回報的本機錯誤紀錄。

### P0 — 正式上架前

- [ ] Package ID 從 `com.anonymous.lumi` 改成正式 reverse-domain。
- [ ] 建立正式 release keystore；不可再用 `debug.keystore` 簽 release。
- [ ] 產生 AAB 並驗證升級簽章。
- [ ] 正式 App icon、adaptive icon、splash 與商店素材。
- [ ] 不再追蹤手動生成的 Android JS bundle/assets，交由可重現 build 產生。
- [ ] 隱私政策：本機資料、AI 供應商、傳送內容、刪除與匯出。
- [ ] iOS EAS／Xcode 實機 build 與 TestFlight。

---

## 暫不優先

- 通用型 Goals 頁面。
- 自建帳號系統與雲端後端。
- Google Keep 整合（無公開 API）。
- 沒有證據連結的純 AI Dashboard。
- 一次同時開發 Widget、通知、Google sync；原生風險應分期驗證。

---

## 成功指標

- 使用者能在 10 秒內完成輸入。
- 自動分類修正率持續下降。
- 備份匯出與還原成功率 100%，錯誤檔不改動本機資料。
- Lumi 觀察可追溯到原始資料，使用者回饋「有幫助」比例可量化。
- Ask Lumi 的回答包含來源，送給 AI 的資料量比目前顯著下降。
- 新版本能以既有簽章覆蓋升級，不丟失 SQLite 與 SecureStore 資料。
