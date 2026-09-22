# ENVIRONMENT — 環境、指令、規範、踩坑（單一事實來源）

> 唯一的「參考資料」檔。其他檔案需要時引用本檔，不要複製內容。
> 技術棧：Expo 55 + React Native 0.83 + TypeScript + SQLite + Expo Router，Android 為主。
> 完整規格見 `../Lumi_PRD.md`。

## 環境

> 專案在多台機器間搬動，帳號名不同、JDK 來源也不同。**開工先確認自己在哪一台**（`whoami`），再套下面對應那節，不要照抄別台。

### `Brayden`（2026-08-17 起，目前主力）

- JDK：**Android Studio 內建 jbr**，`C:\Program Files\Android\Android Studio\jbr`（OpenJDK 21.0.10）。`JAVA_HOME` 系統層已設好，但 `java` 不在 PATH，直接下 `java -version` 會說找不到——這不代表沒 JDK，Gradle 讀的是 `JAVA_HOME`。
- Android SDK：`C:\Users\Brayden\AppData\Local\Android\Sdk`（Build Tools 35/36/36.1/37、Platform android-36 與 36.1、NDK 27.1.12297006）。
- `android\local.properties`：`sdk.dir=C\:\\Users\\Brayden\\AppData\\Local\\Android\\Sdk`。
- adb：`C:\Users\Brayden\AppData\Local\Android\Sdk\platform-tools\adb.exe`。

### `asus`（2026-08-02）

- Microsoft OpenJDK 21 於 `C:\Program Files\Microsoft\jdk-21.0.12.8-hotspot`；SDK 於 `C:\Users\asus\AppData\Local\Android\Sdk`（Platform 36、Build Tools 36.0.0、NDK 27.1.12297006）。

### `user`（早期）

- `$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"`、`$env:ANDROID_HOME = "C:\Users\user\AppData\Local\Android\Sdk"`。

## 常用指令 SOP

- 型別/檢查：`npm.cmd run check`（TypeScript）＋ Expo public config ＋ diff check。
- Release build（本地 Gradle，debug keystore 簽），同一個 PowerShell session：
  ```powershell
  $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"   # Brayden 機；別台見「環境」節
  Set-Location <repo>\android
  .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain
  ```
  （限 arm64 加速；Pixel 8a 為 arm64。APK 產出 `android\app\build\outputs\apk\release\app-release.apk`）
- 安裝到裝置：`adb install -r <apk>`（`-r` 保留資料覆蓋升級，因 keystore 相同）。目前目標機：Samsung S26 Ultra（`SM-S9480`，序號 `R5GL75NTH4Y`）；舊機 Pixel 8a 為 `42231JEKB12273`。多裝置時用 `adb -s <序號>`。
- 耗時參考：`Brayden` 機有 Gradle 快取時 arm64 release 約 **1 分 22 秒**（430 tasks、21 executed）；冷快取首次約 10 分鐘。APK 約 35 MB。

## 開發固定規則（原 CLAUDE.md）

- 不用 react-native-calendars，月曆自製 grid。
- `Crypto.randomUUID()` 同步，不需 await；ID 用它，時間用 `new Date().toISOString()`。
- Modal 一律 bottom sheet（`justifyContent: 'flex-end'`）。
- `useFocusEffect + useCallback([dep])` 處理頁面重入 + 狀態變更。

## UI 色彩系統

- 背景 `#0F0F0F`；卡片 `#111111`/border `#1A1A1A`；次要卡片/輸入 `#161616`/border `#2A2A2A`。
- 文字：主 `#FFFFFF`、次 `#444444`、暗 `#333333`。
- 財務收入 accent `#55DDAA`、支出 `#FF6655`；任務 accent `#FF9944`。
- `fontWeight '300'` 為主基調。

## 踩坑清單（append-only，新坑加最下面）

