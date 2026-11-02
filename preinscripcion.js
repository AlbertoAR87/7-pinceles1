export function createPreinscription(root, client, openAuth) {
  if (!root) return {setUser() {}};
  let user = null, revision = 0;
  const doc = root.ownerDocument;
  const node = (tag,text,cls) => {const e=doc.createElement(tag); if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const msg=node('p','','form-msg'); msg.setAttribute('role','status');
  const content=node('div');
  root.append(msg,content);
  function button(text,handler) {const b=node('button',text,'btn btn-small');b.type='button';b.addEventListener('click',handler);return b;}
  async function rpc(action,payload={}) {
    const stamp=revision;
    const {data,error}=await client.rpc('workshop_preinscription',{action,payload});
    if(stamp!==revision) throw Object.assign(new Error(),{stale:true});
    if(error) throw new Error(['22023','40001','42501'].includes(error.code)?error.message:'No se pudo completar la operación. Comprueba tu conexión y vuelve a intentarlo.');
    return data;
  }
  async function load() {
    if(!user)return;
    const stamp=++revision;content.replaceChildren();msg.textContent='Cargando preinscripciones…';
    try {
      const rows=await rpc('mine');if(stamp!==revision)return;
      msg.textContent='';
      if(!rows?.length)content.append(node('p','No hay preinscripciones disponibles.'));
      for(const row of rows||[])render(row);
    }catch(e){if(e.stale)return;msg.textContent=e.message;content.append(button('Reintentar',()=>void load()));}
  }
  function render(row) {
    const card=node('article','','card');card.append(node('h3',row.title));
    const labels={pending:'Pendiente de confirmación',confirmed:'Plaza confirmada',waitlist:'En lista de espera',cancelled:'Cancelada'};
    card.append(node('p',row.starts_at?new Date(row.starts_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'}):'Fecha y horario por confirmar.'));
    if(row.status)card.append(node('p',`Estado: ${labels[row.status]}. Participantes: ${row.participants}; menores: ${row.minors}.`));
    if(row.status&&row.status!=='cancelled') {
      const stamp=revision;
      const cancelArea=node('div');
      const cancel=button('Cancelar preinscripción',()=>{cancel.hidden=true;confirmation.hidden=false;yes.focus();});
      const confirmation=node('div');confirmation.hidden=true;
      confirmation.append(node('p','¿Cancelar esta preinscripción para todos sus participantes?'));
      const yes=button('Sí, cancelar mi preinscripción',async e=>{
        e.target.disabled=true;keep.disabled=true;
        try{await rpc('cancel',{workshop_id:row.id});await load();if(stamp+1===revision)msg.textContent='Preinscripción cancelada.';}
        catch(error){if(!error.stale){msg.textContent=error.message;e.target.disabled=false;keep.disabled=false;}}
      });
      const keep=button('Mantener preinscripción',()=>{confirmation.hidden=true;cancel.hidden=false;cancel.focus();});
      confirmation.append(yes,keep);cancelArea.append(cancel,confirmation);card.append(cancelArea);
    }else if(row.is_open) {
      const form=node('form','','stack');
      const count=(title,value,min)=>{const label=node('label',title);const input=node('input');input.type='number';input.min=String(min);input.max='30';input.step='1';input.value=String(value);input.required=true;label.append(input);form.append(label);return input;};
      const participants=count('Personas que participarán pintando (incluye a los menores)',1,1);
      const minors=count('De ellas, ¿cuántas son menores de edad?',0,0);
      form.append(node('p','No incluyas acompañantes que no pinten. Si necesitas más de una plaza, solicita todas juntas desde esta cuenta. No incluyas datos médicos ni nombres de menores.'));
      const label=node('label','','check'), accepted=node('input');accepted.type='checkbox';accepted.required=true;
      const text=node('span','Soy mayor de edad y responsable de esta solicitud. He leído la información de privacidad. Entiendo que no garantiza plaza ni implica hacerme socio. ');
      const link=node('a','Consultar privacidad');link.href='privacidad.html#preinscripciones';link.target='_blank';link.rel='noopener';text.append(link);label.append(accepted,text);form.append(label);
      const send=node('button','Enviar preinscripción','btn');send.type='submit';form.append(send);
      let busy=false;
      form.addEventListener('submit',async event=>{
        event.preventDefault();if(busy||!form.reportValidity())return;
        if(Number(minors.value)>Number(participants.value)){msg.textContent='El número de menores no puede superar el total de participantes.';return;}
        busy=true;send.disabled=true;form.setAttribute('aria-busy','true');msg.textContent='Enviando…';
        const owner=user?.id;
        try{await rpc('submit',{workshop_id:row.id,participants:Number(participants.value),minors:Number(minors.value),accepted:accepted.checked});await load();if(user?.id===owner)msg.textContent='Preinscripción recibida. Consulta aquí su estado. La plaza queda pendiente de confirmación.';}
        catch(e){if(!e.stale)msg.textContent=e.message;}
        finally{busy=false;send.disabled=false;form.removeAttribute('aria-busy');}
      });card.append(form);
    }else card.append(node('p','Preinscripción cerrada.'));
    content.append(card);
  }
  const refresh=button('Actualizar estado',()=>void load());root.append(refresh);refresh.hidden=true;
  const cta=doc.querySelector('#preinscriptionCta');
  if(cta && typeof client.rpc==='function') {
    void client.rpc('workshop_preinscription_availability').then(({data,error})=>{
      const event=data?.find?.(row=>row.id===cta.dataset.workshop);
      const state=doc.querySelector('#evento .event-state');
      if(error||!event){if(state)state.textContent='CONSULTA LA DISPONIBILIDAD AL ACCEDER';return;}
      if(state)state.textContent=event.is_open?'PREINSCRIPCIÓN ABIERTA · 1.ª EDICIÓN':'PREINSCRIPCIÓN CERRADA · 1.ª EDICIÓN';
      if(!event.is_open)cta.textContent='Consultar mi preinscripción';
    }).catch(()=>{const state=doc.querySelector('#evento .event-state');if(state)state.textContent='CONSULTA LA DISPONIBILIDAD AL ACCEDER';});
  }
  cta?.addEventListener('click',()=>{if(!user){try{doc.defaultView.sessionStorage.setItem('7p-preinscription','1');}catch{}openAuth();}else{root.scrollIntoView({behavior:'smooth'});void load();}});
  return {setUser(next){
    if(next?.id===user?.id)return;
    revision++;user=next;content.replaceChildren();msg.textContent='';refresh.hidden=!user;root.hidden=!user;
    if(user){void load();let pending=false;try{pending=doc.defaultView.sessionStorage.getItem('7p-preinscription')==='1';doc.defaultView.sessionStorage.removeItem('7p-preinscription');}catch{}
      if(pending||doc.defaultView.location.hash==='#preinscripcion')root.scrollIntoView({behavior:'smooth'});
    }
  }};
}
