const permissionLabels = { members: 'Asociados y solicitudes', workshops: 'Talleres', resources: 'Recursos' };
const statusLabels = { registered: 'Registrado', pending: 'Pendiente', active: 'Asociado activo', suspended: 'Suspendido', cancelled: 'Cancelado' };

export function madridInput(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function madridUTC(value) {
  if (!value) return null;
  const guess = Date.parse(value + 'Z');
  const candidates = [1, 2].map(offset => new Date(guess - offset * 3600000).toISOString()).filter(candidate => madridInput(candidate) === value);
  if (candidates.length !== 1) throw new Error('La hora coincide con un cambio de horario o no es válida. Elige otra hora.');
  return candidates[0];
}

export function createAdminPanel(root, client) {
  if (!root) return { setUser() {} };
  const doc = root.ownerDocument;
  let version = 0;
  let access = null;
  let currentUser = null;
  let activeView = '';
  let offset = 0;
  let search = '';
  let loadVersion = 0;
  let status, body, area, nav, toggle;
  const element = (tag, text, cls) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  function button(text, handler, cls = 'btn btn-small btn-secondary') {
    const node = element('button', text, cls); node.type = 'button';
    node.addEventListener('click', handler); return node;
  }
  function message(text, error = false) {
    if (!status) return;
    status.textContent = text; status.className = 'form-msg' + (error ? ' error' : '');
  }
  const fail = error => {
    if (error.stale) return;
    message(error.message || 'No se pudo completar la operación.', true);
  };
  async function rpc(action, payload = {}) {
    const stamp = version;
    const response = await client.rpc('admin_panel', { action, payload });
    if (stamp !== version) throw Object.assign(new Error(), { stale: true });
    if (response.error) {
      if (response.error.code === '42501') {
        root.hidden = true; root.replaceChildren(); access = null;
        throw new Error('Tu acceso administrativo ya no está disponible. Vuelve a acceder.');
      }
      const allowed = ['22023', '40001'].includes(response.error.code);
      throw new Error(allowed ? response.error.message : 'No se pudo completar la operación. Revisa los datos y vuelve a intentarlo.');
    }
    return response.data;
  }
  function field(form, title, name, value = '', type = 'text', max = 160) {
    const label = element('label', title);
    const input = element(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type;
    input.name = name; input.value = value ?? '';
    if (['text', 'textarea', 'email', 'url'].includes(type)) input.maxLength = max;
    if (type === 'textarea') input.rows = 3;
    label.append(input); form.append(label); return input;
  }
  function checkbox(form, title, name, checked) {
    const label = element('label', undefined, 'check');
    const input = element('input'); input.type = 'checkbox'; input.name = name; input.checked = Boolean(checked);
    label.append(input, element('span', title)); form.append(label); return input;
  }
  function submit(form, text, handler) {
    const save = element('button', text, 'btn btn-small'); save.type = 'submit'; form.append(save);
    let busy = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;
      busy = true; save.disabled = true; form.setAttribute('aria-busy', 'true');
      try { await handler(); } catch (error) { fail(error); }
      finally { busy = false; save.disabled = false; form.removeAttribute('aria-busy'); }
    });
  }
  async function save(action, payload, confirmation) {
    if (!doc.defaultView.confirm(confirmation)) return;
    message('Guardando…');
    await rpc(action, payload);
    await load();
    message('Cambio guardado y registrado en el historial.');
  }
  function renderMember(item) {
    const card = element('article', undefined, 'admin-card');
    card.append(element('h4', item.full_name || 'Sin nombre'), element('p', `Estado: ${statusLabels[item.membership_status] || item.membership_status}`));
    if (item.submitted_at) card.append(element('p', `Solicitud: ${statusLabels[item.application_status] || item.application_status} · ${new Date(item.submitted_at).toLocaleDateString('es-ES')}`));
    if (item.motivation) {
      const detail = element('details'); detail.append(element('summary', 'Ver solicitud'), element('p', item.motivation)); card.append(detail);
    }
    const form = element('form', undefined, 'stack');
    const label = element('label', 'Nuevo estado'); const select = element('select');
    for (const key of ['registered', 'active', 'suspended', 'cancelled']) {
      const option = element('option', statusLabels[key]); option.value = key; select.append(option);
    }
    select.value = item.membership_status === 'pending' ? 'active' : item.membership_status;
    label.append(select); form.append(label);
    submit(form, 'Guardar estado', () => save('member_save', { user_id: item.user_id, membership_status: select.value, expected_updated_at: item.updated_at, expected_application_status: item.application_status }, `¿Cambiar el estado de ${item.full_name || 'esta cuenta'} a «${statusLabels[select.value]}»?`));
    card.append(form); return card;
  }
  function editor(kind, item = {}) {
    const form = element('form', undefined, 'stack admin-editor');
    form.append(element('h4', item.id ? 'Editar' : kind === 'workshops' ? 'Nuevo taller' : 'Nuevo recurso'));
    const title = field(form, 'Título', 'title', item.title); title.required = true;
    const description = field(form, 'Descripción', 'description', item.description, 'textarea', 4000);
    let starts, ends, location, capacity, url, category;
    if (kind === 'workshops') {
      form.append(element('p', 'Horas de Ibiza y España peninsular. Deja las fechas vacías si aún no están confirmadas.', 'admin-note'));
      starts = field(form, 'Inicio', 'starts_at', madridInput(item.starts_at), 'datetime-local');
      ends = field(form, 'Fin (opcional)', 'ends_at', madridInput(item.ends_at), 'datetime-local');
      location = field(form, 'Lugar', 'location', item.location, 'text', 250);
      capacity = field(form, 'Aforo confirmado (opcional)', 'capacity', item.capacity, 'number'); capacity.min = '1'; capacity.step = '1';
      form.append(element('p', 'Publicar lo muestra en el calendario de cuentas registradas. Las inscripciones siguen cerradas.', 'admin-note'));
    } else {
      url = field(form, 'Enlace HTTPS', 'url', item.url, 'url', 2000); url.required = true; url.pattern = 'https://.+';
      category = field(form, 'Categoría (opcional)', 'category', item.category, 'text', 120);
      form.append(element('p', 'El enlace se muestra a asociados activos. El archivo enlazado necesita su propia protección si es confidencial.', 'admin-note'));
    }
    const published = checkbox(form, kind === 'workshops' ? 'Visible en el calendario privado' : 'Visible para asociados activos', 'is_published', item.is_published);
    submit(form, 'Guardar', async () => {
      const payload = { id: item.id || null, expected_updated_at: item.updated_at || null, title: title.value.trim(), description: description.value.trim(), is_published: published.checked };
      if (kind === 'workshops') {
        payload.starts_at = madridUTC(starts.value); payload.ends_at = madridUTC(ends.value);
        if (payload.ends_at && (!payload.starts_at || payload.ends_at <= payload.starts_at)) throw new Error('El fin debe ser posterior al inicio.');
        payload.location = location.value.trim(); payload.capacity = capacity.value || null;
      } else { payload.url = url.value.trim(); payload.category = category.value.trim(); }
      await save(kind === 'workshops' ? 'workshop_save' : 'resource_save', payload, published.checked ? '¿Guardar y publicar este contenido para las personas con acceso?' : '¿Guardar este contenido como borrador oculto?');
    });
    form.append(button('Cancelar edición', () => void load().catch(fail)));
    return form;
  }
  function renderContent(item, kind) {
    const card = element('article', undefined, 'admin-card');
    card.append(element('h4', item.title), element('p', item.is_published ? 'Publicado' : 'Borrador oculto'));
    if (kind === 'workshops') card.append(element('p', item.starts_at ? new Date(item.starts_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : 'Sin fecha confirmada'));
    if (item.description) card.append(element('p', item.description));
    card.append(button('Editar', () => { body.replaceChildren(editor(kind, item)); body.querySelector('input')?.focus(); }));
    return card;
  }
  function accessEditor(item = {}) {
    const form = element('form', undefined, 'stack admin-editor');
    form.append(element('h4', item.email ? 'Modificar permisos' : 'Dar acceso administrativo'));
    form.append(element('p', 'La persona debe tener una cuenta con el correo confirmado. Marca solo las áreas que deba gestionar.', 'admin-note'));
    const email = field(form, 'Correo de la cuenta', 'email', item.email, 'email', 254); email.required = true; email.readOnly = Boolean(item.email);
    const permissions = Object.entries(permissionLabels).map(([key, label]) => [key, checkbox(form, label, key, item.permissions?.includes(key))]);
    submit(form, 'Guardar permisos', async () => {
      const selected = permissions.filter(([, input]) => input.checked).map(([key]) => key);
      if (!item.email && !selected.length) throw new Error('Selecciona al menos un permiso.');
      await save('access_save', { email: email.value.trim(), permissions: selected, expected_updated_at: item.updated_at || null }, selected.length ? `¿Conceder a ${email.value.trim()} estos permisos de administración: ${selected.map(key => permissionLabels[key]).join(', ')}?` : `¿Retirar el acceso administrativo a ${email.value.trim()}?`);
    });
    form.append(button('Cancelar edición', () => void load().catch(fail)));
    return form;
  }
  async function load() {
    const request = ++loadVersion;
    const stamp = version;
    const view = activeView;
    body.replaceChildren(); message('Cargando…');
    const rows = await rpc(view + '_list', { offset, search });
    if (stamp !== version || view !== activeView || request !== loadVersion) return;
    message('');
    if (view === 'workshops' || view === 'resources') body.append(button(view === 'workshops' ? 'Crear taller' : 'Crear recurso', () => { body.replaceChildren(editor(view)); body.querySelector('input')?.focus(); }));
    if (view === 'access') body.append(button('Dar acceso', () => { body.replaceChildren(accessEditor()); body.querySelector('input')?.focus(); }));
    if (!rows?.length) body.append(element('p', 'No hay registros en esta página.'));
    for (const item of rows || []) {
      if (view === 'members') body.append(renderMember(item));
      else if (view === 'workshops' || view === 'resources') body.append(renderContent(item, view));
      else if (view === 'access') {
        const card = element('article', undefined, 'admin-card');
        card.append(element('h4', item.full_name), element('p', item.email), element('p', item.is_owner ? 'Administrador fundador · gestiona los accesos' : 'Administrador'), element('p', item.permissions.map(key => permissionLabels[key]).join(' · ')));
        if (!item.is_owner) card.append(button('Modificar o retirar permisos', () => { body.replaceChildren(accessEditor(item)); body.querySelector('input')?.focus(); }));
        body.append(card);
      } else {
        const actions = { member_save: 'Estado de asociado', workshop_save: 'Taller guardado', resource_save: 'Recurso guardado', access_save: 'Permisos modificados', bootstrap_owner: 'Acceso inicial del fundador' };
        const card = element('article', undefined, 'admin-card');
        card.append(element('h4', actions[item.action] || 'Cambio administrativo'), element('p', `${item.actor_name || 'Cuenta administrativa'} · ${new Date(item.created_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`));
        if (item.target) card.append(element('p', `Referencia: ${item.target}`));
        if (item.details?.before !== undefined) card.append(element('p', `Antes: ${Array.isArray(item.details.before) ? item.details.before.map(key => permissionLabels[key]).join(', ') || 'Sin permisos' : statusLabels[item.details.before] || item.details.before}`));
        if (item.details?.after !== undefined) card.append(element('p', `Después: ${Array.isArray(item.details.after) ? item.details.after.map(key => permissionLabels[key]).join(', ') || 'Sin permisos' : statusLabels[item.details.after] || item.details.after}`));
        body.append(card);
      }
    }
    const pages = element('div', undefined, 'actions');
    const previous = button('Anterior', () => { offset = Math.max(0, offset - 50); void load().catch(fail); }); previous.disabled = offset === 0;
    const next = button('Siguiente', () => { offset += 50; void load().catch(fail); }); next.disabled = (rows?.length || 0) < 50;
    pages.append(previous, element('span', `Página ${Math.floor(offset / 50) + 1}`), next); body.append(pages);
  }
  function render() {
    root.replaceChildren(); root.hidden = false;
    toggle = button('Administración', () => {
      area.hidden = !area.hidden; toggle.setAttribute('aria-expanded', String(!area.hidden));
      if (!area.hidden) void load().catch(fail);
    }, 'btn btn-small');
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'adminContents');
    area = element('div', undefined, 'admin-contents'); area.id = 'adminContents'; area.hidden = true;
    area.append(element('h3', 'Administración'), element('p', 'Gestiona únicamente las áreas para las que tienes permiso. Los cambios quedan registrados.', 'admin-note'));
    nav = element('nav', undefined, 'admin-nav'); nav.setAttribute('aria-label', 'Áreas de administración');
    const views = Object.entries(permissionLabels).filter(([key]) => access.permissions.includes(key));
    if (access.is_owner) views.push(['access', 'Administradores'], ['audit', 'Historial']);
    activeView = views[0]?.[0] || '';
    for (const [key, label] of views) {
      const tab = button(label, () => { activeView = key; offset = 0; search = ''; filterInput.value = ''; for (const item of nav.children) item.setAttribute('aria-pressed', String(item === tab)); void load().catch(fail); });
      tab.setAttribute('aria-pressed', String(key === activeView)); nav.append(tab);
    }
    const filter = element('form', undefined, 'admin-filter');
    const filterInput = field(filter, 'Buscar por nombre o título (asociados, talleres y recursos)', 'search', '', 'text', 120);
    submit(filter, 'Buscar / actualizar', async () => { search = filterInput.value.trim(); offset = 0; await load(); });
    status = element('p', undefined, 'form-msg'); status.setAttribute('role', 'status');
    body = element('div', undefined, 'admin-body');
    area.append(nav, filter, status, body); root.append(toggle, area);
  }
  return {
    async setUser(user) {
      const stamp = ++version; currentUser = user;
      root.hidden = true; root.replaceChildren(); access = null;
      if (!currentUser || typeof client.rpc !== 'function') return;
      try {
        const data = await rpc('access');
        if (stamp !== version || !data || data.role !== 'admin' || !data.permissions?.length) return;
        access = data; offset = 0; search = ''; render();
      } catch { /* Fail closed: no administrative UI or data on errors. */ }
    }
  };
}
