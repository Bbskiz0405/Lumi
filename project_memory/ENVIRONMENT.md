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
- 安裝到裝置：`adb install -r <apk>`（`-r` 保留資料覆蓋升級，因 keystore 相同）。目標機：Pixel 8a（`adb devices` 應見 `42231JEKB12273`）。
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
