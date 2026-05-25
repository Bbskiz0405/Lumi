# Graph Report - C:/Users/Brayden/Desktop/VS_pro/Lumi  (2026-05-25)

## Corpus Check
- Corpus is ~42,669 words - fits in a single context window. You may not need a graph.

## Summary
- 153 nodes · 146 edges · 13 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Android Icon Assets|Android Icon Assets]]
- [[_COMMUNITY_Task & DB Layer|Task & DB Layer]]
- [[_COMMUNITY_Data Schema & Entries|Data Schema & Entries]]
- [[_COMMUNITY_Product & Tech Stack|Product & Tech Stack]]
- [[_COMMUNITY_Calendar Screen|Calendar Screen]]
- [[_COMMUNITY_Android Native Bridge|Android Native Bridge]]
- [[_COMMUNITY_AI Dispatcher & Finance|AI Dispatcher & Finance]]
- [[_COMMUNITY_Launcher Icon Set|Launcher Icon Set]]
- [[_COMMUNITY_Android Build Config|Android Build Config]]
- [[_COMMUNITY_Android App Init|Android App Init]]
- [[_COMMUNITY_Home Screen|Home Screen]]
- [[_COMMUNITY_Task Card UI|Task Card UI]]
- [[_COMMUNITY_Task Form|Task Form]]

