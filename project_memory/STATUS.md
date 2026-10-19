# STATUS — 現在的狀態與下一步

> 唯一的「現在」。歷史實測與舊版細節見 LOG.md。
> 最後更新：2026-10-19

## 🚀 下一步（開工第一件事）

> 使用者有 Mac 了，接著要在 Mac 上把 Lumi 裝到 iPhone。**開工先 `whoami` / `uname` 確認是哪台機器**（Windows `Brayden` 或 Mac），再照下面對應的段落做。

### A. 在 Mac 上把 Lumi 裝到 iPhone（目前最優先）

- 方式：**Xcode＋免費 Apple ID（Personal Team）直接安裝**，不用付 US$99。限制：App 每 **7 天**要重新從 Xcode 安裝一次；同一 Apple ID 最多 3 個側載 App。
- 步驟（細節與踩坑見 ENVIRONMENT「Mac／iOS」節）：
  1. Mac 安裝 Xcode（App Store）＋ Command Line Tools、Node 22.13+（`check:tracker` 需要 node:sqlite）、CocoaPods（`sudo gem install cocoapods` 或 `brew install cocoapods`）。
  2. `git clone` 本 repo → `npm install` → `npm run check:all` 確認在 Mac 也全過。
  3. **先決定 iOS bundle ID**（建議 `com.brayden.lumi`；寫進 `app.json` 的 `expo.ios.bundleIdentifier`）。⚠️ 只改 iOS；Android `package` 先維持 `com.anonymous.lumi`，改了會變成另一個 App、無法 `install -r` 覆蓋、舊資料要靠備份搬。
  4. `npx expo prebuild --platform ios`（產生 `ios/`）→ Xcode 開 `ios/Lumi.xcworkspace` → Signing & Capabilities 選 Personal Team。
  5. iPhone 用線接 Mac、開「開發者模式」（設定 → 隱私權與安全性 → 開發者模式），`npx expo run:ios --device --configuration Release` 或在 Xcode 選 iPhone 按 Run。
  6. iPhone「設定 → 一般 → VPN 與裝置管理」信任自己的 Apple ID。
- **預期要修的 iOS 問題**（從未在 iOS 跑過）：
  - **免費 Personal Team 不支援 Push Notifications capability**：expo-notifications 可能自動加 `aps-environment` entitlement 導致簽章失敗 → 移除該 entitlement（Lumi 只用本機通知，不需要 APNs）。先實際 build 確認是否發生。
  - 鍵盤：`KeyboardSheet` 在 iOS 用 `keyboardWillShow`，iOS 視窗不會 resize，應直接推高；實機確認不會推兩次或不足。
  - 權限文案：行事曆已有說明；通知權限在 iOS 第一次開提醒時詢問；確認 Info.plist 有需要的 usage description。
  - SafeArea／瀏海、字型、`fontWeight '300'` 在 iOS 的呈現；`Alert` 樣式不同。
  - SecureStore 存 API Key、SQLite、日曆（EventKit）、本機通知都要實測。
- **資料**：iPhone 版是全新的資料庫。要帶 Android 資料，用 App 內「資料設定 → 匯出 JSON」→ 傳到 iPhone → 匯入（backup schema 7）。

### B. Android 實機驗收（使用者要求「提醒我要測」，仍待做）

- S26 Ultra 目前是 10/1 的 v3 版。最新版：`adb -s R5GL75NTH4Y install -r C:\Users\Brayden\Desktop\Lumi-0.4.81-20261019.apk`（36,841,586 bytes，SHA256 `A67DE8B54FEAA7E44526802F95FCE79F6EE89D45014E80FF33EF69E46036E96F`）。⚠️ ADB 上的 `850000409002517` 是 Digital Paper，不要裝到那台。在 Mac 上要裝 Android 版需另裝 Android SDK／adb，或直接用 Windows 機。
- 驗收重點（iOS 版也用同一份清單）：
  - **記帳**：「午餐 120」應瞬間存好（不等 AI）；「貓砂 450」走 AI；「晚餐 1,050」「房租 1.2萬」「昨天 珍奶 60」「薪水 42000」「悠遊卡儲值 500」；記帳頁改某筆分類後再輸入同品項應沿用。
  - **鍵盤**：記帳新增／編輯、儲蓄目標、預算、對帳、任務、行程、工時、筆記、紀念日、模組記錄，輸入框都在鍵盤上方，收起後回原位、不推兩次。
  - **點選日期**：所有日期欄都能點選（記帳、任務、行程、紀念日、儲蓄目標、模組）。
  - **自訂模組**：快速建立「月經紀錄」→ 摘要好懂 → 記 2 筆過去日期 → 推算卡；日曆空心紫點與當日卡片、首頁提示、問 Lumi 引用推算、09:00 提醒鎖屏不顯示內容。
  - **財務分析**：月模式最上方四張卡（還好嗎／哪裡不一樣／小錢累積／每月固定支出）數字合理、資料不足說明清楚；舊區塊都還在。
  - **AI**：設定頁「比較回答速度」看 3.8／3.6／3.5 Flash-Lite 秒數與品質（使用者覺得 3.8 慢，用數據決定要不要換）。

