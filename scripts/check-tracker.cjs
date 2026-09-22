// Isolated checks: Node 22.13+ with node:sqlite. No app/device data or live API calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const sql = new DatabaseSync(':memory:');
const adapter = {
  execAsync: async text => sql.exec(text),
  runAsync: async (text, values = []) => sql.prepare(text).run(...values),
  getFirstAsync: async (text, values = []) => sql.prepare(text).get(...values) ?? null,
  getAllAsync: async (text, values = []) => sql.prepare(text).all(...values),
  withExclusiveTransactionAsync: async fn => {
    sql.exec('BEGIN');
    try { await fn(adapter); sql.exec('COMMIT'); }
    catch (error) { sql.exec('ROLLBACK'); throw error; }
  },
};
const cache = new Map();
let responseText = '';
let lastBody;
let lastUrl;
let lastHeaders;
let responseOverride;
let responseQueue = [];
let responseStatus = 200;
let metadataStatus = 200;
let listPages = [];
let listedUrls = [];
let generationCalls = 0;
let generationUrls = [];
let failWrite = false;
const normalRun = adapter.runAsync;
adapter.runAsync = async (...args) => {
  if (failWrite && args[0].startsWith('INSERT') && args[0].includes('tracker_records')) throw Error('Injected write failure');
  return normalRun(...args);
};
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, console, Date, Error, TypeError, SyntaxError, setTimeout, clearTimeout, AbortController,
    fetch: async (url, options) => {
      if (url.includes('/models?')) {
        listedUrls.push(url);
        return { ok: true, json: async () => listPages.shift() };
      }
      if (!options.body) return { ok: metadataStatus === 200, status: metadataStatus, json: async () => ({name:'models/gemini-3.8-flash'}) };
      generationCalls++;
      generationUrls.push(url);
      lastUrl = url;
      lastHeaders = options.headers;
      lastBody = JSON.parse(options.body);
      const queued = responseQueue.shift();
      return { ok: responseStatus === 200, status: responseStatus, json: async () => queued ?? responseOverride ?? ({ candidates: [{content:{parts:[{text:responseText}]}}] }) };
    },
    require: name => {
      if (name === 'expo-sqlite') return {openDatabaseAsync: async () => adapter};
      if (name === 'expo-crypto') return {randomUUID};
      if (name === 'expo-secure-store') return {
        isAvailableAsync: async () => true,
        getItemAsync: async () => JSON.stringify({provider:'gemini',apiKey:'test-only'}),
      };
      if (name === './financeService') return {
        getExpenseCategories: async () => [{value:'food',label:'餐飲'}],
        findCategoryMeta: () => ({value:'food',label:'餐飲'}),
        getTransactionsForMonth: async () => [],
        getMonthSummary: async () => ({income:1000,expense:250}),
        getBudgetsForMonth: async () => [],
        getExpenseByCategory: async () => ({food:250}),
      };
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts')));
      throw Error('Unexpected dependency: ' + name);
    },
  }, { filename });
  return exports;
}

let checks = 0;
async function test(name, fn) {
  await fn();
  checks++;
  console.log('PASS ' + name);
}
const clone = value => JSON.parse(JSON.stringify(value));

