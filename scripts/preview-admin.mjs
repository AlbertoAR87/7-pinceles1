// Local review only. This server is not used by the production build.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const page = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vista local · Administración</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/admin.css"></head><body><main class="section narrow"><p class="eyebrow">VISTA LOCAL · DATOS FICTICIOS</p><h1>Administración de 7 Pinceles</h1><p>Esta vista no está conectada a Supabase y no modifica cuentas reales.</p><section id="adminPanel" hidden></section></main><script type="module">
import {createAdminPanel} from '/admin.js';
const rows={
members_list:[{user_id:'demo',full_name:'Persona de ejemplo',membership_status:'pending',application_status:'pending',submitted_at:'2026-10-28T10:00:00Z',motivation:'Me gustaría aprender a pintar miniaturas y colaborar en las actividades.',updated_at:'2026-10-28T10:00:00Z'}],
workshops_list:[{id:'demo',title:'Taller de ejemplo',description:'Actividad ficticia para revisar el panel.',is_published:false,starts_at:null,capacity:null}],
resources_list:[{id:'demo',title:'Guía de ejemplo',description:'Recurso ficticio.',url:'https://example.invalid/guia',is_published:false}],
access_list:[{user_id:'owner',full_name:'Fundador de ejemplo',email:'fundador@example.invalid',is_owner:true,permissions:['members','workshops','resources']},{user_id:'delegate',full_name:'Colaboradora de ejemplo',email:'colaboradora@example.invalid',is_owner:false,permissions:['workshops'],updated_at:'2026-10-28T10:00:00Z'}],
audit_list:[{id:1,actor_name:'Fundador de ejemplo',action:'bootstrap_owner',created_at:'2026-10-28T10:00:00Z'}]
};
const client={rpc:async(_,args)=>({data:args.action==='access'?{role:'admin',is_owner:true,permissions:['members','workshops','resources']}:rows[args.action]||{ok:true},error:null})};
const panel=createAdminPanel(document.querySelector('#adminPanel'),client);await panel.setUser({id:'owner'});document.querySelector('#adminPanel>button').click();
</script></body></html>`;
createServer(async(req,res)=>{
  const path = new URL(req.url,'http://localhost').pathname;
  if(path==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(page);}
  if(!['/styles.css','/admin.css','/admin.js'].includes(path)){res.writeHead(404);return res.end();}
  try{res.writeHead(200,{'Content-Type':path.endsWith('.css')?'text/css':'text/javascript'});res.end(await readFile('.'+path));}
  catch{res.writeHead(404);res.end();}
}).listen(4175,'127.0.0.1',()=>console.log('Local review only: http://127.0.0.1:4175/'));
