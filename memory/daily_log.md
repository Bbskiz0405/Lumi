# Daily Log

每次對話開始先讀此檔取得當前狀態。做完事後更新。Phase 完成後搬到 `project_status.md`，此檔只保留最近動態。

---

## 當前狀態 (2026-05-29)

**版號：0.4.47**

### 0.4.47 — Gemini 改用 2.5-flash-lite (2026-05-29)
- 0.4.46 用 `gemini-2.0-flash`，新 project 新 key 仍持續 429。
- 確認排除：key 有效、Generative Language API 已啟用、project 對。
- 原因：2026 年 Google 砍 free tier，`gemini-2.0-flash` RPD 很低，輕鬆打爆。
- 修正：DEFAULT_MODELS.gemini 改為 **`gemini-2.5-flash-lite`**（2025/07 stable，free tier RPD 高得多，且 1M context、智能更高）。
- 備案順位：2.5-flash-lite → flash-lite-latest → 2.5-flash → 2.0-flash。

**版號：0.4.46**

### 0.4.46 — Gemini model 404 修復 (2026-05-29)
- 0.4.45 實機測試回報 `Gemini 404: models/gemini-1.5-flash is not found for API version v1beta`。
- 原因：`gemini-1.5-flash` 已於 2025/09 從 v1beta API 下架。
- 修正：
  - `services/geminiService.ts` DEFAULT_MODELS.gemini 改為 `gemini-2.0-flash`（穩定免費）。
  - 順手修掉 `setGeminiApiKey` 把 provider hardcode 成 `'openrouter'` 的舊 bug（既然名字是 Gemini，provider 改回 `'gemini'`）。
- 因為朋友的 OpenRouter 額度用完，**Gemini 重新成為主要 provider**，需確保預設 model 可用。
- 備案：若 `gemini-2.0-flash` 再失效，改 `gemini-flash-latest`（永遠指最新）。

**版號：0.4.45**
**Build 方式：** 本地 Gradle build（不靠 EAS）
**環境：** Android Studio JBR 21 + Gradle 8.13

### 0.4.45 Release APK 產出 (2026-05-29)
- 透過 `android\gradlew.bat assembleRelease --no-daemon` 成功打包。
- APK 路徑：`C:\Users\Brayden\Desktop\Lumi-0.4.45.apk`，大小 **86.2 MB**（不是 180 MB，因為 release 走 R8 minify + .so 壓縮 + Hermes bytecode，比 debug 小一半正常）。
- 內容驗證：4 ABI（arm64-v8a / armeabi-v7a / x86 / x86_64）齊全、Hermes `.hbc` 3 MB、共 1261 entries。
- 用 debug keystore 簽名（與舊版同 keystore 可覆蓋升級；若不同需先解除安裝）。
- **環境變數踩坑紀錄**：
  - Bash 子 shell 沒有 JAVA_HOME / ANDROID_HOME，必須改用 PowerShell 並在同一個 session 內 `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"`、`$env:ANDROID_HOME = "C:\Users\Brayden\AppData\Local\Android\Sdk"`。
  - 需在 `android\local.properties` 寫入 `sdk.dir=C\:\\Users\\Brayden\\AppData\\Local\\Android\\Sdk`。
  - `react-native-screens` 的 `R.jar` 會被前一次 build 的 java daemon 鎖住，遇到 `Couldn't delete ... R.jar` 時 `Stop-Process java,javaw` 後刪掉 `node_modules\react-native-screens\android\build` 再重跑。

Phase 1（任務/月曆）✅
Phase 4（財務記帳）✅
Phase 2（智慧分流 + AI）✅ 大致完成
Phase 5（目標）— 融入筆記標籤
Phase 3（Dashboard）⬜

## 最近完成 (2026-05-28 下半場)

### 導覽架構與 UI 重構
- **自定義 5-Tab 主導覽**: 實作了 `CustomTabBar`，底部固定為「首頁、行事曆、財務、任務、筆記」五個 Tab，解決了原生 MaterialTopTabs 字體裁切、偏低無法置中的問題。
- **雙層滑動設計**: 點擊「行事曆」或「財務」皆進入 `(calendar-finance)` 巢狀導覽，內部透過 `SubTabBar` 可在兩者間滑動切換，且 `PersistentCalendar` 日曆保持固定不抖動。
- **消除閃爍 (One-time Loading)**: 在各頁面加入 `hasLoaded` 鎖，避免切換 Tab 時重複觸發 `ActivityIndicator` 加載畫面。

### 終極 Icon 解決方案 (Kaomoji / Unicode)
- **問題**: 打包至 Android 時 `MaterialCommunityIcons` 經常失效顯示空白。
- **方案**: 棄用依賴外部字體，將全 App 的按鈕與標籤換成 **日系簡約線條感 Unicode 符號**。
  - Tab Bar: `✎`, `[ ]`, `$`, `[v]`, `!`
  - 操作按鈕: `+`, `x`, `v`, `>`, `^`, `↻`, `[=]`, `✧`
  - 月曆切換: 頂部加入清晰的 `<` 與 `>` 文字按鈕。

### AI 財務顧問修復
- **模型與 API 錯誤修復**:
  - 修復 Gemini 404/429 錯誤：將模型強制指定為穩定且免費的 `gemini-1.5-flash`，並作為預設供應商。
  - 修復 OpenRouter 400 錯誤：將模型指定為 `google/gemma-7b-it:free`。
- **UI 優化**:
  - 使用 `KeyboardAvoidingView` 並設定 `keyboardVerticalOffset` 解決鍵盤遮擋 API Key 輸入框的問題。
  - 供應商按鈕改為垂直列表並加入綠色 `●` 標示選中狀態，提升對比度。
  - 將發送圖標改為明顯的「發送」與 `^` 文字按鈕。

### 部署坑點紀錄
- 發現 Metro Bundler 的快取極度頑固，導致修改後的代碼（如正確的模型名稱）無法包入 APK。**現在編譯前必須強制清除 `.expo` 快取**。

## 待解決問題
- 目前尚未接回 USB 進行最終 0.4.45 版本安裝。

### 財務進階規劃（朋友回饋）
- 儲蓄目標：月存金額 → 從收入扣 → 固定支出扣 → 剩餘比例分配各類上限
- 收入分類：固定 vs 額外 → 額外可選歸類或存起來
- 緩衝區：未分配額外收入 → 抵消超標
- 長期目標：幾月/幾年存多少 → 歷史平均反推月存額
