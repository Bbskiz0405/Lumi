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
import DataSettings from './DataSettings';
import TechIcon from './ui/TechIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(320, Math.round(SCREEN_WIDTH * 0.82));

type Section = 'menu' | 'settings' | 'data' | 'changelog' | 'about';

interface ReleaseEntry {
  version: string;
  date: string;
  notes: string[];
}

const RELEASES: ReleaseEntry[] = [
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

const VERSION = '0.4.65';
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
