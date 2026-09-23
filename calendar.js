const zone = 'Europe/Madrid';
const dayKey = date => new Intl.DateTimeFormat('sv-SE', { timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit' }).format(date);

export function createPrivateCalendar(root, client) {
  let owner = null, revision = 0, events = [], selected = null;
  let month = dayKey(new Date()).slice(0, 7);
  const find = selector => root.querySelector(selector);
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  function reset() {
    revision++;
    events = []; selected = null;
    month = dayKey(new Date()).slice(0, 7);
    root.hidden = true;
    find('[data-days]').replaceChildren();
    find('[data-agenda]').replaceChildren();
    find('[data-pending]').replaceChildren();
    find('[data-calendar-status]').textContent = '';
  }
  function render() {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, m - 1, 1, 12));
    find('[data-month]').textContent = new Intl.DateTimeFormat('es-ES', { month:'long', year:'numeric', timeZone:zone }).format(date);
    const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const offset = (date.getUTCDay() + 6) % 7;
    const body = find('[data-days]'); body.replaceChildren();
    const today = dayKey(new Date());
    for (let i = 0; i < Math.ceil((offset + days) / 7) * 7; i++) {
      if (i % 7 === 0) body.append(node('tr'));
      const cell = node('td'); body.lastChild.append(cell);
      const day = i - offset + 1;
      if (day < 1 || day > days) continue;
      const key = `${month}-${String(day).padStart(2, '0')}`;
      const count = events.filter(e => e.day === key).length;
      const content = node(count ? 'button' : 'span', String(day));
      if (count) {
        content.type = 'button'; content.dataset.day = key;
        content.setAttribute('aria-label', `${day} de ${find('[data-month]').textContent}: ${count} ${count === 1 ? 'actividad' : 'actividades'}`);
        content.setAttribute('aria-pressed', String(selected === key));
      }
      if (key === today) content.setAttribute('aria-current', 'date');
      cell.append(content);
    }
    const agenda = find('[data-agenda]'); agenda.replaceChildren();
    const matching = events.filter(e => e.day && (selected ? e.day === selected : e.day.startsWith(month)));
    find('[data-agenda-title]').textContent = selected ? `Actividades del ${Number(selected.slice(-2))}` : 'Actividades del mes';
    find('[data-clear-day]').hidden = !selected;
    if (!matching.length) agenda.append(node('p', 'No hay actividades con fecha confirmada en este mes.', 'calendar-empty'));
    matching.forEach(e => agenda.append(card(e)));
    const pending = find('[data-pending]'); pending.replaceChildren();
    const undated = events.filter(e => !e.day);
    find('[data-pending-section]').hidden = !undated.length;
    undated.forEach(e => pending.append(card(e)));
  }
  function card(event) {
    const article = node('article', '', 'calendar-event');
    article.append(node('p', event.day ? new Intl.DateTimeFormat('es-ES', {dateStyle:'full', timeStyle:'short', timeZone:zone}).format(new Date(event.starts_at)) : 'Fecha por confirmar', 'event-date'));
    article.append(node('h4', event.title));
    if (event.location) article.append(node('p', event.location));
    if (event.description) article.append(node('p', event.description));
    article.append(node('small', 'Inscripciones todavía no disponibles.'));
    return article;
  }
  async function load() {
    if (!owner) return;
    const version = ++revision;
    root.hidden = false;
    find('[data-calendar-body]').hidden = true;
    find('[data-calendar-status]').textContent = 'Cargando actividades…';
    find('[data-retry]').disabled = true;
    try {
      const { data, error } = await client.from('workshops').select('id,title,description,starts_at,location').eq('is_published', true).order('starts_at', {ascending:true});
      if (version !== revision) return;
      if (error) throw error;
      events = (data || []).map(e => ({...e, day:e.starts_at && Number.isFinite(Date.parse(e.starts_at)) ? dayKey(new Date(e.starts_at)) : null}));
      find('[data-calendar-status]').textContent = events.length ? 'Actividades actualizadas.' : 'Todavía no hay actividades publicadas.';
      render();
      find('[data-calendar-body]').hidden = false;
    } catch {
      if (version !== revision) return;
      events = [];
      find('[data-calendar-status]').textContent = 'No se pudo cargar el calendario. Pulsa «Actualizar» para volver a intentarlo.';
    } finally {
      if (version === revision) find('[data-retry]').disabled = false;
    }
  }
  root.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button || !owner) return;
    if (button.hasAttribute('data-retry')) { void load(); return; }
    if (button.dataset.shift) {
      const [y,m] = month.split('-').map(Number);
      month = new Date(Date.UTC(y,m - 1 + Number(button.dataset.shift),1,12)).toISOString().slice(0,7); selected = null;
    } else if (button.hasAttribute('data-today')) { month = dayKey(new Date()).slice(0,7); selected = null; }
    else if (button.dataset.day) selected = selected === button.dataset.day ? null : button.dataset.day;
    else if (button.hasAttribute('data-clear-day')) selected = null;
    else return;
    const focusedDay = button.dataset.day;
    render();
    if (focusedDay) find(`[data-day="${focusedDay}"]`)?.focus();
    else if (button.hasAttribute('data-clear-day')) find('[data-today]').focus();
  });
  return { setUser(user) {
    const next = user?.id || null;
    if (next === owner) return;
    reset(); owner = next;
    if (owner) void load();
  } };
}
