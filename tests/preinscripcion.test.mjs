import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createPreinscription} from '../preinscripcion.js';
const wait=()=>new Promise(r=>setTimeout(r,15));
function setup(handler){
 const dom=new JSDOM('<button id="preinscriptionCta"></button><section id="preinscripcion" hidden></section>',{url:'https://example.org/'});
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};dom.window.confirm=()=>true;
 let auth=0;const calls=[];
 const client={rpc:async(name,args)=>{if(name==='workshop_preinscription_availability')return {data:[],error:null};calls.push({name,...args});return handler?.(args)||{data:[{id:'w',title:'Taller',is_open:true}],error:null};}};
 const root=dom.window.document.querySelector('section');const api=createPreinscription(root,client,()=>auth++);
 return{dom,root,api,calls,get auth(){return auth;}};
}
test('requires sign in, loads for nonmember, submits only counts and consent; blocks double send',async()=>{
 let finish;const t=setup(a=>a.action==='submit'?new Promise(r=>finish=r):null);
 t.dom.window.document.querySelector('button').click();assert.equal(t.auth,1);assert.equal(t.calls.length,0);
 t.api.setUser({id:'a'});await wait();assert.equal(t.root.hidden,false);
 t.root.querySelector('[type=checkbox]').checked=true;const form=t.root.querySelector('form');
 const submit=()=>form.dispatchEvent(new t.dom.window.Event('submit',{cancelable:true}));submit();submit();await wait();
 assert.equal(t.calls.filter(c=>c.action==='submit').length,1);assert.deepEqual(t.calls.at(-1).payload,{workshop_id:'w',participants:1,minors:0,accepted:true});
 finish({data:{ok:true},error:null});await wait();assert.match(t.root.textContent,/Preinscripción recibida/);t.dom.window.close();
});
test('logout discards late private responses',async()=>{
 let finish;const t=setup(()=>new Promise(r=>finish=r));t.api.setUser({id:'a'});t.api.setUser(null);
 finish({data:[{id:'w',title:'Privado',is_open:true}],error:null});await wait();assert.equal(t.root.hidden,true);assert.doesNotMatch(t.root.textContent,/Privado/);t.dom.window.close();
});
test('network error is recoverable and user content cannot insert HTML',async()=>{
 let fails=true;const t=setup(()=>fails?{error:{message:'Network error'}}:{data:[{id:'w',title:'<img src=x>',status:'pending',participants:2,minors:1}]});
 t.api.setUser({id:'a'});await wait();assert.match(t.root.textContent,/No se pudo/);fails=false;t.root.querySelector('button').click();await wait();
 assert.equal(t.root.querySelector('img'),null);assert.match(t.root.textContent,/Pendiente de confirmación/);t.dom.window.close();
});
test('closed events do not offer forms; cancellation only includes event reference',async()=>{
 const t=setup(a=>a.action==='mine'?{data:[{id:'w',title:'Taller',is_open:false,status:'pending',participants:1,minors:0}]}:{data:{ok:true}});
 t.api.setUser({id:'a'});await wait();assert.equal(t.root.querySelector('form'),null);t.root.querySelector('article button').click();await wait();
 assert.deepEqual(t.calls.find(c=>c.action==='cancel').payload,{workshop_id:'w'});t.dom.window.close();
});
