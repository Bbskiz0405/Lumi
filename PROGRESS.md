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

---

## Bug 修復紀錄

### ✅ 任務頁顯示空白（沒有待辦任務）
**症狀：** 首頁 `TasksModule` 顯示 2 件待辦，點進任務 tab 卻顯示「沒有待辦任務」

**根因：** `services/db.ts` 使用 `let db` 變數作為 singleton，但多個 tab 畫面同時 mount 時，兩個並發的 `getDb()` 呼叫都看到 `db === null`，各自開了一個 DB 連線，後者覆蓋 `db` 變數，導致先前的呼叫者持有孤立連線，查詢靜默失敗回傳空陣列。

**修法：**
- `services/db.ts`：改用 Promise singleton（`let dbPromise`），確保所有並發呼叫共用同一個 Promise，DB 只開一次
- `app/(tabs)/tasks.tsx`：加上 `.catch()` 避免靜默吞錯

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
- 開發指令：`set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr && npx expo run:android --no-bundler`

### Android build 關鍵設定（解決白畫面問題）

**問題根因：** Hermes JIT 無法編譯超大 glyph map（MaterialCommunityIcons 7000+ 筆），且 dev bundle OkHttp multipart chunked 解析失敗。

**解法組合：**
1. `android/app/build.gradle` → `debuggableVariants = []`：讓 Gradle 在 build 時用 hermesc AOT 編譯並嵌入 bundle（不依賴 Metro）
2. `npx expo run:android --no-bundler`：不啟動 Metro server，app 才會讀 embedded bundle
3. `metro.config.js` resolver mocks：把 MaterialCommunityIcons 換成 `assets/mci-minimal.json`（9 筆），其餘 glyph maps 換成 empty module，讓 hermesc 可以編譯
4. `assets/expo-symbols-mock.js`：防止 expo-symbols 在 Android 上出錯

**重要：** 每次改完 JS/UI 後，需重新 build：
```bash
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
npx expo run:android --no-bundler
```
