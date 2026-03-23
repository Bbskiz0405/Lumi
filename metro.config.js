const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const emptyModule = config.resolver.emptyModulePath;
const minimalMCI = path.resolve(__dirname, 'assets/mci-minimal.json');
const expoSymbolsMock = path.resolve(__dirname, 'assets/expo-symbols-mock.js');
const originalResolveRequest = config.resolver.resolveRequest;

// 不需要的 glyph maps
const UNUSED_GLYPHMAPS = [
  'AntDesign', 'Entypo', 'EvilIcons', 'Feather', 'Fontisto',
  'FontAwesome', 'FontAwesome5Free', 'FontAwesome5Free_meta',
  'FontAwesome6Free', 'FontAwesome6Free_meta',
  'Foundation', 'Ionicons', 'MaterialIcons',
  'Octicons', 'SimpleLineIcons', 'Zocial',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // mock react-devtools-core, react-dom
  if (moduleName === 'react-devtools-core' ||
      moduleName.startsWith('react-devtools-core/') ||
      moduleName === 'react-dom' ||
      moduleName.startsWith('react-dom/')) {
    return { filePath: emptyModule, type: 'sourceFile' };
  }
  // expo-symbols: 換成有 stub 的 mock，避免 expo-router 出錯
  if (moduleName === 'expo-symbols' ||
      moduleName.startsWith('expo-symbols/')) {
    return { filePath: expoSymbolsMock, type: 'sourceFile' };
  }
  // MaterialCommunityIcons 換成精簡版
  if (moduleName.endsWith('/glyphmaps/MaterialCommunityIcons.json') ||
      moduleName.endsWith('/glyphmaps/MaterialCommunityIcons')) {
    return { filePath: minimalMCI, type: 'sourceFile' };
  }
  // 不需要的 glyph maps
  for (const name of UNUSED_GLYPHMAPS) {
    if (moduleName.endsWith(`/glyphmaps/${name}.json`) ||
        moduleName.endsWith(`/glyphmaps/${name}`)) {
      return { filePath: emptyModule, type: 'sourceFile' };
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