## God Nodes (most connected - your core abstractions)
1. `Lumi Personal OS App` - 12 edges
2. `getDb()` - 9 edges
3. `Lumi Logo - Blue Chevron/Caret Mark` - 8 edges
4. `Service: db.ts (SQLite init)` - 7 edges
5. `createTask()` - 6 edges
6. `MainActivity` - 5 edges
7. `Database Table: entries` - 5 edges
8. `Android Icon Foreground Layer` - 5 edges
9. `Android Density xxhdpi (144dpi)` - 5 edges
10. `Android Density xxxhdpi (192dpi)` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Lumi Splashscreen Logo (concentric circles grid/target guideline, placeholder)` --references--> `Lumi Personal OS App`  [INFERRED]
  android/app/src/main/res/drawable-hdpi/splashscreen_logo.png → Lumi_PRD.md
- `Lumi Visual Identity (blue gradient caret/chevron logo, minimal, light theme)` --references--> `Lumi Personal OS App`  [INFERRED]
  android/app/src/main/res/mipmap-hdpi/ic_launcher.webp → Lumi_PRD.md
- `handleSubmit()` --calls--> `createTask()`  [INFERRED]
  app\(tabs)\index.tsx → services\taskService.ts
- `loadDayTasks()` --calls--> `getTasksForDate()`  [INFERRED]
  app\(tabs)\calendar.tsx → services\taskService.ts
- `handleToggle()` --calls--> `toggleTaskComplete()`  [INFERRED]
  app\(tabs)\calendar.tsx → services\taskService.ts

## Hyperedges (group relationships)
- **SQLite Schema: All Database Tables** — prd_db_entries, prd_db_tasks, prd_db_notes, prd_db_transactions, prd_db_budgets, prd_db_goals, prd_db_goal_milestones, prd_db_goal_tasks [EXTRACTED 1.00]
- **Lumi Technology Stack** — prd_expo_framework, prd_react_native_paper, prd_expo_router, prd_expo_sqlite, prd_gemini_flash_api [EXTRACTED 1.00]
- **Lumi Development Phases (1-5)** — prd_phase1_calendar_tasks, prd_phase2_notes_gemini, prd_phase3_dashboard, prd_phase4_finance, prd_phase5_goals [EXTRACTED 1.00]
- **Android Launcher Icon Asset Set** — img_ic_launcher, img_ic_launcher_foreground, img_ic_launcher_background, img_ic_launcher_monochrome, img_ic_launcher_round [EXTRACTED 1.00]
- **Android Build Fix Components** — progress_android_build_fix, progress_mci_minimal, progress_expo_symbols_mock, progress_gradle_version [EXTRACTED 1.00]
- **Android Adaptive Icon Layer Set** — assets_android_icon_background, assets_android_icon_foreground, assets_android_icon_monochrome [EXTRACTED 1.00]
- **Lumi Visual Identity - Blue Chevron Brand** — lumi_logo_chevron, assets_icon, assets_favicon, assets_android_icon_foreground, assets_android_icon_monochrome [INFERRED 0.90]
- **Android mipmap-xhdpi Launcher Icon Set** — mipmap_xhdpi_monochrome, mipmap_xhdpi_round, density_xhdpi [EXTRACTED 1.00]
- **Android mipmap-xxhdpi Launcher Icon Set** — mipmap_xxhdpi_launcher, mipmap_xxhdpi_background, mipmap_xxhdpi_foreground, mipmap_xxhdpi_monochrome, mipmap_xxhdpi_round, density_xxhdpi [EXTRACTED 1.00]
- **Android mipmap-xxxhdpi Launcher Icon Set** — mipmap_xxxhdpi_launcher, mipmap_xxxhdpi_background, mipmap_xxxhdpi_foreground, mipmap_xxxhdpi_monochrome, mipmap_xxxhdpi_round, density_xxxhdpi [EXTRACTED 1.00]
- **All Android Launcher Icon Variants** — mipmap_xhdpi_monochrome, mipmap_xhdpi_round, mipmap_xxhdpi_launcher, mipmap_xxhdpi_background, mipmap_xxhdpi_foreground, mipmap_xxhdpi_monochrome, mipmap_xxhdpi_round, mipmap_xxxhdpi_launcher, mipmap_xxxhdpi_background, mipmap_xxxhdpi_foreground, mipmap_xxxhdpi_monochrome, mipmap_xxxhdpi_round [EXTRACTED 1.00]
- **App Launch Visual Assets** — assets_icon, assets_favicon, assets_splash_icon [INFERRED 0.80]

## Communities

### Community 0 - "Android Icon Assets"
Cohesion: 0.13
Nodes (22): Android Icon Background Layer, Android Icon Foreground Layer, Android Icon Monochrome Layer, Favicon (Web), App Icon (Master Source), Splash Screen Icon, Android Density xhdpi (96dpi), Android Density xxhdpi (144dpi) (+14 more)

### Community 1 - "Task & DB Layer"
Cohesion: 0.19
Nodes (14): getDb(), createTask(), deleteTask(), generateId(), getAllTasks(), getDatesWithTasks(), getTaskById(), getTasksForDate() (+6 more)

### Community 2 - "Data Schema & Entries"
Cohesion: 0.16
Nodes (16): Input Classification Types (TASK/IDEA/FINANCE/GOAL/PROGRESS/UNCERTAIN), Database Table: entries, Database Table: goal_milestones, Database Table: goal_tasks, Database Table: goals, Database Table: notes, Database Table: tasks, Database Table: transactions (+8 more)

### Community 3 - "Product & Tech Stack"
Cohesion: 0.19
Nodes (13): Lumi Splashscreen Logo (concentric circles grid/target guideline, placeholder), Expo (React Native + TypeScript), Expo Router (file-based routing), Expo SQLite (local storage), Lumi Personal OS App, Phase 1: Calendar & Task List Module, Phase 2: Quick Notes + Gemini Dispatcher Input, Phase 3: Dashboard Overview (+5 more)

### Community 4 - "Calendar Screen"
Cohesion: 0.38
Nodes (4): handleDayPress(), handleToggle(), loadDayTasks(), toDateStr()

### Community 5 - "Android Native Bridge"
Cohesion: 0.33
Nodes (1): MainActivity

### Community 6 - "AI Dispatcher & Finance"
Cohesion: 0.33
Nodes (6): Database Table: budgets, Dynamic Budget Logic (AI-driven monthly budget suggestions), Gemini Dispatcher (AI Input Router), Gemini Flash API (AI Dispatcher), QuickInput Component (Universal Input Box), Service: geminiService.ts (Gemini API + Prompt)

### Community 7 - "Launcher Icon Set"
Cohesion: 0.33
Nodes (6): Lumi App Launcher Icon (full, light blue chevron/caret on light bg), Lumi App Launcher Background (light blue circular grid guidelines), Lumi App Launcher Foreground (blue gradient upward caret logo), Lumi App Launcher Monochrome (grey caret on white, adaptive icon), Lumi App Launcher Round (circular badge, blue caret on light bg), Lumi Visual Identity (blue gradient caret/chevron logo, minimal, light theme)

### Community 8 - "Android Build Config"
Cohesion: 0.4
Nodes (5): Android Build Fix: AOT bundle + MCI mock + Metro bypass, Android Build Issue: White Screen (Hermes JIT + OkHttp), assets/expo-symbols-mock.js (Android compatibility shim), Gradle Version Lock (8.13, blocked from 9.0), assets/mci-minimal.json (MaterialCommunityIcons minimal glyph map)

### Community 9 - "Android App Init"
Cohesion: 0.5
Nodes (1): MainApplication

### Community 10 - "Home Screen"
Cohesion: 0.67
Nodes (1): handleSubmit()

### Community 11 - "Task Card UI"
Cohesion: 1.0
Nodes (2): DeadlineLabel(), getDaysUntil()

### Community 12 - "Task Form"
Cohesion: 1.0
Nodes (2): handleSubmit(), validateDate()

## Knowledge Gaps
- **28 isolated node(s):** `Expo (React Native + TypeScript)`, `Database Table: budgets`, `Database Table: goal_milestones`, `Phase 2: Quick Notes + Gemini Dispatcher Input`, `Phase 3: Dashboard Overview` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Android Native Bridge`** (6 nodes): `MainActivity.kt`, `MainActivity`, `.createReactActivityDelegate()`, `.getMainComponentName()`, `.invokeDefaultOnBackPressed()`, `.onCreate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Android App Init`** (4 nodes): `MainApplication.kt`, `MainApplication`, `.onConfigurationChanged()`, `.onCreate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Home Screen`** (3 nodes): `index.tsx`, `formatDate()`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Task Card UI`** (3 nodes): `TaskCard.tsx`, `DeadlineLabel()`, `getDaysUntil()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Task Form`** (3 nodes): `TaskForm.tsx`, `handleSubmit()`, `validateDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Lumi Personal OS App` connect `Product & Tech Stack` to `AI Dispatcher & Finance`, `Launcher Icon Set`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Service: db.ts (SQLite init)` connect `Data Schema & Entries` to `Product & Tech Stack`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `Expo SQLite (local storage)` connect `Product & Tech Stack` to `Data Schema & Entries`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Lumi Personal OS App` (e.g. with `Lumi Splashscreen Logo (concentric circles grid/target guideline, placeholder)` and `Lumi Visual Identity (blue gradient caret/chevron logo, minimal, light theme)`) actually correct?**
  _`Lumi Personal OS App` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `getDb()` (e.g. with `getAllTasks()` and `getTasksForDate()`) actually correct?**
  _`getDb()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Lumi Logo - Blue Chevron/Caret Mark` (e.g. with `Android Launcher Foreground xxhdpi` and `Android Launcher Foreground xxxhdpi`) actually correct?**
  _`Lumi Logo - Blue Chevron/Caret Mark` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `Service: db.ts (SQLite init)` (e.g. with `Database Table: entries` and `Database Table: tasks`) actually correct?**
  _`Service: db.ts (SQLite init)` has 5 INFERRED edges - model-reasoned connections that need verification._