# LOG — 歷史紀錄歸檔（新條目加在「當前狀態」下方，由新到舊）

> 唯一的「過去」。收工時把新條目加到最上方版本清單頂端，並覆寫 `STATUS.md`。
> 重要決策用 `⭐定案：` 標籤（含理由）方便 grep。
> 註：本檔由原 `daily_log.md` 遷入，尾端併入原 `project_status.md` 的早期 Phase 歸檔。

---

## 當前狀態 (2026-07-31)

**版號：0.4.81（標準工時＋固定休息制度）**

### GitHub同步（2026-09-22）

- 使用者要求更新GitHub。fetch確認本機master與origin/master原先0 ahead／0 behind；37個功能／測試／文件檔提交`0b59a83`，正常push成功，無force push。
- 重跑TypeScript、32組tracker／SQLite、8組Gemini transport、日曆與Ask兩支render檢查全部通過。staged diff check發現TrackerDefinitionEditor檔尾多一空行，僅移除該空行後通過。變更檔常見憑證模式掃描未命中。
- 同步包含project memory與AGENTS.md；無APK、手機資料或API Key。依開發收尾技能驗證後按使用者要求直接推送既有master，未建立PR、未清理工作目錄。

### UI 修正版 S26 Ultra 安裝驗收（2026-09-22 晚間）

- USB重新授權後連線成功。核對calendar-ask-layout APK SHA256與前輪一致，install -r回傳Success；lastUpdateTime=2026-09-22 20:33:10。
- 實機截图確認日曆事件顏色圖例已移除、日期色點保留。問Lumi送出「今天是什麼日子？」後，等待中與回覆後快速提問文字完整；開啟鍵盤時也無上下裁切。AI本次回覆今日無已記錄紀念日，與當前日曆無紀念日卡片一致；未重建早先測試紀念日，也未操作新增／修改／刪除紀錄。
- 目前程序AndroidRuntime／ReactNativeJS／SQLiteLog error無輸出。截图在桌面lumi-calendar-layout.png、lumi-ask-layout.png、lumi-ask-keyboard.png。已關閉鍵盤；未更改字體大小，其他裝置／大字體仍未測。
- 按verify-and-stop技能完成兩項既定UI驗收即停止，未改產品程式、未commit／push。

### 日曆圖例與問 Lumi 快速提問裁切修正（2026-09-22）

- 使用者確認紀念日功能成功後，要求移除日曆顏色的事件文字說明，並回報對話開始後快速提問文字被切半。
- 最小範圍修正：CalendarGrid僅calendar模式不渲染圖例列，日期色點、accessible labels、切換與其他模式圖例保留。Ask strip原maxHeight44不足容納上下留白／邊框／文字，改內容決定高度並flexGrow0／flexShrink0；chip最小高度44與文字lineHeight20，保留點擊和水平捲動。依surgical-patch採局部修補，未改聊天或AI流程。
- TypeScript、兩支新增render回歸檢查`check-calendar-grid.cjs`／`check-ask-layout.cjs`、Expo public config、diff check通過。render mocks不代表Android像素驗收。32組tracker與8組transport為前輪結果，本輪未重跑。
- arm64 release BUILD SUCCESSFUL in1m10s，430tasks；v2簽章通過。產物`C:\Users\Brayden\Desktop\Lumi-0.4.81-calendar-ask-layout.apk`，36,778,694 bytes，SHA256 `0E5F902E29DDDB1BD494156773BEAF76EDF0240E413F34C9240D683739FBBD3B`。
- ADB無裝置，未安裝新版／未完成手機快速提問、鍵盤或字體放大驗收。已安裝仍為calendar-anniversaries版（14:36:43）。無資料／Key變更、無升版、無commit／push。

### 紀念日改由日曆管理（2026-09-22）
- 建置1分12秒／430tasks成功，APK `C:\Users\Brayden\Desktop\Lumi-0.4.81-calendar-anniversaries.apk` 36,779,322 bytes，SHA256 `4178DA9577485BAEF55C7705147A9B2F7CB80CFFDFFF5133661C1C4297018F70`，v2簽章通過。install -r Success，手機lastUpdateTime14:36:43；Play Protect上傳詢問選不要傳送，未停用防護。
- 實機日曆9/22顯示原Lumi測試紀念日、2026-09-22原日期，粉色點／圖例可見；編輯bottom sheet名稱日期正確、取消未改資料，截圖已目視確認。筆記頁顯示還沒有筆記、無紀念日分類。問Lumi「今天是什麼日子？」真實回覆「今天是你的『Lumi測試紀念日』（2026/09/22）。」error logs無輸出。未實機提交CRUD或刪除使用者原紀念日；不宣稱所有尺寸／键盤已驗收。
- 使用者確認首頁已記住紀念日，但不希望混在筆記，明確要求改放日曆。保留notes內原有紀念日格式與ID，不搬移／重建資料，因此不需DB或backup升版；新增日曆專用讀取／日期匹配／CRUD服務，更新與刪除皆限category=紀念日，避免動到普通筆記。
- 日曆格加入粉色紀念日標記及圖例，當日列表顯示紀念日卡片；「＋」新增紀念日，獨立bottom sheet提供名稱／日期、有效日期檢查、防重複儲存、鍵盤避讓、捲動、安全區、放棄修改與刪除確認。每年同月同日顯示、起始年份前不顯示、2/29只在閏年；首頁月曆卡顯示今日紀念日數。
- 一般筆記list／recent／count／分類及首頁最近動態、事件流的note來源排除紀念日；問Lumi仍透過專用完整context讀取，備份／復原維持原格式。首頁宣告改提示已加入日曆，普通筆記不能新增同名分類入口。
- lean-build沿用既有日曆／儲存；UI/UX技能搜尋腳本缺檔，採已讀規範與專案現有樣式實作。TypeScript、32組tracker（新加舊紀念日顯示、排除筆記數量、月份標記、calendar CRUD、普通筆記保護、備份還原）＋8組transport通過；Expo config、diff check通過。待新APK建置與手機驗收；未commit／push。

### S26 Ultra 安裝紀念日版，分流實測通過（2026-09-22）
- 手機從unauthorized轉device，核對anniversaries APK SHA256 `77D23529221FDA6B3370FC25E17B5EFAFDA4CC09CA40549D3286AD6429A7B0D5`及v2簽章後install -r成功；lastUpdateTime14:23:09，版本0.4.81。Play Protect詢問是否上傳未知App，選不要傳送，未停用防護；未清資料或讀出Key。
- 啟動設定頁97ms，原Gemini設定仍在，分流文字正常。真實「驗證分類與模組」顯示通過：分類2.5 Flash-Lite午餐250→餐飲1.4秒；模組設計3.8 Flash體重格式驗證2.9秒。測試不儲存資料；不能推論長期可靠性／模組CRUD已驗收。已返回首頁，下一步請使用者輸入中文測試紀念日，再驗證保存與問Lumi回覆；未改產品程式。

### 無手機時的安裝就緒複核（2026-09-21）
- 依使用者要求僅驗證，不改產品程式碼。TypeScript、30組tracker、8組transport重新通過，diff check通過。桌面anniversaries APK與Gradle產物均SHA256 `77D23529221FDA6B3370FC25E17B5EFAFDA4CC09CA40549D3286AD6429A7B0D5`。
- 新APK v2簽章有效，與9/18 model-check APK簽署憑證SHA256相同：`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`。套件com.anonymous.lumi、versionCode81、minSDK24／target36、arm64-v8a；內含assets/index.android.bundle。準備可保留資料覆蓋安裝，無須另跑開發伺服器。手機不在，未操作或安裝；不能保證當下API額度／網路或實機UI。提醒插USB不會自動更新，仍須安裝新版。

### 紀念日記憶與問 Lumi 查詢（2026-09-21）
- arm64 APK建置1分28秒／430tasks成功，v2簽章驗證通過；`C:\Users\Brayden\Desktop\Lumi-0.4.81-anniversaries.apk`，36,770,910 bytes，SHA256 `77D23529221FDA6B3370FC25E17B5EFAFDA4CC09CA40549D3286AD6429A7B0D5`。含9/19分流；再次查ADB為空，未安裝。STATUS已整理為目前狀態，舊版詳細歷史保留本LOG。
- 使用者要求首頁記錄「今天是什麼紀念日」，之後問Lumi能查日期／今天的日子。依lean-build沿用notes與現有編輯／刪除／復原／備份，新增固定「紀念日」分類，無新表／依賴／migration，App0.4.81、DB9、backup7不變。
- `anniversaryService` 嚴格辨識「今天／昨天／明天是…紀念日／生日」、完整西元日期與中文月日、反向「…紀念日是日期」。當地日期於記錄時固定，非法日期阻擋，不把明確問題或消費敘述當紀念日。內容為名稱、日期：YYYY-MM-DD、每年紀念三行；筆記編輯校驗、固定分類提示與格式說明。首頁直接本地辨識，其他輸入維持2.5分類。
- 問Lumi仍3.8，額外查全部紀念日，不受近期250筆限制；傳入當地今天與本機計算今日匹配，明確區分紀念日與建立時間，同名衝突列出詢問，未來起始日期不提前紀念、2/29僅閏年匹配。介面告知所有紀念日會送至使用者設定的AI供應商。日期年份只代表記錄指定年份，不能推論出生／交往年份。未增加推播／農曆／自動遷移舊自由文字筆記。
- 本機TypeScript、30組tracker與8組transport通過；新測試涵蓋本地日期、跨年／閏日、無效日期、問句／消費排除、CRUD／undo、251筆較新筆記不遮蔽舊紀念日、問Lumi請求context、備份還原／刪除／修改。Expo config與diff check通過。ADB無裝置，尚未实機驗收或真實AI問答，不能以模擬AI測試宣稱回覆正確率。未commit／push。

### 依功能選用 Gemini 模型（2026-09-19）
- arm64建置1分10秒／430tasks成功，v2簽章與diff check通過。APK `C:\Users\Brayden\Desktop\Lumi-0.4.81-task-routing.apk`，36,765,050 bytes，SHA256 `983449ACDF2EBAE379A90B765EF226A06925A05C366A6F33913EDC23E0C25716`。再次確認ADB無裝置，未安裝。
- 使用者明確要求主畫面用2.5、分析／建立模組用3.8。以小範圍修補在共用服務新增 `getModelForTask`：quick=2.5 Flash-Lite（分類、新分類建議、既有模組紀錄帶入），deep=3.8 Flash（財務顧問、快速分析、問Lumi、月回顧、模組設計）。不靠改寫全域設定切換，避免請求互相干擾；其他provider、key、DB及計費未動。
- 設定頁清楚顯示分工；合成功能測試使用真實分流路徑，報告分別標示模型。連線／模型比較診斷仍能測原保存或指定模型，不被業務分流蓋掉。失敗不跨模型重試，分類12秒＋本機fallback、深度65秒有限重試維持。
- 型別檢查、25組tracker與8組transport測試通過，含分類／紀錄／模組／問Lumi／財務分析／月回顧請求URL、設定保存不變與其他provider模型保留；Expo public config通過。手機未連線，尚無新版實機驗收。未commit／push，版本仍0.4.81／DB9／backup7。

### S26 Ultra 模型比較與合成功能實測（2026-09-18）
- 使用者「開始吧」後，確認 R5GL75NTH4Y device；model-check APK SHA256 `3CEE137BC7768B63E0ADC5C935BCD09FA7D1F702D3AD342491342AEFC00093E2` 與v2簽章驗證通過，`adb install -r` Success；lastUpdateTime=19:12:33。保留資料／key，未改模型、網路、計費，未commit／push。
- 19:13帳號模型清單＋各兩次真實生成：3.8 Flash成功2/2（12.6、24.0秒）；3.7 Flash成功0/2（兩次30秒逾時）；2.5 Flash-Lite成功2/2（0.9、0.9秒）。每輪maxAttempts=1，不用重試掩蓋失敗。不能由此推論長期穩定／免費。
- 保存模型仍3.8：功能測試顯示通過，午餐250→餐飲11.2秒（函式亦檢查FINANCE／expense／250）；體重模組設計與格式驗證13.2秒（有效定義且有date、number欄位）。全部合成資料、未儲存；未驗證財務分析、完整欄位語義或模組實際CRUD。分類接近12秒上限，仍須處理延遲風險。
- 本次重新跑TypeScript、23組tracker、8組transport全通過；目前程序AndroidRuntime／ReactNativeJS／SQLiteLog error查詢無輸出。依完成前驗證規範，僅回報已實測範圍，不宣稱全面完成。

