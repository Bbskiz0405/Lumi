# Lumi 開發進度

## Phase 1 ✅ 完成

### 已實作功能

**基礎架構**
- Expo Router (file-based routing)
- React Native Paper 深色主題
- Expo SQLite 本地資料庫（所有 Phase 1-5 資料表一次建立）
- TypeScript 型別定義

**首頁**
- 純黑極簡設計，中央輸入框
- 快速輸入任務（打字按 ↑ 即記錄）
- 日期標題

**任務模組**
- 任務列表（顯示所有未完成任務）
- 新增任務（標題、截止日期、優先度、標籤）
- 勾選完成即從列表消失
- 任務詳情頁（查看、編輯、刪除）
- 優先度色標（高/中/低）
- Deadline 倒數顯示

**月曆**
- 月曆視圖，有任務的日期顯示紅點
- 點擊日期顯示當天任務

**導覽**
- 底部 Tab：首頁 / 任務 / 月曆 / 財務 / 目標
- 財務、目標為 Phase 4-5 佔位

---

## 待開發

### Phase 2｜快速筆記 + Gemini 分流
- [ ] `geminiService.ts` 實作（需要 Gemini API Key）
- [ ] `QuickInput.tsx` 接上 Gemini 分類
- [ ] UNCERTAIN 待確認清單
- [ ] 筆記模組（notes）

### Phase 3｜Dashboard 總覽
- [ ] 今日完成率
- [ ] 即將到期任務列表
- [ ] 各模組數據摘要

### Phase 4｜財務記帳
- [ ] 收支記錄
- [ ] 動態預算建議
- [ ] 超標警告

### Phase 5｜目標規劃器
- [ ] 長期目標輸入
- [ ] Gemini 產生里程碑
- [ ] 重複性任務排程
- [ ] 進度更新

---

## 技術備註

- `react-native-reanimated` 已移除（SDK 55 相容性問題，Phase 1 不需要）
- Gradle 固定在 8.13（Gradle 9.0 與 React Native 不相容）
- `JAVA_HOME` 需指向 Android Studio JBR：`C:\Program Files\Android\Android Studio\jbr`
- 開發指令：`set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr && npx expo run:android`
