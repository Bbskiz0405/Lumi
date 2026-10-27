// Regression guard: screens under the shared collapsible calendar must not swap their list for a
// spinner after the first load. Doing so remounts the list at the top while the calendar header
// stays collapsed at the old scroll offset, leaving a blank band (bug seen after editing a record).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
const bookkeeping = read('app/(tabs)/(calendar)/bookkeeping.tsx');
const work = read('app/(tabs)/(calendar)/work.tsx');

const loud = (source, pattern) => [...source.matchAll(pattern)].map(match => match[0]);
assert.deepEqual(loud(bookkeeping, /loadAll\(\s*viewMode\s*\)/g), [], 'bookkeeping reloads must pass silent=true');
assert.deepEqual(loud(work, /\bload\(\s*\)/g), [], 'work reloads must pass silent=true');
assert.match(bookkeeping, /useState\(true\)|setLoading\(true\)/); // the first load may still show a spinner
console.log('PASS calendar workspaces reload silently, so the collapsed calendar header never strands a blank band');