### C. 之後（使用者還沒選）

- 財務：定期收支、記帳提醒、帳戶／支付方式、CSV 匯出、發票載具（研究結論見 LOG 2026-10-19）。
- 若 3.8 仍太慢：問 Lumi 只送相關紀錄、回答逐字顯示（streaming）；或改接 Claude（使用者若有 Max／Team 方案含每月 API 額度；Haiku 5.5 $0.10/$0.50）。

## 目前階段

- 版號 **0.4.81**（未 bump），DB v9、backup schema 7。未升版累積改動：可收合共用月曆、記帳／財務分析拆頁、存款對帳、AI 財務分類、AI 自訂追蹤模組（r2）、推算積木 v1–v3、10/19 一整批（範本／摘要／點選日期、全 App 鍵盤修正、記帳分類優化與學習、財務結論卡、3.5 Flash-Lite 與本機先判斷、事件流容錯）。
- **推算積木**：`cycle`／`duration`／`trend`，AI 只挑選、手機本機計算（`services/trackerInsightService.ts`）；日曆紫點、首頁提示、問 Lumi 引用、週期提醒。計畫 `plans/plan_20260929_tracker_insights.md`。
- **AI 模型分流**（`services/geminiService.ts`）：quick（分類／新分類建議／模組紀錄帶入）`gemini-3.5-flash-lite`＋MINIMAL；chat（問 Lumi／財務顧問／分析／月回顧）與 deep（建立模組）`gemini-3.8-flash`＋LOW。有把握的記帳本機直接存，不呼叫 AI（`canSkipAI`）。分類 12 秒、深度 65 秒最多 3 次，不跨模型備援。
- 測試：`npm run check:all`（Windows 用 `npm.cmd`）＝typecheck＋tracker 45＋gemini 8＋classifier（83 條＋30 條保留集＋local-first）＋4 支 UI render。
- S26 Ultra 安裝的是 10/1 的 `Lumi-0.4.81-module-insights-v3.apk`；10/19 版本未安裝。iOS 從未建置過。
- GitHub：10/19 全部改動已推上 `origin/master`（見 LOG 最新一條）。本地 Android release APK 仍用 debug keystore。

## 待辦

- [ ] **iOS 首次建置與實機驗收**（見下一步 A）。
- [ ] **Android 實機驗收**（見下一步 B）。
- [ ] **問 Lumi 省 token**：3.8 Flash 2027-01-01 起價格加倍；改為依問題篩選相關紀錄再送（需實測回答品質）。
- [ ] **OpenAI 預設模型過時**（gpt-4o-mini）：以官方頁確認現行型號再換。
- [ ] **換裝置資料遷移（上架 v1 blocker）**：JSON export/import 已完成（schema 7），剩換機實測（Android → iPhone 正好可測）；決定 v2 是否雲端同步。
- [ ] **差異化路線 A/B/D**：D 問 Lumi、A 時間軸程式碼已落地未完整驗收；**B 行為迴路偵測未動**。共用 `services/eventStreamService.ts`。
- [ ] **雙平台上架（最終目標）**：Android 正式 keystore 與 package（仍 `com.anonymous.lumi`）、iOS 正式上架需 Apple Developer Program（US$99／年）、隱私政策（需涵蓋經期等健康紀錄、推算送 AI 與通知的揭露）、BYOK 門檻。

## 已砍

- Phase 3 Dashboard、Phase 5 目標規劃器（退化為筆記標籤「目標」）。
