// Render the post-conversation state without native devices or API requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const filename = path.resolve(__dirname, '../app/ask.tsx');
const exportsObject = {};
let stateIndex = 0;
const mockReact = {default:React,useRef:()=>({current:null}),useCallback:fn=>fn,
  useState:initial=>[stateIndex++ === 0 ? [{role:'user',text:'test'}] : initial,()=>{}]};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename,'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React},
}).outputText,{exports:exportsObject,require(name) {
  if(name==='react') return mockReact;
  if(name==='react-native') return {...Object.fromEntries(['View','Text','TextInput','TouchableOpacity','ScrollView','ActivityIndicator','KeyboardAvoidingView'].map(key=>[key,key])),StyleSheet:{create:v=>v}};
  if(name==='expo-router') return {useFocusEffect:()=>{},useRouter:()=>({})};
  if(name==='react-native-safe-area-context') return {SafeAreaView:'SafeAreaView'};
  if(name==='@react-navigation/elements') return {useHeaderHeight:()=>64};
  if(name.includes('geminiService')) return {};
  throw Error('Unexpected dependency '+name);
}});
function flatten(node) {
  if(Array.isArray(node)) return node.flatMap(flatten);
  if(!node || typeof node!=='object') return [];
  return [node,...flatten(node.props?.children)];
}
const nodes=flatten(exportsObject.default());
const strip=nodes.find(node=>node.type==='ScrollView' && node.props.horizontal);
assert.ok(strip,'post-conversation suggestion strip exists');
assert.equal(strip.props.style.flexGrow,0);
assert.equal(strip.props.style.flexShrink,0);
assert.equal(strip.props.style.maxHeight,undefined);
assert.equal(strip.props.style.height,undefined);
assert.equal(strip.props.keyboardShouldPersistTaps,'handled');
const chips=flatten(strip).filter(node=>node.type==='TouchableOpacity');
assert.equal(chips.length,4);
for(const chip of chips) {
  assert.ok(chip.props.style.minHeight>=44);
  assert.equal(chip.props.children.props.style.lineHeight,20);
  assert.equal(typeof chip.props.onPress,'function');
}
console.log('PASS post-conversation quick questions have intrinsic non-shrinking height, readable line height and intact actions');
