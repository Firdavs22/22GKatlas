const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const axios = require('axios');

// Execute the actual TS client in an isolated module scope with a fake HTTP adapter.
// No browser, backend, network, or authentication secrets are needed.
function client(adapter) {
  const storage = new Map([['token', 'legacy-access'], ['refreshToken', 'legacy-refresh']]);
  const redirects = [];
  const browser = {
    location: { protocol: 'https:', hostname: 'portal.example', port: '', origin: 'https://portal.example', pathname: '/parent', assign: value => redirects.push(value) },
  };
  const localStorage = { setItem: (k, v) => storage.set(k, v), getItem: k => storage.get(k) || null, removeItem: k => storage.delete(k) };
  const document = { cookie: '' };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const requireTest = name => name === 'axios' ? { isAxiosError: axios.isAxiosError, create: options => axios.create({ ...options, adapter }) } :
      name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name);
    new Function('require', 'module', 'exports', 'window', 'document', 'localStorage', 'process', source)(
      requireTest, mod, mod.exports, browser, document, localStorage, { env: {} },
    );
    return mod.exports;
  }
  return { ...load(path.resolve(__dirname, '../lib/api.ts')), storage, redirects, load };
}
const response = (config, data, status = 200) => ({ config, data, status, statusText: 'OK', headers: {} });
function unauthorized(config) {
  throw new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response(config, {}, 401));
}

test('browser requests erase legacy secrets and never attach Authorization', async () => {
  const requests = [];
  const app = client(async config => {
    requests.push(config);
    return response(config, config.url === '/auth/csrf' ? { csrfToken: 'signed-csrf' } : { user: { id: 'parent' } });
  });
  await app.api.post('/auth/login', { email: 'parent@example.invalid', password: 'test', client: 'web' });
  assert.equal(app.storage.has('token'), false);
  assert.equal(app.storage.has('refreshToken'), false);
  assert.ok(requests.every(config => !config.headers.Authorization && config.withCredentials));
  assert.equal(requests[1].headers['X-XSRF-TOKEN'], 'signed-csrf');
  app.storeAuthData({ user: { id: 'parent' }, token: 'must-not-store', refreshToken: 'must-not-store' });
  assert.deepEqual([...app.storage.keys()], ['user']);
});

test('simultaneous expired requests share one cookie refresh and all resume', async () => {
  let refreshes = 0;
  const app = client(async config => {
    if (config.url === '/auth/csrf') return response(config, { csrfToken: 'signed-csrf' });
    if (config.url === '/auth/refresh') {
      refreshes++;
      assert.deepEqual(JSON.parse(config.data), {});
      assert.equal(config.headers['X-XSRF-TOKEN'], 'signed-csrf');
      await new Promise(resolve => setTimeout(resolve, 10));
      return response(config, { user: { id: 'parent' } });
    }
    if (!config._retry) return unauthorized(config);
    return response(config, { ok: true });
  });
  const results = await Promise.all(['/me', '/children', '/chats'].map(url => app.api.get(url)));
  assert.equal(refreshes, 1);
  assert.ok(results.every(result => result.data.ok));
  assert.equal(app.redirects.length, 0);
});

test('failed refresh settles all callers and a later login can recover', async () => {
  let fail = true;
  const app = client(async config => {
    if (config.url === '/auth/csrf') return response(config, { csrfToken: 'csrf' });
    if (config.url === '/auth/refresh') {
      if (fail) return unauthorized(config);
      return response(config, { user: { id: 'parent' } });
    }
    if (!config._retry) return unauthorized(config);
    return response(config, { ok: true });
  });
  const failures = await Promise.allSettled([app.api.get('/me'), app.api.get('/children')]);
  assert.ok(failures.every(result => result.status === 'rejected'));
  assert.ok(app.redirects.includes('/login'));
  fail = false;
  assert.equal((await app.api.get('/me')).data.ok, true);
});

test('media URLs never include credentials and production uses the same origin', () => {
  const app = client(async config => response(config, {}));
  const { getAuthMediaUrl } = app.load(path.resolve(__dirname, '../lib/media.ts'));
  const { API_URL, WS_URL } = app.load(path.resolve(__dirname, '../lib/network.ts'));
  assert.equal(API_URL, 'https://portal.example');
  assert.equal(WS_URL, API_URL);
  assert.equal(getAuthMediaUrl('https://old-host/api/files/photo.jpg?token=legacy'), 'https://portal.example/api/files/photo.jpg');
  assert.equal(getAuthMediaUrl('/api/files/photo.jpg?token=legacy'), 'https://portal.example/api/files/photo.jpg');
  assert.equal(getAuthMediaUrl('https://external.example/photo.jpg'), 'https://external.example/photo.jpg');
});
