# Daily Log

每次對話開始先讀此檔取得當前狀態。做完事後更新。Phase 完成後搬到 `project_status.md`，此檔只保留最近動態。

---

## 當前狀態 (2026-05-26)

Phase 1（任務/月曆）✅ 完成
Phase 4（財務記帳）✅ 完成
Phase 2（智慧分流 + Gemini）🔄 大部分完成，待實機測試 Gemini API（疑似 billing 未設）
Phase 3（Dashboard）⬜ 未開始
Phase 5（目標）— 已融入筆記模組，以標籤形式存在

## 最近完成 (2026-05-26)

### Bug 修復
- 首頁模組不刷新 → 改用 `useFocusEffect` + `refreshKey` 雙機制
- 任務刪除後首頁數字不更新 → `useFocusEffect` 每次 focus 重查 DB
- 記帳新增 Modal 被鍵盤擋住 → 改 `animationType="fade"` + 定位頂部

### 智慧分流輸入
- `classificationService.ts` — 關鍵字分類 + entries 歷史習慣學習
- 首頁輸入流程：打字 → 自動分類 → 三選一 pill（任務/記帳/筆記）→ 可修正 → 確認
- 財務自動抽取金額和分類

### Gemini 財務顧問
- `geminiService.ts` — Gemini 2.0 Flash，system prompt 鎖定財務分析
- `FinanceAdvisor.tsx` — 聊天 UI + API key 設定/移除/更換
- API key 持久化存 SQLite settings 表
- 詳細錯誤訊息（區分 429/403/400 + response body）
- **問題**：使用者第一次就跳 429，可能是 billing/API 未啟用

### noteService + 筆記頁
- `noteService.ts` — 完整 CRUD
- 筆記移至底部 tab（取代目標 tab）
- 分類篩選：VTuber/卡牌/科技/生活/目標
- 目標功能融入筆記標籤系統

### 財務增強
- 月/年/全部三模式切換
- 支出分佈甜甜圈圓餅圖（react-native-svg）+ 百分比圖例
- 預算條只在月模式顯示
- 一鍵重置所有記帳資料

### 首頁增強
- 常用快捷按鈕（依使用者習慣排序）
- 最近動態時間線（混合任務/記帳/筆記 + 相對時間）
- 筆記模組卡（取代目標模組卡）

### AI 頁面
- SafeAreaView 避免被手機狀態列擋住

### 其他
- DB 新增 settings 表
- README.md 建立

## 進行中 / 待辦

- Gemini API 問題排查（使用者需確認 billing + Generative Language API 啟用）
- 實機測試圓餅圖/月年全部切換
- 筆記目前無法從筆記頁直接新增（只能從首頁輸入）
- EAS build 進行中

## 下一步選項

- **Phase 3**：Dashboard 總覽（任務完成率、deadline 列表、收支概況）
- 筆記頁加新增按鈕
- 財務編輯交易、補記日期
