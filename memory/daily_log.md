# Daily Log

每次對話開始先讀此檔取得當前狀態。做完事後更新。Phase 完成後搬到 `project_status.md`，此檔只保留最近動態。

---

## 當前狀態 (2026-05-26)

Phase 1（任務/月曆）✅ 完成
Phase 4（財務記帳）✅ 完成
Phase 2（智慧分流 + Gemini）✅ 大致完成（Gemini API 待使用者設定 billing）
Phase 5（目標）— 已融入筆記模組標籤
Phase 3（Dashboard）⬜ 未開始

## 最近完成 (2026-05-26)

### 智慧分流 + 自學習分類器
- 三層匹配：精確匹配（1次記住）→ Bigram 相似度（模糊匹配）→ 短文字包含
- 高信心自動存，低信心才跳選擇器
- 時間詞偵測（早上/下午/晚上+數字）不誤判為金額
- 欠/還錢/借 → 支出，還我/收到 → 收入
- Enter 改為換行，按鈕才送出

### 筆記 + 記帳可編輯
- 筆記點擊 → 編輯 modal（內容 + 分類標籤）
- 記帳點擊 → 編輯 modal（項目/金額/類型/分類）
- financeService 加 updateTransaction()

### 財務增強
- 月/年/全部三模式切換
- 支出分佈甜甜圈圓餅圖（react-native-svg）
- 預算條只在月模式顯示
- 記帳新增 Modal 從上方出現（避免鍵盤擋住）
- 一鍵重置所有記帳資料

### Tab + 首頁
- 目標 tab 隱藏，筆記 tab 上位（含 goal 標籤）
- 首頁模組 2x2+1 → 2x2（任務/月曆/財務/筆記）
- 常用快捷按鈕（依習慣排序）+ 最近動態時間線
- useFocusEffect 解決跨頁刷新問題

### Gemini 財務顧問
- 嵌入財務 tab，system prompt 鎖定財務分析
- API key 持久化 + 移除/更換功能
- 詳細錯誤訊息（區分 429/403/400）
- **問題**：使用者首次就 429，疑似需啟用 billing/Generative Language API

### 其他
- README.md
- DB 新增 settings 表
- noteService 完整 CRUD
- classificationService 三層學習
- recentService（最近動態 + 使用模式）

## 待辦

- Gemini API 排查（使用者確認 billing）
- 筆記頁無法直接新增（只能從首頁輸入）
- 財務補記日期功能
- Phase 3 Dashboard

## 下一步選項

- **Phase 3**：Dashboard 總覽（任務完成率、deadline、收支概況）
- 筆記頁加新增按鈕
- 財務補記日期