### Gemini 有限重試、功能測試與帳號模型查核（2026-09-18，未安裝）
- 使用者要求繼續修，後追加「確認到底哪個模型可以用」。依官方troubleshooting實作有限退避，避免無限重試；不自動降版、不修改帳號計費或網路。
- 新增 `services/geminiTransport.ts`：Gemini共用完整fetch＋body期限、單次30秒／總65秒、最多3次；暫時HTTP408／500／502／503／504與連線錯誤可重試，遵守Retry-After；金鑰／權限／模型／429額度錯誤不重試。錯誤不暴露key、raw provider body或個人內容。首頁分類維持12秒總budget，失敗回本機分類。
- AI設定新增合成資料功能測試（午餐250必須AI回food／expense／250、模組必須有效date＋number欄位），不讀個人財務歷史、不寫入模組／記帳。測試按鈕共用ref防連點。
- 新增帳號可用模型查核：models.list分頁最多3頁／每頁1000，只測已列且支援generateContent的3.8 Flash、3.7 Flash、2.5 Flash-Lite，各2輪每輪30秒且maxAttempts=1；列出成功數、時間與失敗原因，不以重試掩蓋失敗，保存模型不變。三款官方pricing列有Free Tier，但不因此斷言使用者專案免費／配額可用。
- 本機TypeScript、23組tracker與8組transport測試通過；修正VM測試中各模組Error realm不一致的測試環境問題。ADB為空，已請使用者重接手機；尚未做新一輪真實模型查核或安裝，不能宣稱3.7成功。
- arm64 release build1分28秒、430tasks成功，v2簽章驗證、Expo public config、diff check通過。APK `C:\Users\Brayden\Desktop\Lumi-0.4.81-model-check.apk`，36,764,534 bytes，SHA256 `3CEE137BC7768B63E0ADC5C935BCD09FA7D1F702D3AD342491342AEFC00093E2`；ADB仍無裝置，未安裝。未commit／push，App仍0.4.81、DBv9、backup7。

### S26 Ultra 安裝compat版，3.8兩次成功但後續複測失敗（2026-09-16）
- 手機 `R5GL75NTH4Y` 已授權；核對compat APK SHA256與v2簽章後，`adb install -r` Success，原資料／key保留。Play Protect上傳檢查詢問選「不要傳送」，未停用防護。裝置lastUpdateTime為18:09:47，版號仍0.4.81(81)。
- 正常「測試模型連線」連續兩次回 `gemini-3.8-flash 已成功回應。`，第二次按下到觀察成功5.6秒。此路徑用實際保存的Gemini key、3.8、LOW thinking與systemInstruction，沒有2.5備援。修正後實際生成成功，但沒有同時A/B，不能斷言舊逾時全由temperature造成。
- TypeScript、21組隔離測試與diff check再次通過；目前程序AndroidRuntime／ReactNativeJS／SQLiteLog error為空。嘗試模組預覽測試時鍵盤輸入／導航未完成，未提交模組設計、未建立測試資料；分類／模組等實際工作流程仍待驗收。
- 額外同模型基本請求（僅contents、無LOW或其他選用參數）收到Google HTTP503，UI顯示「模型查詢成功，但文字生成失敗：Gemini 請求失敗（503）」。這是與正常設定兩次成功不同的結果，不能把基本測試算作成功，亦不能保證每次請求都穩定。
- 最後再跑正常設定（第三次）仍45秒逾時。已明確告知使用者：正常測試2成功／1逾時、基本測試1次503，3.8已能回覆但還不穩定，未宣稱完全修好。不能忽略最後的失敗，只引用前兩次成功。未繼續消耗配額做無限重試。

### Gemini 3.8 參數相容性修正，待接手機驗證（2026-09-16）
- 使用者要求使3.8真正可用。重新查官方 https://ai.google.dev/gemini-api/docs/latest-model ，Migration checklist要求移除temperature／top_p／top_k，與先前泛用Gemini3指南temperature=1不同。本機僅針對 `gemini-3.8` 系列移除temperature，保留舊模型與其他供應商；未宣稱這已解決逾時。
- 新增「基本請求測試（同一模型）」：只傳合成Reply OK的contents，不加systemInstruction／generationConfig，等待上限90秒；不保存測試結果為使用者資料、不改模型／金鑰。正常測試45秒、業務20秒、分類12秒均維持。用於下一次實機排除選用參數影響。
- 21組SQLite／mock API測試、TypeScript、Expo public config、diff check、arm64 release build19秒與v2簽章通過；新增測試覆蓋3.8不傳temperature、2.5保留原值、基本請求只有合成contents且不改設定。
- APK `C:\Users\Brayden\Desktop\Lumi-0.4.81-gemini38-compat.apk`，36,756,142 bytes，SHA256 `03080D36E255CB6AD3D8671753E09C7D341EC02EDB83C025BECFB57F6628F50C`。ADB多次查詢均無裝置，尚未安裝／真實驗證；已請使用者接回S26 Ultra。未commit／push，未改計費或手機網路。

### Gemini 逾時診斷與 VPN 誤判更正（2026-09-16）
- 使用者澄清沒有VPN。重新解析Android預設network121：Transports WIFI、NOT_VPN；原字串比對 `-match 'VPN'` 是誤判，已修正紀錄。未改手機網路／DNS／代理。手機shell正常HTTPS約0.14秒回未授權403；使用刻意無效的測試key呼叫generateContent約0.16秒回400，未讀出真實key。
- AI設定新增分階段診斷：metadata查詢15秒，文字生成測試45秒；顯示目前階段並區分哪一步失敗。新增「對照測試2.5 Flash-Lite（不切換模型）」：只在記憶體覆寫該次請求的model，不寫入設定。兩種測試均只傳合成的Reply OK，不送個人記錄。
- 實機證據：3.8 metadata查詢成功，隨後generateContent45秒逾時；相同裝置／key的2.5 Flash-Lite對照測試約數秒成功。關閉結果後UI仍顯示 `目前模型：gemini-3.8-flash`。只定位至3.8生成請求／服務，未證實Google根因；不宣稱3.8已可用、不擅自降版。待使用者選擇明確提示的舊模型備援或暫時切回。
- 20組隔離SQLite／mock API測試、TypeScript、Expo config、diff check通過；arm64 release build20秒、430 tasks，v2簽章驗證通過，覆蓋安裝Success，原資料及key保留。AndroidRuntime／ReactNativeJS／SQLiteLog目前程序error查詢為空。
- 最新APK `C:\Users\Brayden\Desktop\Lumi-0.4.81-gemini38-diagnostics.apk`，36,755,442 bytes，SHA256 `7D40D2A5AC35D7C6D1F39BE7599CE720B1CA58E293E5942B77AF1246077311D5`。未commit／push，未改App／DB／backup版號。

### Gemini 3.8 Flash 升級（未 bump，2026-09-16）
- 使用者要求升級至最新有免費額度的 Gemini。查核 Google 官方模型頁確認 `gemini-3.8-flash` stable、支援 generateContent／structured outputs／LOW、MEDIUM、HIGH；MINIMAL 不支援。官方價格列有 Free Tier，但實際配額／計費依專案，本次未調整計費。
- `services/geminiService.ts` 預設改為 3.8 Flash；沒有指定 model 的既有 Gemini 設定自動套用新預設，保留 API Key、自訂 model 與其他供應商。Gemini 3 設定 temperature=1、thinkingConfig LOW、maxOutputTokens 最少4096，首頁分類逾時從6秒到12秒。systemInstruction 取代舊的假財務開場對話；金鑰移至 header；回應合併文字並排除 thought，截斷／空回應／非正常結束明確報錯。
- AI 設定頁新增實際模型名稱與「測試模型連線」，只傳簡短測試文字，不送個人資料。18 組隔離 SQLite／mock API 測試、TypeScript、Expo config、diff check 與 arm64 release build 通過；build 1分4秒、430 tasks。新增測試覆蓋 default／override、Gemini3 參數／header、分類多片段／thought、429 fallback、截斷與空回應。
- APK `C:\Users\Brayden\Desktop\Lumi-0.4.81-gemini38.apk`（36,754,206 bytes，SHA-256 `CD411A6FF7AA46A786A0B851232E6B8DAF0C7D3BA1E4A39609F88568DFE0F5F7`）v2 簽章驗證通過，ADB 覆蓋安裝至 S26 Ultra 成功，冷啟動81ms，設定頁顯示已設定 Gemini 與 gemini-3.8-flash。
- 真實連線測試兩次都在20秒逾時，未取得成功回應。原先誤報手機預設網路121為VPN，後續確認是 WIFI、NOT_VPN（字串比對錯誤），不需使用者關閉VPN。未讀出金鑰、未建立測試個人紀錄、未commit／push。

### S26 Ultra 安裝 r2 與啟動驗證（2026-09-16）
- 連線確認 `R5GL75NTH4Y`／`SM-S9480` 已授權；核對桌面 r2 APK SHA-256 與前次建置一致。`adb install -r` 回 `Success`，未清除 App 資料；Play Protect 出現是否上傳 App 檢查的詢問，選「不要傳送」後安裝完成。
- 裝置顯示 `0.4.81 (81)`，lastUpdateTime `2026-09-16 17:20:21`；冷啟動 `Status: ok`、81 ms，程序存活。以 `lumi://modules` 開啟自訂模組頁，UI 顯示設計輸入、建立按鈕與「還沒有自訂模組」，未顯示載入失敗。
- 目前 App 程序的 AndroidRuntime／ReactNativeJS／SQLiteLog error 查詢為空。準備輸入測試需求時手機已切至其他 App，停止後續畫面操作。未確認真實 AI 請求、未建立測試模組，CRUD／鍵盤／舊資料內容仍待實機驗收。

### 自訂模組 r2：審查修正、編輯與整合（未 bump，2026-09-15）
- 審查重現原型接受 `2026-99-99`／`2026-02-30`、壞掉的 schema JSON 仍通過備份預覽、頁面失敗無提示，以及缺少編輯功能。使用者要求繼續修到可用。
- 統一驗證模組 schema 與欄位值：真實日期／閏年、有限數值、必填、選項、未知欄位、欄位與內容長度、保留 key；新增與修改都重新读取目前模組並以 transaction 儲存，避免使用過期模組。
- 備份先驗證模組 schema、records JSON、重複 ID 與歸屬；不相容欄位的同 ID 模組不能合併。完全取代中途失敗可回滾；舊 schema 6 可合併或取代。刪除模組明確先刪所屬 records，避免依賴連線 FK 設定。
- 預覽改為可編輯名稱／說明／欄位（增刪、類型、必填、選項、單位），中文標籤、捲動與鍵盤避讓；歷史紀錄點擊編輯、明確刪除入口；既有模組設定允許名稱／說明／欄位標題修改，保留結構與單位以免改變歷史資料語意。載入失敗和不存在顯示訊息／重試，非同步操作有防連點與錯誤處理。
- 新增模組內「AI 整理並帶入」，只傳該次文字與 schema；結果先驗證再帶入，仍需使用者確認儲存。首頁依模組名稱／短名（如「體重追蹤」→「體重 70.5」）轉到草稿；同名衝突先選模組，另有手動選模組入口。
- 統一事件流新增 tracker，時間軸、問 Lumi 與月回顧納入有欄位名稱／單位的模組紀錄，並更新資料傳送說明。仍以紀錄建立時間排列時間軸；實際填寫日期包含於內容。
- 新增 `scripts/check-tracker.cjs`／`npm.cmd run check:tracker`：實際 in-memory SQLite＋模擬 AI 回應，15 組測試通過，含 0→9／8→9 migration、CRUD、日期、backup merge／replace／rollback、首頁配對、事件流和 AI 整理。沒有讀寫使用者資料或發送真實網路請求。
- TypeScript、Expo public config、diff check、arm64 release build（24 秒）通過。APK `C:\Users\Brayden\Desktop\Lumi-0.4.81-ai-modules-r2.apk`，36,751,654 bytes，SHA-256 `7C677FC3A409878E5105D7F5B6968A81401C12A914F00F892656483284EB3802`，v2 簽章驗證成功。ADB 清單為空，尚未安裝；真實 API／鍵盤／實機驗收待重接 S26 Ultra。未 commit／push。

### AI 自訂追蹤模組 v1（未 bump 版號，2026-09-15）
- 新增側邊欄「自訂模組」：使用者以自然語言描述需求，既有 Gemini／OpenRouter 設定會產生名稱、說明與 1–8 個受控欄位；確認 bottom sheet 會先列出 AI 建議，再由使用者決定是否建立。
- ⭐定案：AI 只產生資料 schema，不產生或執行 JavaScript、SQL、公式、網路連線或跨模組自動化。v1 欄位限文字、數字、日期、單選，並由本機再次驗證欄位數、名稱、類型、單位與選項。
- 每個模組可新增／刪除紀錄、查看歷史；數值欄位顯示最新值與平均。模組刪除時會連同所屬紀錄刪除並先確認。
- DB migration v9 新增 `tracker_modules`、`tracker_records` 與日期索引；backup schema 6→7，舊備份自動補空陣列，合併／完全取代都涵蓋模組資料。
- `npm.cmd run check`、Expo public config、`git diff --check` 與 arm64 release build 通過（430 tasks，BUILD SUCCESSFUL）。APK `C:\Users\Brayden\Desktop\Lumi-0.4.81-ai-modules.apk`（36,731,598 bytes，SHA-256 `0FCDBD781D13DF01986FB1744FC6D9977528D3A2FA092F35ECDBD47184ACAF3E`）。建置後 ADB 裝置清單為空，尚待 S26 Ultra 重接後覆蓋安裝、migration 與真實 AI 呼叫驗收。

