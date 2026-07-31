import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiSettings from './ApiSettings';
import CalendarSettings from './CalendarSettings';
import DataSettings from './DataSettings';
import TechIcon from './ui/TechIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(320, Math.round(SCREEN_WIDTH * 0.82));

type Section = 'menu' | 'settings' | 'calendar' | 'data' | 'changelog' | 'about';

interface ReleaseEntry {
  version: string;
  date: string;
  notes: string[];
}

const RELEASES: ReleaseEntry[] = [
  {
    version: '0.4.81',
    date: '2026-07-31',
    notes: [
      '固定休息回歸公司制度設定，只需設定一次，不必每天輸入',
      '預計達標與下班提醒依標準工時加固定休息計算，有效工時於下班後扣除',
      '儲存制度時同步套用目前上班中紀錄，月摘要仍只結算已下班資料',
    ],
  },
  {
    version: '0.4.80',
    date: '2026-07-31',
    notes: [
      '依實際打卡流程移除休息時間，實際工時直接以上班到下班計算',
      '修正只有上班中紀錄時，月摘要將零結餘誤顯示為剛好達標',
      '上班中顯示預計達標時間與剩餘時間，標準工時改為精簡快速設定',
    ],
  },
  {
    version: '0.4.79',
    date: '2026-07-31',
    notes: [
      '工時頁新增可見的工時設定，可自訂每日標準工時與預設休息分鐘',
      '之後的打卡與補登會自動帶入預設值，單日紀錄仍可另外調整',
      '休息扣除顯示計算式，「差額」改為較清楚的工時結餘與多做／少做',
    ],
  },
  {
    version: '0.4.78',
    date: '2026-07-30',
    notes: [
      '修正從 Google 行事曆切回 Lumi 後，外部行程可能仍停在上一次同步結果',
      '回到前景後會短暫自動複查，涵蓋 Android 日曆資料稍晚寫入的情況',
      '避免較慢的舊查詢覆蓋最新結果，日期標點與當日行程會一起更新',
    ],
  },
  {
    version: '0.4.77',
    date: '2026-07-30',
    notes: [
      '任務可設定具體時間與準時、10 分、30 分或 1 小時前的本機提醒',
      '編輯、完成與刪除任務會同步重排或取消提醒，不依賴 Google 日曆',
      '上班打卡後依標準工時加一小時提醒尚未下班，完成下班時自動取消',
    ],
  },
  {
    version: '0.4.76',
    date: '2026-07-30',
    notes: [
      '每次工作區切換改用獨立動畫進度，避免上一段透明度偶爾閃入新畫面',
      '工作區、前一工作區與動畫進度一次更新，快速切換也不產生中間幀',
    ],
  },
  {
    version: '0.4.75',
    date: '2026-07-30',
    notes: [
      '行事曆工作區改用雙層交叉淡化，舊標點淡出時新標點同步淡入',
      '日期、格線與月曆位置保持固定，圖例跟隨相同的 180ms 過渡',
    ],
  },
  {
    version: '0.4.74',
    date: '2026-07-30',
    notes: [
      '移除共用月曆標點與圖例的整片淡入，切換時不再像畫面閃爍',
      '小動畫改放在工作區選中指示線，不干擾日期與標點閱讀',
    ],
  },
  {
    version: '0.4.73',
    date: '2026-07-30',
    notes: [
      '簡化行事曆工作區切換動畫，標點立即切換後只做 120ms 淡入',
      '移除整片日期標點上下位移與舊標點延遲退場，快速滑動時不再閃動',
    ],
  },
  {
    version: '0.4.72',
    date: '2026-07-30',
    notes: [
      '下半部新增「工時」工作區，可即時上下班打卡或手動補登與修正',
      '自動計算休息後工時、每日標準差額，以及當月完成天數、累計工時與差額',
      '共用月曆依行事曆／工時／財務工作區切換標點與圖例，不再一次混放所有資料',
      '工作區切換時，月曆標點會以短暫淡出與位移平順更新',
      '工時資料納入 SQLite migration 與版本化 JSON 備份',
    ],
  },
  {
    version: '0.4.71',
    date: '2026-07-30',
    notes: [
      '行程支援跨日與過夜，可快速設為同日、隔天及 30 分／1 小時／2 小時',
      '今天建立行程會預設到下一個半小時；任務可快速選今天、明天或無日期',
      'Lumi 與外部行程合併按時間排列，並完整顯示開始與結束時間',
      '完成任務會移除 Lumi 建立的手機日曆項目；行程卡顯示是否已寫入手機日曆',
      '外部日曆讀取失敗不再假裝沒有資料，會保留 Lumi 內容並提供重試',
    ],
  },
  {
    version: '0.4.70',
    date: '2026-07-29',
    notes: [
      '行事曆新增「任務／行程」選擇，不再只能建立任務',
      'Lumi 行程支援全天或時間、地點、分類、提醒，以及編輯與刪除',
      '行程可同步到選定的手機／Google 日曆；既有行程也可從設定手動補同步',
      '月曆與單日議程分開標示 Lumi 行程、外部行程與任務，備份亦納入行程資料',
    ],
  },
  {
    version: '0.4.69',
    date: '2026-07-29',
    notes: [
      '修正單日全天外部行程因 UTC 與本地時區換算而被多顯示到隔天',
      '全天行程改用開始日包含、結束日不包含的日期規則，月曆標點與單日內容一致',
    ],
  },
  {
    version: '0.4.68',
    date: '2026-07-29',
    notes: [
      '修正月曆顯示外部行程標點，但單日議程看不到全天、跨日或重複行程',
      '任務分類擴充為工作、學校、研究、申請、生活、健康、家庭、社交、雜務與重要日',
      '支援建立與移除自訂分類，任務卡、月曆標點及單日篩選會沿用分類色彩',
    ],
  },
  {
    version: '0.4.67',
    date: '2026-07-29',
    notes: [
      '新增手機日曆連動，可選擇 Google 日曆並自動同步有日期的 Lumi 任務',
      '外部行程可在 Lumi 單日議程中查看，但不會自動轉成任務或送給 AI',
      '月曆加入今天快捷鍵、固定六週版面、來源圖例與任務／行程篩選',
      '同步關係獨立記錄，避免重複建立；刪除任務時只移除 Lumi 建立的行程',
    ],
  },
  {
    version: '0.4.66',
    date: '2026-07-29',
    notes: [
      '既有筆記改為先閱讀、再編輯，長內容上下滑動不再被輸入手勢接管',
      '編輯框使用固定高度與內部捲動，避免長內容撐開整張介面',
      '底部操作列固定在安全區上方，並改善鍵盤開啟時的版面',
      '取消編輯會還原原始內容與標籤，不會留下未儲存變更',
    ],
  },
  {
    version: '0.4.65',
    date: '2026-07-27',
    notes: [
      '全 App 改用自製 SVG 線框圖示，不再依賴圖示字型或 Unicode 代號',
      '底部導覽、首頁快捷鍵與模組卡統一為深色極簡科技風',
      '財務、任務、筆記、時間軸、AI 顧問與側欄操作圖示全面一致',
      '按鈕改為低圓角幾何造型，保留原本深色配色且不加入裝飾動畫',
    ],
  },
  {
    version: '0.4.64',
    date: '2026-07-27',
    notes: [
      'UX 安全修補：換月同步選取日，記帳可修改日期，刪除只確認一次',
      '智慧輸入新增 8 秒復原，多筆記帳改為先預覽',
      '任務／筆記／財務新增錯誤與重試狀態，表單防止連點',
      'AI 功能明確顯示資料傳送範圍，並加入逾時與設定入口',
      '補齊主要操作的無障礙標籤與觸控範圍',
    ],
  },
  {
    version: '0.4.63',
    date: '2026-07-27',
    notes: [
      '新增 JSON 備份與還原：匯入前預覽，可選合併或完全取代',
      'API Key 不會寫入備份，完全取代時也會保留',
      '資料庫改為逐版 migration，匯入失敗會整批回滾',
    ],
  },
  {
    version: '0.4.62',
    date: '2026-07-27',
    notes: [
      '穩定性優化：修正取消分類留下髒資料、零元記帳與跨類型時間排序',
      'API Key 改存系統安全儲存，舊設定會自動遷移',
      '修正時區、載入卡住、殘留字體圖示與多項小問題',
    ],
  },
  {
    version: '0.4.61',
    date: '2026-06-11',
    notes: [
      '時間軸頂部加「本月回顧」：Lumi 根據當月紀錄寫一段月度敘事',
      '智慧分流顯示「AI 判斷 / 本地判斷」來源標示',
      '修正「存款」被誤記成支出',
    ],
  },
  {
    version: '0.4.60',
    date: '2026-06-10',
    notes: ['新功能「時間軸」：首頁右上快捷鍵，把任務／消費／筆記按時序串成一條 lifeline'],
  },
  {
    version: '0.4.59',
    date: '2026-06-08',
    notes: ['再修「問 Lumi」鍵盤蓋輸入框（用 header 高度精算偏移）'],
  },
  {
    version: '0.4.58',
    date: '2026-06-06',
    notes: ['問 Lumi / AI 財務分析：對話開始後輸入欄上方保留建議問句，隨時可點選'],
  },
  {
    version: '0.4.57',
    date: '2026-06-05',
    notes: ['修「問 Lumi」鍵盤蓋住輸入框（Android）'],
  },
  {
    version: '0.4.56',
    date: '2026-06-04',
    notes: [
      '新功能「問 Lumi」：首頁右上快捷鍵，用自然語言問你的任務／記帳／筆記紀錄',
      '新增統一事件流基建（eventStreamService）',
    ],
  },
  {
    version: '0.4.55',
    date: '2026-06-01',
    notes: ['API 設定搬進側邊選單（供應商選擇 + key 管理）'],
  },
  {
    version: '0.4.54',
    date: '2026-06-01',
    notes: ['首頁右上側邊選單（設定 / 更新日誌 / 關於）'],
  },
  {
    version: '0.4.53',
    date: '2026-06-01',
    notes: ['修任務詳情頁閃退（CalendarProvider 升到 root layout）'],
  },
  {
    version: '0.4.52',
    date: '2026-06-01',
    notes: ['行事曆綠/藍點即時刷新（CRUD 後立即更新，不需切月份）'],
  },
  {
    version: '0.4.51',
    date: '2026-05-31',
    notes: [
      '記帳 timezone 修正（從行事曆新增不再算到下一天）',
      '記帳刪除按鈕 ?  → ×',
      '刪除加二次確認',
    ],
  },
  {
    version: '0.4.50',
    date: '2026-05-29',
    notes: [
      '筆記頁新增「+」新增筆記按鈕',
      'AI 分類：「會議紀錄」不再誤判為任務',
    ],
  },
  {
    version: '0.4.49',
    date: '2026-05-29',
    notes: [
      'AI 分類加 loading 動畫',
      'AI 自動抽日期（「5/30 要出去」→ 進行事曆）',
      '修任務打勾 icon 顯示 ?',
    ],
  },
  {
    version: '0.4.48',
    date: '2026-05-29',
    notes: [
      '任務詳情加「完成」按鈕',
      '記帳編輯加「刪除」按鈕',
      '首頁分類改 AI 優先（無 key 才用本地）',
    ],
  },
  {
    version: '0.4.47',
    date: '2026-05-29',
    notes: ['Gemini 預設模型改 gemini-2.5-flash-lite（free tier 額度更高）'],
  },
];

