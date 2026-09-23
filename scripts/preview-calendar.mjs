// Local visual fixture only. Not included by the production build copy list.
import { readFile, writeFile, copyFile } from 'node:fs/promises';
const html = await readFile('index.html', 'utf8');
const calendar = html.match(/<section id="privateCalendar"[\s\S]*?<\/section>/)[0];
await copyFile('calendar.js', 'dist/__calendar.js');
await writeFile('dist/__calendar-preview.html', `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="design.css"><body class="home-page"><main style="max-width:1100px;margin:auto;padding:16px"><p>Vista local de prueba · datos ficticios</p><div class="member-panel">${calendar}</div></main><script type="module">
import {createPrivateCalendar} from './__calendar.js';
const month=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit'}).format(new Date());
const data=[{title:'Actividad de prueba',starts_at:month+'-25T16:00:00Z',location:'Ibiza',description:'Sesión de ejemplo para revisar el calendario.'},{title:'Taller pendiente de prueba',starts_at:null,description:'Sin fecha confirmada.'}];
const client={from(){return {select(){return this},eq(){return this},order(){return Promise.resolve({data,error:null})}}}};
createPrivateCalendar(document.querySelector('#privateCalendar'),client).setUser({id:'local-fixture'});
</script></body></html>`);