### AI 建立財務分類（未 bump 版號，2026-09-15）
- 首頁智慧輸入會把目前的內建與自訂支出分類一併交給 AI；AI 必須優先選現有分類，避免產生近義重複項目。
- 現有分類確實不適合時，AI 可回傳簡短繁中 `newCategoryLabel`。Lumi 僅在交易實際儲存時建立自訂分類、配置穩定色票，並將該筆交易歸入新分類；預覽或取消不會留下空分類。
- 新分類名稱會驗證長度與控制字元；若同名分類已存在則直接沿用。多筆智慧記帳仍維持既有本機分類流程，本次未擴張。
- 本機關鍵字補齊全部十種內建支出分類；回歸案例涵蓋餐飲、交通、興趣、日用品、醫療、教育、娛樂、通訊、居住，並修正單字「票」讓「電影票」誤判交通的衝突。首頁最近動態現在會顯示支出分類，預覽也能顯示動態／自訂分類名稱。
- 沿用 `settings.expense_categories`，不需 DB migration。`npm.cmd run check`、Expo public config、`git diff --check`、十類關鍵字回歸與 arm64 release build 通過；APK `C:\Users\Brayden\Desktop\Lumi-0.4.81-smart-categories.apk`（36,708,186 bytes，SHA-256 `EB08EBB0BE690F534BF340B25CE91D468D4BE2CF2CAE77DBF3E151EC59147676`）通過 v2 簽章驗證。建置時手機未連線，待覆蓋安裝與帶 API Key 實機驗收。
- 2026-09-15 已透過 ADB 安裝至 Samsung S26 Ultra（`SM-S9480`／序號 `R5GL75NTH4Y`），`adb install -r` 回 `Success`。`0.4.81 (81)` 冷啟動 87 ms、程序存活，AndroidRuntime／ReactNativeJS／SQLite fatal log 為空；首頁與 Google 外部行事曆可正常開啟。新手機沒有 Lumi 本機資料與舊機 SecureStore API Key，AI 真實呼叫仍待使用者設定 Key 後驗收。

### 首頁智慧記帳分類補強（未 bump 版號，2026-09-14）
- 修正首頁優先採用 AI 分類時，AI 只回傳 `FINANCE`／金額／收支方向但漏掉 `category`，交易便被預設存成 `other` 的問題。
- AI 支出分類缺失、不在允許值內，或只回 `other` 但本機能判出更具體分類時，現在會以既有本機關鍵字結果補齊；例如「午餐 250」會補為 `food`（餐飲）。收入維持不設定支出分類。
- 修改範圍限於首頁 AI 與本機分類結果的交界；`npm.cmd run check`、Expo public config 與 `git diff --check` 通過，待實機驗收。

### 目前存款與對帳（未 bump 版號，2026-08-17）
- 起因：使用者問「沒有人設計可以輸入目前存款嗎」。原本緩衝區拿「歷來收入減支出」當存款近似值，只要裝 App 前就有錢、或有漏記，數字就是錯的。
- ⭐定案：**不做獨立的期初餘額設定，只做對帳調整**。`目前存款 = Σ(收入) − Σ(支出)`（含調整）；使用者輸入實際餘額，差額寫成一筆調整交易。理由：餘額只有一種算法、不必維護兩個事實來源，而且每次校正都留在歷史裡可查。第一次「設定存款」與之後的「對帳」是同一個動作。
- ⭐定案：**統計排除調整、餘額包含調整**。調整不是收入也不是支出，算進去的話「這個月花了多少」會被校正金額污染。實作用 `financeService.EXCLUDE_ADJUSTMENTS` 常數統一條件。
- 評估過但不做的：多帳戶（Mint / MoneyMoney 式）。`transactions` 要加 `account_id`、要 `accounts` 表、要轉帳型別，而轉帳會讓現有所有只認 income/expense 的統計雙重灌水，`financeAnalyticsService` 每個查詢都得改。以目前階段（A/B/D 未完、bundle ID 未改）不划算。
- migration v8：`transactions.is_adjustment INTEGER NOT NULL DEFAULT 0` + 索引。backup schema 5→6，舊備份補 0。
- 調整交易**保留**在記帳明細（標「不計入收支」灰藍標籤），但排除於 `eventStreamService`（時間軸／問 Lumi）與 `recentService`（首頁最近動態）——那兩處講的是「使用者做了什麼」，記帳機制不該佔位。
- 新增 `components/finance/analytics/BalanceCard.tsx`：存款數字 + 對帳 bottom sheet，未對過帳時明寫「目前只是收支淨額」。緩衝區文案同步改掉「非實際存款」。
- commit `c16b04f`，`npm run typecheck` 通過。**未 build、未實機驗收。**

### 記帳與財務分析拆頁 + 完整財務中心（未 bump 版號，2026-08-17）
- ⭐定案：底部「行事曆」改名「日曆」，群組內維持三子頁但「財務」更名「記帳」；底部「財務」改成**獨立財務分析頁**，不掛共用月曆。理由：原本記帳與報表擠在同一頁又被月曆壓著，兩種使用情境（逐筆輸入 vs 彙總判讀）互相干擾。
- 路由：`app/(tabs)/(calendar-finance)/` → `(calendar)/`，其中 `finance.tsx` → `bookkeeping.tsx`（讓出 URL `/finance`）；新增 `app/(tabs)/finance.tsx`。`CalendarWorkspace` / `ScrollWorkspace` / `CalendarGrid.mode` 的 `'finance'` 一律改 `'bookkeeping'`。
- ⭐定案：分類色票與標籤集中到 `types/finance.ts` 的 `ExpenseCategoryMeta` + `financeService.DEFAULT_EXPENSE_CATEGORIES`，畫面一律 `findCategoryMeta()` 查表。原因：service 有 10 個分類，但 PieChart／TransactionCard／BudgetMeter 各自硬編 4 個，日用品／醫療／教育／娛樂／通訊／居住 全畫成同一灰並顯示英文 slug。
- 修好三個既有壞掉的東西：新增分類的 state 與 handler 早就寫好但**沒有任何 JSX 渲染**（使用者加不了自訂分類）；`BudgetMeter.tsx` 零 import，`budgets` 表永遠空但 `geminiService` 仍讀它餵 AI 顧問；記帳日期欄設 `keyboardType="numeric"`，Android 數字鍵盤打不出 `-`。
- DB migration v7：`transactions.income_kind`（fixed／extra／NULL）、`savings_goals` 表。`backupService` schema 4→5，舊備份匯入時 `income_kind` 補 null、`savings_goals` 補空陣列。
- 新增 `services/financeAnalyticsService.ts`：KPI＋前期比較、補零月趨勢、分類排行含月對月、TOP 5、收入結構、緩衝區、預算用量、儲蓄目標 CRUD 與反推。
- ⭐定案：日均支出除以「已過天數」而非期間總天數，否則月初永遠看起來很省。⭐定案：緩衝區用歷來累計結餘 ÷ 近月均支出當近似值，並在 UI 明寫「非實際存款」——App 沒有帳戶餘額概念。⭐定案：儲蓄目標的已存金額手動維護，不自動從結餘扣。
- 記帳頁明細改 `FlatList`（原本「全部」模式用 `.map()` 全渲染）、儲存失敗訊息從「項目名稱」欄底下移到按鈕上方、編輯儲存加防連點、清掉月曆化之後殘留的 `monthNav`／`sectionHint`／`budgetContainer` 死樣式。
- `TechIcon` 新增 `target`（儲蓄目標用），維持既有線框語言。
- 分 6 個 commit（`abfdbd1` → `67eede7`），每段 `npm run typecheck` 通過；Expo public config 通過。
- 2026-08-17 已 push 至 GitHub（`c249ab4..7b04674`，8 個 commit，含前面兩個 chore：splash 圖進版控、testresult/ 與 temp.png 進 .gitignore）。
- 2026-08-17 在 `Brayden` 機建 arm64 release 成功：**1 分 22 秒**（Gradle 快取熱，430 tasks 僅 21 executed），APK 35 MB，`adb install -r` 回 `Success`，已進 Pixel 8a（`42231JEKB12273`）。此機環境（Android Studio jbr JDK 21.0.10 + `C:\Users\Brayden\...\Android\Sdk`）已補進 `ENVIRONMENT.md`。**未 bump 版號，待實機驗收。**

### 底部主功能歸屬與可收合共用月曆（未 bump 版號，2026-08-02）
- ⭐定案：財務維持底部獨立大項，保留主打功能能見度；內層仍維持「行事曆｜工時｜財務」三工作區與左右滑動，因三者共享日期情境但不代表財務隸屬行事曆。
- 修正先前雙重入口矛盾：「行事曆」只記住行事曆／工時，從財務離開後再點行事曆會回到上次的時間工作區；財務路徑只亮底部財務，滑回行事曆／工時則亮底部行事曆。
- 共用月曆改為可折疊頁首：在行事曆、工時或財務向上捲動時月曆同步離開畫面，三工作區切換列收合後固定於頂端；每頁各自記錄捲動／收合位置，切換不強制重設。
- 行事曆日期工具列移入同一份 `FlatList`，工時與財務既有 `ScrollView` 接上共用收合狀態；沒有加入新的第三方依賴，避免 Android 巢狀捲動與額外相容風險。
- `npm.cmd run check`、Expo public config、`git diff --check` 通過；尚未升版、build 或實機安裝，待 Android 驗收垂直捲動、水平切頁、短內容與 Modal 手勢。
- 2026-08-02 已在 `asus` 安裝 JDK 21、Android Platform／Build Tools 36 與 NDK 27.1；arm64 release build 成功（10 分 35 秒）。APK 複製至桌面 `Lumi-0.4.81-calendar-scroll.apk`，34.23 MB，v2 簽章驗證通過，SHA-256 `691F63010414CB66964C604B8FB99914D4D4205C631048AAFCC7063768EA23A2`。

### 日曆子頁記憶（未 bump 版號，2026-07-31）
- 使用者回報：在日曆 tab 停在某子頁（行事曆／工時／財務）後離開再回來，底部「行事曆」鍵會硬把子頁重設回「行事曆」。
- 根因：`app/(tabs)/_layout.tsx` 底部「行事曆」鍵寫死 `route: '/(calendar-finance)/calendar'`，每次點都 deep-link 回 calendar 子頁。
- 修法：`CalendarContext` 新增 `lastWorkspace` 狀態；`(calendar-finance)/_layout.tsx` 子頁切換時 `setLastWorkspace`；底部「行事曆」鍵改導向 `/(calendar-finance)/${lastWorkspace}`（三子頁皆記憶）。
- 已知行為：上次停「財務」時點「行事曆」會回到財務子頁，但因兩者同路由，底部亮的是「財務」鍵（內容正確，僅高亮）；狀態存記憶體，App 完全重啟回預設 calendar。
- 環境備忘：本機建置路徑改用帳號 `user` 與 Microsoft OpenJDK 21（見 `ENVIRONMENT.md`）；arm64 release build 通過，`adb install -r` 已裝上 Pixel 8a，待使用者實測三子頁記憶。

### 0.4.81 — 標準工時＋固定休息制度（2026-07-31）
- 使用者進一步確認休息應保留，但屬於公司制度而非每日輸入：例如標準 8 小時、固定休息 1 小時。
- 工時設定同時提供標準工時與固定休息；休息有不扣除、30、60、90 分快捷，預設為標準 8:00／休息 60 分。
- 新打卡與補登自動套用制度；儲存設定時也同步更新目前上班中紀錄並重排提醒，既有已完成紀錄不批次改寫。
- 上班中預計達標時間與剩餘時間依「標準＋休息」計算；單日有效工時在下班後依「在班時間－固定休息」結算。
- v0.4.80 的月摘要修正保留：上班中不列入完成天數、已結算工時或工時結餘，沒有完成紀錄時顯示尚未結算。
- `npm.cmd run check`、Expo public config、diff check 與 arm64 release build 通過；`0.4.81 (81)` 已覆蓋安裝 Pixel 8a，既有上班中紀錄保留。

### 0.4.80 — 工時流程簡化與摘要修正（2026-07-31）
- 使用者實際打卡後確認公司中間休息不需打卡，因此移除所有休息時間設定、輸入、顯示與扣除；實際工時直接為下班時間減上班時間。
- 修正本月只有上班中紀錄時，`balanceMinutes = 0` 被格式化成「剛好達標」的錯誤。月摘要現在只統計已下班紀錄，沒有完成紀錄時顯示「尚未結算」。
- 上班中狀態改為顯示預計達標時間與剩餘時間；達標後顯示已達標或超過標準多久。
- 每日標準工時保留使用者自訂，入口縮成日期標題旁的精簡按鈕，加入 7:00、7:30、8:00、8:30、9:00 快速選擇。
- 資料庫既有 `break_minutes` 欄位保留以維持備份與 migration 相容，但新紀錄固定寫入 0，計算不再使用該欄位。
- `npm.cmd run check`、Expo public config、diff check 與 arm64 release build 通過；`0.4.80 (80)` 已覆蓋安裝 Pixel 8a，既有上班中紀錄保留，實機確認預計達標時間與精簡標準設定正常顯示。

### 0.4.79 — 工時預設與休息計算 UX（2026-07-31）
- 工時頁新增常駐可見的「工時設定」，使用者可依公司制度自訂每日標準工時與預設休息分鐘。
- 新打卡與補登會套用工時預設；既有紀錄不被批次改寫，單日編輯仍可覆寫當天數值。
- 完成的單日紀錄直接顯示「在班時間－休息＝實際工時」算式，補登／編輯視窗加入捲動，避免休息欄位被鍵盤或小螢幕遮住。
- 「差額／累計差額」改為「工時結餘／本月工時結餘」，數值顯示為多做、少做或剛好達標，並註明不等同加班費或薪資。
- 尚未下班提醒由固定加一小時改為依該筆「標準工時＋休息時間」排程。
- `npm.cmd run check`、Expo public config、diff check 與 arm64 release build 通過；`0.4.79 (79)` 已覆蓋安裝 Pixel 8a，工時設定卡實機顯示正常，未新增或修改使用者工時資料。