const VERSION = '0.4.81';
const GITHUB_URL = 'https://github.com/Bbskiz0405/Lumi';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SidebarDrawer({ visible, onClose }: Props) {
  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [section, setSection] = useState<Section>('menu');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setMounted(false);
        setSection('menu');
      });
    }
  }, [visible]);

  function handleClose() {
    onClose();
  }

  function openLink(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <View style={styles.header}>
            {section !== 'menu' ? (
              <TouchableOpacity onPress={() => setSection('menu')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <TechIcon name="chevron-left" size={20} color="#888" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
            <Text style={styles.headerTitle}>
              {section === 'menu' && 'Lumi'}
              {section === 'settings' && '設定'}
              {section === 'calendar' && '日曆連動'}
              {section === 'data' && '資料與備份'}
              {section === 'changelog' && '更新日誌'}
              {section === 'about' && '關於'}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <TechIcon name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {section === 'menu' && (
            <View style={styles.menuList}>
              <TouchableOpacity style={styles.menuItem} onPress={() => setSection('settings')}>
                <View style={styles.menuIcon}><TechIcon name="settings" size={18} color="#888" /></View>
                <Text style={styles.menuLabel}>AI 設定</Text>
                <TechIcon name="chevron-right" size={16} color="#444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => setSection('calendar')}>
                <View style={styles.menuIcon}><TechIcon name="calendar" size={18} color="#888" /></View>
                <Text style={styles.menuLabel}>日曆連動</Text>
                <TechIcon name="chevron-right" size={16} color="#444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => setSection('data')}>
                <View style={styles.menuIcon}><TechIcon name="database" size={18} color="#888" /></View>
                <Text style={styles.menuLabel}>資料與備份</Text>
                <TechIcon name="chevron-right" size={16} color="#444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => setSection('changelog')}>
                <View style={styles.menuIcon}><TechIcon name="file-text" size={18} color="#888" /></View>
                <Text style={styles.menuLabel}>更新日誌</Text>
                <TechIcon name="chevron-right" size={16} color="#444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => setSection('about')}>
                <View style={styles.menuIcon}><TechIcon name="info" size={18} color="#888" /></View>
                <Text style={styles.menuLabel}>關於 Lumi</Text>
                <TechIcon name="chevron-right" size={16} color="#444" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <Text style={styles.footerText}>v{VERSION}</Text>
            </View>
          )}

          {section === 'settings' && (
            <View style={{ flex: 1 }}>
              <ApiSettings />
            </View>
          )}

          {section === 'calendar' && (
            <View style={{ flex: 1 }}>
              <CalendarSettings />
            </View>
          )}

          {section === 'data' && (
            <View style={{ flex: 1 }}>
              <DataSettings />
            </View>
          )}

          {section === 'changelog' && (
            <ScrollView contentContainerStyle={styles.contentPad}>
              {RELEASES.map(r => (
                <View key={r.version} style={styles.releaseCard}>
                  <View style={styles.releaseHead}>
                    <Text style={styles.releaseVersion}>v{r.version}</Text>
                    <Text style={styles.releaseDate}>{r.date}</Text>
                  </View>
                  {r.notes.map((note, i) => (
                    <Text key={i} style={styles.releaseNote}>· {note}</Text>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          {section === 'about' && (
            <ScrollView contentContainerStyle={styles.contentPad}>
              <Text style={styles.aboutBrand}>Lumi</Text>
              <Text style={styles.aboutVersion}>v{VERSION}</Text>
              <Text style={styles.aboutBlurb}>
                極低摩擦的個人管理 App。一個輸入框寫所有東西，AI 自動分類到任務、記帳、筆記。
              </Text>

              <View style={styles.subDivider} />

              <TouchableOpacity style={styles.linkBtn} onPress={() => openLink(GITHUB_URL)}>
                <Text style={styles.linkText}>GitHub 原始碼</Text>
                <TechIcon name="chevron-right" size={16} color="#444" />
              </TouchableOpacity>

              <View style={styles.subDivider} />

              <Text style={styles.helpText}>
                Expo + React Native + SQLite + Gemini / OpenRouter / OpenAI。本地優先、不需登入。
              </Text>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#111111',
    borderLeftWidth: 1,
    borderLeftColor: '#252525',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '300', letterSpacing: 2 },
  divider: { height: 1, backgroundColor: '#252525' },

  menuList: { flex: 1, paddingTop: 12 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 24,
    alignItems: 'center',
  },
  menuLabel: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '300', marginLeft: 12 },
  footerText: { color: '#333', fontSize: 11, textAlign: 'center', paddingVertical: 16 },

  contentPad: { padding: 20, paddingBottom: 40 },
  subTitle: { color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  helpText: { color: '#666', fontSize: 13, fontWeight: '300', lineHeight: 20 },
  subDivider: { height: 1, backgroundColor: '#252525', marginVertical: 20 },

  releaseCard: { marginBottom: 18 },
  releaseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  releaseVersion: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  releaseDate: { color: '#555', fontSize: 11 },
  releaseNote: { color: '#999', fontSize: 12, fontWeight: '300', lineHeight: 20, marginBottom: 2 },

  aboutBrand: { color: '#FFFFFF', fontSize: 28, fontWeight: '200', letterSpacing: 4, marginBottom: 4 },
  aboutVersion: { color: '#555', fontSize: 13, marginBottom: 16 },
  aboutBlurb: { color: '#888', fontSize: 13, fontWeight: '300', lineHeight: 22 },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  linkText: { color: '#88AAFF', fontSize: 14, fontWeight: '300' },
});
