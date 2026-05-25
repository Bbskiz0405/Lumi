# Lumi

Expo 55 + React Native 0.83 + TypeScript + SQLite + Expo Router。Android 為主。

PRD 完整規格：`Lumi_PRD.md`
開發進度：`~/.claude/projects/C--Users-Brayden-Desktop-VS-pro-Lumi/memory/`

每次對話開始先讀 `project_shortterm.md` 取得當前狀態，需要歷史細節再讀 `project_longterm.md`。

## 固定規則
- 不用 react-native-calendars，月曆自製 grid
- `Crypto.randomUUID()` 同步，不需 await
- Modal 一律 bottom sheet（justifyContent: 'flex-end'）
- ID 用 `Crypto.randomUUID()`，時間用 `new Date().toISOString()`
- `useFocusEffect + useCallback([dep])` 處理頁面重入 + 狀態變更

## UI 色彩系統
- 背景：`#0F0F0F`
- 卡片：`#111111`，border `#1A1A1A`
- 次要卡片/輸入：`#161616`，border `#2A2A2A`
- 文字主：`#FFFFFF`，次：`#444444`，暗：`#333333`
- 財務收入 accent：`#55DDAA`，支出：`#FF6655`
- 任務 accent：`#FF9944`
- fontWeight `'300'` 為主基調