### 0.4.78 — Google 日曆回前景同步修正（2026-07-30）
- 使用者回報：在 Google 日曆新增行程後，Lumi 仍顯示上一次結果，直到下一次外部操作後才出現。
- 根因是行事曆頁只在 React Navigation focus／日期改變時讀取；切到 Google 日曆 App 再回來時，畫面仍保持 focus，不會重新查詢 Android Calendar Provider。
- 新增共用 `useForegroundRefresh`：App 從背景回到前景時立即重讀，並於 0.7、2、4.5 秒複查，涵蓋 Google 本機同步稍晚完成的情況。
- 當日行程與月份標點都加入請求序號，只允許最新查詢更新 UI，避免較慢的舊結果反向覆蓋新資料。
- 版號升為 `0.4.78 (78)`；TypeScript、Expo public config 與 diff check 通過。依使用者要求不做額外功能驗收，安裝後由使用者實測 Google 行程同步。

### 0.4.77 — 任務時間與本機提醒（2026-07-30）
- 新增 Expo 55 相容的 `expo-notifications 55.0.25`，提醒由手機本機排程，不需 Google 日曆、帳號或推播伺服器。
- 任務新增 `due_time` 與 `reminder_minutes`；表單可選 09:00／12:00／18:00／21:00，以及不提醒／準時／10 分／30 分／1 小時前。
- 儲存前會檢查日期、時間與提醒是否已過；任務卡及詳情顯示時間與提醒狀態。
- 每筆任務使用固定通知識別碼；建立與編輯會排程或重排，完成與刪除會取消，取消完成時若提醒仍在未來會重新建立。
- 點擊任務通知會直達任務詳情；工時通知會直達工時工作區。
- 上班打卡後，依該筆標準工時加一小時緩衝安排「尚未下班」提醒；下班、補成完整紀錄或刪除工時時取消。
- SQLite 升至 `user_version = 6`；備份 schema 升為 v4，舊 v1–v3 任務會自動補空的時間與提醒欄位。
- `npm.cmd run check`、Expo public config、`git diff --check` 與 arm64 release build 通過；APK 為 `0.4.77 (77)`，SHA-256 `FB3BE583F91532C8CD2AE49A78A2D3848551BE26B7360BA38D2CF76DC9A01A09`。已覆蓋安裝 Pixel 8a，通知權限宣告、任務／工時頻道、冷啟動、程序及 fatal log 檢查正常。
- Android 通知權限刻意延後到使用者第一次儲存有提醒的任務或上班打卡時才詢問；實機目前仍是未授權狀態，待使用者操作系統對話框驗收。

### 0.4.76 — 日曆動畫偶發閃爍修正（2026-07-30）
- 使用者實機確認 v0.4.75 已有交叉淡化，但部分切換仍會偶發閃爍。
- 根因：所有切換共用同一個原生 `Animated.Value`，且前一工作區、新工作區與序號分三次更新；快速操作或動畫收尾交界時，舊透明度可能短暫套到新資料層。
- 每次切換現在建立獨立的 `Animated.Value(0)` 與唯一序號，前一工作區、目標工作區及動畫進度合併成單次狀態更新，不再存在先套新資料再重設透明度的中間幀。
- 前一段動畫會立即停止；完成回呼只有在序號仍是最新時才能移除舊資料層，避免過期回呼覆蓋新切換。
- `npm.cmd run check`、`git diff --check` 與 arm64 release build 通過；APK 為 `0.4.76 (76)`，SHA-256 `1396566BA54417D11CB8D92A0E413A3C18BBE3D83599B400F79064A069AEEE4E`。已覆蓋安裝 Pixel 8a，冷啟動及連續 12 次工作區路徑切換正常，程序存活且未命中 fatal log。

### 0.4.75 — 日曆標點雙層交叉淡化（2026-07-30）
- 使用者確認仍希望上方日曆標點保有動畫，因此不沿用 v0.4.74 的完全靜態切換。
- 改為真正的雙層交叉淡化：舊工作區標點留在原位由 100% 淡至 0%，新工作區標點同時由 0% 淡至 100%。
- 日期、選中狀態、格線及月曆尺寸不參與動畫；圖例使用相同的 180ms ease-in-out 進度，避免先清空再亮起。
- 下方工作區選中指示線的 160ms 輕動畫保留；快速連續切換會停止上一段並以最新工作區重新開始。
- `npm.cmd run check`、`git diff --check` 與 arm64 release build 通過；APK 為 `0.4.75 (75)`，SHA-256 `413D4428787378A5DFD3B863FA359094EF3EC69D26A69875EEEF37E5D63B0860`。已覆蓋安裝 Pixel 8a，冷啟動、程序與 fatal log 檢查正常。

### 0.4.74 — 日曆標點閃爍修正（2026-07-30）
- 使用者實機確認 v0.4.73 的 120ms 整片標點淡入仍像閃爍；42 個日期格同時重設透明度並不適合資訊密集的月曆。
- 日期標點與圖例改為直接、穩定切換，不再套用透明度或位移動畫。
- 小動畫移到下方工作區的選中指示線：160ms 淡入並由短至完整寬度，不影響日期與標點閱讀。
- 後續原則：月曆資料層保持穩定，互動回饋放在頁籤或控制項，不再讓整片資料同步亮滅。
- `npm.cmd run check`、`git diff --check` 與 arm64 release build 通過；APK 為 `0.4.74 (74)`，SHA-256 `224A9FF1B275BC858DB136DEF0D2C687C8A22AB7FCBCAA0FBC519E416370C3DC`。已覆蓋安裝 Pixel 8a，冷啟動、程序與 fatal log 檢查正常。

### 0.4.73 — 月曆標點切換動畫修正（2026-07-30）
- 使用者實機回報工作區切換時，上方日曆動畫看起來不自然。
- 根因：舊標點先等待 90ms 淡出並同步下移，再更換資料做 150ms 淡入；42 個日期格一起位移，且上方標點比下方頁籤慢半拍。
- 改為工作區切換時立即換成正確標點，只對新標點與圖例做 120ms ease-out 淡入。
- 移除日期標點的垂直位移與舊標點退場等待；快速連續切換會停止前一個動畫並直接以最新工作區為準。
- `npm run check`、`git diff --check` 與 arm64 release build 通過；APK 為 `0.4.73 (73)`，SHA-256 `AAA2BDC466268D697BA3BB10BD0AF35BA8B7DE989CFB399A1B6D0C0E7F153FAB`。已覆蓋安裝 Pixel 8a，冷啟動、work deep link、程序與 fatal log 檢查正常。

### 0.4.72 — 工時工作區與情境月曆（2026-07-30）
- 依使用者構想，把下半部擴充為「行事曆｜工時｜財務」三個工作區，保留上方共用月曆。
- 月曆標點與圖例改為跟隨目前工作區：行事曆只顯示任務／Lumi 行程／外部行程，工時顯示上班中／超時／剛好／不足，財務只顯示記帳。
- 切換或左右滑動工作區時，標點與圖例使用短暫淡出、微幅下移再淡入；日期格與整個月曆不重繪跳動。
- 新增工時即時上班／下班打卡、過去日期手動補登、跨午夜下班、休息分鐘、每日標準工時、備註、編輯與刪除。
- 單日顯示有效工時與正負差額；月份顯示完成天數、累計工時與累計差額。第一版不套用任何地區的法定加班或薪資規則。
- SQLite 升至 `user_version = 5`，新增 `work_records`；備份 schema 升為 v3，舊 v1／v2 備份會自動視為沒有工時資料。
- 工時資料納入資料統計、合併／取代備份；AI API Key 排除規則不變。
- `npm run check`、Expo public config、`git diff --check` 與 arm64 release build 通過；APK 為 `0.4.72 (72)`，SHA-256 `808AA2A6CC6FD1288771D4750309BB20DA8F8C9030BDA6E8C4813205F0AC29CB`。已覆蓋安裝 Pixel 8a，既有 DB migration、冷啟動、work deep link、程序與 fatal log 檢查正常。

### 0.4.71 — 行事曆主動健檢第一批改善（2026-07-30）
- 完整健檢已寫入 `memory/calendar_ux_audit_2026-07-30.md`；不再只依使用者點名的單一功能推進。
- 修正完成任務後，Lumi 先前建立的手機日曆全天項目仍殘留；取消完成時可依目前連動設定重新建立。
- 行程表單真正使用既有的開始／結束日期資料，支援跨日與過夜；加入同日／隔天及 30 分／1 小時／2 小時快捷。
- 今天建立行程預設為下一個半小時；任務日期加入今天／明天／無日期，減少手動輸入。
- 單日議程將 Lumi 與外部行程合併後依時間排序，全天優先，並顯示完整開始／結束時間與跨日日期。
- Lumi 行程卡顯示「已寫入手機日曆／僅儲存在 Lumi」；外部日曆讀取失敗時保留本機內容並顯示重試提示。
- 後續優先順序：本機提醒＋任務時間、Schedule／搜尋／快速改期、重複系列、多個顯示日曆與同步重試。
- `npm run check`、Expo public config、`git diff --check` 與 arm64 release build 通過；APK 確認為 `0.4.71 (71)`、Android 7+、arm64-v8a，SHA-256 為 `B5081D1A33BBED82C45F3BEDF315ED2E36838B519A8317D687093EEE92C34F51`。已覆蓋安裝 Pixel 8a，版本、程序及 fatal log 檢查正常。

### 下次優先事項：行事曆完整產品健檢
- 使用者要求不要只逐字實作他提出的單點需求；後續必須從一般使用者的完整流程主動推演、比較成熟產品並找出未被點名的缺口。
- 下次先重新檢查整個行事曆內容模型與操作流程，不把範圍限制在「任務／行程」：涵蓋建立、查看、修改、改期、提醒、重複、搜尋、分類、日／週／月視圖、外部同步、錯誤復原與空狀態。
- 每次提出功能時需一併檢查相鄰情境與後續狀態，例如新增後如何找回、編輯、刪除、同步、備份及跨日顯示；不能等使用者逐項指出。
- 先輸出依影響程度排序的問題與建議，再由使用者確認實作批次；避免只因看到一個例子就把全部注意力鎖在該例子上。

### 0.4.70 — Lumi 原生行程（2026-07-29）
- 補正產品缺口：行事曆「＋」先選任務或行程，不再只有可完成的任務。
- 行程可設定全天／開始結束時間、地點、分類、提醒與備註，並可在 Lumi 編輯或刪除。
- Lumi 行程本地優先保存；日曆連動已開啟時寫入所選手機／Google 日曆，之後才開啟連動也可手動補同步既有任務與行程。
- 同步後的 Lumi 行程以 external event ID 排除外部唯讀清單的重複顯示；刪除只處理 Lumi 自己建立的系統日曆項目。
- 月曆以方點標示 Lumi 行程、空心點標示外部行程；單日議程可編輯 Lumi 行程或開啟外部行程。
- SQLite 升至 `user_version = 4`，新增 `lumi_events`；JSON 備份格式升至 v2 並向下相容舊備份，日曆 ID 與 external event ID 不跨裝置匯出。
- 修正新增／編輯 Modal 內容未卸載可能殘留上一次輸入，以及只有 Lumi 行程時來源篩選不出現的問題。
- `npm run check`、Expo public config、`git diff --check` 與 arm64 release build 已通過；v0.4.70 已覆蓋安裝 Pixel 8a，版本、程序及 fatal log 檢查正常。為避免自動建立真實日曆資料，新增／同步／提醒留給使用者手動驗收。

### 0.4.69 — 全天行程結束日修正（2026-07-29）
- 使用者回報單日全天外部行程會在隔天重複顯示。
- 根因：Android／Google 全天事件以 UTC 日期保存，且 `endDate` 是排除日；轉成本地時間後，結束日午夜變成台灣早上 08:00，原本的時間重疊判斷因此把隔天也算進去。
- 全天事件改以 UTC 年月日比較，採「開始日包含、結束日不包含」；只有有時間的事件才使用本地毫秒時間重疊。
- 月曆標點與單日議程同步使用相同規則，避免畫面判斷不一致。
- 產品決策：Lumi 的「任務」保留可完成、優先度與分類；「提醒」不另建一種內容，後續作為任務／行程的通知設定。需要佔用時間但沒有完成狀態的內容才是「行程」。
- `npm run typecheck`、`git diff --check` 與 arm64 release build 通過；v0.4.69 已覆蓋安裝 Pixel 8a，版本、程序與 fatal log 檢查正常。

### 0.4.68 — 外部行程單日修正與任務分類（2026-07-29）
- 使用者實機回報月曆有外部行程空心標點，但點進當日沒有內容。
- 根因方向：整月標點與單日議程原本分別查詢；Android Calendar Provider 對窄的一天範圍處理全天、跨日或部分重複事件時可能漏回實例。
- 修正為單日先讀同月事件，再以 `eventStart < dayEnd && eventEnd > dayStart` 篩選；跨日事件會在涵蓋的每一天顯示標點。
- 換日期時自動重設來源與任務分類篩選，避免舊篩選讓新日期看似沒有內容。
- 任務分類從研究／學校／申請／生活擴充為工作、學校、研究、申請、生活、健康、家庭、社交、雜務、重要日。
- 支援建立自訂分類與長按移除；已使用分類的任務不因移除選項而改變。分類色彩套用任務卡、月曆標點與單日篩選。
- `npm run typecheck`、`git diff --check`、arm64 release build 通過；v0.4.68 已覆蓋安裝 Pixel 8a，版本、程序與 fatal log 檢查正常。

