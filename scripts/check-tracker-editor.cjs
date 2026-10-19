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

// Minimal hook harness: components are plain functions here, so useState is replayed per render.
function mount(component, props) {
  const state = [];
  let cursor = 0;
  const hooks = {default:React, useState: initial => {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
    return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
  }};
  const render = () => { cursor = 0; return flatten(component(hooks)(props)); };
  return {render, props};
}
const DateFieldModule = hooks => load('components/ui/DateField.tsx', {
  react: hooks,
  'react-native':{View:'View',Text:'Text',TouchableOpacity:'TouchableOpacity',StyleSheet:{create:value=>value}},
  './TechIcon':{default:'TechIcon'},
});
const pad = value => String(value).padStart(2, '0');
const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const todayIso = iso(new Date());
let picked;
const field = mount(hooks => DateFieldModule(hooks).default, {label:'開始日', value:'2024-02-10', optional:true, onChange: value => { picked = value; }});
let tree = field.render();
assert.ok(tree.some(node => node?.props?.accessibilityLabel?.startsWith('開始日：2024年2月10日（週六）')));
assert.ok(!tree.some(node => node?.props?.accessibilityLabel === '上一個月')); // grid starts closed
press(tree, '今天');
assert.equal(picked, todayIso);
press(tree, '清除');
assert.equal(picked, '');
tree.find(node => node?.props?.accessibilityLabel?.startsWith('開始日：')).props.onPress();
tree = field.render();
assert.ok(tree.some(node => node?.type === 'Text' && text(node) === '2024年 2月')); // opens on the selected month
tree.find(node => node?.props?.accessibilityLabel === '下一個月').props.onPress();
tree = field.render();
const march = tree.filter(node => node?.props?.accessibilityLabel?.startsWith('2024年3月'));
assert.equal(march.length, 31);
march[30].props.onPress();
assert.equal(picked, '2024-03-31');
tree = field.render();
assert.ok(!tree.some(node => node?.props?.accessibilityLabel === '上一個月')); // picking closes the grid
tree.find(node => node?.props?.accessibilityLabel?.startsWith('開始日：')).props.onPress(); // reopens on the current value
assert.equal(field.render().filter(node => node?.props?.accessibilityLabel?.startsWith('2024年2月')).length, 29); // leap year
const required = mount(hooks => DateFieldModule(hooks).default, {label:'日期', value:'', onChange: () => {}});
const requiredTree = required.render();
assert.ok(!requiredTree.some(node => node?.type === 'TouchableOpacity' && text(node) === '清除'));
assert.ok(requiredTree.some(node => node?.props?.accessibilityLabel === '日期：未選擇，點選以選擇日期'));
assert.equal(DateFieldModule({default:React,useState:()=>[]}).formatDateLabel('2026-02-30'), '');

const Summary = load('components/TrackerDefinitionSummary.tsx', {
  react:{default:React},
  'react-native':{View:'View',Text:'Text',StyleSheet:{create:value=>value}},
}).default;
const summaryText = definition => flatten(Summary({value:definition})).filter(item => typeof item === 'string' || typeof item === 'number').join('');
const summary = summaryText({...period, insights:[{...period.insights[0], offsets:[...period.insights[0].offsets, {label:'易孕期',from:-19,to:-13}], remindDaysBefore:1}, period.insights[1]]});
for (const expected of ['開始日、結束日、經血量','只有開始日必填','下次月經（含排卵日、易孕期），前 1 天提醒','經期天數（開始日到結束日）','僅供參考']) assert.ok(summary.includes(expected), expected);
assert.ok(!summaryText({...period, insights:[]}).includes('自動推算'));
console.log('PASS date field picks by tap across months and leap years; summary explains fields, required and insights');

