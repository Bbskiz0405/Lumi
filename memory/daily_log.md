# Daily Log

每次對話開始先讀此檔取得當前狀態。做完事後更新。Phase 完成後搬到 `project_status.md`，此檔只保留最近動態。

---

## 當前狀態 (2026-05-28)

**版號：0.4.12**
**Build 方式：** 本地 Gradle build（不靠 EAS）
**環境：** Android Studio JBR 21 + Gradle 8.13

Phase 1（任務/月曆）✅
Phase 4（財務記帳）✅
Phase 2（智慧分流 + AI）✅ 大致完成
Phase 5（目標）— 融入筆記標籤
Phase 3（Dashboard）⬜

## 最近完成 (2026-05-28)

### v0.4.x 系列
- Material Top Tabs 替換 Bottom Tabs，支援 finger-following 滑動
- PersistentCalendar 在 layout 層級渲染（只在行事曆/財務 tab 顯示）
- Dashboard / Goals tab 檔案移除
- Tab bar 多次調整高度與字位置（最終 height: 70+insets, paddingBottom: insets+16）
- 行事曆/財務頁加新增按鈕（預填選中日期）
- 任務日期帶優先度顏色（高紅/中橘/低藍）
- API 模型修正：Gemini `gemini-2.5-flash` + `v1beta` endpoint
- API 模型修正：OpenRouter `google/gemma-4-26b-a4b-it:free`（gemini 無免費）
- 機器人 icon 改 `brain`（更穩定）
- 字型自動載入問題：useFonts 會卡住，移除後改靠 Android assets/fonts/ 自動載入

### 本地 build 流程
1. 改 app.json 版號
2. `expo export --platform android --output-dir android/app/src/main/assets`
3. 複製 *.hbc → `index.android.bundle`
4. 複製 `MaterialCommunityIcons.ttf` → `android/app/src/main/assets/fonts/`
5. `gradlew assembleDebug`
6. `adb install -r app-debug.apk` 或複製到桌面

## 待解決問題

- **日曆點滑動效果** — 行事曆↔財務切換時兩個 CalendarGrid 視覺上仍會滑動（因為在 tab content 內）。要做到真正固定需 Reanimated + 監聽 tab-view position
- 部分 icon 可能顯示空白 — 字型在 assets 但某些 icon name 可能不對

### 財務進階規劃（朋友回饋）
- 儲蓄目標：月存金額 → 從收入扣 → 固定支出扣 → 剩餘比例分配各類上限
- 收入分類：固定 vs 額外 → 額外可選歸類或存起來
- 緩衝區：未分配額外收入 → 抵消超標
- 長期目標：幾月/幾年存多少 → 歷史平均反推月存額