### 0.4.67 — 手機日曆連動與行事曆 UX（2026-07-29）
- 產品決策：先使用手機系統日曆橋接 Google 日曆，不建立第二套 Google 登入／token 流程；Google 帳號只要已加入手機並開啟日曆同步即可選擇。
- 預設規則：選定日曆後，新的有日期任務自動同步；既有未完成任務不擅自批次寫入，必須由使用者點「同步目前未完成任務」。
- 外部行程只讀顯示，不自動建立 Lumi 任務；Lumi 只更新／刪除自己建立且有 `calendar_event_links` 對應的行程。
- 新增 `expo-calendar ~55.0.17`、Android `READ_CALENDAR`／`WRITE_CALENDAR` 權限與設定畫面；權限只在使用者點連接時要求。
- SQLite migration 升為 v3，新增任務／日曆 event link 表避免重複建立；日曆設定和 link 都視為裝置專屬狀態，不進 JSON 備份。
- 行事曆加入固定六週版面、「今天」快捷鍵、外部行程空心標記、來源圖例，以及全部／任務／行程篩選；外部行程可點回系統日曆。
- 版號同步為 Expo `0.4.67`、Android `versionCode 67`／`versionName 0.4.67`，側欄更新日誌亦已補齊。
- `npm run check`、Expo public config、arm64 release build 與 APK manifest 權限檢查通過；APK 為 `android/app/build/outputs/apk/release/app-release.apk`。
- v0.4.67 APK 已透過 ADB 覆蓋安裝至 Pixel 8a，確認版本為 `0.4.67 (67)`、程序正常運行，冷啟動後未命中 AndroidRuntime／ReactNativeJS／ExpoModulesCore／SQLite fatal error。
- 首次啟動後 READ_CALENDAR／WRITE_CALENDAR 仍為 `granted=false`，確認不會在啟動時擅自索取權限；待使用者進入「日曆連動」手動驗證 Google 日曆清單、建立／改期／刪除同步及拒絕權限狀態。

### 筆記長內容閱讀與安全區修正（2026-07-29）
- 既有筆記改為「先閱讀、再編輯」：打開後顯示純文字閱讀模式，不再自動 focus 輸入框，長內容可由外層 ScrollView 正常上下滑動。
- 閱讀模式新增固定的「關閉／編輯」操作；點「編輯」後才顯示鍵盤與多行輸入框。
- 編輯輸入框固定 240px 高並啟用內部捲動，避免內容持續撐高整張 bottom sheet。
- 編輯時按「取消」會還原原始內容與標籤並回到閱讀模式；新增筆記時按取消則直接關閉。
- 底部操作列移出內容 ScrollView，固定顯示並使用 `useSafeAreaInsets()` 增加底部間距；Modal 加入 `KeyboardAvoidingView`。
- `npm run typecheck`、`git diff --check` 與 arm64 release build 均通過；APK 已覆蓋安裝至 Pixel 8a，冷啟動正常且未命中 AndroidRuntime／ReactNativeJS／SQLite fatal error。
- 為避免自動讀取或截取手機內的真實筆記內容，長內容滑動與鍵盤開關留給使用者手動驗收。
- 使用者已於 Pixel 8a 驗收通過，正式收錄為 v0.4.66。

### 0.4.65 — 深色極簡科技 UI
- 新增 `components/ui/TechIcon.tsx`，直接使用 `react-native-svg` 繪製統一的 1.7px 幾何線框圖示，不依賴容易在 Android 打包失效的 icon font。
- 新增共用 `IconButton`：36px 方形、8px 低圓角、深色表面與細灰邊框，只有必要的按壓回饋，無裝飾性動畫。
- 底部導覽改為 grid／calendar／wallet／check-square／file-text，選中狀態只使用頂部細線與亮度差。
- 首頁快捷鍵改為 activity／command／menu；分類、最近動態與四張模組卡同步套用 SVG 圖示。
- 財務工具列、計算機入口、任務／筆記新增與刪除、時間軸、AI 財務顧問及側邊選單全面統一。
- 保留原有深色配色與功能邏輯，卡片與互動元件收斂為低圓角、扁平且偏科技工具的視覺語言。
- `npm run typecheck`、`git diff --check`、arm64 release APK 均通過；APK 已覆蓋安裝至 Pixel 8a，實機確認首頁 SVG 圖示與導覽正常顯示。
- 首次建置因終端缺少 `JAVA_HOME` 與 Gradle 外掛快取而較慢；可用 JDK 為 `C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot`，後續應直接編 arm64 release。

### 0.4.64 — UX 安全修補
- 換月時同步 `selectedDate` 並處理月底日數；交易新增／編輯可直接修改與驗證日期。
- 修正編輯記帳刪除會出現兩次確認；重置財務改成單一 exclusive transaction。
- 任務日期改為真實年月日驗證，單日任務依高／中／低正確排序，TaskForm 防止連點重複建立。
- 首頁高信心自動儲存後提供 8 秒復原；多筆記帳一律先預覽，分類預覽改用中文類別。
- 任務、行事曆、筆記、財務開始區分讀取錯誤與空資料，提供重試；筆記空內容不再靜默關閉。
- 問 Lumi 顯示最多 250 筆資料的外送範圍，無 Key 時可直達 AI 設定；財務顧問／月度回顧也補資料使用提示。
- 一般 AI 呼叫加入 20 秒 timeout；API Key 取得網址改為可點擊。
- 底部 tab 改用 navigate 避免累積 push 歷史，主要 tab、首頁按鈕、日曆、任務／交易／筆記卡片補無障礙語意。
- `npm run check`、Expo public config、production Hermes export（1240 modules）、arm64 release build 與 `git diff --check` 均通過。
- 最終 APK 已覆蓋安裝至 Pixel 8a；冷啟動成功（339 ms），確認 `0.4.64 (64)`，程序持續運行，未命中 AndroidRuntime／ReactNativeJS／SQLite fatal error。
- 未以自動化點擊手機內的任務、記帳與筆記，避免讀取或改動真實私人資料；互動流程可直接在手機上使用並由使用者驗收。

### 使用者體驗健檢（2026-07-27）
- 以一般使用者的「記錄 → 確認 → 修改 → 找回 → 備份」流程，逐頁檢查首頁、導覽、任務、行事曆、財務、筆記、時間軸、AI 與備份。
- 完整結果：`memory/ux_audit_2026-07-27.md`。
- 最高優先問題：換月後 `selectedDate` 未同步可能讓記帳存錯日；高信心自動分類無 Undo；AI 傳送資料範圍不透明；讀取失敗常被畫面誤呈現成空資料。
- 另確認：編輯記帳刪除會雙重確認；預算與自訂消費分類有程式但沒有可達 UI；任務日期只驗格式、單日優先度排序不正確；筆記清空儲存會靜默關閉。
- 建議下一版先做 v0.4.64「UX 安全修補」，完成資料正確性、Undo、錯誤狀態、表單防連點與基本無障礙，再做新功能。

### 0.4.63 — 備份還原與資料庫 migration
- 新增 `services/backupService.ts`：版本化 JSON 格式，涵蓋 9 張資料表與非敏感 settings。
- API Key 不匯出；匯入「完全取代」時也保留 SecureStore 與 SQLite fallback key。
- 新增「資料與備份」側邊選單：資料筆數、匯出、選檔預覽、合併／取代與二次確認。
- 匯入包在 exclusive transaction，任何錯誤會整批 rollback。
- `services/db.ts` 改成循序 migration runner，最新 `user_version = 2`。
- 安裝 Expo 55 相容的 `expo-file-system`、`expo-document-picker`、`expo-sharing`。
- 修正 `.gitignore` 不應全面忽略 PNG/JPG，避免正式圖片資產再次漏版控。
- 新增 `memory/product_roadmap.md`：v0.5 Lumi 觀察、v0.6 Widget、v0.7 retrieval-first 問答、v0.8 週期與同步，以及技術／上架清單。
- `npm run check`、Expo public config、production Hermes export、arm64 release build 與 `git diff --check` 均通過。
- 最終 APK 已覆蓋安裝至 Pixel 8a；冷啟動成功（354 ms），確認為 `0.4.63 (63)`，程序持續運行，未命中 AndroidRuntime／ReactNativeJS／SQLite fatal error。
- 新增 Expo 原生模組後，原本 Gradle `MaxMetaspaceSize=512m` 曾耗盡；已調整為 1024m，最終 arm64 release build 在 56 秒完成。此電腦可用 JDK 位於 `C:\Users\user\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2`。
- 既有資料庫可正常由舊版啟動至 migration v2；未自動執行「完全取代」，避免測試流程改動手機真實資料。
- 待手動驗證：匯出分享、合併、完全取代與錯誤檔 rollback。
- 待使用者明確允許：連線 npm registry 執行 dependency security audit；目前只保留安裝時的風險提示，不繞過權限送出依賴 metadata。

### 0.4.62 — 穩定性、資料一致性與安全性優化
- 修正 4 個 TypeScript 錯誤，新增 `npm run typecheck` / `npm run check` 品質檢查。
- 智慧分流改為成功儲存後才留下 learning entry；取消不再產生孤兒資料，失敗會回滾並保留輸入文字。
- 記帳無有效金額時禁止確認，服務層拒絕空白任務／筆記與零元交易。
- 「問 Lumi」排除原始 entries，避免與衍生 task / finance / note 重複。
- API Key 改用 `expo-secure-store`；舊 SQLite `ai_config` 首次讀取後自動搬移並刪除。
- OpenRouter 預設由舊 `google/gemma-7b-it:free` 改為 `openrouter/free`，降低單一免費模型下架造成 404 的風險。
- 統一跨類型事件排序的時間解析，修正 UTC 與本地記帳時間混用造成的錯序／跨月漏資料。
- 日期-only 計算改成本地日期，修正台灣凌晨「今天」與任務截止日判斷。
- SQLite 加 schema version 與常用索引；移除重複查詢、未處理載入錯誤與殘留字體 icon。
- Modal 對齊 bottom sheet 規範；修正筆記刪空仍顯示舊預覽、財務重置後日曆未刷新等小問題。
- Expo 設定與 Android 原生版本同步為 0.4.62 / versionCode 62。

---

## 當前狀態 (2026-07-09)

**版號：0.4.61（已 commit + push，local = GitHub `c6fab49`）**

### 0.4.61 — 本月回顧敘事 + 智慧分流來源標示 (2026-07-09)
- 先 sync GitHub：remote 有 `a812575`（記帳去 Z hotfix，未 bump 版號）比 local 新，fast-forward pull 進來（無衝突，改檔不重疊）。
- 本地未 commit 改動一併 commit 成 0.4.61，push 上 GitHub。
- **時間軸「本月回顧」**：新增 `services/narrativeService.ts`，依當月紀錄生成月度敘事，放時間軸頂部（0.4.60 A 下半的 LLM narrative summary，這輪落地）。
- **智慧分流來源標示**：`app/(tabs)/index.tsx` 分類結果顯示「AI 判斷 / 本地判斷」badge；feedback 文字帶來源 tag。用 `sourceRef`（同步）+ `classifySource` state。
- **修「存款」誤記支出**：`services/classificationService.ts` 關鍵字調整。
- `geminiService.ts` 加敘事相關呼叫；`SidebarDrawer.tsx` release notes + VERSION → 0.4.61。
- 下一步：接續 B 行為迴路偵測；widget_plan.md 的 widget/通知/Google 整合仍未動工。

### 記帳「跑到隔天」hotfix (2026-06-26) — 已上 GitHub（`a812575`）
- **問題**：記帳後交易顯示在下一天（使用者回報）。下午/晚上記帳（當地 16:00 後）才會發生。
- **根因**：0.4.51 的「fake-UTC」修法把本地時間組成 ISO 但**結尾仍留 `Z`**（宣告為 UTC）。`TransactionCard.tsx` 的 `formatDate` 用 `new Date(isoStr)` 解析 → 當成 UTC 再轉回本地（+8）→ 日期 +1 天。
- **修**：移除那個假的 `Z`，存純本地時間字串（`new Date()` 解析時當本地）：
  - `services/financeService.ts` `nowISO()`：去掉結尾 `Z`。
  - `app/(tabs)/(calendar-finance)/finance.tsx` `handleSubmit` 的 `timeStr`：去掉結尾 `Z`。
- **注意**：舊資料（已存帶 `Z`）顯示仍會偏一天，需一次性 migration 才修得到（尚未做）。
- **連帶**：CLAUDE.md 寫「時間用 `new Date().toISOString()`」與此衝突（toISOString 帶 Z），財務這塊已改本地時間字串，未來勿再用 toISOString 存財務時間。

