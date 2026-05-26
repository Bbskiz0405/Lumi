# Daily Log

每次對話開始先讀此檔取得當前狀態。做完事後更新。Phase 完成後搬到 `project_status.md`，此檔只保留最近動態。

---

## 當前狀態 (2026-05-26)

Phase 1（任務/月曆）✅ 完成
Phase 4（財務記帳）✅ 完成
Phase 2（智慧分流 + Gemini）🔄 部分完成（分流 + 財務顧問已做，待實機測試）
Phase 3, 5 未開始

## 最近完成 (2026-05-26)

### 首頁刷新 bug 修復
- TasksModule / CalendarModule / FinanceModule 加 `refreshKey` prop
- 首頁輸入新增後即時更新模組數據

### 智慧分流輸入
- `services/classificationService.ts` — 關鍵字分類 + entries 歷史習慣學習
- 財務關鍵字（買/花/元/午餐...）→ FINANCE，自動抽取金額和分類
- 任務關鍵字（要/記得/deadline/明天...）→ TASK
- 其他 → IDEA（筆記）
- 首頁輸入流程：打字 → 送出 → 顯示分類結果（三選一 pill）→ 可修正 → 確認儲存
- 修正結果寫入 entries 表，下次遇到類似詞彙自動學習

### Gemini 財務顧問
- `services/geminiService.ts` — Gemini 2.0 Flash API
- System prompt 鎖定財務分析角色，拒答非財務問題
- 自動把當月交易數據塞進 context
- 功能：多輪對話、一鍵快速分析
- `components/finance/FinanceAdvisor.tsx` — 聊天 UI（全螢幕 modal）
- API key 持久化存 SQLite settings 表
- 財務 tab header 加 AI 按鈕（robot icon）

### noteService
- `services/noteService.ts` — 完整 CRUD（create/read/update/delete/count）

### 財務重置
- `financeService.resetAllFinance()` — 清除所有交易 + 預算
- 財務 tab header 加重置按鈕 + 確認 Alert

### DB 擴充
- 新增 `settings` 表（key-value，存 API key 等設定）

## 進行中 / 待辦

- 實機測試智慧分流準確度
- 實機測試 Gemini 財務顧問
- 筆記模組 UI（目前 noteService 有 CRUD 但無獨立頁面）
- EAS build 更新 APK
- 下一 Phase 待決定

## 下一步選項

- **Phase 2 剩餘**：筆記頁面 UI、UNCERTAIN 待確認清單
- **Phase 3**：Dashboard 總覽
- **Phase 5**：目標規劃器
