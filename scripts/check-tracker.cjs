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
const alerts = [];
const notificationState = {scheduled: [], granted: true, canAskAgain: true, prompts: 0, channels: []};
const fakeNotifications = {
  AndroidImportance: {HIGH: 4, DEFAULT: 3},
  AndroidNotificationVisibility: {PRIVATE: 0},
  SchedulableTriggerInputTypes: {DATE: 'date'},
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async (id, options) => { notificationState.channels.push({id, ...options}); },
  getPermissionsAsync: async () => ({granted: notificationState.granted, canAskAgain: notificationState.canAskAgain}),
  requestPermissionsAsync: async () => { notificationState.prompts++; return {granted: notificationState.granted}; },
  getAllScheduledNotificationsAsync: async () => notificationState.scheduled.map(item => ({...item})),
  cancelScheduledNotificationAsync: async id => { notificationState.scheduled = notificationState.scheduled.filter(item => item.identifier !== id); },
  scheduleNotificationAsync: async request => { notificationState.scheduled.push(request); return request.identifier; },
};
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
      if (name === 'expo-notifications') return fakeNotifications;
      if (name === 'react-native') return {Platform:{OS:'android'},Alert:{alert:(...args) => alerts.push(args)}};
      if (name === 'expo-secure-store') return {
        isAvailableAsync: async () => true,
        getItemAsync: async () => JSON.stringify({provider:'gemini',apiKey:'test-only'}),
      };
      if (name === './financeService') return {
        EXCLUDE_ADJUSTMENTS: 'is_adjustment = 0',
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
    assert.equal(ai.getModelForTask(config, 'quick'), 'gemini-3.5-flash-lite');
    assert.equal(ai.getModelForTask(config, 'deep'), 'gemini-3.8-flash');
    assert.equal(ai.getModelForTask(config, 'chat'), 'gemini-3.6-flash');
    assert.equal(config.model, 'custom-saved-model');
    for (const provider of ['openrouter', 'openai']) {
      for (const task of ['quick', 'chat', 'deep']) {
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
    assert.match(lastUrl, /models\/gemini-3\.5-flash-lite:generateContent$/);
    assert.equal(lastBody.generationConfig.responseMimeType, 'application/json');
    assert.equal(lastBody.generationConfig.thinkingConfig.thinkingLevel, 'MINIMAL'); // flash-lite's fastest documented level
    assert.ok(lastBody.generationConfig.maxOutputTokens >= 4096);
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
    assert.match(report, /gemini-3.5-flash-lite：清單未列/);
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
    assert.match(generationUrls[0], /gemini-3\.5-flash-lite:generateContent$/);
    assert.match(generationUrls[1], /gemini-3\.8-flash:generateContent$/);
    assert.match(result.report, /分類：gemini-3\.5-flash-lite/);
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
    assert.match(lastUrl, /gemini-3\.5-flash-lite:generateContent$/);
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
    assert.match(lastUrl, /gemini-3\.6-flash:generateContent$/);
    assert.equal(lastBody.generationConfig.thinkingConfig.thinkingLevel, 'MINIMAL');
    assert.match(JSON.stringify(lastBody),/69.5 公斤/);
  });
  await test('conversation features route to the faster chat model; module design stays on 3.8', async () => {
    const before = JSON.stringify(await ai.getApiConfig());
    responseText = 'test analysis';
    await ai.getQuickAnalysis('2026-09');
    assert.match(lastUrl, /gemini-3\.6-flash:generateContent$/);
    assert.equal(lastBody.generationConfig.thinkingConfig.thinkingLevel, 'MINIMAL');
    assert.match(lastBody.systemInstruction.parts[0].text, /結餘：750/);
    await ai.chatWithFinanceAdvisor('分析', [], '2026-09');
    assert.match(lastUrl, /gemini-3\.6-flash:generateContent$/);
    const calls = generationCalls;
    // Fixture rows are stamped with the real clock, so the narrative must look at the current month.
    const now = new Date();
    await ai.generateMonthNarrative(now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'));
    assert.equal(generationCalls, calls + 1);
    assert.match(lastUrl, /gemini-3\.6-flash:generateContent$/);
    assert.equal(JSON.stringify(await ai.getApiConfig()), before);
    responseText = JSON.stringify(definition);
    await ai.designTrackerModule('體重追蹤');
    assert.match(lastUrl, /gemini-3\.8-flash:generateContent$/);
    assert.equal(lastBody.generationConfig.thinkingConfig.thinkingLevel, 'LOW'); // 3.8 has no MINIMAL
    // Speed comparison: one synthetic request per model, no retries, nothing saved.
    responseText = '餐飲最多，十月比九月多。';
    const speedCalls = generationCalls;
    const urls = generationUrls.length;
    const report = await ai.compareChatModelSpeed();
    assert.equal(generationCalls - speedCalls, 3);
    assert.deepEqual(generationUrls.slice(urls).map(url => url.match(/models\/([^:]+)/)[1]), ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']);
    assert.match(report, /gemini-3\.8-flash（思考 LOW）：[\d.]+ 秒/);
    assert.match(report, /gemini-3\.6-flash（思考 MINIMAL）/);
    assert.match(JSON.stringify(lastBody), /合成測試資料/);
    assert.doesNotMatch(JSON.stringify(lastBody), /69\.5 公斤/); // never the user's records
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
  const insightsService = load('services/trackerInsightService.ts');
  const period = {
    name: '月經紀錄', description: '記錄經期並推算下次',
    fields: [
      {key:'start_date',label:'開始日',type:'date',required:true},
      {key:'end_date',label:'結束日',type:'date',required:false},
      {key:'flow',label:'經血量',type:'select',required:false,options:['少','中','多']},
    ],
    insights: [
      {type:'cycle',label:'下次月經',field:'start_date',offsets:[{label:'排卵日',from:-14,to:-14},{label:'易孕期',from:-19,to:-13}]},
      {type:'duration',label:'經期天數',start:'start_date',end:'end_date'},
    ],
  };
  const rec = (data, recorded_at) => ({id:randomUUID(),module_id:'m',data,recorded_at:recorded_at ?? data.start_date + 'T04:00:00.000Z',created_at:'2026-09-01T00:00:00.000Z'});
  await test('insight validation rejects unknown types, wrong field types, bad offsets and too many insights', () => {
    const valid = tracker.validateTrackerModuleDefinition(period);
    assert.equal(valid.insights.length,2);
    assert.deepEqual(clone(tracker.validateTrackerModuleDefinition(definition).insights),[]);
    const bad = patch => assert.throws(() => tracker.validateTrackerModuleDefinition({...period,insights:[{...period.insights[0],...patch}]}));
    bad({type:'formula'});
    bad({field:'flow'});
    bad({field:'missing'});
    bad({offsets:[{label:'x',from:3,to:1}]});
    bad({offsets:[{label:'x',from:-61,to:0}]});
    bad({offsets:[{label:'x',from:0.5,to:1}]});
    bad({offsets:[1,2,3,4].map(n => ({label:'x'+n,from:n,to:n}))});
    assert.throws(() => tracker.validateTrackerModuleDefinition({...period,insights:[{type:'duration',label:'x',start:'start_date',end:'start_date'}]}));
    assert.throws(() => tracker.validateTrackerModuleDefinition({...definition,insights:[{type:'trend',label:'x',field:'weight',window:2}]}));
    assert.throws(() => tracker.validateTrackerModuleDefinition({...period,insights:Array(5).fill(period.insights[1])}));
  });
  await test('cycle projection averages intervals, ignores duplicates and needs two dates', () => {
    const module = tracker.validateTrackerModuleDefinition(period);
    const now = new Date(2026, 8, 10, 23, 30);
    const records = ['2026-06-01','2026-06-29','2026-07-28','2026-08-25','2026-08-25'].map(start_date => rec({start_date}));
    const [cycle] = clone(insightsService.computeTrackerInsights(module, records, now));
    assert.deepEqual(cycle, {type:'cycle',label:'下次月經',ready:true,average:28.3,shortest:28,longest:29,samples:3,
      last:'2026-08-25',next:'2026-09-22',spread:1,daysUntil:12,
      ranges:[{label:'排卵日',start:'2026-09-08',end:'2026-09-08'},{label:'易孕期',start:'2026-09-03',end:'2026-09-09'}]});
    const two = clone(insightsService.computeTrackerInsights(module, records.slice(0, 2), now))[0];
    assert.equal(two.spread, null);
    assert.equal(two.daysUntil, -45);
    assert.deepEqual(clone(insightsService.computeTrackerInsights(module, records.slice(3), now))[0], {type:'cycle',label:'下次月經',ready:false,needed:1});
    // Month and leap-year boundaries use calendar days, not 24h offsets.
    const leap = clone(insightsService.computeTrackerInsights(module, [rec({start_date:'2028-01-31'}),rec({start_date:'2028-02-28'})], now))[0];
    assert.equal(leap.next,'2028-03-27');
  });
  await test('duration counts inclusive days and trend reports weekly slope', () => {
    const module = tracker.validateTrackerModuleDefinition(period);
    const durations = clone(insightsService.computeTrackerInsights(module, [
      rec({start_date:'2026-06-29',end_date:'2026-07-02'}), rec({start_date:'2026-06-01',end_date:'2026-06-05'}),
      rec({start_date:'2026-07-28'}), rec({start_date:'2026-08-25',end_date:'2026-08-20'}),
    ]))[1];
    assert.deepEqual(durations, {type:'duration',label:'經期天數',ready:true,latest:4,average:4.5,samples:2});
    const weight = tracker.validateTrackerModuleDefinition({...definition,insights:[{type:'trend',label:'體重趨勢',field:'weight',window:3}]});
    const points = [['2026-08-01',80],['2026-09-01',70],['2026-09-08',69.5],['2026-09-15',69]].map(([date,value]) => rec({date,weight:value}, date + 'T04:00:00.000Z'));
    assert.deepEqual(clone(insightsService.computeTrackerInsights(weight, points))[0], {type:'trend',label:'體重趨勢',ready:true,perWeek:-0.5,change:-1,samples:3,unit:'公斤'});
    const sameDay = points.slice(1).map(point => ({...point,recorded_at:'2026-09-01T04:00:00.000Z'}));
    assert.equal(insightsService.computeTrackerInsights(weight, sameDay)[0].ready,false);
  });
  await test('insights persist in schema_json, legacy array stays, existing modules can gain insights without touching records', async () => {
    const created = await tracker.createTrackerModule(period);
    const stored = JSON.parse((await db.getFirstAsync('SELECT schema_json FROM tracker_modules WHERE id = ?',[created.id])).schema_json);
    assert.equal(stored.insights.length,2);
    assert.equal((await tracker.getTrackerModule(created.id)).insights[0].offsets[1].from,-19);
    const plain = await tracker.createTrackerModule(definition);
    assert.ok(Array.isArray(JSON.parse((await db.getFirstAsync('SELECT schema_json FROM tracker_modules WHERE id = ?',[plain.id])).schema_json)));
    await tracker.createTrackerRecord(plain,{date:'2026-09-01',weight:'70'});
    await tracker.updateTrackerModule(plain.id,{...definition,insights:[{type:'trend',label:'體重趨勢',field:'weight',window:10}]});
    assert.equal((await tracker.getTrackerModule(plain.id)).insights[0].type,'trend');
    assert.equal((await tracker.getTrackerRecords(plain.id))[0].data.weight,70);
    await tracker.updateTrackerModule(plain.id,{...definition,insights:[]});
    assert.ok(Array.isArray(JSON.parse((await db.getFirstAsync('SELECT schema_json FROM tracker_modules WHERE id = ?',[plain.id])).schema_json)));
    await assert.rejects(tracker.updateTrackerModule(plain.id,{...definition,insights:[{type:'trend',label:'x',field:'note',window:10}]}));
    const saved = await backup.createBackup();
    const preview = backup.previewBackupJson(JSON.stringify(saved));
    const edited = clone(saved);
    const row = edited.data.tracker_modules.find(item => item.id === created.id);
    const schema = JSON.parse(row.schema_json); schema.insights = []; row.schema_json = JSON.stringify(schema);
    await backup.importBackup(backup.previewBackupJson(JSON.stringify(edited)),'merge');
    assert.equal((await tracker.getTrackerModule(created.id)).insights.length,2);
    await backup.importBackup(preview,'replace');
    assert.equal((await tracker.getTrackerModule(created.id)).insights[1].type,'duration');
    const broken = clone(saved);
    const brokenRow = broken.data.tracker_modules.find(item => item.id === created.id);
    const brokenSchema = JSON.parse(brokenRow.schema_json); brokenSchema.insights[0].field = 'flow'; brokenRow.schema_json = JSON.stringify(brokenSchema);
    assert.throws(() => backup.previewBackupJson(JSON.stringify(broken)));
    await tracker.deleteTrackerModule(created.id);
    await tracker.deleteTrackerModule(plain.id);
  });
  await test('AI design may pick insight blocks but invalid insight output is rejected', async () => {
    responseText = JSON.stringify(period);
    const designed = await ai.designTrackerModule('月經紀錄，想推算下次和排卵期');
    assert.equal(designed.insights[0].offsets[0].label,'排卵日');
    assert.match(JSON.stringify(lastBody),/cycle/);
    responseText = JSON.stringify({...period,insights:[{type:'script',label:'x',code:'alert(1)'}]});
    await assert.rejects(ai.designTrackerModule('月經紀錄'));
    assert.equal((await tracker.getTrackerModules()).length,0);
  });
  const periodStarts = ['2026-06-01','2026-06-29','2026-07-28','2026-08-25'];
  await test('calendar projections repeat the average cycle with spread and ranges, never on or before the latest record', () => {
    const module = {...tracker.validateTrackerModuleDefinition(period), id:'p1'};
    module.insights[0].offsets.push({label:'早期',from:-30,to:-27});
    const records = periodStarts.map(start_date => rec({start_date}));
    const october = clone(insightsService.projectTrackerDates(module, records, '2026-10-01', '2026-11-01', new Date(2026, 8, 10)));
    const byLabel = label => october.filter(item => item.label === label).map(item => item.date);
    assert.deepEqual(byLabel('下次月經（預測）'), ['2026-10-19','2026-10-20','2026-10-21']);
    assert.deepEqual(byLabel('排卵日'), ['2026-10-06']);
    assert.deepEqual(byLabel('易孕期'), ['2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05','2026-10-06','2026-10-07','2026-10-29','2026-10-30','2026-10-31']);
    assert.ok(october.every(item => item.moduleId === 'p1' && item.moduleName === '月經紀錄'));
    const august = clone(insightsService.projectTrackerDates(module, records, '2026-08-01', '2026-09-01', new Date(2026, 8, 10)));
    assert.deepEqual(august.map(item => item.date), ['2026-08-26']);
    assert.deepEqual(clone(insightsService.projectTrackerDates(module, records.slice(0, 1), '2026-06-01', '2027-01-01')), []);
  });
  await test('home highlights show upcoming, active-range and overdue cycles but go quiet when far or stale', () => {
    const module = {...tracker.validateTrackerModuleDefinition(period), id:'p1'};
    const records = periodStarts.map(start_date => rec({start_date}));
    const at = (month, day) => clone(insightsService.trackerHighlights(module, records, new Date(2026, month - 1, day, 21)));
    assert.deepEqual(at(9, 10), [{moduleId:'p1',moduleName:'月經紀錄',text:'下次月經還有 12 天（9/22）'}]);
    assert.equal(at(9, 5)[0].text, '下次月經還有 17 天（9/22），今天在易孕期');
    assert.deepEqual(at(9, 1), []);
    assert.equal(at(9, 22)[0].text, '下次月經預測是今天');
    assert.equal(at(9, 30)[0].text, '下次月經已過預測日 8 天');
    assert.deepEqual(at(11, 30), []);
  });
  await test('Ask Lumi receives locally computed insight summaries; a module with broken records is skipped, not fatal', async () => {
    const created = await tracker.createTrackerModule(period);
    for (const start_date of periodStarts) await tracker.createTrackerRecord(created, {start_date, end_date: start_date === '2026-08-25' ? '2026-08-29' : ''});
    const lines = clone(insightsService.describeInsightResults(created, await tracker.getTrackerRecords(created.id), new Date(2026, 8, 10)));
    assert.equal(lines[0], '月經紀錄／下次月經：預測下次 2026-09-22（±1 天）；距今天 12 天；平均週期 28.3 天（28–29，3 次間隔）；最近一次 2026-08-25；排卵日 2026-09-08；易孕期 2026-09-03～2026-09-09');
    assert.equal(lines[1], '月經紀錄／經期天數：最近 5 天，平均 5 天（1 次）');
    const month = clone(await tracker.getTrackerProjections('2026-09-01', '2026-10-01', new Date(2026, 8, 10)));
    assert.ok(month.some(item => item.date === '2026-09-22' && item.moduleId === created.id));
    const highlights = clone(await tracker.getTrackerHighlights(new Date(2026, 8, 10)));
    assert.equal(highlights[0].moduleId, created.id);
    responseText = 'test response';
    await ai.askLumi('下次月經什麼時候？');
    const sent = JSON.stringify(lastBody);
    assert.match(sent, /自訂模組推算/);
    assert.match(sent, /月經紀錄／下次月經：預測下次 2026-09-22/);
    assert.match(sent, /不自行重算/);
    const plain = await tracker.createTrackerModule(definition);
    assert.equal((await tracker.getTrackerProjections('2026-09-01', '2026-10-01')).filter(item => item.moduleId === plain.id).length, 0);
    await db.runAsync('UPDATE tracker_records SET data_json = ? WHERE module_id = ?', ['{"start_date":"2026-99-99"}', created.id]);
    assert.deepEqual(clone(await tracker.getTrackerProjections('2026-09-01', '2026-10-01')), []);
    assert.match(await tracker.buildTrackerInsightContext(), /目前沒有設定推算的自訂模組/);
    // A broken record is skipped by the shared event stream, so timeline and Ask Lumi keep working.
    await tracker.createTrackerRecord(plain, {date:'2026-09-30', weight:'71'});
    const streamed = await stream.getEventStream({types:['tracker']});
    assert.ok(!streamed.some(event => event.moduleId === created.id));
    assert.ok(streamed.some(event => event.moduleId === plain.id));
    responseText = 'test response';
    await ai.askLumi('最近體重？');
    assert.match(JSON.stringify(lastBody), /71 公斤/);
    assert.equal((await stream.getEventStream({types:['tracker'], limit:1})).length, 1);
    await tracker.deleteTrackerModule(created.id);
    await tracker.deleteTrackerModule(plain.id);
  });
  await test('cycle reminders validate 0-14 days and plan one 09:00 notification for the next date only', () => {
    const withReminder = days => ({...period, insights:[{...period.insights[0], remindDaysBefore: days}]});
    for (const days of [-1, 15, 1.5, '2']) assert.throws(() => tracker.validateTrackerModuleDefinition(withReminder(days)));
    const module = {...tracker.validateTrackerModuleDefinition(withReminder(2)), id:'p1'};
    const records = periodStarts.map(start_date => rec({start_date}));
    const [plan] = insightsService.planTrackerReminders(module, records, new Date(2026, 8, 10, 12));
    assert.equal(plan.id, 'lumi-tracker-p1-0');
    assert.equal(plan.moduleId, 'p1');
    assert.equal(plan.date.getFullYear() + '-' + (plan.date.getMonth() + 1) + '-' + plan.date.getDate() + ' ' + plan.date.getHours(), '2026-9-20 9');
    assert.equal(plan.body, '下次月經預計 9/22，還有 2 天');
    assert.equal(plan.title, 'Lumi 推算提醒');
    assert.deepEqual(clone(insightsService.planTrackerReminders(module, records, new Date(2026, 8, 20, 9, 0))), []);
    const sameDay = {...tracker.validateTrackerModuleDefinition(withReminder(0)), id:'p1'};
    assert.equal(insightsService.planTrackerReminders(sameDay, records, new Date(2026, 8, 20))[0].body, '下次月經預計今天（9/22）');
    const off = {...tracker.validateTrackerModuleDefinition(period), id:'p1'};
    assert.deepEqual(clone(insightsService.planTrackerReminders(off, records, new Date(2026, 8, 10))), []);
    assert.deepEqual(clone(insightsService.planTrackerReminders(module, records.slice(0, 1), new Date(2026, 5, 2))), []);
  });
  await test('reminder sync replaces only module reminders, never prompts, and hides content on the lock screen', async () => {
    const notify = load('services/notificationService.ts');
    const created = await tracker.createTrackerModule({...period, insights:[{...period.insights[0], remindDaysBefore: 1}]});
    const futureStart = new Date(); futureStart.setDate(futureStart.getDate() - 20);
    const iso = date => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    const earlier = new Date(futureStart); earlier.setDate(earlier.getDate() - 28);
    for (const date of [earlier, futureStart]) await tracker.createTrackerRecord(created, {start_date: iso(date)});
    notificationState.scheduled = [
      {identifier:'lumi-task-keep', content:{}, trigger:{}},
      {identifier:'lumi-tracker-stale-0', content:{}, trigger:{}},
    ];
    await notify.syncTrackerReminders();
    assert.deepEqual(notificationState.scheduled.map(item => item.identifier), ['lumi-task-keep', 'lumi-tracker-' + created.id + '-0']);
    const scheduled = notificationState.scheduled[1];
    assert.equal(scheduled.trigger.channelId, 'lumi-tracker-reminders');
    assert.deepEqual(clone(scheduled.content.data), {type:'tracker', moduleId: created.id});
    assert.equal(notificationState.channels.find(channel => channel.id === 'lumi-tracker-reminders').lockscreenVisibility, 0);
    await Promise.all([notify.syncTrackerReminders(), notify.syncTrackerReminders()]);
    assert.equal(notificationState.scheduled.length, 2);
    notificationState.granted = false;
    await notify.syncTrackerReminders();
    assert.deepEqual(notificationState.scheduled.map(item => item.identifier), ['lumi-task-keep']);
    assert.equal(notificationState.prompts, 0);
    await notify.confirmTrackerReminderPermission(created);
    assert.equal(notificationState.prompts, 1);
    assert.equal(alerts.pop()[0], '提醒未開啟');
    await notify.confirmTrackerReminderPermission(tracker.validateTrackerModuleDefinition(definition));
    assert.equal(notificationState.prompts, 1);
    notificationState.granted = true;
    await tracker.deleteTrackerModule(created.id);
    await notify.syncTrackerReminders();
    assert.deepEqual(notificationState.scheduled.map(item => item.identifier), ['lumi-task-keep']);
  });
  await test('built-in templates pass the same validation, create without AI and project once recorded', async () => {
    const templates = load('services/trackerTemplates.ts');
    const calls = generationCalls;
    assert.deepEqual(clone(templates.TRACKER_TEMPLATES.map(template => template.id)), ['period','weight','routine']);
    for (const template of templates.TRACKER_TEMPLATES) {
      const valid = clone(tracker.validateTrackerModuleDefinition(templates.templateDefinition(template.id)));
      assert.deepEqual(valid, clone(template.definition), template.id);
    }
    const copy = templates.templateDefinition('period');
    copy.insights[0].offsets.pop();
    assert.equal(templates.TRACKER_TEMPLATES[0].definition.insights[0].offsets.length, 2);
    assert.equal(templates.templateDefinition('missing'), null);
    const created = await tracker.createTrackerModule(templates.templateDefinition('period'));
    await tracker.createTrackerRecord(created, {start_date:'2026-08-25', end_date:'2026-08-29', flow:'中'});
    await tracker.createTrackerRecord(created, {start_date:'2026-09-22'});
    const [cycle, duration] = clone(insightsService.computeTrackerInsights(created, await tracker.getTrackerRecords(created.id), new Date(2026, 9, 1)));
    assert.equal(cycle.next, '2026-10-20');
    assert.deepEqual(cycle.ranges.map(range => range.label), ['排卵日','易孕期']);
    assert.equal(duration.latest, 5);
    assert.equal(generationCalls, calls);
    await tracker.deleteTrackerModule(created.id);
  });
  await test('learned categories follow the user\'s own kept choices; AI finance output is validated and hinted', async () => {
    const cls = load('services/classificationService.ts');
    const insert = (item, category, extra = {}) => db.runAsync(
      'INSERT INTO transactions (id, entry_id, type, item, amount, category, income_kind, is_adjustment, created_at) VALUES (?, NULL, ?, ?, 100, ?, NULL, ?, ?)',
      [randomUUID(), extra.type ?? 'expense', item, category, extra.adjustment ? 1 : 0, extra.at ?? '2026-10-01T12:00:00.000']);
    await insert('咖啡豆', 'daily'); await insert('咖啡豆', 'daily'); await insert('咖啡豆', 'education');
    await insert('咖啡豆', 'interest', {adjustment: true}); await insert('咖啡豆', 'interest', {adjustment: true}); await insert('咖啡豆', 'interest', {adjustment: true});
    await insert('胖老爹', 'other'); await insert('胖老爹', 'other');
    assert.equal(await cls.getLearnedCategory('咖啡豆 450'), 'daily');
    assert.equal(await cls.getLearnedCategory('昨天 咖啡豆 $1,450'), 'daily');
    assert.equal(await cls.getLearnedCategory('胖老爹 320'), null); // "other" teaches nothing
    assert.equal(await cls.getLearnedCategory('沒記過的東西 99'), null);
    assert.equal(cls.extractItemName('10/15 午餐 NT$1,200'), '午餐');
    await db.runAsync("DELETE FROM transactions WHERE item IN ('咖啡豆', '胖老爹')");

    const categories = [{value:'food',label:'餐飲',color:'#fff'},{value:'entertainment',label:'娛樂',color:'#fff'},{value:'pets',label:'寵物',color:'#fff'}];
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const iso = date => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    responseText = JSON.stringify({type:'FINANCE', amount:60, category:'food', transactionType:'expense', date: iso(yesterday)});
    let parsed = clone(await ai.classifyTextWithAI('昨天 珍奶 60', categories));
    assert.equal(parsed.date, iso(yesterday));
    const prompt = JSON.stringify(lastBody);
    assert.match(prompt, /影音串流訂閱/);
    assert.match(prompt, /pets：寵物/);
    assert.doesNotMatch(prompt, /pets：寵物（/); // custom categories get no invented hint
    assert.match(prompt, /incomeKind/);
    responseText = JSON.stringify({type:'FINANCE', amount:'abc', transactionType:'income', incomeKind:'weird', date: iso(new Date(now.getFullYear() + 1, 0, 1))});
    parsed = clone(await ai.classifyTextWithAI('薪水', categories));
    assert.equal(parsed.amount, undefined);
    assert.equal(parsed.incomeKind, undefined);
    assert.equal(parsed.date, undefined);
    responseText = JSON.stringify({type:'TASK', dueDate:'2026-12-01', date: iso(yesterday)});
    parsed = clone(await ai.classifyTextWithAI('交報告', categories));
    assert.equal(parsed.date, undefined);
    assert.equal(parsed.dueDate, '2026-12-01');
    responseText = JSON.stringify({type:'FINANCE', amount:42000, transactionType:'income', incomeKind:'fixed'});
    assert.equal(clone(await ai.classifyTextWithAI('薪水 42000', categories)).incomeKind, 'fixed');
  });
  await test('finance insights compare with the usual month, find changes, small leaks and fixed costs', async () => {
    const fi = load('services/financeInsightService.ts');
    const tx = (date, item, amount, category, extra = {}) => ({id: randomUUID(), entry_id: null, type: 'expense', item, amount, category,
      income_kind: null, is_adjustment: 0, created_at: date + 'T12:00:00.000', ...extra});
    const rows = [];
    for (const [month, transport] of [['2026-07', 600], ['2026-08', 400], ['2026-09', 800]]) {
      rows.push(tx(month + '-01', '房租', 12000, 'housing'), tx(month + '-10', '電話費', 599, 'communication'),
        tx(month + '-15', 'Netflix', 390, 'entertainment'), tx(month + '-12', '捷運', transport, 'transport'),
        ...[5, 15, 25].map(day => tx(`${month}-${String(day).padStart(2, '0')}`, '午餐', 1000, 'food')));
    }
    rows.push(tx('2026-10-01', '房租', 12000, 'housing'), tx('2026-10-10', '電話費', 599, 'communication'),
      tx('2026-10-05', '午餐', 1000, 'food'), tx('2026-10-15', '午餐', 1000, 'food'),
      tx('2026-10-03', '高鐵', 1490, 'transport'), ...[6, 7, 8].map(day => tx(`2026-10-0${day}`, '計程車', 250, 'transport')),
      ...[10, 11, 12, 13, 14, 15].map(day => tx(`2026-10-${day}`, '手搖飲', 55, 'food')),
      tx('2026-10-19', '對帳調整', 99999, 'other', {is_adjustment: 1}), tx('2026-10-18', '薪水', 42000, null, {type: 'income'}),
      tx('2026-10-25', '未來的帳', 5000, 'other'));
    const now = new Date(2026, 9, 19, 20, 0);
    const result = clone(fi.computeFinanceInsights(rows, '2026-10', now, '2026-07-01T09:00:00.000', null));
    assert.deepEqual({...result.pulse, vsTypical: Math.round(result.pulse.vsTypical * 1000)}, {
      month: '2026-10', isCurrent: true, day: 19, daysInMonth: 31, daysLeft: 13, spent: 17169, historyMonths: 3,
      typicalSoFar: 15589, typicalTotal: 16589, vsTypical: 101, projected: 18169, projectedBasis: 'history',
      dailyAllowance: 0, allowanceBasis: 'typical',
    });
    assert.deepEqual(result.changes.map(change => [change.category, change.diff]), [['transport', 1640], ['entertainment', -390]]);
    assert.deepEqual(result.changes[0].drivers, [{item: '高鐵', total: 1490, count: 1}, {item: '計程車', total: 750, count: 3}]);
    assert.deepEqual(result.smallSpends, [{item: '手搖飲', category: 'food', count: 6, total: 330, yearly: 4015}]);
    assert.deepEqual(result.fixedCosts.map(cost => [cost.item, cost.monthly, cost.paidThisMonth]),
      [['房租', 12000, true], ['電話費', 599, true], ['Netflix', 390, false]]); // 捷運 varies, 午餐 is 3×/month
    assert.equal(result.fixedTotal, 12989);

    const budgeted = clone(fi.computeFinanceInsights(rows, '2026-10', now, '2026-07-01T09:00:00.000', 20000)).pulse;
    assert.deepEqual([budgeted.dailyAllowance, budgeted.allowanceBasis], [217, 'budget']);
    // Records began mid-August: August is half-tracked, so only September counts as "usual".
    const partial = clone(fi.computeFinanceInsights(rows, '2026-10', now, '2026-08-15T09:00:00.000', null));
    assert.equal(partial.pulse.historyMonths, 1);
    assert.deepEqual(partial.fixedCosts, []);
    const fresh = clone(fi.computeFinanceInsights(rows, '2026-10', now, '2026-10-01T09:00:00.000', null));
    assert.deepEqual([fresh.pulse.historyMonths, fresh.pulse.vsTypical, fresh.pulse.projectedBasis, fresh.pulse.projected, fresh.pulse.dailyAllowance],
      [0, null, 'pace', Math.round(17169 / 19 * 31), null]);
    assert.deepEqual(fresh.changes, []);
    const past = clone(fi.computeFinanceInsights(rows, '2026-09', now, '2026-07-01T09:00:00.000', null)).pulse;
    assert.deepEqual([past.isCurrent, past.day, past.daysLeft, past.spent, past.projected, past.dailyAllowance], [false, 30, 0, 16789, 16789, null]);
    assert.equal(clone(fi.computeFinanceInsights(rows, '2026-11', now, '2026-07-01T09:00:00.000', null)).pulse.day, 0);

    for (const row of rows) {
      await db.runAsync('INSERT INTO transactions (id, entry_id, type, item, amount, category, income_kind, is_adjustment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [row.id, null, row.type, row.item, row.amount, row.category, null, row.is_adjustment, row.created_at]);
    }
    const loaded = clone(await fi.getFinanceInsights('2026-10', now));
    assert.equal(loaded.pulse.spent, 17169); // adjustment and income excluded, future row after today ignored
    assert.equal(loaded.fixedTotal, 12989);
    await db.runAsync('DELETE FROM transactions WHERE id IN (' + rows.map(() => '?').join(',') + ')', rows.map(row => row.id));
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
    assert.match(lastUrl,/gemini-3\.6-flash:generateContent$/);
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
