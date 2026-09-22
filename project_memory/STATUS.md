# STATUS — 現在的狀態與下一步

> 唯一的「現在」。歷史實測與舊版細節見 LOG.md。
> 最後更新：2026-09-22

## 🚀 下一步（開工第一件事）

- **最新 UI 修正版已安裝**：`C:\Users\Brayden\Desktop\Lumi-0.4.81-calendar-ask-layout.apk`，36,778,694 bytes，SHA256 `0E5F902E29DDDB1BD494156773BEAF76EDF0240E413F34C9240D683739FBBD3B`。日曆移除事件顏色圖例文字／空白列，日期色點與無障礙標籤保留；工時／記帳圖例不變。問 Lumi 對話後快速提問列移除44高度上限，改內容高度、不收縮，按鈕最小44／文字行高20，處理文字裁切。
- **此輪實機驗證完成**：9/22 20:33:10，S26 Ultra覆蓋安裝Success，APK hash核對一致。日曆無事件圖例、日期色點保留；問Lumi送出問題後，等待／回覆完成及鍵盤開啟時快速提問文字皆完整，未上下裁切。真實AI有回覆；未新增／編輯／刪除使用者紀錄，程序error log無輸出。大字體與其他裝置未驗收。前輪TypeScript、兩支UI render檢查、Expo config、diff check、release build與簽章已通過。
- **日曆紀念日已安裝並完成主要實機驗證**：S26 Ultra `R5GL75NTH4Y`／SM-S9480，lastUpdateTime=2026-09-22 14:36:43。APK `C:\Users\Brayden\Desktop\Lumi-0.4.81-calendar-anniversaries.apk`，36,779,322 bytes，SHA256 `4178DA9577485BAEF55C7705147A9B2F7CB80CFFDFFF5133661C1C4297018F70`。arm64 build1分12秒／430tasks成功、v2簽章通過、install -r Success；原資料／Key保留。
- **最新使用方式**：首頁「今天是Lumi測試紀念日」仍本地固定日期；紀念日在日曆當天的粉色標记與卡片呈現，按卡片編輯名稱／日期或刪除；當日「＋」可新增紀念日。每年同月同日顯示，起始年前不顯示、2/29只在閏年。不是任務、不計入一般筆記。底層保留舊notes category格式與ID以相容備份，無migration，不需重輸既有紀念日。
- **實機證據**：9/22日曆有原「Lumi測試紀念日」、原日期2026-09-22，格子粉色點與圖例可見；編輯sheet正確帶入名稱／日期，未修改原紀念日；筆記頁顯示「還沒有筆記」，無紀念日分類；問Lumi「今天是什麼日子？」真實回覆「今天是你的『Lumi測試紀念日』（2026/09/22）。」當前程序AndroidRuntime／ReactNativeJS／SQLiteLog error無輸出。
- **本機驗證**：TypeScript、32組tracker／SQLite整合、8組transport、Expo config、diff check通過。新測試涵蓋舊紀念日保留、普通筆記列表／數量／最近動態排除、日曆CRUD限制分類、月份標記／閏年／未來年份、備份restore及問Lumicontext不變。未實機提交編輯／刪除／新增（保護原紀念日）；鍵盤、小螢幕／大字體未完整抽測，不宣稱全裝置驗收。
- **模型分流已實測**：分類／新分類建議／既有模組紀錄帶入2.5 Flash-Lite；分析／問Lumi／月回顧／設計模組3.8。9/22合成實測午餐250→餐飲1.4秒、體重模組設計格式2.9秒通過。分類12秒、深度65秒最多3次，不改保存Key／計費，不以失敗跨模型備援；其他provider不變。單次成功不代表長期穩定。
- **問Lumi資料範圍**：近期250筆任務／財務／普通筆記／模組＋獨立完整紀念日context與當地日期；紀念日不再混入一般note事件流。隱私提示有說明。無推播、農曆、自動舊自由文字遷移；不自行推論生日／交往原始年份，同名衝突提示確認。
- **後續待驗收**：日曆紀念日實機新增／編輯／刪除與鍵盤；自訂模組預覽／建立／CRUD／首頁帶入／備份；財務分析真實數據正確性；首頁寵物等新分類重用；舊機匯入／財務期間預算儲蓄對帳。已通過的日曆與問Lumi主路徑不需重做。
- **GitHub已同步（2026-09-22）**：功能提交`0b59a83`已推送`origin/master`，包含AI模組、模型分流、日曆紀念日、UI修正、測試與project memory。提交前TypeScript、32組tracker、8組transport、2支UI render檢查通過；常見憑證模式掃描未命中，未上傳APK／手機資料／Key。未啟用付費或改網路；DB9、backup7、App0.4.81不變。

## 目前階段

- 版號 **0.4.81 — 標準工時＋固定休息制度**（未 bump）。
- 未升版累積中的改動有六批：① 可收合共用月曆＋底部歸屬；② 記帳／財務分析拆頁＋完整財務中心；③ 目前存款與對帳；④ 首頁智慧記帳缺少分類時以本機關鍵字補齊；⑤ AI 優先沿用現有分類，必要時建立自訂財務分類；⑥ AI 自訂追蹤模組 v1＋r2 修正與整合。六批已隨 r2 安裝至 S26 Ultra，仍待完整實機驗收。
- r2 修正：真實日期驗證、模組與紀錄備份深度驗證、重複 ID／孤兒紀錄拒絕匯入、合併時欄位衝突拒絕且回滾、編輯與刪除的交易保護、載入失敗／不存在／重試、防重複送出、可捲動且避開鍵盤的表單。測試入口 `npm.cmd run check:tracker`（Node 22.13+，此機 Node 24）。未新增原生依賴，DB 維持 v9、backup schema 7。
- S26 Ultra 最新安裝檔為 `Lumi-0.4.81-calendar-ask-layout.apk`，9/22 20:33:10覆蓋安裝，包含r2、模型分流、日曆紀念日與UI修正；以install -r保留資料。
- 本機與手機Gemini3.8請求均已移除temperature；其他Gemini3仍temperature=1，皆thinkingLevel=LOW。輸出上限至少4096、分類12秒；業務65秒內最多3次。systemInstruction與x-goog-api-key header、thought排除與文字合併、空回應／截斷／配額錯誤處理均保留。未升App／DB／備份版本。
- 本地 Gradle release APK 仍用 debug keystore；正式上架一次性處理延後。

## 待辦

- [ ] **換裝置資料遷移（上架 v1 blocker）**：JSON export/import **已完成**（`services/backupService.ts` + `components/DataSettings.tsx`，schema 7）。剩驗收：換機實測一次，並決定 v2 要不要做雲端同步。
- [ ] **差異化路線 A/B/D**：D 問 Lumi（`app/ask.tsx`）與 A 時間軸敘事（`app/timeline.tsx` + `narrativeService.ts`）程式碼已落地，**未實機驗收**；**B 行為迴路偵測未動**。三條共用 `services/eventStreamService.ts`。
- [ ] **財務進階規劃**（朋友回饋）：儲蓄目標／固定 vs 額外收入／緩衝區／反推月存額 **本次已做**，待實機驗收與使用回饋。
- [ ] **雙平台上架（最終目標）**：正式 keystore、bundle ID（目前仍是 `com.anonymous.lumi`，**必改**）、iOS EAS build、隱私政策。每次動 build config／加外部依賴時以「能否雙平台上架」為前提。

## 已砍

- Phase 3 Dashboard、Phase 5 目標規劃器（`services/goalService.ts` 不做，退化為筆記標籤「目標」）。