- `react-native-screens` 的 `R.jar` 鎖檔 → `Stop-Process java,javaw` + 刪 `node_modules\react-native-screens\android\build` 後重跑。
- Release APK 86.2 MB 為正常（4 ABI + Hermes + R8 minify）；比舊 debug 180 MB 小是因 R8 + .so 壓縮。
- `gemini-1.5-flash` 已於 2025/09 從 v1beta 下架；`gemini-2.0-flash` free tier RPD 被砍極低 → 現用 `gemini-2.5-flash-lite`。
- `MaterialCommunityIcons.ttf` 曾被刪導致 MCI icon 全變問號 → 改自製圓圈 + Unicode（`✓`/`↑`/`$`/`!`）。
- 帳號與工作區搬到新電腦後不要照抄舊 `JAVA_HOME`／`ANDROID_HOME`：先用 `java -version`、`Test-Path $env:LOCALAPPDATA\Android\Sdk` 驗證；Java 8 無法建置目前 Expo 55 Android 專案。
- `asus` 首次安裝 SDK 時 `sdkmanager` 在不穩定網路會反覆得到截斷 ZIP（`Unexpected end of ZLIB input stream`）；改從 Google `repository2-3.xml` 取得官方 URL／SHA-1，以 `curl -C -` 續傳並驗證後解壓。首次 arm64 release 約 10 分 35 秒，後續可沿用 Gradle 快取。
- `java -version` 說找不到指令 **不等於沒裝 JDK**：`Brayden` 機用 Android Studio jbr，`JAVA_HOME` 有設但 jbr 的 bin 不在 PATH。判斷有無 JDK 要看 `$env:JAVA_HOME` 與 `C:\Program Files\Android\Android Studio\jbr\bin\java.exe`。
- `adb devices` 顯示 `unauthorized` 是手機沒授權，不是線或驅動問題：手機螢幕會跳「允許 USB 偵錯」，勾「一律允許這台電腦」。沒跳就拔插 USB，或開發者選項→撤銷 USB 偵錯授權後重插。
- `adb install -r` 可能久久不回應（曾超過 5 分鐘）：多半是手機端在等使用者確認（Play Protect 掃描、更新既有應用程式、允許透過 USB 安裝）。看手機螢幕點掉即可，不要重下指令。
- 2026-09-16 Gemini 預設已升至 `gemini-3.8-flash`，上方 2.5 Flash-Lite 是歷史設定。3.8 僅支援 LOW／MEDIUM／HIGH，不支援 MINIMAL；Gemini 3 官方建議 temperature=1。參考 https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash 與 https://ai.google.dev/api/generate-content#ThinkingConfig 。
- `npm.cmd run check:tracker` 使用 Node 22.13+ 內建 SQLite 建立獨立記憶體 DB，測試 migration／CRUD／backup／AI 請求格式，不讀寫手機資料，也不送真實 API。2026-09-16 共18組測試；真實 API 需另以手機 AI 設定中的「測試模型連線」確認。
- Android `dumpsys connectivity` 判斷 VPN 必須查看 active default network 的 `Transports`，不可用 `-match 'VPN'`：會把 `NOT_VPN` 誤判成 VPN。系統列出 VPN service 也不等於有啟用 VPN。
- 2026-09-16 診斷版測試增至20組；AI設定先查metadata，再做短文字生成，另有2.5 Flash-Lite對照按鈕（不改保存模型）。metadata成功不保證生成可用／配額足夠；2.5成功也不保證3.8正常。真實對照結果見STATUS／LOG。
- 2026-09-16更正3.8參數：最新 https://ai.google.dev/gemini-api/docs/latest-model 的Migration checklist要求移除temperature／top_p／top_k，以此覆蓋上方泛用Gemini3的temperature=1規則（舊Gemini3仍保留）。compat版21組測試，新增90秒基本請求診斷；尚待實機確認能否解決逾時，勿把指南符合性當作成功呼叫證據。
- 2026-09-18 新增 `npm.cmd run check:gemini`：8組假時鐘傳輸測試，完全離線，驗證有限重試／Retry-After／完整body timeout。`check:tracker`增至23組；VM載入不同TS模組時共用Error／TypeError／SyntaxError，避免跨realm instanceof造成假失敗。
- Gemini新transport一般生成總65秒、每次最多30秒／共3次，分類總12秒；帳號模型比較刻意每輪只送一次30秒，不能用重試成功掩蓋原始成功率。3款各2輪僅是當次短測，不能宣稱長期穩定。models.list可見性不是Free Tier／配額保證，官方價格參考 https://ai.google.dev/gemini-api/docs/pricing 。
