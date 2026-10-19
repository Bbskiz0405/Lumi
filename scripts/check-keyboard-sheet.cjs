// Isolated checks for the shared keyboard-aware bottom sheet; no device needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

const listeners = {};
let removed = 0;
const state = [];
const refs = [];
let cursor = 0;
let refCursor = 0;
const hooks = {
  default: React,
  useState: initial => {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [state[index], next => { state[index] = next; }];
  },
  useRef: initial => {
    const index = refCursor++;
    if (!(index in refs)) refs[index] = { current: initial };
    return refs[index];
  },
  useEffect: effect => { if (!listeners.done) { listeners.done = true; listeners.cleanup = effect(); } },
};
const exportsObject = {};
const filename = path.resolve(__dirname, '../components/ui/KeyboardSheet.tsx');
vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsObject, require(name) {
  if (name === 'react') return hooks;
  if (name === 'react-native') return {
    Platform: { OS: 'android' },
    Keyboard: { addListener: (event, handler) => { listeners[event] = handler; return { remove: () => { removed++; } }; } },
    Pressable: 'Pressable', View: 'View',
    StyleSheet: { create: value => value, absoluteFill: { position: 'absolute' } },
  };
  throw Error('Unexpected import ' + name);
} });

const { keyboardLift } = exportsObject;
assert.equal(keyboardLift(320, 900, 900), 320); // edge-to-edge: window not resized
assert.equal(keyboardLift(320, 900, 580), 0); // window already resized by the system
assert.equal(keyboardLift(320, 900, 800), 220); // partial resize
assert.equal(keyboardLift(0, 900, 900), 0);

let closed = 0;
const render = () => { cursor = 0; refCursor = 0; return exportsObject.default({ children: 'sheet', style: { backgroundColor: '#000' }, onBackdropPress: () => { closed++; } }); };
const area = tree => tree.props.children[1];
let tree = render();
tree.props.onLayout({ nativeEvent: { layout: { height: 900 } } });
tree = render();
assert.equal(area(tree).props.style[1].marginBottom, 0);
assert.equal(area(tree).props.pointerEvents, 'box-none');
listeners.keyboardDidShow({ endCoordinates: { height: 320 } });
tree = render();
assert.equal(area(tree).props.style[1].marginBottom, 320);
// A device that still resizes: layout shrinks, so the lift drops instead of doubling.
tree.props.onLayout({ nativeEvent: { layout: { height: 580 } } });
assert.equal(area(render()).props.style[1].marginBottom, 0);
listeners.keyboardDidHide();
tree.props.onLayout({ nativeEvent: { layout: { height: 900 } } });
tree = render();
assert.equal(area(tree).props.style[1].marginBottom, 0);
tree.props.children[0].props.onPress();
assert.equal(closed, 1);
listeners.cleanup();
assert.equal(removed, 2);
console.log('PASS keyboard sheet lifts by keyboard height, never double-lifts a resized window, resets on hide and closes from backdrop');
