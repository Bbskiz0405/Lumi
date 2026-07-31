# ENVIRONMENT — 環境、指令、規範、踩坑（單一事實來源）

> 唯一的「參考資料」檔。其他檔案需要時引用本檔，不要複製內容。
> 技術棧：Expo 55 + React Native 0.83 + TypeScript + SQLite + Expo Router，Android 為主。
> 完整規格見 `../Lumi_PRD.md`。

## 環境

- adb 路徑：`C:\Users\Brayden\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- Build 前需在同一 PowerShell session 設定：
  - `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"`
  - `$env:ANDROID_HOME = "C:\Users\Brayden\AppData\Local\Android\Sdk"`
- `android\local.properties` 需寫入 `sdk.dir=C\:\\Users\\Brayden\\AppData\\Local\\Android\\Sdk`。

## 常用指令 SOP

- 型別/檢查：`npm.cmd run check`（TypeScript）＋ Expo public config ＋ diff check。
- Release build：arm64 release build（本地 Gradle，debug keystore 簽）。
- 安裝到裝置：`adb install -r <apk>`（`-r` 保留資料覆蓋升級，因 keystore 相同）。目標機：Pixel 8a。

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
