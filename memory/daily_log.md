# Daily Log

每次對話開始先讀此檔取得當前狀態。做完事後更新。Phase 完成後搬到 `project_status.md`，此檔只保留最近動態。

---

## 當前狀態 (2026-05-28)

**版號：0.3.2**
Phase 1（任務/月曆）✅ 完成
Phase 4（財務記帳）✅ 完成
Phase 2（智慧分流 + AI）✅ 大致完成
Phase 5（目標）— 融入筆記標籤
Phase 3（Dashboard）⬜ 未開始

**Build 方式：** 本地 Gradle build（EAS 免費額度 6/1 重置）
**環境：** Android Studio JBR 21 + Gradle 8.13 + ANDROID_HOME + JAVA_HOME 已設

## 最近完成 (2026-05-28)

### v0.3.2 — 日曆固定到 layout + UI 修復
- CalendarGrid 移到 (tabs)/_layout.tsx，只在行事曆/財務 tab 顯示
- 切換兩 tab 時日曆完全不動（持久化在 layout）
- Tab bar height 88 + paddingBottom 30（避開手勢列）
- API endpoint v1beta → v1
- Gemini 模型更新為 `gemini-3.5-flash`
- Tab 動畫改回 'shift'（滑動過渡）
- MaterialCommunityIcons 字型複製到 Android assets/fonts/
- 移除 calendar.tsx 和 finance/index.tsx 內的 CalendarGrid（搬到 layout）

### v0.3.1 — Tab 滑動 + 對齊
- SwipeableTab + PanResponder（放開時觸發切換）
- 財務頁移除 header，按鈕搬到 toolbar 跟 mode toggle 同排
- 動態記帳分類

### 待解決問題
- finger-following 滑動（手指跟著動）— 需 react-native-pager-view + 重構 tab 系統
- 部分 icon 仍可能顯示 ? — 字型已加，待測試確認
- API 429 — 確認模型 ID 正確後待測試

### 共享日曆系統
- CalendarContext — 共享年月日狀態（React Context）
- CalendarGrid 共用元件 — 行事曆 tab 和財務 tab 都渲染同一個日曆
- 切換兩個 tab 時日曆不動，只換下方內容和點的顏色
- 藍點（任務）+ 綠點（財務）同時顯示

### 本地 Build 環境
- Android Studio + JBR 21 + Gradle 8.13 設定完成
- `expo export` → 複製 bundle → `gradlew assembleDebug` 流程建立
- adb install 到 Pixel 8a 測試成功
- APK 可傳到手機安裝（不受 EAS 額度限制）

### 行事曆雙模式（已移除內部滑動，改為 tab 共享）
- 行事曆 tab：日曆 + 當天任務
- 財務 tab：同一日曆 + 月摘要 + 圓餅圖 + 交易記錄
- Tab 切換 animation: none，日曆視覺固定

### 多筆記帳拆分
- 「飲料60 便當50」自動拆兩筆，各自判斷分類
- parseMultipleTransactions() 

### 嵌入式計算機
- Calculator.tsx — +-×÷、即時預覽、退格
- 財務新增/編輯金額欄旁計算機按鈕

### 多 API 供應商
- Gemini / OpenRouter / OpenAI 三選一
- 各自正確 API 格式
- 供應商選擇 UI + 持久化

### 其他完成項
- 動態標籤系統（記帳 10 預設 + 自訂，筆記自訂）
- 三層自學習分類（精確→Bigram→短文字）
- 高信心自動存、時間詞偵測、欠還分類
- 筆記/記帳點擊編輯 modal
- 任務頁「已完成」收折區
- Enter 改換行
- 全局色彩對比度提升
- chevron icon 修復
- 移除首頁快捷按鈕、預算功能
- Tab 順序：首頁/行事曆/財務/任務/筆記
- Tab 閃白修復（sceneStyle + animation: none）

## 待辦

- 問號符號排查（部分 icon 仍顯示 ?）
- 全 tab 左右滑動切換（需 react-native-pager-view）
- 筆記頁無法直接新增
- 財務補記日期
- Phase 3 Dashboard
- 參考其他記帳 app 設計

### 財務進階規劃（朋友回饋）

**儲蓄目標：** 月存金額 → 從收入扣除 → 固定支出扣除 → 剩餘按比例分配各類上限
**收入分類：** 固定 vs 額外 → 額外可選歸類或存起來
**緩衝區：** 未分配額外收入 → 可抵消超標
**長期目標：** 幾月/幾年存多少 → 歷史平均反推月存額
