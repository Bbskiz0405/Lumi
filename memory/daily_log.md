# Daily Log

每次對話開始先讀此檔取得當前狀態。做完事後更新。Phase 完成後搬到 `project_status.md`，此檔只保留最近動態。

---

## 當前狀態 (2026-05-25)

Phase 1（任務/月曆）✅ 完成
Phase 4（財務記帳）✅ 完成
Phase 2, 3, 5 未開始
**部署**：EAS 雲端 build 進行中（Build #10d25471）

## 最近完成

### Phase 4 財務模組
- `services/financeService.ts` — CRUD + 月統計 + 預算 upsert
- `components/finance/TransactionCard.tsx` — 左側色條、刪除
- `components/finance/BudgetMeter.tsx` — 進度條 + 點擊設定上限 dialog，超標紅色
- `app/(tabs)/finance/index.tsx` — 月份導覽、收支結餘、4類預算條、記錄列表、新增 Modal
- `components/modules/FinanceModule.tsx` — 首頁格顯示本月結餘

### 部署嘗試
- EAS 雲端 build 設定：`eas.json`、`app.json`（移除缺漏的 icon/splash 引用）
- 修正 `package.json` native module 版號（safe-area-context / screens / vector-icons）
- 清除舊 `android/` 目錄讓 EAS 重建
- Build #1 (e4c7ca4c)：Gradle 變體不相容 → 鎖版號
- Build #2 (b897d03c)：Prebuild 缺 icon 圖檔 → 移除引用
- Build #3 (10d25471)：進行中，Gradle 編譯順利

### 其他
- `CLAUDE.md` 建立（專案規則）+ 更新指向 `memory/`
- `memory/` 目錄建立（daily_log + project_status）
- 推送至 GitHub master

## 進行中 / 待辦

- EAS build 等待完成 → 下載 APK 安裝到 Pixel 8a
- 財務模組未實機測試
- 下一 Phase 待決定

## 下一步選項

- **Phase 2**：Gemini 分流（`geminiService.ts` 空白，最大缺口）
- **Phase 3**：Dashboard 總覽
- **Phase 5**：目標規劃器