const money = load('utils/money.ts', {});
const Cards = load('components/finance/analytics/InsightCards.tsx', {
  react:{default:React},
  'react-native':{View:'View',Text:'Text',StyleSheet:{create:value=>value}},
  '../../../services/financeService':{findCategoryMeta:(_, value) => ({value, label:{transport:'交通',entertainment:'娛樂'}[value] ?? value, color:'#fff'})},
  '../../../utils/money':money,
});
const all = node => flatten(node).filter(item => typeof item === 'string' || typeof item === 'number').join('');
const pulse = {month:'2026-10', isCurrent:true, day:19, daysInMonth:31, daysLeft:13, spent:17169, historyMonths:3, typicalSoFar:15589,
  typicalTotal:16589, vsTypical:0.101, projected:18169, projectedBasis:'history', dailyAllowance:217, allowanceBasis:'budget'};
let shown = all(Cards.MonthPulseCard({pulse}));
for (const expected of ['10月到今天已花','17,169','比你平常這時候多 10%','平常約 15,589','照你平常的節奏，','18,169','還有 13 天','217','不會超過預算','依本月預算總額計算']) assert.ok(shown.includes(expected), expected);
shown = all(Cards.MonthPulseCard({pulse:{...pulse, dailyAllowance:0, allowanceBasis:'typical'}}));
assert.ok(shown.includes('已經超過平常一個月的花費了') && shown.includes('依你近 3 個月的平均月花費計算'));
shown = all(Cards.MonthPulseCard({pulse:{...pulse, historyMonths:0, vsTypical:null, typicalSoFar:null, projectedBasis:'pace', dailyAllowance:null, allowanceBasis:null}}));
assert.ok(shown.includes('完整記錄滿一個月後') && shown.includes('照目前速度粗估') && !shown.includes('還有 13 天'));
shown = all(Cards.MonthPulseCard({pulse:{...pulse, isCurrent:false, day:30, vsTypical:-0.02, dailyAllowance:null}}));
assert.ok(shown.includes('10月共花') && shown.includes('跟你平常差不多') && !shown.includes('月底'));
assert.equal(all(Cards.MonthPulseCard({pulse:{...pulse, day:0}})), '這個月還沒開始。');
shown = all(Cards.ChangeList({historyMonths:3, categories:[], changes:[
  {category:'transport', current:2240, typical:600, diff:1640, ratio:2.733, drivers:[{item:'高鐵',total:1490,count:1},{item:'計程車',total:750,count:3}]},
  {category:'entertainment', current:0, typical:390, diff:-390, ratio:-1, drivers:[]}]}));
for (const expected of ['交通','+1,640（↑273%）','主要是 高鐵 1,490、計程車 ×3 750','娛樂','−390（↓100%）','比平常省']) assert.ok(shown.includes(expected), expected);
assert.ok(all(Cards.ChangeList({historyMonths:0, changes:[], categories:[]})).includes('至少一個完整月份'));
assert.equal(all(Cards.ChangeList({historyMonths:2, changes:[], categories:[]})), '各分類都跟平常差不多。');
shown = all(Cards.SmallSpendList({windowDays:30, items:[{item:'手搖飲', category:'food', count:6, total:330, yearly:4015}]}));
assert.ok(shown.includes('手搖飲') && shown.includes('6 次 · 330') && shown.includes('一年大約 4,015'));
shown = all(Cards.FixedCostList({historyMonths:3, total:12989, items:[{item:'房租',category:'housing',monthly:12000,months:3,paidThisMonth:true},{item:'Netflix',category:'entertainment',monthly:390,months:3,paidThisMonth:false}]}));
assert.ok(shown.includes('本月已記') && shown.includes('本月未記') && shown.includes('每月固定約12,989'));
assert.ok(all(Cards.FixedCostList({historyMonths:1, total:0, items:[]})).includes('至少兩個完整月份'));
console.log('PASS finance insight cards explain pace, changes, small leaks and fixed costs, with honest not-enough-data states');
console.log('PASS insight editor renders blocks, steps offsets, toggles cycle reminders, prunes dependents and caps at four');