(async () => {
  let db = await load('services/db.ts').getDb();
  await test('fresh database migrates to v9', async () => {
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 9);
  });
  await test('v8 upgrade and repeated initialization preserve existing data', async () => {
    await db.runAsync('INSERT INTO entries VALUES (?, ?, ?, ?)', ['existing','old record','IDEA','2026-01-01T00:00:00Z']);
    sql.exec('DROP TABLE tracker_records; DROP TABLE tracker_modules; PRAGMA user_version = 8;');
    cache.delete(path.join(root, 'services/db.ts'));
    db = await load('services/db.ts').getDb();
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 9);
    assert.equal((await db.getFirstAsync('SELECT raw_input FROM entries WHERE id = ?', ['existing'])).raw_input, 'old record');
    cache.delete(path.join(root, 'services/db.ts'));
    await load('services/db.ts').getDb();
    assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM entries')).n, 1);
  });
  const tracker = load('services/trackerModuleService.ts');
  const backup = load('services/backupService.ts');
  const stream = load('services/eventStreamService.ts');
  const ai = load('services/geminiService.ts');
  await test('Gemini 3.8 default upgrade preserves explicit models and other providers', async () => {
    assert.equal(ai.getEffectiveModel(await ai.getApiConfig()), 'gemini-3.8-flash');
    assert.equal(ai.getEffectiveModel({provider:'gemini',model:'gemini-2.5-flash'}), 'gemini-2.5-flash');
    assert.equal(ai.getEffectiveModel({provider:'openrouter'}), 'openrouter/free');
    assert.equal(ai.getEffectiveModel({provider:'openai'}), 'gpt-4o-mini');
  });
  await test('Gemini requests use supported thinking settings, system instructions and header auth', async () => {
    responseText = 'OK';
    assert.equal(await ai.testAIConnection(), 'gemini-3.8-flash');
    assert.match(lastUrl, /models\/gemini-3\.8-flash:generateContent$/);
    assert.ok(!lastUrl.includes('test-only'));
    assert.equal(lastHeaders['x-goog-api-key'], 'test-only');
    assert.equal(lastBody.generationConfig.temperature, undefined);
    assert.equal(lastBody.generationConfig.thinkingConfig.thinkingLevel, 'LOW');
    assert.ok(lastBody.generationConfig.maxOutputTokens >= 4096);
    assert.ok(lastBody.systemInstruction.parts[0].text);
    assert.equal(lastBody.contents.length, 1);
  });
  await test('task routing overrides Gemini per request but preserves saved config and other providers', async () => {
    const config = Object.freeze({provider:'gemini', model:'custom-saved-model'});
    assert.equal(ai.getModelForTask(config, 'quick'), 'gemini-2.5-flash-lite');
    assert.equal(ai.getModelForTask(config, 'deep'), 'gemini-3.8-flash');
    assert.equal(config.model, 'custom-saved-model');
    for (const provider of ['openrouter', 'openai']) {
      for (const task of ['quick', 'deep']) {
        assert.equal(ai.getModelForTask({provider,model:'custom'}, task), 'custom');
        assert.equal(ai.getModelForTask({provider}, task), ai.getEffectiveModel({provider}));
      }
    }
  });
  await test('classification assembles final text, ignores thoughts and falls back on exhausted quota', async () => {
    responseOverride = { candidates: [{finishReason:'STOP',content:{parts:[
      {thought:true,text:'not JSON'}, {text:'{"type":"FINANCE",'}, {text:'"amount":250,"category":"food","transactionType":"expense"}'},
    ]}}] };
    const classification = await ai.classifyTextWithAI('午餐250', []);
    assert.equal(classification.category, 'food');
    assert.equal(classification.amount, 250);
    assert.match(lastUrl, /models\/gemini-2\.5-flash-lite:generateContent$/);
    assert.equal(lastBody.generationConfig.responseMimeType, 'application/json');
    assert.equal(lastBody.generationConfig.thinkingConfig, undefined);
    responseStatus = 429;
    assert.equal(await ai.classifyTextWithAI('午餐250', []), null);
    await assert.rejects(ai.testAIConnection(), /額度/);
    responseStatus = 200;
    responseOverride = {candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"name":'}]}}]};
    await assert.rejects(ai.testAIConnection(), /長度/);
    responseOverride = {candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'internal only'}]}}]};
    await assert.rejects(ai.testAIConnection(), /未回傳文字/);
    responseOverride = undefined;
  });
  await test('connection diagnostics distinguish model lookup from generation without leaking the key', async () => {
    const stages = [];
    responseText = 'OK';
    await ai.testAIConnection(stage => stages.push(stage));
    assert.equal(stages.length, 2);
    assert.match(stages[1], /模型查詢成功/);
    const before = generationCalls;
    for (const status of [403, 404, 429]) {
      metadataStatus = status;
      await assert.rejects(ai.testAIConnection(), error => {
        assert.match(error.message, /模型查詢未完成/);
        assert.ok(!error.message.includes('test-only'));
        return true;
      });
    }
    assert.equal(generationCalls, before);
    metadataStatus = 200;
    responseStatus = 429;
    await assert.rejects(ai.testAIConnection(), /模型查詢成功，但文字生成失敗/);
    responseStatus = 200;
  });
  await test('comparison test uses old Gemini without changing the configured model', async () => {
    responseText = 'OK';
    assert.equal(await ai.testAIConnection(undefined, 'previous'), 'gemini-2.5-flash-lite');
    assert.match(lastUrl, /gemini-2\.5-flash-lite:generateContent$/);
    assert.equal(lastBody.generationConfig.thinkingConfig, undefined);
    assert.equal(lastBody.generationConfig.temperature, 0);
    assert.equal(ai.getEffectiveModel(await ai.getApiConfig()), 'gemini-3.8-flash');
  });
  await test('basic request isolates the current model without optional parameters or private context', async () => {
    responseText = 'OK';
    assert.equal(await ai.testAIConnection(undefined, 'basic'), 'gemini-3.8-flash');
    assert.match(lastUrl, /models\/gemini-3\.8-flash:generateContent$/);
    assert.deepEqual(Object.keys(lastBody), ['contents']);
    assert.equal(lastBody.contents[0].parts[0].text, 'Reply OK.');
    assert.equal(ai.getEffectiveModel(await ai.getApiConfig()), 'gemini-3.8-flash');
  });
  await test('account model probes follow pagination, test only listed candidates, preserve configuration', async () => {
    const model = name => ({name:'models/'+name,supportedGenerationMethods:['generateContent']});
    listPages = [{models:[model('gemini-3.8-flash')],nextPageToken:'next/token'}, {models:[model('gemini-2.5-flash-lite'),model('gemini-paid-unrelated')]}];
    const before = generationCalls;
    responseText = 'OK';
    const report = await ai.checkGeminiModelAvailability();
    assert.match(report, /gemini-3.8-flash：2\/2/);
    assert.match(report, /gemini-3.7-flash：清單未列/);
    assert.equal(generationCalls - before, 4);
    assert.ok(listedUrls[1].includes('pageToken=next%2Ftoken'));
    assert.equal(ai.getEffectiveModel(await ai.getApiConfig()), 'gemini-3.8-flash');
    listPages = [{models:[model('gemini-3.8-flash')]}];
    responseStatus = 503;
    const failuresBefore = generationCalls;
    const failed = await ai.checkGeminiModelAvailability();
    assert.match(failed, /gemini-3.8-flash：0\/2/);
    assert.equal(generationCalls - failuresBefore, 2);
    assert.ok(!failed.includes('test-only'));
    responseStatus = 200;
  });
  const definition = {
    name: '體重追蹤', description: '每天記錄體重',
    fields: [
      {key:'date',label:'日期',type:'date',required:true},
      {key:'weight',label:'體重',type:'number',required:true,unit:'公斤'},
      {key:'mood',label:'心情',type:'select',required:false,options:['好','普通']},
      {key:'note',label:'備註',type:'text',required:false},
    ],
  };
  await test('feature smoke checks use real validators but never save synthetic data or disguise fallback', async () => {
    const response = value => ({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]});
    const counts = await db.getFirstAsync('SELECT (SELECT COUNT(*) FROM entries) AS entries, (SELECT COUNT(*) FROM tracker_modules) AS modules');
    responseQueue = [response({type:'FINANCE',amount:250,category:'food',transactionType:'expense'}), response(definition)];
    const configBefore = JSON.stringify(await ai.getApiConfig());
    generationUrls = [];
    const result = await ai.testAIFeatures();
    assert.equal(result.passed, true); assert.match(result.report, /午餐 250 → 餐飲/);
    assert.match(generationUrls[0], /gemini-2\.5-flash-lite:generateContent$/);
    assert.match(generationUrls[1], /gemini-3\.8-flash:generateContent$/);
    assert.match(result.report, /分類：gemini-2\.5-flash-lite/);
    assert.match(result.report, /模組設計：gemini-3\.8-flash/);
    assert.equal(JSON.stringify(await ai.getApiConfig()), configBefore);
    assert.deepEqual(await db.getFirstAsync('SELECT (SELECT COUNT(*) FROM entries) AS entries, (SELECT COUNT(*) FROM tracker_modules) AS modules'), counts);
    responseQueue = [response({type:'IDEA'}), response({...definition,fields:[]})];
    const failed = await ai.testAIFeatures();
    assert.equal(failed.passed, false); assert.match(failed.report, /未以本機分類冒充/);
  });
  let module, record, snapshot;
  await test('invalid dates, leap years and boundaries', () => {
    for (const date of ['2026-99-99','2026-02-30','2026-02-29','0000-01-01','2026-04-31','2026-01-00']) {
      assert.equal(tracker.isValidTrackerDate(date), false, date);
      assert.throws(() => tracker.validateTrackerValues(definition, {date,weight:'70'}));
    }
    for (const date of ['2024-02-29','2026-12-31','2026-01-01']) assert.equal(tracker.isValidTrackerDate(date), true);
  });
  await test('reject malformed schema and unknown/invalid values; retain zero', () => {
    for (const key of ['constructor','__proto__','prototype']) assert.throws(() =>
      tracker.validateTrackerModuleDefinition({...definition,fields:[{key,label:'x',type:'text',required:true}]}));
    assert.throws(() => tracker.validateTrackerModuleDefinition({...definition,fields:[{key:'x',label:'x',type:'select',options:['same','same']}]}));
    for (const weight of ['NaN','Infinity','0x10','  ']) assert.throws(() =>
      tracker.validateTrackerValues(definition,{date:'2026-09-15',weight}));
    assert.throws(() => tracker.validateTrackerValues(definition,{date:'2026-09-15',weight:'70',unexpected:1}));
    assert.throws(() => tracker.validateTrackerValues(definition,{date:'2026-09-15',weight:'70',mood:'bad'}));
    assert.equal(tracker.validateTrackerValues(definition,{date:'2026-09-15',weight:'0'}).weight,0);
  });
  await test('create and edit record persists, preserves id and creation time', async () => {
    module = await tracker.createTrackerModule(definition);
    record = await tracker.createTrackerRecord(module,{date:'2026-09-14',weight:'70.5',note:'test'});
    await tracker.updateTrackerRecord(module.id,record.id,{date:'2026-09-15',weight:'69.5'});
    const stored = (await tracker.getTrackerRecords(module.id))[0];
    assert.equal(stored.id,record.id);
    assert.equal(stored.created_at,record.created_at);
    assert.equal(stored.data.weight,69.5);
    assert.equal(stored.data.note,undefined);
    assert.equal(new Date(stored.recorded_at).getDate(),15);
  });
  await test('failed edits cannot change existing records; other module ids rejected', async () => {
    await assert.rejects(tracker.updateTrackerRecord(module.id,record.id,{date:'2026-02-30',weight:'1'}));
    await assert.rejects(tracker.updateTrackerRecord('missing',record.id,{date:'2026-09-15',weight:'1'}));
    assert.equal((await tracker.getTrackerRecords(module.id))[0].data.weight,69.5);
  });
  await test('rename labels preserves records; structural changes rejected', async () => {
    const renamed = clone(definition);
    renamed.fields[1].label = '體重值';
    await tracker.updateTrackerModule(module.id,renamed);
    assert.equal((await tracker.getTrackerModule(module.id)).fields[1].label,'體重值');
    assert.equal((await tracker.getTrackerRecords(module.id))[0].data.weight,69.5);
    renamed.fields[1].unit = '磅';
    await assert.rejects(tracker.updateTrackerModule(module.id,renamed));
  });
  await test('home routing accepts names and short aliases but avoids unrelated purchases and ambiguity', () => {
    assert.equal(tracker.matchTrackerModule('體重 70.5',[module]).id,module.id);
    assert.equal(tracker.matchTrackerModule('體重追蹤：70.5',[module]).id,module.id);
    assert.equal(tracker.matchTrackerModule('買體重計 250',[module]),null);
    assert.equal(tracker.matchTrackerModule('體重 70',[module,{...module,id:'duplicate'}]),null);
  });
  await test('timeline and search contain labeled tracker data', async () => {
    const events = await stream.getEventStream({types:['tracker'],query:'體重值'});
    assert.equal(events.length,1);
    assert.equal(events[0].moduleId,module.id);
    assert.match(events[0].raw,/69.5 公斤/);
  });
  await test('AI drafting validates model output without saving', async () => {
    responseText = JSON.stringify({date:'2026-09-15',weight:68});
    assert.equal((await ai.draftTrackerRecord(definition,'體重68')).weight,'68');
    assert.match(lastUrl, /gemini-2\.5-flash-lite:generateContent$/);
    assert.equal((await tracker.getTrackerRecords(module.id)).length,1);
    responseText = JSON.stringify({date:'2026-99-99',weight:68});
    await assert.rejects(ai.draftTrackerRecord(definition,'test'));
    responseText = 'not JSON';
    await assert.rejects(ai.draftTrackerRecord(definition,'test'));
  });
  await test('AI design validates schema; Ask Lumi receives tracker context', async () => {
    responseText = JSON.stringify(definition);
    assert.equal((await ai.designTrackerModule('體重追蹤')).name,definition.name);
    assert.match(lastUrl, /gemini-3\.8-flash:generateContent$/);
    responseText = JSON.stringify({...definition,fields:[]});
    await assert.rejects(ai.designTrackerModule('體重追蹤'));
    responseText = 'test response';
    await ai.askLumi('我的體重是多少');
    assert.match(lastUrl, /gemini-3\.8-flash:generateContent$/);
    assert.match(JSON.stringify(lastBody),/69.5 公斤/);
  });
  await test('financial analysis and month narrative route to deep model without changing saved config', async () => {
    const before = JSON.stringify(await ai.getApiConfig());
    responseText = 'test analysis';
    await ai.getQuickAnalysis('2026-09');
    assert.match(lastUrl, /gemini-3\.8-flash:generateContent$/);
    assert.match(lastBody.systemInstruction.parts[0].text, /結餘：750/);
    await ai.chatWithFinanceAdvisor('分析', [], '2026-09');
    assert.match(lastUrl, /gemini-3\.8-flash:generateContent$/);
    const calls = generationCalls;
    await ai.generateMonthNarrative('2026-09');
    assert.equal(generationCalls, calls + 1);
    assert.match(lastUrl, /gemini-3\.8-flash:generateContent$/);
    assert.equal(JSON.stringify(await ai.getApiConfig()), before);
  });
  await test('backup export/preview contains modules and rejects bad JSON, values, orphans and duplicate ids', async () => {
    snapshot = await backup.createBackup();
    assert.equal(snapshot.schemaVersion,7);
    assert.equal(backup.previewBackupJson(JSON.stringify(snapshot)).counts.trackerRecords,1);
    const badSchema = clone(snapshot); badSchema.data.tracker_modules[0].schema_json = 'broken JSON';
    assert.throws(() => backup.previewBackupJson(JSON.stringify(badSchema)));
    const badValue = clone(snapshot); badValue.data.tracker_records[0].data_json = '{"date":"2026-99-99","weight":70}';
    assert.throws(() => backup.previewBackupJson(JSON.stringify(badValue)));
    const orphan = clone(snapshot); orphan.data.tracker_records[0].module_id = 'missing';
    assert.throws(() => backup.previewBackupJson(JSON.stringify(orphan)));
    const dup = clone(snapshot); dup.data.tracker_records.push(dup.data.tracker_records[0]);
    assert.throws(() => backup.previewBackupJson(JSON.stringify(dup)));
    const nullDate = clone(snapshot); nullDate.data.tracker_records[0].recorded_at = null;
    assert.throws(() => backup.previewBackupJson(JSON.stringify(nullDate)));
  });
  await test('backup merge skips duplicates and rejects incompatible module schemas', async () => {
    await backup.importBackup(backup.previewBackupJson(JSON.stringify(snapshot)),'merge');
    assert.equal((await tracker.getTrackerRecords(module.id)).length,1);
    const changed = clone(snapshot);
    const fields = JSON.parse(changed.data.tracker_modules[0].schema_json);
    fields[1].unit = '磅';
    changed.data.tracker_modules[0].schema_json = JSON.stringify(fields);
    await assert.rejects(backup.importBackup(backup.previewBackupJson(JSON.stringify(changed)),'merge'));
    assert.equal((await tracker.getTrackerModule(module.id)).fields[1].unit,'公斤');
  });
  await test('replace failure rolls back deletions and restores the original data', async () => {
    failWrite = true;
    await assert.rejects(backup.importBackup(backup.previewBackupJson(JSON.stringify(snapshot)),'replace'));
    failWrite = false;
    assert.equal((await tracker.getTrackerRecords(module.id))[0].data.weight,69.5);
    assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM entries')).n,1);
  });
  await test('delete cascades; restore reconstructs records; old schema6 backup remains importable', async () => {
    await tracker.deleteTrackerModule(module.id);
    assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM tracker_records')).n,0);
    await assert.rejects(tracker.createTrackerRecord(module,{date:'2026-09-15',weight:'1'}));
    await backup.importBackup(backup.previewBackupJson(JSON.stringify(snapshot)),'replace');
    assert.equal((await tracker.getTrackerRecords(module.id))[0].data.weight,69.5);
    const old = clone(snapshot);
    old.schemaVersion = 6; old.databaseVersion = 8;
    delete old.data.tracker_modules; delete old.data.tracker_records;
    const preview = backup.previewBackupJson(JSON.stringify(old));
    assert.equal(preview.counts.trackerRecords,0);
    await backup.importBackup(preview,'merge');
    assert.equal((await tracker.getTrackerRecords(module.id)).length,1);
    await backup.importBackup(preview,'replace');
    assert.equal((await tracker.getTrackerModules()).length,0);
  });
  const anniversaries = load('services/anniversaryService.ts');
  const notes = load('services/noteService.ts');
  const classifier = load('services/classificationService.ts');
  const localToday = new Date(2026, 8, 21, 0, 5);
  await test('anniversary declarations freeze local dates; reject invalid dates and do not capture questions or expenses', () => {
    const parse = text => clone(anniversaries.parseAnniversaryInput(text, localToday));
    assert.deepEqual(parse('今天是我們交往紀念日'), {name:'我們交往紀念日',date:'2026-09-21'});
    assert.deepEqual(parse('幫我記住，昨天是媽媽生日'), {name:'媽媽生日',date:'2026-09-20'});
    assert.equal(parse('明天是結婚紀念日').date, '2026-09-22');
    assert.equal(parse('2024/2/29是交往紀念日').date, '2024-02-29');
    assert.equal(parse('交往紀念日是2024-05-20').date, '2024-05-20');
    assert.equal(parse('5月20日是我們交往紀念日').date, '2026-05-20');
    assert.equal(anniversaries.parseAnniversaryInput('昨天是交往紀念日', new Date(2026,0,1)).date,'2025-12-31');
    for (const text of ['2026-02-29是交往紀念日','2026-13-01是媽媽生日','2026-04-31是結婚紀念日']) assert.throws(() => parse(text));
    for (const text of ['今天是什麼紀念日','交往紀念日是什麼時候？','今天是媽媽生日嗎？','紀念日禮物250','午餐250','今天是媽媽生日，買蛋糕500','今天要準備紀念日']) assert.equal(parse(text),null);
  });
  let anniversaryNote;
  await test('anniversary notes support validated editing, fixed tag discovery and existing undo', async () => {
    const value = anniversaries.parseAnniversaryInput('今天是我們交往紀念日', localToday);
    const content = anniversaries.formatAnniversary(value);
    anniversaryNote = await notes.createNote({content,category:'紀念日'});
    assert.ok(!(await notes.getCustomTags()).includes('紀念日'));
    await assert.rejects(notes.updateNote(anniversaryNote.id,{content:'我們交往紀念日\n日期：2026-02-30\n每年紀念'}));
    assert.equal((await notes.getNoteById(anniversaryNote.id)).content,content);
    await notes.updateNote(anniversaryNote.id,{content:anniversaries.formatAnniversary({...value,date:'2024-09-21'})});
    const entryId = await classifier.saveEntry('今天是測試紀念日','IDEA');
    const undoNote = await notes.createNote({content,category:'紀念日',entry_id:entryId});
    await classifier.rollbackEntry(entryId);
    assert.equal(await notes.getNoteById(undoNote.id),null);
    await assert.rejects(notes.createNote({content:'不完整日期',category:'紀念日'}));
  });
  await test('anniversaries survive recent-250 cutoff and feed authoritative local today and exact dates to Ask Lumi', async () => {
    await db.runAsync('UPDATE notes SET created_at = ? WHERE id = ?', ['2000-01-01T00:00:00Z',anniversaryNote.id]);
    for (let i=0;i<251;i++) await notes.createNote({content:`newer note ${i}`});
    assert.ok(!(await stream.getEventStream({types:['note'],limit:250})).some(event => event.refId === anniversaryNote.id));
    const context = await anniversaries.buildAnniversaryContext(localToday);
    assert.match(context,/使用者當地今天：2026-09-21/);
    assert.match(context,/今天的紀念日：我們交往紀念日/);
    assert.match(context,/2024-09-21/);
    assert.match(await anniversaries.buildAnniversaryContext(new Date(2026,8,22)),/今天的紀念日：沒有/);
    responseText = '測試回答';
    await ai.askLumi('交往紀念日是什麼時候？');
    assert.match(lastBody.systemInstruction.parts[0].text,/2024-09-21/);
    assert.match(lastBody.systemInstruction.parts[0].text,/使用者當地今天/);
    assert.match(lastUrl,/gemini-3\.8-flash:generateContent$/);
  });
  await test('anniversary leap days, future dates and same-name conflicts are explicit, not guessed', async () => {
    const leap = await notes.createNote({category:'紀念日',content:anniversaries.formatAnniversary({name:'閏日紀念日',date:'2024-02-29'})});
    const future = await notes.createNote({category:'紀念日',content:anniversaries.formatAnniversary({name:'未來紀念日',date:'2030-09-21'})});
    assert.match(await anniversaries.buildAnniversaryContext(new Date(2028,1,29)),/今天的紀念日：閏日紀念日/);
    assert.match(await anniversaries.buildAnniversaryContext(new Date(2027,1,28)),/今天的紀念日：沒有/);
    assert.ok(!(await anniversaries.buildAnniversaryContext(localToday)).split('\n').find(line => line.startsWith('今天的紀念日：')).includes('未來紀念日'));
    const duplicate = await notes.createNote({category:'紀念日',content:anniversaries.formatAnniversary({name:'我們交往紀念日',date:'2023-05-20'})});
    const context = await anniversaries.buildAnniversaryContext(localToday);
    assert.match(context,/2023-05-20/); assert.match(context,/2024-09-21/); assert.match(context,/同名有不同日期/);
    for (const note of [leap,future,duplicate]) await notes.deleteNote(note.id);
  });
  await test('anniversary backup restore, editing and deletion update recall without schema migration', async () => {
    const snapshot = await backup.createBackup();
    assert.equal(snapshot.schemaVersion,7);
    assert.ok(snapshot.data.notes.some(note => note.id === anniversaryNote.id && note.category === '紀念日'));
    await notes.deleteNote(anniversaryNote.id);
    assert.ok(!(await anniversaries.buildAnniversaryContext(localToday)).includes('2024-09-21'));
    await backup.importBackup(backup.previewBackupJson(JSON.stringify(snapshot)), 'merge');
    assert.match(await anniversaries.buildAnniversaryContext(localToday),/2024-09-21/);
    await notes.updateNote(anniversaryNote.id,{content:anniversaries.formatAnniversary({name:'我們交往紀念日',date:'2024-05-20'})});
    assert.match(await anniversaries.buildAnniversaryContext(localToday),/今天的紀念日：沒有/);
    await notes.deleteNote(anniversaryNote.id);
    assert.match(await anniversaries.buildAnniversaryContext(localToday),/尚未記錄紀念日/);
  });
  await test('calendar owns legacy anniversaries without migration or duplicating records; notes counts and recent lists exclude them', async () => {
    const recent = load('services/recentService.ts');
    const beforeCount = await notes.getNotesCount();
    const legacy = await notes.createNote({category:'紀念日',content:anniversaries.formatAnniversary({name:'原紀念日',date:'2024-09-22'})});
    assert.equal(await notes.getNotesCount(),beforeCount);
    assert.ok(!(await notes.getAllNotes()).some(note => note.id === legacy.id));
    assert.ok(!(await notes.getRecentNotes(500)).some(note => note.id === legacy.id));
    assert.equal((await notes.getNotesByCategory('紀念日')).length,0);
    assert.ok(!(await recent.getRecentActivity(500)).some(item => item.id === legacy.id));
    assert.ok(!(await stream.getEventStream({types:['note']})).some(item => item.refId === legacy.id));
    assert.equal((await anniversaries.getAnniversariesForDate('2026-09-22'))[0].id,legacy.id);
    assert.equal((await anniversaries.getAnniversariesForDate('2023-09-22')).length,0);
    assert.ok((await anniversaries.getAnniversaryDatesForMonth(2027,8)).has('2027-09-22'));
    assert.equal((await anniversaries.getAnniversaryDatesForMonth(2027,7)).size,0);
    await anniversaries.saveAnniversary({name:'更新紀念日',date:'2024-10-01'},legacy.id);
    assert.equal((await anniversaries.getAnniversariesForDate('2026-09-22')).length,0);
    assert.equal((await anniversaries.getAnniversariesForDate('2026-10-01'))[0].name,'更新紀念日');
    assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM notes WHERE id = ?', [legacy.id])).n,1);
    assert.match(await anniversaries.buildAnniversaryContext(new Date(2026,9,1)),/今天的紀念日：更新紀念日/);
    const snapshot = await backup.createBackup();
    await anniversaries.deleteAnniversary(legacy.id);
    assert.equal((await anniversaries.getAnniversariesForDate('2026-10-01')).length,0);
    await backup.importBackup(backup.previewBackupJson(JSON.stringify(snapshot)), 'merge');
    assert.equal((await anniversaries.getAnniversariesForDate('2026-10-01'))[0].id,legacy.id);
    assert.equal(await notes.getNotesCount(),beforeCount);
    await anniversaries.deleteAnniversary(legacy.id);
  });
  await test('calendar CRUD rejects invalid dates and cannot edit or delete ordinary notes; leap-year markers stay exact', async () => {
    const ordinary = await notes.createNote({content:'一般筆記'});
    await assert.rejects(anniversaries.saveAnniversary({name:'不可覆蓋',date:'2026-09-22'},ordinary.id));
    await anniversaries.deleteAnniversary(ordinary.id);
    assert.equal((await notes.getNoteById(ordinary.id)).content,'一般筆記');
    await assert.rejects(anniversaries.saveAnniversary({name:'無效日期',date:'2026-02-29'}));
    await anniversaries.saveAnniversary({name:'閏日',date:'2024-02-29'});
    const record = (await anniversaries.getAnniversariesForDate('2028-02-29'))[0];
    assert.ok(record);
    assert.equal((await anniversaries.getAnniversaryDatesForMonth(2027,1)).size,0);
    assert.ok((await anniversaries.getAnniversaryDatesForMonth(2028,1)).has('2028-02-29'));
    await anniversaries.deleteAnniversary(record.id);
    await notes.deleteNote(ordinary.id);
  });
  console.log('All ' + checks + ' tracker checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => sql.close());
