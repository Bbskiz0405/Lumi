// Isolated render-tree checks for module insight editing, no device or user data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function load(relative, stubs) {
  const exportsObject = {};
  const filename = path.resolve(__dirname, '..', relative);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020},
  }).outputText, {exports:exportsObject, require(name) {
    if(name in stubs) return stubs[name];
    throw Error('Unexpected import '+name);
  }});
  return exportsObject;
}
const insightService = load('services/trackerInsightService.ts', {});
const Editor = load('components/TrackerDefinitionEditor.tsx', {
  react:{default:React},
  'react-native':{View:'View',Text:'Text',TextInput:'TextInput',TouchableOpacity:'TouchableOpacity',StyleSheet:{create:value=>value}},
  '../services/trackerModuleService':{FIELD_TYPE_LABELS:{text:'文字',number:'數字',date:'日期',select:'單選'}},
  '../services/trackerInsightService':insightService,
}).default;

function flatten(node) {
  if(Array.isArray(node)) return node.flatMap(flatten);
  if(!node || typeof node !== 'object') return [node];
  return [node,...flatten(node.props?.children)];
}
const text = node => flatten(node.props?.children).filter(item => typeof item === 'string' || typeof item === 'number').join('');
const press = (nodes, label) => {
  const target = nodes.find(node => node?.type === 'TouchableOpacity' && text(node) === label);
  assert.ok(target, 'missing button '+label);
  target.props.onPress();
};

const period = {
  name:'月經紀錄', description:'',
  fields:[
    {key:'start_date',label:'開始日',type:'date',required:true},
    {key:'end_date',label:'結束日',type:'date',required:false},
    {key:'flow',label:'經血量',type:'select',required:false,options:['少','中','多']},
  ],
  insights:[
    {type:'cycle',label:'下次月經',field:'start_date',offsets:[{label:'排卵日',from:-14,to:-14}]},
    {type:'duration',label:'經期天數',start:'start_date',end:'end_date'},
  ],
};
let changed;
const render = (value, extra = {}) => flatten(Editor({value, onChange:next => { changed = JSON.parse(JSON.stringify(next)); }, ...extra}));

let nodes = render(period);
const strings = nodes.filter(item => typeof item === 'string').join('|');
const buttons = nodes.filter(node => node?.type === 'TouchableOpacity').map(text);
for(const expected of ['推算','週期推算','持續天數','前 14 天']) assert.ok(strings.includes(expected), expected);
for(const expected of ['＋ 預測區間','＋ 週期推算','＋ 持續天數']) assert.ok(buttons.includes(expected), expected);
assert.ok(!buttons.includes('＋ 數字趨勢')); // no number field to trend
assert.match(strings, /排卵日＝預測日前 14 天/);

press(nodes, '＋'); // "from" stepper drags "to" along so the range never inverts
assert.deepEqual(changed.insights[0].offsets[0], {label:'排卵日',from:-13,to:-13});
nodes.filter(node => node?.type === 'TouchableOpacity' && text(node) === '＋')[1].props.onPress();
assert.deepEqual(changed.insights[0].offsets[0], {label:'排卵日',from:-14,to:-13});
press(nodes, '−');
assert.deepEqual(changed.insights[0].offsets[0], {label:'排卵日',from:-15,to:-14});
press(nodes, '移除區間');
assert.equal(changed.insights[0].offsets.length, 0);

press(nodes, '前 1 天');
assert.equal(changed.insights[0].remindDaysBefore, 1);
assert.ok(strings.includes('鎖定畫面不顯示內容'));
const reminded = render({...period, insights:[{...period.insights[0], remindDaysBefore:1}, period.insights[1]]});
assert.ok(reminded.some(node => node?.type === 'TouchableOpacity' && text(node) === '前 1 天' && node.props.accessibilityState.selected));
press(reminded, '不提醒');
assert.ok(!('remindDaysBefore' in changed.insights[0]));
assert.equal(reminded.filter(node => node?.type === 'TouchableOpacity' && text(node) === '不提醒').length, 1); // cycle only

// Removing a referenced date field drops dependent insights instead of leaving a broken preview.
const removeButtons = nodes.filter(node => node?.type === 'TouchableOpacity' && text(node) === '移除欄位');
removeButtons[1].props.onPress();
assert.deepEqual(changed.insights.map(insight => insight.type), ['cycle']);
removeButtons[0].props.onPress();
assert.deepEqual(changed.insights, []);

// Existing modules keep structure locked but may still add insights.
nodes = render({...period, insights:[]}, {existing:true});
assert.ok(!nodes.some(node => node?.type === 'TouchableOpacity' && text(node) === '移除欄位'));
press(nodes, '＋ 週期推算');
assert.deepEqual(changed.insights, [{type:'cycle',label:'下次預測',field:'start_date',offsets:[]}]);
for(const insight of changed.insights) assert.ok(insightService.describeTrackerInsight(insight, period.fields).includes('開始日'));

nodes = render({...period, insights:Array(4).fill(period.insights[1])});
assert.ok(!nodes.some(node => node?.type === 'TouchableOpacity' && text(node).startsWith('＋ 週期')));
console.log('PASS insight editor renders blocks, steps offsets, toggles cycle reminders, prunes dependents and caps at four');