### 規劃：桌面 widget + 通知記帳 + Google 整合 (2026-06-26)
- 完整實作計畫見 **`memory/widget_plan.md`**（自包含，實驗室電腦接手用）。
- 順序：Phase 1 桌面 widget（`react-native-android-widget`）→ Phase 2 常駐通知行內記帳（自動分類，重用 `classificationService`）→ Phase 3 Google 整合（Calendar/Tasks 雙向同步＝免費跨裝置同步）。
- 不做：Quick Settings 磚（磚內無法打字）、鎖屏 widget（Android 手機限制）。
- 產品方向定調：**與 Google 整合**而非取代；記帳→Sheets 暫緩。
- 尚未寫任何 widget/通知/整合的 code，僅規劃。

---

## 當前狀態 (2026-06-10)

**版號：0.4.60**

### 0.4.60 — 時間軸 (ABD 路線 A v1：Personal Lifeline UI) (2026-06-10)
- ABD 路線 D（問 Lumi）鍵盤 + 建議條已實機驗過，收工。開始 A。
- 決策：入口走「首頁右上加鈕」（不擠 tab）；v1 只做時間軸 UI，月底 LLM 敘事總結下一輪再加。
- `app/timeline.tsx`：吃 `getEventStream({types:['task','finance','note'], limit:300})`，按日分組（今天/昨天/M月D日）垂直 lifeline：左側 rail（dot + line）+ 卡片（type tag + 時間 + 標題；finance 顯示金額 +/- 與類別；完成任務刪除線）。
- **刻意排除 entry 類**：entries 是原始輸入，每筆衍生 task/note/transaction，全顯示會重複。
- `app/_layout.tsx`：註冊 `timeline` Stack screen。
- `app/(tabs)/index.tsx`：topRow 加 `≣` 鈕 → `/timeline`（排在 `⌕` 左邊）。
- 下一步（A 的下半）：月底 LLM narrative summary（"這個月你過得怎樣"），跨類關聯。之後做 B 行為迴路偵測。

### 0.4.59 — 問 Lumi 鍵盤再修 (header 偏移) (2026-06-08)
- 問題：0.4.57 的 `behavior:'height'` 在 ask.tsx 仍擋住輸入框。
- 根因：ask.tsx 有 **native Stack header**（FinanceAdvisor 是自繪 header 所以沒事），`'height'` 計算未含 header 高度 → KAV 偏移錯。Expo 55 edge-to-edge 強制開啟，加劇。
- 修：`@react-navigation/elements` 的 `useHeaderHeight()` 取精確 header 高度當 `keyboardVerticalOffset`，`behavior` 改 `'padding'`（含 header 場景最穩）。移除沒用到的 `Platform` import。
- APK build 到桌面，走 Discord 傳手機測。

### 0.4.58 — AI 對話頁建議問句常駐 (2026-06-06)
- 需求：問 Lumi / AI 財務分析，一開始有建議選項，開始對話後就消失 → 不知道能問什麼。
- 改：對話開始後（`messages.length > 0`）在輸入欄**上方**顯示橫向可滑 chip 條，隨時可點選送出。空狀態維持原本置中介紹。
- `app/ask.tsx`：複用既有 SUGGESTIONS，加橫向 strip。
- `components/finance/FinanceAdvisor.tsx`：原本只有 1 顆「快速分析」鈕 → 補 4 個建議問句（花最多/可省/異常/省錢建議）；`handleSend` 重構成 `send(text)` 參數版，chip 與送出鈕共用。
- APK 已 build 到桌面，走 Discord 傳手機（非 adb，使用者本人手機未接電腦）。

### 0.4.57 — 問 Lumi 鍵盤修正 (2026-06-05)
- 問題：「問 Lumi」(`app/ask.tsx`) 點輸入框後，Android 鍵盤蓋住輸入框，看不到打的字。
- 根因：`KeyboardAvoidingView` 的 `behavior` 只設了 iOS（`'padding'`），Android 給 `undefined` → 失效。
- 修：對齊 `FinanceAdvisor` 可動的寫法 `behavior={ios?'padding':'height'}`、`keyboardVerticalOffset={0}`。
- 備註：本次只 commit/push，**還沒重 build 推使用者本人手機**（之前那台 42231 是產學測試機，剛好插著被我裝了 Lumi，產學 app `com.chuanen.penpredswitcher` 未受影響）。

### 0.4.56 — 問 Lumi（ABD 差異化路線 D：記憶檢索）(2026-06-04)
ABD 三條差異化路線（見 `project_status.md` / auto-memory `project_differentiation_vision`）正式起步，先做 D。
- **共用基建** `services/eventStreamService.ts`：`getEventStream({start,end,types,query,limit})` → `UnifiedEvent[]`，攤平 tasks/transactions/notes/entries 成統一事件流。timestamp = created_at，task 另存 dueDate。A / B / D 三路線都吃這個，避免重複 SQL。
- **D 問 Lumi** `services/geminiService.ts` 新增 `askLumi(question, history)`：拉 eventStream（limit 250）→ 格式化成「記憶 context」→ 餵 AI 只根據紀錄回答（複用既有多 provider `callAI`，temp 0.3）。
- **UI** `app/ask.tsx`：聊天頁（建議問句 chips + 對話氣泡 + KeyboardAvoidingView）。`app/_layout.tsx` 註冊 `ask` Stack screen。首頁 (`app/(tabs)/index.tsx`) topRow 加放大鏡 `⌕` → `/ask`。
- **更新日誌補齊**：`SidebarDrawer` RELEASES 之前卡在 0.4.53、VERSION 卡 0.4.54，本次補上 0.4.54 / 0.4.55 / 0.4.56，VERSION → 0.4.56。
- 已本地 Gradle build（39s, APK 90 MB）+ `adb install -r` 推上實機（device 42231JEKB12273）。
- **v1 檢索限制**：目前抓最新 250 筆讓 AI 過濾。資料量大時「兩個月前的冷氣」可能落在窗外 → 之後改 query 關鍵字 + 日期窗。
- **下一步**：D 實機測 → A 個人時間軸敘事（吃同一 eventStream）→ B 行為迴路偵測。

### 0.4.55 — API 設定搬進 Sidebar (2026-06-01)
- 新元件：`components/ApiSettings.tsx`。供應商選擇（Gemini / OpenRouter / OpenAI）+ API key 輸入 + 更換 / 移除按鈕 + 取得 key 連結提示。Gemini 列為推薦。
- `SidebarDrawer` 「設定」section 改成內嵌 `<ApiSettings />`，從佔位變成可實際操作 UI。
- `FinanceAdvisor.tsx`：移除 header 的 `⚙` 齒輪按鈕（設定已搬到 sidebar），刪掉相關 `handleKeySettings` / 未用 imports（`Alert`、`removeApiConfig`）。
- 首次設定 UI 仍保留在 FinanceAdvisor 內（needsKey 分支），方便新使用者從顧問頁直接入門。設好後管理走 sidebar。

### 0.4.54 — 首頁右上側邊選單 (2026-06-01)
- 新元件：`components/SidebarDrawer.tsx`。Modal + Animated 從右側滑入（DRAWER_WIDTH = min(320, 螢幕寬 82%)）。
- 首頁 (`app/(tabs)/index.tsx`) 日期文字右側加 `≡` 圓鈕，點開 drawer。
- Drawer 三段：
  - **設定**：佔位（目前 AI 設定還在財務頁 ✧ 按鈕，後續搬過來集中管理）。
  - **更新日誌**：硬編碼 0.4.47–0.4.53 release notes。
  - **關於**：版號 + GitHub 連結 (`Linking.openURL`) + 簡介。
- 後續：設定要把 AI 供應商 / API key 管理 UI 從 FinanceAdvisor 搬進來；資料匯出 / 匯入按鈕加在這裡（對應 v1 上架 blocker）。

### 0.4.53 — Task detail 閃退 hotfix (2026-06-01)
- 問題：0.4.52 後點任務詳情頁立刻閃退。
- 根因：`task/[id].tsx` 在 `(tabs)` 路由群組「外」，但 `CalendarProvider` 只包在 `(tabs)/_layout.tsx`。0.4.52 改 `task/[id].tsx` 用 `useCalendar()` 來叫 `bumpRefresh()` → 找不到 provider → throw。
- 修：把 `CalendarProvider` 升到 root `app/_layout.tsx`，移除 `(tabs)/_layout.tsx` 內的重複 wrapper（避免兩層獨立 state）。

### 0.4.52 — 行事曆 dot 即時刷新 (2026-06-01)
- 問題：新增 / 刪除任務或記帳時，行事曆上的綠點 / 藍點要切換月份再切回來才會更新。
- 根因：`PersistentCalendar` 的 `loadDates` deps 只有 `[year, month]`，沒在 CRUD 後重新跑。
- 修：`CalendarContext` 加 `refreshKey` + `bumpRefresh()`；`PersistentCalendar` deps 加 `refreshKey`；所有 CRUD 入口在動 DB 後呼叫 `bumpRefresh()`：
  - `app/(tabs)/(calendar-finance)/finance.tsx`：create / edit / delete transaction。
  - `app/(tabs)/(calendar-finance)/calendar.tsx`：create / toggle task。
  - `app/task/[id].tsx`：update / delete / toggle complete。
  - `app/(tabs)/tasks.tsx`：create task / toggle complete。
  - `app/(tabs)/index.tsx`：智慧分流 doSave 結束時。
- 順手：`_layout.tsx` 移除沒在用的 `MaterialCommunityIcons` import。

### 0.4.51 — 記帳 timezone 修正 + 刪除確認 + 圖示修 (2026-05-31)
1. **記帳日期 timezone bug**：原本 `new Date().toISOString()` 走 UTC，台灣 UTC+8 在午夜前後、或從行事曆指定其他天時會把記帳算到 UTC 日期而非使用者看到的 local 日期 → 綠點跑掉 / 算到「下一天」。
   - 修：`services/financeService.ts` `nowISO()` 改成把 local 年月日時分秒組成 ISO（fake-UTC，後綴仍 `Z` 但內容是 local）。
   - 修：`app/(tabs)/(calendar-finance)/finance.tsx` `handleSubmit` 無論今天 / 其他天，一律用 `selectedDate + local 時間` 組 `created_at`，移除原本的「今天 → undefined」分支。
   - **注意**：舊資料仍是真 UTC，會顯示在 UTC 日期上；新資料起一致。
2. **記帳刪除按鈕 `?`**：`components/finance/TransactionCard.tsx` 還用 `MaterialCommunityIcons name="close"` → 改 Unicode `×`。
3. **刪除加二次確認**：`handleDelete` 加 `Alert.alert` 確認框，避免誤刪。
4. **任務頁面平行檢查**：任務列表頁沒有直接刪除 UI（刪除走詳情頁，已有 Alert 確認）、`due_date` 用 YYYY-MM-DD（無 timezone bug）、icon 已在 0.4.49 全換 Unicode。**任務面無需修正**。

### 0.4.50 — 筆記新增按鈕 + AI 分類 TASK vs IDEA 修正 (2026-05-29)
1. **筆記頁加新增按鈕**：原本只有「+」新增標籤、沒有獨立新增筆記入口。
   - `app/(tabs)/notes.tsx` 標題右側加 `+` 按鈕 → 開 modal「新增筆記」（內容 + 標籤）。
   - 重用 edit modal：新增 `addingNote` state，modal title / button label 隨 mode 切換。
2. **修 AI 把「會議紀錄」誤判為 TASK**：CLASSIFY_PROMPT 加入關鍵判斷規則「TASK 是未來要做的動作，IDEA 是紀錄/想法」+ 多個對比範例（「明天開會」TASK vs 「會議紀錄」IDEA、「上課筆記」IDEA、「讀書心得」IDEA）。
**Build 方式：** 本地 Gradle build（不靠 EAS）
**環境：** Android Studio JBR 21 + Gradle 8.13
**主分支：** `master`（已合併 `release/v0.4.45`）

### Phase 狀態
- Phase 1（任務 / 月曆）✅
- Phase 4（財務記帳）✅
- Phase 2（智慧分流 + AI）✅ 大致完成
- Phase 5（目標）— 融入筆記標籤
- Phase 3（Dashboard）⬜

### 0.4.45 → 0.4.49 Release 時間軸 (2026-05-29)

**0.4.45** — 5-Tab 巢狀導覽 + Unicode icons + AI fixes（首次 release APK 86.2 MB，4 ABI + Hermes 齊全）。
**0.4.46** — `gemini-1.5-flash` 已從 v1beta API 下架（2025/09）→ 改 `gemini-2.0-flash`；順手修 `setGeminiApiKey` provider hardcode bug。
**0.4.47** — `gemini-2.0-flash` free tier RPD 被砍極低 → 改 `gemini-2.5-flash-lite`（2025/07 stable，free tier 高、1M context、智能更強）。**首次實機驗證通過。**
**0.4.48** — (1) 任務詳情頁加「完成 / 取消完成」按鈕；(2) 記帳編輯 Modal 加「刪除」按鈕；(3) 首頁智慧分流改 AI 優先（`classifyTextWithAI`：6 秒 timeout，無 key / 失敗則 fallback 本地 `classifyWithHabits`；Gemini 用 `responseMimeType: application/json`，OpenAI/OpenRouter 用 `response_format: json_object`）。
**0.4.49** — (1) AI 分類 loading：送出按鈕 swap `ActivityIndicator`；(2) AI 抽 `dueDate`：CLASSIFY_PROMPT 注入今天日期 + 範例，TASK 類別回 `dueDate` (YYYY-MM-DD) → 進行事曆；(3) 修任務打勾 icon `?`：`MaterialCommunityIcons.ttf` 已刪 → MCI 全變問號；`TaskCard` 改自製圓圈 + Unicode `✓`，`index.tsx` 殘留 MCI 全換 Unicode (`↑` / `[v]` / `$` / `!`)。

