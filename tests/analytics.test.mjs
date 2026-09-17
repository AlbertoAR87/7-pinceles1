import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
const source = await readFile(new URL('../analytics.js', import.meta.url), 'utf8');
function page(url = 'https://sietepinceles.es/', saved) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => {
    if (!error.message.includes('navigation')) throw error;
  });
  const dom = new JSDOM('<button data-cookie-settings>Cookies</button>', { url, runScripts: 'outside-only', virtualConsole });
  if (saved) dom.window.localStorage.setItem('7p-analytics-consent-v1', JSON.stringify(saved));
  dom.window.eval(source);
  return dom;
}
const tag = dom => dom.window.document.querySelector('script[src*="googletagmanager"]');
test('analytics sends nothing before consent or after rejection', () => {
  const dom = page();
  assert.equal(tag(dom), null);
  assert.equal(dom.window.dataLayer, undefined);
  dom.window.document.querySelector('[data-choice="rejected"]').click();
  assert.equal(tag(dom), null);
  assert.equal(JSON.parse(dom.window.localStorage.getItem('7p-analytics-consent-v1')).choice, 'rejected');
  dom.window.close();
});

test('saved decisions persist and withdrawal disables collection and deletes GA cookies', () => {
  for (const choice of ['accepted', 'rejected']) {
    const dom = page(undefined, { choice, expires: Date.now() + 10000 });
    assert.equal(dom.window.document.querySelector('.cookie-panel').hidden, true);
    assert.equal(!!tag(dom), choice === 'accepted');
    if (choice === 'accepted') {
      dom.window.document.cookie = '_ga=test; Path=/; Secure';
      dom.window.document.cookie = '_ga_EP929LYQG4=test; Path=/; Domain=sietepinceles.es; Secure';
      dom.window.document.cookie = 'necessary=keep; Path=/; Secure';
      const count = dom.window.dataLayer.length;
      dom.window.document.querySelector('[data-cookie-settings]').click();
      dom.window.document.querySelector('[data-choice="rejected"]').click();
      assert.equal(dom.window['ga-disable-G-EP929LYQG4'], true);
      assert.equal(dom.window.dataLayer.length, count, 'withdrawal sends no new command');
      assert.equal(dom.window.document.cookie, 'necessary=keep');
      assert.equal(JSON.parse(dom.window.localStorage.getItem('7p-analytics-consent-v1')).choice, 'rejected');
    }
    dom.window.close();
  }
});

test('withdrawal in another tab disables an already loaded tag', () => {
  const dom = page(undefined, { choice: 'accepted', expires: Date.now() + 10000 });
  dom.window.dispatchEvent(new dom.window.StorageEvent('storage', {
    key: '7p-analytics-consent-v1', newValue: JSON.stringify({ choice: 'rejected', expires: Date.now() + 10000 })
  }));
  assert.equal(dom.window['ga-disable-G-EP929LYQG4'], true);
  dom.window.close();
});
test('acceptance loads one tag, excludes personal context and keeps advertising denied', () => {
  const dom = page('https://sietepinceles.es/#asociados');
  dom.window.document.querySelector('[data-choice="accepted"]').click();
  const entries = dom.window.dataLayer;
  assert.ok(tag(dom));
  const config = entries.find(e => e[0] === 'config')[2];
  assert.equal(config.page_location, 'https://sietepinceles.es/');
  assert.equal(config.page_referrer, '');
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.send_page_view, false);
  assert.equal(entries[0][2].ad_storage, 'denied');
  dom.window.document.querySelector('[data-cookie-settings]').click();
  dom.window.document.querySelector('[data-choice="accepted"]').click();
  assert.equal(dom.window.document.querySelectorAll('script').length, 1);
  dom.window.close();
});
test('authentication links and query strings never load analytics even with saved consent', () => {
  for (const suffix of ['?code=private', '#access_token=private&type=recovery', '?email=private']) {
    const dom = page('https://sietepinceles.es/' + suffix, { choice: 'accepted', expires: Date.now() + 10000 });
    assert.equal(tag(dom), null);
    assert.equal(dom.window.dataLayer, undefined);
    dom.window.close();
  }
});
test('expired consent prompts again and local previews never load Google', () => {
  const dom = page(undefined, { choice: 'accepted', expires: 1 });
  assert.equal(tag(dom), null);
  assert.equal(dom.window.document.querySelector('.cookie-panel').hidden, false);
  dom.window.close();
  const local = page('http://localhost:4173/');
  local.window.document.querySelector('[data-choice="accepted"]').click();
  assert.equal(tag(local), null);
  local.window.close();
});
