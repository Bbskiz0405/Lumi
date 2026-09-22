// Deterministic, offline transport checks: simulated clock, no credentials/network/device data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../services/geminiTransport.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function harness(sequence) {
  let now = 0, timerId = 0;
  const timers = new Map(), calls = [];
  const exports = {};
  const math = Object.create(Math); math.random = () => 0;
  vm.runInNewContext(code, {
    exports, AbortController, Error, TypeError, Math: math,
    Date: class extends Date { static now() { return now; } },
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, {fn, at:now + ms}); return id; },
    clearTimeout: id => timers.delete(id),
    fetch: async (url, options) => {
      const spec = sequence[Math.min(calls.length, sequence.length - 1)];
      calls.push({url, options, at:now});
      if (spec.network) throw new TypeError('Sensitive upstream details: secret-test-key');
      if (spec.hang) return new Promise(() => {});
      return {
        ok: (spec.status ?? 200) === 200, status: spec.status ?? 200,
        headers: { get: () => spec.retryAfter ?? null },
        json: () => spec.bodyHang ? new Promise(() => {}) : spec.badJson ? Promise.reject(new SyntaxError('secret-test-key')) : Promise.resolve({ok:true}),
      };
    },
  });
  return {
    calls, timers,
    run: async (options = {}) => {
      let done = false, value, error;
      exports.requestGeminiJson('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
        'secret-test-key', {contents:[{parts:[{text:'Reply OK.'}]}]}, options)
        .then(result => {value = result; done = true;}, failure => {error = failure; done = true;});
      for (let step = 0; !done && step < 30; step++) {
        for (let flush = 0; flush < 30; flush++) await Promise.resolve();
        if (done) break;
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        assert.ok(next, 'Pending request must have a deadline');
        now = next[1].at; timers.delete(next[0]); next[1].fn();
      }
      assert.ok(done, 'Operation must settle');
      assert.equal(timers.size, 0, 'All timers must be cleaned up');
      if (error) assert.ok(!error.message.includes('secret-test-key'));
      return {value, error, elapsed:now};
    },
  };
}

(async () => {
  let checks = 0;
  async function test(name, fn) { await fn(); checks++; console.log('PASS ' + name); }
  await test('503 then success retries identical model/body with header auth and backoff', async () => {
    const h = harness([{status:503}, {}]), retry = [];
    const result = await h.run({onRetry: attempt => retry.push(attempt)});
    assert.ok(result.value.ok); assert.equal(h.calls.length, 2); assert.deepEqual(retry, [2]);
    assert.equal(h.calls[1].at, 750);
    assert.equal(h.calls[0].url, h.calls[1].url);
    assert.equal(h.calls[0].options.body, h.calls[1].options.body);
    assert.equal(h.calls[0].options.headers['x-goog-api-key'], 'secret-test-key');
    assert.ok(!h.calls[0].url.includes('secret-test-key'));
  });
  await test('permanent 503 stops at three attempts', async () => {
    const h = harness([{status:503}]);
    assert.match((await h.run()).error.message, /503/); assert.equal(h.calls.length, 3);
    assert.deepEqual(h.calls.map(call => call.at), [0, 750, 2250]);
  });
  await test('availability probes can disable retries without masking a failure', async () => {
    const h = harness([{status:503}, {}]); assert.match((await h.run({maxAttempts:1})).error.message, /503/); assert.equal(h.calls.length, 1);
  });
  await test('400/401/403/404/429 are never retried', async () => {
    for (const status of [400, 401, 403, 404, 429]) {
      const h = harness([{status}]); assert.ok((await h.run()).error); assert.equal(h.calls.length, 1);
    }
  });
  await test('Retry-After seconds/date honored; excessive wait never retried early', async () => {
    for (const retryAfter of ['2', 'Thu, 01 Jan 1970 00:00:02 GMT']) {
      const h = harness([{status:503,retryAfter}, {}]); assert.ok((await h.run()).value.ok); assert.equal(h.calls[1].at, 2000);
    }
    const h = harness([{status:503,retryAfter:'120'}]); assert.ok((await h.run()).error); assert.equal(h.calls.length, 1);
  });
  await test('network failure and attempt timeout can recover', async () => {
    for (const spec of [{network:true}, {hang:true}]) {
      const h = harness([spec, {}]); assert.ok((await h.run()).value.ok); assert.equal(h.calls.length, 2);
      if (spec.hang) assert.ok(h.calls[0].options.signal.aborted);
    }
  });
  await test('hung fetch and hung body both stop within total 65 second budget', async () => {
    for (const spec of [{hang:true}, {bodyHang:true}]) {
      const h = harness([spec]); const result = await h.run();
      assert.match(result.error.message, /逾時/); assert.equal(result.elapsed, 65000);
      assert.equal(h.calls.length, 3); assert.ok(h.calls.every(call => call.options.signal.aborted));
    }
  });
  await test('classification retains 12 second cap; malformed JSON is not retried', async () => {
    const h = harness([{bodyHang:true}]); assert.equal((await h.run({timeoutMs:12000})).elapsed, 12000); assert.equal(h.calls.length, 1);
    const bad = harness([{badJson:true}]); assert.match((await bad.run()).error.message, /格式/); assert.equal(bad.calls.length, 1);
  });
  console.log(`All ${checks} Gemini transport checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