### 環境變數 / 安裝流程備忘
- adb 路徑：`C:\Users\Brayden\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- 直接安裝：`adb install -r <apk>`（`-r` 保留資料覆蓋升級，因 keystore 相同）。
- Build 必須在 PowerShell 同 session 內設：
  - `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"`
  - `$env:ANDROID_HOME = "C:\Users\Brayden\AppData\Local\Android\Sdk"`
- `android\local.properties` 需寫入 `sdk.dir=C\:\\Users\\Brayden\\AppData\\Local\\Android\\Sdk`。
- `react-native-screens` 的 `R.jar` 鎖檔 → `Stop-Process java,javaw` + 刪 `node_modules\react-native-screens\android\build` 後重跑。
- Release APK 86.2 MB 正常（4 ABI + Hermes + R8 minify）。比舊 debug 180 MB 小是因為 R8 + .so 壓縮。

---

## 先前完成 (2026-05-28 下半場)

### 導覽架構與 UI 重構
- **自製 5-Tab 主導覽** (`CustomTabBar`)：底部「首頁 / 行事曆 / 財務 / 任務 / 筆記」。
- **雙層滑動**：「行事曆」「財務」進入 `(calendar-finance)` 巢狀導覽，`SubTabBar` 切換，`PersistentCalendar` 固定不抖。
- **`hasLoaded` 鎖**：避免切 Tab 重複觸發 `ActivityIndicator` 閃爍。

### 終極 Icon 解決方案 (Kaomoji / Unicode)
- 棄用 `MaterialCommunityIcons`（打包失效）→ 全改 Unicode：Tab `✎ [ ] $ [v] !`，操作 `+ x v > ^ ↻ [=] ✧`，月曆切換 `< >`。
- **注意**：刪 `.ttf` 後仍殘留 MCI 引用會顯示 `?`。0.4.49 已掃掉 TaskCard / index.tsx；finance.tsx / TransactionCard / ModuleCard / CalendarGrid / `_layout.tsx` 可能尚有殘留，看到 `?` 再修。

### Metro Bundler 快取
- 編譯前強制清 `.expo` 否則改的代碼進不去 APK。

---

## 待解決問題

### 財務進階規劃（朋友回饋）
- 儲蓄目標：月存金額 → 從收入扣 → 固定支出扣 → 剩餘比例分配各類上限。
- 收入分類：固定 vs 額外 → 額外可選歸類或存起來。
- 緩衝區：未分配額外收入 → 抵消超標。
- 長期目標：幾月/幾年存多少 → 歷史平均反推月存額。

### Phase 5：目標規劃器（**砍掉**）
- 原 `services/goalService.ts` 計畫不做了。差異化不足。
- 退化為「筆記標籤『目標』」即可。

### 差異化方向：A + B + D（2026-05-29 決策，取代 Phase 3 / 5）
備審導向，市面上沒人做過 + 對使用者有實際價值。三條共用 `eventStreamService` 統一事件流。

- **A — 個人時間軸敘事 (Lifeline)**：tasks/finance/notes/entries 按時序合一 + 月底 LLM narrative summary（"這個月你過得怎樣"）。取代 Phase 3 Dashboard。工時 3–4 天。
- **B — 行為迴路偵測**：本地演算法找週期性 / 連鎖性 / 未完成規律 → 首頁 "Lumi 觀察" card。備審研究角度（可量化準確率）。工時 4–5 天。
- **D — 問 Lumi 任何事**：全文檢索 + AI 整理回答（"兩個月前冷氣多少"）。工時 1–2 天，**最快出成果**。

**建議順序：** D → A → B（簡 → 中 → 難）。或 A 先（UI 先有可丟備審 demo）→ D → B。

詳細見 auto-memory `project_differentiation_vision.md`。

### 換裝置資料遷移（上架 v1 blocker）
SQLite 純本地，使用者換手機 / 重裝 App 會掉所有資料（任務 / 記帳 / 筆記 / entries / AI 學習）。**上架前必須有方案**。候選：
1. **JSON export / import**（最簡單，v1 推薦）— 設定頁「匯出」→ dump 全表 JSON → `expo-sharing` 分享；新裝置「匯入」讀回。
2. iCloud / Google Drive 自動備份 — 平台差異大。
3. 雲端帳號同步（Firebase / Supabase）— UX 最佳，要寫後端、加登入、處理 conflict、付雲端費。
4. QR / Wi-Fi Direct 點對點 — 零後端，實作較複雜。

**策略：** v1 先做 #1（JSON），v2 視反饋加 #3。

---

## 最終目標：雙平台上架 (2026-05-29 決策)

設定最終目標為 **App Store + Google Play 雙平台正式上架**。詳細 blocker 清單見 `project_status.md`。

**現階段不立即動，但每次設計新功能 / 動到 build config / 加外部依賴時，需以「能否雙平台上架」為前提考量**。

短期內仍以本地 Gradle release APK 持續測試新版（debug keystore 簽）。正式上架前再一次性處理 bundle ID + 正式 keystore + iOS EAS build + 隱私政策。


---

# ═══ 早期 Phase 歸檔（原 project_status.md，2026-07-31 併入）═══


已完成 Phase 的歸檔、架構決策、UI 慣例。需要歷史細節時才讀。**新 AI 接手時請務必先閱讀此檔與 `daily_log.md`。**

---

## v0.4.81 — 標準工時＋固定休息制度（2026-07-31）

- 固定休息回歸工時制度設定，不需逐日輸入；預設標準 8:00／休息 60 分，並提供常用快捷。
- 預計達標、下班提醒與完成後有效工時均依標準工時及固定休息計算。
- 儲存制度會套用目前上班中與未來紀錄，已完成紀錄維持原值；月摘要仍只結算已下班資料。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.81 (81)` 已覆蓋安裝 Pixel 8a。

---

## v0.4.80 — 工時流程簡化與摘要修正（2026-07-31）

- 依使用者實際公司流程移除休息時間，實際工時直接以上班到下班計算；舊欄位僅為資料相容保留。
- 月摘要只納入已下班紀錄，沒有完成紀錄時顯示尚未結算，修正上班中卻誤顯示剛好達標。
- 上班中顯示預計達標時間與剩餘時間；標準工時改為頁首精簡入口與常用時數快捷。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.80 (80)` 已覆蓋安裝 Pixel 8a，既有上班中紀錄保留。

---

## v0.4.79 — 工時預設與休息計算 UX（2026-07-31）

- 工時頁新增可見的偏好設定，支援自訂每日標準工時與預設休息分鐘；新打卡／補登自動帶入，單日仍可覆寫。
- 單日完成紀錄顯示休息扣除算式，補登／編輯 bottom sheet 可捲動，休息欄位不再容易被遮住。
- 工時頁以「工時結餘／多做／少做／剛好達標」取代容易和金額混淆的「差額」。
- 尚未下班提醒時間改為該筆標準工時加休息時間，不再固定多加一小時。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.79 (79)` 已覆蓋安裝 Pixel 8a，設定卡實機顯示正常。

---

## v0.4.78 — Google 日曆回前景同步修正（2026-07-30）

- 修正從 Google 行事曆 App 切回 Lumi 時，外部行程可能停留在上一次查詢結果的問題。
- 新增前景恢復後的短期複查機制，讓 Android Calendar Provider 稍晚完成的同步能自動反映。
- 當日列表與月份標點使用請求序號避免舊查詢覆蓋新資料。
- `0.4.78 (78)` 已完成 TypeScript、Expo config 與 diff check；依使用者要求不做額外實機功能測試，由使用者自行驗收同步結果。

---

## v0.4.77 — 任務時間與本機提醒（2026-07-30）

- 新增 `expo-notifications 55.0.25` 與 Android 任務／工時通知頻道；本機提醒不依賴 Google 日曆或網路服務。
- 任務 schema 新增 `due_time`、`reminder_minutes`，建立與編輯支援時間快捷及準時／10 分／30 分／1 小時前提醒。
- 任務提醒以固定 ID 管理，建立、修改、完成、取消完成與刪除均同步排程或取消；通知點擊可直達任務詳情。
- 上班打卡依標準工時加一小時安排尚未下班提醒，下班、完整補登或刪除時取消；通知點擊直達工時頁。
- SQLite 最新版為 v6；備份 schema v4 並將舊備份任務的新增欄位正規化為 `null`。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.77 (77)` 已覆蓋安裝 Pixel 8a，通知權限宣告與兩個頻道存在，冷啟動正常且未命中 fatal error。

---

## v0.4.76 — 日曆動畫偶發閃爍修正（2026-07-30）

- 工作區轉場改為單一 `WorkspaceTransition` 狀態，原子地保存唯一序號、來源、目標及該次專用的 `Animated.Value`。
- 新轉場不再重用上一段原生透明度；舊動畫立即停止，過期完成回呼須通過序號比對才能清理資料層，消除快速切換與收尾交界的競態。
- TypeScript、diff check 與 arm64 release build 通過；`0.4.76 (76)` 已覆蓋安裝 Pixel 8a，冷啟動及連續 12 次工作區路徑切換正常，未命中應用程式 fatal error。

---

## v0.4.75 — 日曆標點雙層交叉淡化（2026-07-30）

- 上方共用月曆恢復動畫，但改用兩個重疊資料層：舊標點淡出與新標點淡入同步進行，不再先清空整片標點。
- 日期、選中框、格線與月曆版面保持靜止；圖例共用 180ms ease-in-out 過渡，工作區指示線動畫維持獨立。
- 快速切換會停止前一段動畫並從目前指定工作區重新交叉淡化，完成後移除舊資料層。
- TypeScript、diff check 與 arm64 release build 通過；`0.4.75 (75)` 已覆蓋安裝 Pixel 8a，冷啟動正常且未命中應用程式 fatal error。

---

## v0.4.74 — 日曆標點閃爍修正（2026-07-30）

- 移除共用月曆日期標點與圖例的整片透明度動畫；切換工作區時直接呈現正確資料，避免資訊區域看起來像閃爍或重畫。
- 動態回饋改放在工作區選中指示線，使用 160ms 淡入與輕微水平展開，日曆本體維持穩定。
- UI 原則補充：資訊密集的月曆資料層不做整批亮滅；動畫應集中在頁籤、按鈕等操作回饋。
- TypeScript、diff check 與 arm64 release build 通過；`0.4.74 (74)` 已覆蓋安裝 Pixel 8a，冷啟動正常且未命中應用程式 fatal error。

---

## v0.4.73 — 月曆標點切換動畫修正（2026-07-30）

- 工作區一切換就立即套用對應的行事曆／工時／財務標點，只對新標點與圖例做 120ms ease-out 淡入。
- 移除原本 90ms 舊標點淡出、日期格標點下移及延後換資料的流程，避免整片閃動與上下工作區不同步。
- TypeScript、diff check 與 arm64 release build 通過；`0.4.73 (73)` 已覆蓋安裝 Pixel 8a，冷啟動及 work deep link 正常，未命中應用程式 fatal error。

---

## v0.4.72 — 工時工作區與情境月曆（2026-07-30）

- 共用月曆下方由兩個工作區擴充為「行事曆｜工時｜財務」；工時歸在時間與財務之間，不冒充任務或一般行程。
- 月曆依目前工作區只顯示相關標點與圖例，切換時以 90ms 淡出＋150ms 淡入及微位移更新，保留極簡科技風且避免整個月曆跳動。
- 工時支援即時上下班、手動補登、跨午夜、休息分鐘、標準工時、備註、修改與刪除；日期格區分上班中、超時、剛好與不足。
- 工時單日卡顯示上下班、進度、實際工時與差額；月摘要顯示完成天數、累計工時及差額。
- SQLite 最新版本升為 `user_version = 5`；備份 schema 升為 v3 並向下相容，新增 `work_records` 的統計、匯出、合併與取代。
- 薪資、法定加班倍率、多段班與 CSV 報表未納入第一版；須先取得實際公司規則與朋友試用回饋。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.72 (72)` 已覆蓋安裝 Pixel 8a，既有 DB 升級與 work deep link 正常，未命中 React Native／Expo／SQLite fatal error。

---

## v0.4.71 — 行事曆主動健檢第一批改善（2026-07-30）

- 依建立、查看、修改、提醒、重複、搜尋、同步與刪除的完整流程重新健檢，結果見 `memory/calendar_ux_audit_2026-07-30.md`。
- 完成任務時移除 Lumi 建立的手機日曆項目，避免已完成內容繼續佔用日曆；取消完成可重新同步。
- Lumi 行程支援開始／結束日期不同的跨日與過夜情境，提供同日／隔天與常用時長快捷。
- 任務提供今天／明天／無日期快捷；今天的新行程預設到下一個半小時。
- Lumi 與外部行程在單日議程合併按時間排列，顯示完整時段、跨日日期、同步狀態與外部讀取錯誤。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.71 (71)` 已覆蓋安裝 Pixel 8a，冷啟動程序正常且未命中 React Native／Expo／SQLite fatal error。

---

## v0.4.70 — Lumi 原生行程（2026-07-29）

