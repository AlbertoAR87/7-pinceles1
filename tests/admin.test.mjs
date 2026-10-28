import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createAdminPanel, madridUTC, madridInput } from '../admin.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 5));
function setup(handler = () => ({ data: null, error: null })) {
  const dom = new JSDOM('<section id="adminPanel" hidden></section>', { url: 'https://sietepinceles.es/' });
  dom.window.confirm = () => true;
  const root = dom.window.document.querySelector('section');
  const calls = [];
  const panel = createAdminPanel(root, { rpc: async (_, args) => { calls.push(args); return handler(args.action, args.payload); } });
  const buttons = () => [...root.querySelectorAll('button')];
  const click = text => buttons().find(button => button.textContent === text).click();
  return { dom, root, panel, calls, click };
}
const owner = { role: 'admin', is_owner: true, permissions: ['members', 'workshops', 'resources'] };

test('nonadmins and editable metadata cannot reveal panel or trigger private lists', async () => {
  const t = setup();
  await t.panel.setUser({ id: 'normal', user_metadata: { role: 'admin', is_owner: true } });
  assert.equal(t.root.hidden, true);
  assert.deepEqual(t.calls.map(call => call.action), ['access']);
  t.dom.window.close();
});
test('panel fails closed on access lookup failure', async () => {
  const t = setup(() => ({ data: null, error: { code: '500' } }));
  await t.panel.setUser({ id: 'x' });
  assert.equal(t.root.hidden, true);
  assert.equal(t.root.textContent, '');
  t.dom.window.close();
});
test('delegated admin sees only granted area; founder gets access and audit management', async () => {
  const t = setup(action => ({ data: action === 'access' ? { role: 'admin', is_owner: false, permissions: ['resources'] } : [], error: null }));
  await t.panel.setUser({ id: 'x' });
  assert.equal(t.root.hidden, false);
  assert.equal(t.root.textContent.includes('Administradores'), false);
  assert.equal(t.root.textContent.includes('Asociados y solicitudes'), false);
  t.click('Administración'); await tick();
  assert.equal(t.calls.at(-1).action, 'resources_list');
  t.dom.window.close();
  const o = setup(action => ({ data: action === 'access' ? owner : [], error: null }));
  await o.panel.setUser({ id: 'owner' });
  assert.match(o.root.textContent, /Administradores/);
  assert.match(o.root.textContent, /Historial/);
  o.dom.window.close();
});
test('logout discards an in-flight access response', async () => {
  let resolveAccess;
  const t = setup(() => new Promise(resolve => { resolveAccess = resolve; }));
  const pending = t.panel.setUser({ id: 'owner' });
  await t.panel.setUser(null);
  resolveAccess({ data: owner, error: null }); await pending;
  assert.equal(t.root.hidden, true); assert.equal(t.root.textContent, '');
  t.dom.window.close();
});
test('late private data cannot reappear after logout and user text cannot inject markup', async () => {
  let resolveList;
  const t = setup(action => action === 'access' ? { data: owner, error: null } : new Promise(resolve => { resolveList = resolve; }));
  await t.panel.setUser({ id: 'owner' }); t.click('Administración');
  await t.panel.setUser(null);
  resolveList({ data: [{ full_name: '<img src=x onerror=alert(1)>', membership_status: 'registered' }], error: null }); await tick();
  assert.equal(t.root.hidden, true); assert.equal(t.root.textContent, '');
  t.dom.window.close();
  const x = setup(action => ({ data: action === 'access' ? owner : [{ full_name: '<img src=x onerror=alert(1)>', membership_status: 'registered' }], error: null }));
  await x.panel.setUser({ id: 'owner' }); x.click('Administración'); await tick();
  assert.equal(x.root.querySelector('img'), null); assert.match(x.root.textContent, /<img/);
  x.dom.window.close();
});
test('membership changes include optimistic concurrency markers and require confirmation', async () => {
  const row = { user_id: 'user-b', full_name: 'Prueba', membership_status: 'pending', application_status: 'pending', updated_at: '2026-10-01T00:00:00Z' };
  const t = setup(action => ({ data: action === 'access' ? owner : action === 'member_save' ? { ok: true } : [row], error: null }));
  await t.panel.setUser({ id: 'owner' }); t.click('Administración'); await tick();
  const form = t.root.querySelector('.admin-card form');
  t.dom.window.confirm = () => false;
  form.dispatchEvent(new t.dom.window.Event('submit', { cancelable: true })); await tick();
  assert.equal(t.calls.some(call => call.action === 'member_save'), false);
  t.dom.window.confirm = () => true;
  form.dispatchEvent(new t.dom.window.Event('submit', { cancelable: true })); await tick();
  const call = t.calls.find(call => call.action === 'member_save');
  assert.equal(call.payload.membership_status, 'active');
  assert.equal(call.payload.expected_updated_at, row.updated_at);
  assert.equal(call.payload.expected_application_status, 'pending');
  t.dom.window.close();
});
test('revocation from server immediately removes administrative contents', async () => {
  const t = setup(action => action === 'access' ? { data: owner, error: null } : { data: null, error: { code: '42501' } });
  await t.panel.setUser({ id: 'owner' }); t.click('Administración'); await tick();
  assert.equal(t.root.hidden, true); assert.equal(t.root.textContent, '');
  t.dom.window.close();
});
test('Madrid dates remain correct across summer/winter and reject ambiguous/nonexistent hours', () => {
  assert.equal(madridUTC('2026-11-15T17:00'), '2026-11-15T16:00:00.000Z');
  assert.equal(madridUTC('2026-07-15T17:00'), '2026-07-15T15:00:00.000Z');
  assert.equal(madridInput('2026-07-15T15:00:00Z'), '2026-07-15T17:00');
  assert.throws(() => madridUTC('2026-10-25T02:30'), /hora/);
  assert.throws(() => madridUTC('2026-03-29T02:30'), /hora/);
  assert.equal(madridUTC(''), null);
});
