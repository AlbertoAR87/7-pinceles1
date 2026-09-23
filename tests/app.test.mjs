import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const html = await readFile('index.html', 'utf8');
const calendarSource = (await readFile('calendar.js', 'utf8')).replace('export function', 'function');
const source = calendarSource + '\n' + (await readFile('app.js', 'utf8'))
  .replace(/^import .*?;\r?\n/gm, '')
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

test('calendar is private, loads for registered nonmembers, keeps undated activities outside grid and clears on logout', async () => {
  const t = setup({query:s=>s.table==='workshops' ? {data:[{title:'Taller pendiente',starts_at:null,description:'Octubre por confirmar'}],error:null}:undefined});
  assert.equal(t.$('#privateCalendar').hidden,true);
  assert.equal(t.calls.some(c=>c.table==='workshops'),false);
  t.event('SIGNED_IN'); await wait();
  assert.equal(t.$('#privateCalendar').hidden,false);
  assert.match(t.$('[data-pending]').textContent,/Taller pendiente/);
  assert.equal(t.$('[data-days]').querySelectorAll('button').length,0);
  assert.equal(t.calls.find(c=>c.table==='workshops').is_published,true);
  t.event('TOKEN_REFRESHED'); await wait();
  assert.equal(t.calls.filter(c=>c.table==='workshops').length,1);
  t.event('SIGNED_OUT',null); await wait();
  assert.equal(t.$('#privateCalendar').hidden,true);
  assert.equal(t.$('[data-pending]').textContent,'');
  t.dom.window.close();
});

test('calendar uses Madrid dates, supports month navigation and escapes event text', async () => {
  const now = new Date();
  const month = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit'}).format(now);
  const t = setup({query:s=>s.table==='workshops' ? {data:[{title:'<img src=x onerror=alert(1)>',starts_at:month+'-01T23:30:00Z'}],error:null}:undefined});
  t.event('SIGNED_IN'); await wait();
  assert.ok(t.$(`[data-day="${month}-02"]`));
  t.$(`[data-day="${month}-02"]`).click();
  assert.match(t.$('[data-agenda-title]').textContent,/del 2/);
  assert.equal(t.$('[data-agenda]').querySelector('img'),null);
  assert.match(t.$('[data-agenda]').textContent,/<img/);
  const original=t.$('[data-month]').textContent;
  t.$('[data-shift="1"]').click(); assert.notEqual(t.$('[data-month]').textContent,original);
  t.$('[data-shift="-1"]').click(); assert.equal(t.$('[data-month]').textContent,original);
  t.dom.window.close();
});

test('late calendar response cannot reappear after logout', async () => {
  let finish;
  const t=setup({query:s=>s.table==='workshops' ? new Promise(resolve=>finish=resolve):undefined});
  t.event('SIGNED_IN'); await wait(); t.event('SIGNED_OUT',null); await wait();
  finish({data:[{title:'Private event',starts_at:null}],error:null}); await wait();
  assert.equal(t.$('#privateCalendar').hidden,true);
  assert.equal(t.$('[data-pending]').textContent,''); t.dom.window.close();
});

test('calendar load errors can be retried without opening registrations', async () => {
  let fails=true;
  const t=setup({query:s=>s.table==='workshops' ? {data:[],error:fails?{message:'offline'}:null}:undefined});
  t.event('SIGNED_IN'); await wait();
  assert.match(t.$('[data-calendar-status]').textContent,/No se pudo/);
  assert.equal(t.$('[data-retry]').disabled,false);
  fails=false;t.$('[data-retry]').click();await wait();
  assert.equal(t.$('[data-calendar-body]').hidden,false);
  assert.match(t.$('[data-calendar-status]').textContent,/Todavía no hay/);t.dom.window.close();
});

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
test('token refresh preserves an active member profile and resources', async () => {
  const t=setup({status:'active'}); t.event('SIGNED_IN'); await wait();
  assert.equal(t.$('#resourcesBox').hidden,false);
  t.event('TOKEN_REFRESHED'); await wait();
  assert.equal(t.$('#resourcesBox').hidden,false); t.dom.window.close();
});
test('successful password recovery calls updateUser and restores private area', async () => {
  let saved;
  const t=setup({auth:{updateUser:async payload=>{saved=payload; return {error:null};}}});
  t.event('PASSWORD_RECOVERY'); await wait();
  t.$('#newPassword').value='NewExample123!'; t.$('#confirmPassword').value='NewExample123!';
  t.submit('#newPasswordForm'); await wait();
  assert.equal(saved.password,'NewExample123!');
  assert.match(t.$('#authMsg').textContent,/actualizada/);
  assert.equal(t.$('#memberPanel').hidden,false); t.dom.window.close();
});
test('registration uses the hosting base URL for email confirmation', async () => {
  let saved;
  const t=setup({auth:{signUp:async payload=>{saved=payload; return {data:{session:null},error:null};}}});
  t.$('#registerName').value='Prueba Web'; t.$('#registerEmail').value='test@example.org';
  t.$('#registerPassword').value='Example123!'; t.$('#registerPrivacy').checked=true;
  t.submit('#registerForm'); await wait();
  assert.equal(saved.options.emailRedirectTo,'https://example.org/7-pinceles1/');
  assert.match(t.$('#authMsg').textContent,/Revisa tu correo/); t.dom.window.close();
});
test('profile update sends editable fields and updates greeting', async () => {
  const t=setup(); t.event('SIGNED_IN'); await wait();
  t.$('#profileName').value='Nombre Editado'; t.submit('#profileForm'); await wait();
  const call=t.calls.find(c=>c.operation==='update');
  assert.deepEqual(Object.keys(call.payload).sort(),['city','full_name','phone']);
  assert.equal(t.$('#memberGreeting').textContent,'Hola, Nombre'); t.dom.window.close();
});