- 行事曆新增建立類型選擇：任務保留完成狀態／優先度；行程使用開始結束時間且不需完成。
- 新增行程支援全天、時間、地點、分類、提醒、備註，以及 Lumi 內編輯／刪除。
- 行程先存本機 SQLite，再以 best-effort 寫入選定的手機／Google 日曆；日曆連動設定可補同步既有未來任務與行程。
- 同步的 Lumi 行程以 external event ID 去重，不會同時出現在 Lumi 行程與外部唯讀行程。
- 月曆、單日議程、資料筆數與 JSON 備份都納入行程；裝置 calendar ID 與 external event ID 不進可攜式備份。
- SQLite 最新版本升為 `user_version = 4`；備份 schema 升為 v2，匯入 schema v1 時自動視為沒有 Lumi 行程。
- 提醒採任務／行程的屬性模型，不增加第三種近似資料類型；第一版提醒由連動的手機日曆發出。
- TypeScript、Expo config、diff check 與 arm64 release build 通過；`0.4.70 (70)` 已覆蓋安裝 Pixel 8a，冷啟動程序正常且未命中 AndroidRuntime／ReactNativeJS／ExpoModulesCore／SQLite fatal error。

---

## v0.4.69 — 全天行程時區修正（2026-07-29）

- 修正 Google／Android 全天事件因 UTC 結束時間轉成台灣時間後，在隔天多出標點及內容。
- 全天事件採日期語意：開始日包含、結束日不包含；定時事件才使用本地時間重疊判斷。
- 產品模型確認：提醒是任務或行程上的通知能力，不新增第三種近似資料；任務有完成狀態，行程則有開始／結束時間且不需勾選完成。
- v0.4.69 已覆蓋安裝至 Pixel 8a，冷啟動與 fatal log 檢查正常；全天事件是否只顯示單日待使用者以原行程驗收。

---

## v0.4.68 — 外部行程單日修正與任務分類（2026-07-29）

- 修正月曆已有外部行程標點，點進當日卻讀不到全天、跨日或部分重複事件：單日議程改為取得同月事件實例，再用事件與當日時間重疊篩選。
- 月曆外部行程標點改為涵蓋事件跨越的每一天，不只標記開始日；換日期時來源與分類篩選會回到「全部」，避免殘留篩選造成看似空白。
- 任務由四個固定標籤擴充為十個常用分類：工作、學校、研究、申請、生活、健康、家庭、社交、雜務、重要日。
- 支援自訂任務分類；自訂值存於非敏感 settings 並會進入備份。分類顏色會顯示於任務卡、月曆任務標點與單日分類篩選。
- TypeScript、diff check、arm64 release build 均通過；`0.4.68 (68)` 已覆蓋安裝至 Pixel 8a，冷啟動正常且未命中 AndroidRuntime／ReactNativeJS／ExpoModulesCore／SQLite fatal error。

---

## v0.4.67 — 手機日曆連動與行事曆 UX（2026-07-29）

- 採用 `expo-calendar` 連接手機系統日曆；Android 使用者可選擇已同步到手機的 Google 日曆，不需在 Lumi 再登入一次 Google 或保存 OAuth token。
- 同步規則刻意保持單向：有日期的 Lumi 任務可自動建立／更新日曆行程；外部行程在 Lumi 只讀顯示，不會自動轉成任務。
- Lumi 只刪除自己建立且有 link 紀錄的行程；外部行程不修改、不刪除，也不會送進 AI。
- SQLite 升至 `user_version = 3`，新增 `calendar_event_links` 防止重複建立；日曆 ID、權限與連動 link 屬於裝置狀態，不放進 JSON 備份。
- 新增日曆連動設定、權限說明、可寫入日曆選擇、自動同步開關，以及由使用者主動觸發的「同步目前未完成任務」。
- 月曆固定為六週高度，加入「今天」快捷鍵、科技風換月圖示與任務／外部行程／記帳圖例；單日議程可切換全部、任務或行程，並能開回系統日曆。
- Expo config、TypeScript、arm64 release build 與 APK manifest 驗證通過，產出 `0.4.67 (67)`；APK 已覆蓋安裝至 Pixel 8a，冷啟動與程序狀態正常，未命中 AndroidRuntime／ReactNativeJS／ExpoModulesCore／SQLite fatal error。
- 首次啟動不會主動要求日曆權限；Google 帳號日曆選擇與建立／改期／刪除真實同步仍待使用者手動驗收。

---

## v0.4.66 — 筆記長內容閱讀與安全區（2026-07-29）

- 既有筆記採閱讀優先模式，打開後不再自動 focus 多行輸入框，長內容可正常上下滑動。
- 使用者按「編輯」後才進入輸入狀態；輸入框固定 240px 高並可內部捲動。
- 取消編輯會還原原始內容與標籤；新增筆記取消則直接關閉。
- 底部操作列移出 ScrollView 並套用 safe-area，Modal 使用 KeyboardAvoidingView 處理鍵盤版面。
- typecheck、diff check、arm64 release build 與 Pixel 8a 冷啟動均通過，使用者已實機驗收。

---

## v0.4.65 — 深色極簡科技 UI（2026-07-27）

- 以 `react-native-svg` 自製 `TechIcon` 圖示系統，避開 Android icon font 打包失效問題。
- 新增共用 `IconButton`，統一 36px、8px 低圓角、細邊框與深色表面。
- 重整底部導覽、首頁快捷鍵、模組卡、財務工具列、任務、筆記、時間軸、AI 顧問與側欄圖示。
- 保留原深色配色，不使用可愛元素、霓虹效果或裝飾性動畫；選中狀態只以細線與亮度呈現。
- typecheck、diff check、arm64 release build 均通過，並已於 Pixel 8a 實機確認 SVG 圖示正常。

---

## v0.4.64 — UX 安全修補（2026-07-27）

- 換月同步選取日並防快速連按競態；交易新增／編輯可直接修改與驗證日期。
- 修正記帳雙重刪除確認、任務真實日期驗證與單日優先度排序。
- 智慧輸入新增 8 秒 Undo，多筆記帳強制先預覽；復原採 exclusive transaction。
- 任務、行事曆、筆記、財務及首頁模組開始區分讀取錯誤與空資料，主要表單防連點。
- 問 Lumi 可直達 AI 設定並顯示資料傳送範圍；AI 財務顧問／月度回顧補透明提示，一般 AI 呼叫加入 20 秒 timeout。
- 底部 tab 改用 navigate，主要操作補 accessibility label／state 與較大觸控範圍。
- production Hermes export 1240 modules、arm64 release build、typecheck 均通過。
- 最終 APK 已安裝至 Pixel 8a，確認 `0.4.64 (64)` 冷啟動 339 ms，無 AndroidRuntime／ReactNativeJS／SQLite fatal error。

---

## v0.4.63 — 信任層（2026-07-27）

- 新增「資料與備份」：JSON 匯出、匯入預覽、合併與完全取代。
- API Key 永不寫入備份；完全取代時仍保留 SecureStore／SQLite fallback key。
- 匯入採單一 exclusive transaction，失敗時不留下半套資料。
- SQLite 初始化改為循序 migration，目前最新 `user_version = 2`。
- 完整後續規劃見 `memory/product_roadmap.md`。
- `npm run check`、production Hermes export 與 arm64 release build 已通過。
- 最終 APK 已安裝至 Pixel 8a，確認 `0.4.63 (63)` 可冷啟動（354 ms）、既有 DB 可升級，且無 AndroidRuntime／ReactNativeJS／SQLite fatal error。
- Gradle release build 的 Metaspace 已由 512m 調至 1024m，避免新增 Expo 原生模組後建置耗盡。
- 為避免改動手機真實資料，匯出、合併、完全取代與錯誤檔 rollback 仍列為手動驗證。

---

## 專案概覽

- **Framework**: Expo 55 + React Native 0.83 + TypeScript + Expo Router
- **Database**: SQLite (純本地，不需登入)
- **AI Integration**: OpenRouter / Gemini (使用者自填 API Key)
- **目標平台**：Android（開發中）+ iOS（未 build）→ **最終目標：雙平台正式上架 App Store + Google Play**
- **PRD**：`Lumi_PRD.md`

## 最終目標：雙平台上架 (2026-05-29 決策)

所有架構決策需以雙平台上架為前提。上架前 blocker 清單：

1. Bundle ID `com.anonymous.lumi` → 正式 reverse-domain（Apple 拒收 anonymous）。
2. Debug keystore → 正式 release keystore（Google Play 拒收 debug 簽）。
3. iOS 從未 build → 需 EAS Build 雲端或 macOS Xcode。
4. Google Play 要 `.aab`（`bundleRelease`），不是 APK。
5. 隱私政策 URL（揭露 AI 呼叫送輸入給 Google/OpenAI）。
6. App icon / splash 全尺寸符規。
7. Apple Developer $99/yr + Google Play Console $25。

**規劃順序**：Android internal testing → Apple TestFlight → 雙平台正式發佈。

**政策風險**：AI Key BYOK 可能被 Apple 質疑，預留後端代理 / first-party key 切換點。

**換裝置資料遷移（上架 v1 必做）**：SQLite 純本地，使用者換手機會掉資料。v1 至少要做 JSON export / import（設定頁按鈕 + `expo-sharing`）。v2 視反饋再評估雲端同步（Firebase / Supabase）。

---

## 核心架構與 UI 慣例 (極度重要)

### 導覽架構 (Custom Nested Routing)
由於原生 `MaterialTopTabs` 有字體裁切與佈局問題，我們採用了高度客製化的導覽結構：
1. **外層 (`app/(tabs)/_layout.tsx`)**:
   - 使用自製 `CustomTabBar` 取代預設的 Bottom Tab Bar。
   - 包含 5 個主要入口：首頁(`index`)、行事曆/財務容器(`(calendar-finance)`)、任務(`tasks`)、筆記(`notes`)。
   - **請勿使用負 margin 或 padding 來排版 Tab Bar 文字，請依賴 Flexbox (`alignItems: 'center'`)。**
2. **內層 (`app/(tabs)/(calendar-finance)/_layout.tsx`)**:
   - 包含共用的 `PersistentCalendar` (不會因滑動而重繪)。
   - 使用自製 `SubTabBar` 在「行事曆」與「財務」間切換。

### UI 風格（Dark Minimal Tech）
- **禁用 Icon Font**：Android 實機曾發生 `MaterialCommunityIcons` 字型漏包。圖示一律使用 `components/ui/TechIcon.tsx` 的 `react-native-svg` 幾何線框，不使用 Unicode 假圖示。
- **圖示規格**：一般 18–22px、線寬約 1.7px、圓角端點；選中時可提高至 1.9px，但不使用填滿、發光或彈跳效果。
- **按鈕規格**：優先使用共用 `IconButton`，預設 36px、8px 低圓角、`#121417` 表面與 `#2B2F34` 邊框。
- **視覺原則**：保留深色底與現有語意色；選中狀態只使用細線、邊框或亮度差。不要加入可愛插圖、膠囊化、霓虹漸層或非必要動畫。
- **新增圖示**：先擴充 `TechIconName` 與對應 SVG path，確保全 App 的線條語言一致，不要臨時塞文字代號。

### 資料狀態管理
- **Silent Refresh**: 避免使用 `ActivityIndicator` 造成畫面切換閃爍。在 `useFocusEffect` 中使用 `hasLoaded` 鎖定初始加載，後續切換僅在背景靜默更新 `state`。

---

## 已完成 Phase

### Phase 1 — 日曆 & 任務清單 ✅
- 自製月曆 Grid (`components/shared/CalendarGrid.tsx`)。
- 任務列表 (`app/(tabs)/tasks.tsx`) 支援優先度、標籤、到期日倒數。

### Phase 2 — 智慧分流 & AI 財務顧問 ✅
- `services/geminiService.ts` 負責處理 AI 邏輯。
- 支援 Gemini (`gemini-2.5-flash-lite`，預設) 與 OpenRouter (`openrouter/free` 自動選可用免費模型)。
- **Gemini model 注意**：`gemini-1.5-flash` 已於 2025/09 下架，v1beta API 會回 404。現以 `gemini-2.0-flash` 為穩定免費預設。若再失效，改用 `gemini-flash-latest`。
- AI 財務顧問 (`FinanceAdvisor.tsx`) 實作了鍵盤防擋 (`KeyboardAvoidingView`) 與 API Key 儲存機制。

### Phase 4 — 財務記帳 ✅
- 包含收支明細、圓餅圖統計、手動輸入與計算機功能。

### 筆記模組 (取代 Dashboard) ✅
- `app/(tabs)/notes.tsx` 提供標籤過濾與純文字筆記功能。

---

## 待完成 / 開發中

- 財務進階規劃：儲蓄目標、固定/額外收入分類。

## 差異化方向：A + B + D (2026-05-29 決策)

砍 Phase 3 Dashboard + Phase 5 簡化（退化為筆記標籤「目標」）。改做三條備審導向 + 市場差異化路線：

- **A — 個人時間軸敘事 (Lifeline)**：tasks/finance/notes/entries 按時序合一 + 月底 LLM narrative。取代 Dashboard。
- **B — 行為迴路偵測**：本地演算法找週期/連鎖/未完成規律，AI 翻譯成首頁推送。
- **D — 問 Lumi 任何事**：全文檢索 + AI 整理。最快出成果（1–2 天）。

共用基建：`services/eventStreamService.ts` 統一事件流（避免三條各寫 SQL）。

**建議順序**：D → A → B。詳細見 auto-memory `project_differentiation_vision.md`。
