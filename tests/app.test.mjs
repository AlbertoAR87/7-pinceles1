import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const html = await readFile('index.html', 'utf8');
const source = (await readFile('app.js', 'utf8'))
  .replace(/^import .*?;\n/, '')
  .replace(/const supabase = createClient\([\s\S]*?\n\}\);/, 'const supabase = window.testClient;');
const wait = () => new Promise(resolve => setTimeout(resolve, 15));
function setup({status = 'registered', query, auth = {}, url = 'https://example.org/7-pinceles1/'} = {}) {
  const dom = new JSDOM(html, { url, runScripts:'outside-only' });
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  const calls = [];
  let authCallback;
  const account = { id:'user-a', user_metadata:{ full_name:'Prueba' } };
  const record = { user_id:account.id, full_name:'Prueba Web', phone:null, city:null, membership_status:status };
  const client = {
    auth: { onAuthStateChange(callback) { authCallback = callback; },
      signUp: async () => ({ data:{ user:account, session:null }, error:null }),
      signInWithPassword: async () => ({ error:null }),
      resetPasswordForEmail: async () => ({ error:null }),
      updateUser: async () => ({ error:null }), signOut: async () => ({ error:null }), ...auth },
    from(table) {
      const state = { table, operation:'select' };
      const chain = {
        select(fields) { state.fields = fields; return chain; },
        eq(column, value) { state[column] = value; return chain; },
        insert(payload) { state.operation='insert'; state.payload=payload; return chain; },
        update(payload) { state.operation='update'; state.payload=payload; return chain; },
        order() { return chain; }, single() { return chain; }, maybeSingle() { return chain; },
        then(resolve, reject) {
          calls.push({...state});
          let result = query?.(state);
          result ??= { data:table === 'profiles' ? {...record, ...state.payload} : table === 'member_resources' ? [] : null, error:null };
          return Promise.resolve(result).then(resolve,reject);
        }
      };
      return chain;
    }
  };
  w.testClient = client;
  w.eval(source);
  const $ = id => w.document.querySelector(id);
  const submit = id => $(id).dispatchEvent(new w.Event('submit', {bubbles:true,cancelable:true}));
  const event = (name, user = account) => authCallback(name, user ? {user} : null);
  return { dom,w,$,submit,event,calls,client,account };
}

test('Mi cuenta shows private panel without reopening login; signout clears data', async () => {
  const t=setup(); t.event('SIGNED_IN'); await wait();
  assert.equal(t.$('#memberPanel').hidden,false);
  t.$('#authOpenBtn').click(); assert.equal(t.$('#authDialog').open,false);
  t.event('SIGNED_OUT',null); await wait();
  assert.equal(t.$('#memberPanel').hidden,true);
  assert.equal(t.$('#profileName').value,'');
  t.dom.window.close();
});
test('membership insert uses allowed columns, never status', async () => {
  const t=setup(); t.event('SIGNED_IN'); await wait();
  t.$('#privacyCheck').checked=true; t.submit('#membershipForm'); await wait();
  const insert=t.calls.find(call=>call.operation==='insert');
  assert.deepEqual(Object.keys(insert.payload).sort(),['motivation','privacy_accepted_at','user_id']);
  assert.match(t.$('#membershipMsg').textContent,/correctamente/); t.dom.window.close();
});
test('recovery event shows password form before any asynchronous initialization', async () => {
  const t=setup(); t.event('PASSWORD_RECOVERY'); await wait();
  assert.equal(t.$('#newPasswordTab').hidden,false);
  assert.equal(t.$('#memberPanel').hidden,true);
  t.$('#newPassword').value='Different123!'; t.$('#confirmPassword').value='Mismatch123!';
  t.submit('#newPasswordForm'); await wait();
  assert.match(t.$('#authMsg').textContent,/no coinciden/); t.dom.window.close();
});
test('expired recovery link gives actionable feedback', () => {
  const t=setup({url:'https://example.org/#error=access_denied&error_code=otp_expired'});
  assert.equal(t.$('#recoveryTab').hidden,false);
  assert.match(t.$('#authMsg').textContent,/caducado/); t.dom.window.close();
});
test('network exception restores submit button and shows error', async () => {
  const t=setup({auth:{signInWithPassword:async()=>{throw new Error('offline');}}});
  t.$('#loginEmail').value='test@example.org'; t.$('#loginPassword').value='Example123!';
  t.submit('#loginForm'); await wait();
  assert.match(t.$('#authMsg').textContent,/conexión/);
  assert.equal(t.$('#loginForm button').disabled,false); t.dom.window.close();
});
test('double submit makes one login request', async () => {
  let count=0, finish;
  const t=setup({auth:{signInWithPassword:()=>{count++; return new Promise(resolve=>finish=resolve);}}});
  t.$('#loginEmail').value='test@example.org'; t.$('#loginPassword').value='Example123!';
  t.submit('#loginForm'); t.submit('#loginForm'); assert.equal(count,1);
  finish({error:null}); await wait(); t.dom.window.close();
});
test('late profile response after signout cannot reveal private data', async () => {
  let finish;
  const t=setup({query:state=>state.table==='profiles' ? new Promise(resolve=>finish=resolve) : undefined});
  t.event('SIGNED_IN'); await wait(); t.event('SIGNED_OUT',null); await wait();
  finish({data:{full_name:'Private name',membership_status:'active'},error:null}); await wait();
  assert.equal(t.$('#profileName').value,''); assert.equal(t.$('#memberPanel').hidden,true); t.dom.window.close();
});
test('active member resource URLs cannot execute javascript or HTML', async () => {
  const t=setup({status:'active',query:state=>state.table==='member_resources' ? {data:[{title:'<img onerror=alert(1)>',url:'javascript:alert(1)',description:'Prueba'}],error:null} : undefined});
  t.event('SIGNED_IN'); await wait();
  assert.equal(t.$('#resourcesList').querySelector('a,img'),null);
  assert.match(t.$('#resourcesList').textContent,/<img/); t.dom.window.close();
});
test('profile read error never attempts unauthorized profile creation', async () => {
  const t=setup({query:state=>state.table==='profiles' ? {data:null,error:{code:'42501'}} : undefined});
  t.event('SIGNED_IN'); await wait();
  assert.equal(t.calls.some(c=>c.operation==='insert'),false);
  assert.match(t.$('#memberStatus').textContent,/Recargar perfil/); t.dom.window.close();
});
test('nonmembers cannot see or request private resources', async () => {
  const t=setup(); t.event('SIGNED_IN'); await wait();
  assert.equal(t.calls.some(c=>c.table==='member_resources'),false);
  assert.equal(t.$('#resourcesBox').hidden,true); t.dom.window.close();
});
