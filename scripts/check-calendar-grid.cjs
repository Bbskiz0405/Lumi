// Isolated render-tree checks, no device or user data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const filename = path.resolve(__dirname, '../components/shared/CalendarGrid.tsx');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React},
}).outputText, {exports:exportsObject, require(name) {
  if(name === 'react') return {default:React};
  if(name === 'react-native') return {View:'View',Text:'Text',TouchableOpacity:'TouchableOpacity',Animated:{View:'AnimatedView'},StyleSheet:{create:value=>value}};
  if(name.includes('CalendarContext')) return {useCalendar:()=>({year:2026,month:8,selectedDate:'2026-09-22'})};
  if(name.includes('utils/date')) return {toLocalDateString:()=> '2026-09-22'};
  if(name.includes('taskTags')) return {getTaskTagMeta:()=>({color:'#FF9944'})};
  if(name.includes('TechIcon')) return {default:'TechIcon'};
  throw Error('Unexpected import '+name);
}});
function flatten(node) {
  if(Array.isArray(node)) return node.flatMap(flatten);
  if(!node || typeof node !== 'object') return [node];
  return [node,...flatten(node.props?.children)];
}
const props = {taskDates:new Set(['2026-09-22']),eventDates:new Set(['2026-09-22']),anniversaryDates:new Set(['2026-09-22']),externalDates:new Set(['2026-09-22'])};
for(const previousMode of [undefined,'work','bookkeeping']) {
  const nodes = flatten(exportsObject.default({...props,mode:'calendar',previousMode}));
  for(const legend of ['任務','Lumi 行程','紀念日','外部行程','上班中','有記帳']) assert.ok(!nodes.includes(legend));
  assert.ok(!nodes.some(node=>node?.props?.style?.height===18)); // no empty legend strip
  assert.ok(nodes.some(node=>node?.props?.accessibilityLabel?.includes('2026年9月22日，有任務，有 Lumi 行程，有紀念日，有外部行程')));
  assert.ok(nodes.some(node=>Array.isArray(node?.props?.style) && node.props.style.some(style=>style?.backgroundColor==='#FF88BB')));
}
assert.ok(flatten(exportsObject.default({mode:'work'})).includes('上班中'));
assert.ok(flatten(exportsObject.default({mode:'bookkeeping'})).includes('有記帳'));
console.log('PASS calendar legend and strip removed; date markers, accessible labels, transitions and other modes preserved');
