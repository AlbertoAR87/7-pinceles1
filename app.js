import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gboifuaaswbqumxxijed.supabase.co";
const SUPABASE_KEY = "sb_publishable_b8DSnE44g2Amxx_1l2eK0w_ZKVlEGlK";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: (url, options = {}) => fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(20000) }) }
});

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const authDialog = $("#authDialog");
const authMsg = $("#authMsg");
let currentUser = null;
let currentProfile = null;
let sessionVersion = 0;
let recoveryMode = false;

$("#year").textContent = new Date().getFullYear();

const setMsg = (el, text = "", type = "") => {
  const errors = {
    'Invalid login credentials': 'El correo o la contraseña no son correctos.',
    'Email not confirmed': 'Confirma tu correo antes de acceder.',
    'Failed to fetch': 'No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.'
  };
  if (type === 'error') text = errors[text] || text;
  el.textContent = text;
  el.className = `form-msg${type ? ` ${type}` : ""}`;
};

function bindForm(selector, handler) {
  const form = $(selector);
  let busy = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    busy = true;
    const version = sessionVersion;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    try { await handler(event); }
    catch {
      const output = selector === '#profileForm' ? $('#profileMsg') : selector === '#membershipForm' ? $('#membershipMsg') : authMsg;
      if (output === authMsg || version === sessionVersion) setMsg(output, 'No se pudo completar la operación. Comprueba tu conexión e inténtalo de nuevo.', 'error');
    } finally {
      busy = false;
      button.disabled = selector === '#profileForm' && !currentProfile;
      form.removeAttribute('aria-busy');
    }
  });
}

$("#menuBtn").addEventListener("click", () => {
  const nav = $("#mainNav");
  const open = nav.classList.toggle("open");
  $("#menuBtn").setAttribute("aria-expanded", String(open));
});
$$(".main-nav a").forEach(a => a.addEventListener("click", () => {
  $("#mainNav").classList.remove("open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
}));

function showAuthPane(name) {
  ["login","register","recovery","newPassword"].forEach(n => {
    $(`#${n}Tab`).hidden = n !== name;
  });
  $$(".auth-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  setMsg(authMsg);
}
function openAuth(name = "login") {
  showAuthPane(name);
  if (!authDialog.open) authDialog.showModal();
}
$("#authOpenBtn").addEventListener("click", () => {
  $("#mainNav").classList.remove("open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
  if (recoveryMode) openAuth("newPassword");
  else if (currentUser) $("#asociados").scrollIntoView({behavior:"smooth"});
  else openAuth("login");
});
$("#memberCta").addEventListener("click", () => openAuth("register"));
$("#authCloseBtn").addEventListener("click", () => authDialog.close());
$$(".auth-tab").forEach(b => b.addEventListener("click", () => showAuthPane(b.dataset.tab)));
$("#forgotBtn").addEventListener("click", () => showAuthPane("recovery"));
$$(".auth-back").forEach(b => b.addEventListener("click", () => showAuthPane("login")));

bindForm("#registerForm", async (e) => {
  e.preventDefault();
  setMsg(authMsg, "Creando cuenta…");
  const email = $("#registerEmail").value.trim();
  const password = $("#registerPassword").value;
  const fullName = $("#registerName").value.trim();
  if (!fullName) return setMsg(authMsg, 'Escribe tu nombre.', 'error');
  if (!$("#registerPrivacy").checked) return setMsg(authMsg, "Debes aceptar el tratamiento de datos de la cuenta.", "error");
  const redirectTo = new URL('./', location.href).href;
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName }, emailRedirectTo: redirectTo }
  });
  if (error) return setMsg(authMsg, error.message, "error");
  if (data.user && data.session) {
    setMsg(authMsg, "Cuenta creada. Ya has iniciado sesión.", "success");
  } else {
    setMsg(authMsg, "Revisa tu correo para confirmar la cuenta. Si ya estabas registrado, accede o recupera tu contraseña.", "success");
  }
});

bindForm("#loginForm", async (e) => {
  e.preventDefault();
  setMsg(authMsg, "Accediendo…");
  const { error } = await supabase.auth.signInWithPassword({
    email: $("#loginEmail").value.trim(),
    password: $("#loginPassword").value
  });
  if (error) return setMsg(authMsg, error.message, "error");
  setMsg(authMsg, "Sesión iniciada.", "success");
  $("#loginPassword").value = '';
  authDialog.close();
  $("#asociados").scrollIntoView({behavior:"smooth"});
});

bindForm("#recoveryForm", async (e) => {
  e.preventDefault();
  setMsg(authMsg, "Enviando enlace…");
  const { error } = await supabase.auth.resetPasswordForEmail(
    $("#recoveryEmail").value.trim(),
    { redirectTo: new URL('./', location.href).href }
  );
  if (error) return setMsg(authMsg, error.message, "error");
  setMsg(authMsg, "Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.", "success");
});

bindForm("#newPasswordForm", async (e) => {
  e.preventDefault();
  if (!recoveryMode || !currentUser) return setMsg(authMsg, "Solicita un enlace de recuperación válido.", "error");
  if ($("#newPassword").value !== $("#confirmPassword").value) return setMsg(authMsg, "Las contraseñas no coinciden.", "error");
  setMsg(authMsg, "Actualizando…");
  const { error } = await supabase.auth.updateUser({ password: $("#newPassword").value });
  if (error) return setMsg(authMsg, error.message, "error");
  setMsg(authMsg, "Contraseña actualizada.", "success");
  recoveryMode = false;
  $("#newPasswordForm").reset();
  updateSessionUI(currentUser);
});

$("#logoutBtn").addEventListener("click", async () => {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    updateSessionUI(null);
  } catch { setMsg($("#profileMsg"), "No se pudo cerrar la sesión. Vuelve a intentarlo.", "error"); }
});

async function ensureProfile(user, fullName = "") {
  // The existing auth trigger creates profiles; the browser has no INSERT grant.
  const { data, error } = await supabase.from("profiles")
    .select("user_id,full_name,phone,city,membership_status,member_number").eq("user_id", user.id).single();
  if (error || !data) throw error || new Error('Missing profile');
  return data;
}

async function loadProfile() {
  if (!currentUser || recoveryMode) return;
  const version = ++sessionVersion;
  $("#profileForm button").disabled = true;
  $("#resourcesBox").hidden = true;
  try {
    const loaded = await ensureProfile(currentUser);
    if (version !== sessionVersion) return;
    currentProfile = loaded;
    $("#profileName").value = currentProfile.full_name || "";
    $("#profilePhone").value = currentProfile.phone || "";
    $("#profileCity").value = currentProfile.city || "";
    $("#memberGreeting").textContent = currentProfile.full_name ? `Hola, ${currentProfile.full_name.split(" ")[0]}` : "Hola";
    renderMembershipStatus(currentProfile.membership_status);
    await loadMembershipApplication(version);
    if (version !== sessionVersion) return;
    await loadResources(version);
  } catch (err) {
    if (version !== sessionVersion) return;
    currentProfile = null;
    $("#membershipForm").hidden = true;
    $("#memberStatus").textContent = "No se pudo cargar el perfil. Pulsa «Recargar perfil» para volver a intentarlo.";
  } finally {
    if (version === sessionVersion) $("#profileForm button").disabled = !currentProfile;
  }
}
$("#reloadProfileBtn").addEventListener('click', () => void loadProfile());

function renderMembershipStatus(status) {
  const labels = {
    registered: "Cuenta registrada · todavía no eres asociado",
    pending: "Solicitud de asociación pendiente",
    active: "Asociado activo",
    suspended: "Condición de asociado suspendida",
    cancelled: "Condición de asociado cancelada"
  };
  $("#memberStatus").textContent = labels[status] || "Estado de cuenta disponible";
}

bindForm("#profileForm", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const version = sessionVersion;
  if (!currentProfile) return;
  setMsg($("#profileMsg"), "Guardando…");
  const payload = {
    full_name: $("#profileName").value.trim(),
    phone: $("#profilePhone").value.trim() || null,
    city: $("#profileCity").value.trim() || null
  };
  if (!payload.full_name) return setMsg($('#profileMsg'), 'Escribe tu nombre.', 'error');
  const { data, error } = await supabase.from("profiles")
    .update(payload).eq("user_id", currentUser.id).select().single();
  if (version !== sessionVersion) return;
  if (error) return setMsg($("#profileMsg"), "No se pudo guardar el perfil.", "error");
  currentProfile = data;
  $("#memberGreeting").textContent = `Hola, ${data.full_name.split(' ')[0]}`;
  setMsg($("#profileMsg"), "Perfil guardado.", "success");
});

async function loadMembershipApplication(version = sessionVersion) {
  if (!currentUser) return;
  const { data, error } = await supabase.from("membership_applications")
    .select("status,submitted_at").eq("user_id", currentUser.id).maybeSingle();
  if (version !== sessionVersion) return;

  if (error) {
    $("#membershipText").textContent = "No se pudo consultar la solicitud.";
    $("#membershipForm").hidden = true;
    return;
  }
  if (data) {
    const labels = {pending:"Pendiente de revisión",active:"Aprobada",suspended:"Suspendida",cancelled:"Cancelada",registered:"Registrada"};
    $("#membershipText").textContent = `Estado: ${labels[data.status] || data.status}.`;
    $("#membershipForm").hidden = true;
    if (data.status === 'pending' && currentProfile?.membership_status === 'registered') renderMembershipStatus('pending');
  } else if (currentProfile?.membership_status !== "registered") {
    $("#membershipText").textContent = "Para consultar tu situación de asociado, contacta con 7 Pinceles.";
    $("#membershipForm").hidden = true;
  } else {
    $("#membershipText").textContent = "Todavía no has enviado una solicitud.";
    $("#membershipForm").hidden = false;
  }
}

bindForm("#membershipForm", async (e) => {
  e.preventDefault();
  if (!currentUser || !$("#privacyCheck").checked) return;
  const version = sessionVersion;
  setMsg($("#membershipMsg"), "Enviando…");
  const { error } = await supabase.from("membership_applications").insert({
    user_id: currentUser.id,
    motivation: $("#motivation").value.trim() || null,
    privacy_accepted_at: new Date().toISOString()
  });
  if (version !== sessionVersion) return;
  if (error) {
    if (error.code === "23505") {
      setMsg($("#membershipMsg"), "Ya existe una solicitud asociada a tu cuenta.", "error");
      await loadMembershipApplication();
      return;
    }
    return setMsg($("#membershipMsg"), "No se pudo enviar la solicitud.", "error");
  }
  setMsg($("#membershipMsg"), "Solicitud enviada correctamente.", "success");
  await loadMembershipApplication();
});

async function loadResources(version = sessionVersion) {
  const box = $("#resourcesBox");
  const list = $("#resourcesList");
  if (currentProfile?.membership_status !== "active") {
    box.hidden = true;
    return;
  }
  const { data, error } = await supabase.from("member_resources")
    .select("title,description,url,category").eq("is_published", true).order("created_at", { ascending: false });
  if (version !== sessionVersion) return;
  box.hidden = false;
  if (error) {
    list.textContent = "Los recursos no están disponibles ahora mismo.";
    return;
  }
  if (!data?.length) {
    list.textContent = "Todavía no hay recursos publicados.";
    return;
  }
  list.innerHTML = "";
  data.forEach(r => {
    try { if (new URL(r.url).protocol !== 'https:') r.url = null; } catch { r.url = null; }
    const a = document.createElement(r.url ? "a" : "div");
    a.className = "resource-link";
    if (r.url) {
      a.href = r.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    const title = document.createElement("strong");
    title.textContent = r.title;
    a.append(title);
    if (r.description) {
      const p = document.createElement("p");
      p.textContent = r.description;
      a.append(p);
    }
    list.append(a);
  });
}

async function loadWorkshops() {
  const target = $("#workshopsList");
  const { data, error } = await supabase.from("workshops")
    .select("title,description,starts_at,location,capacity")
    .eq("is_published", true)
    .order("starts_at", { ascending: true });
  if (error || !data?.length) return;
  target.innerHTML = "<h3>Actividades publicadas</h3>";
  data.forEach(w => {
    const item = document.createElement("article");
    item.className = "workshop-item";
    const h = document.createElement("h4");
    h.textContent = w.title;
    item.append(h);
    if (w.starts_at) {
      const d = document.createElement("p");
      d.textContent = new Intl.DateTimeFormat("es-ES", { dateStyle:"long", timeStyle:"short" }).format(new Date(w.starts_at));
      item.append(d);
    }
    if (w.location) {
      const p = document.createElement("p"); p.textContent = w.location; item.append(p);
    }
    if (w.description) {
      const p = document.createElement("p"); p.textContent = w.description; item.append(p);
    }
    target.append(item);
  });
}

function updateSessionUI(user) {
  const changed = currentUser?.id !== user?.id;
  if (changed || !user) {
    sessionVersion++;
    currentProfile = null;
    $("#profileForm").reset();
    $("#membershipForm").reset();
    $("#membershipForm").hidden = true;
    $("#resourcesList").replaceChildren();
    $("#memberGreeting").textContent = 'Hola';
    $("#memberStatus").textContent = 'Cargando perfil…';
    $("#membershipText").textContent = 'Comprobando estado…';
    setMsg($("#profileMsg"));
    setMsg($("#membershipMsg"));
  }
  currentUser = user;
  const signed = Boolean(user);
  $("#memberPanel").hidden = !signed || recoveryMode;
  $("#memberCta").hidden = signed;
  $("#authOpenBtn").textContent = recoveryMode ? 'Cambiar contraseña' : signed ? "Mi cuenta" : "Acceder";
  if (signed && !recoveryMode && (changed || !currentProfile)) void loadProfile();
  else {
    currentProfile = null;
    $("#resourcesBox").hidden = true;
  }
}

// Subscribe before initialization resolves, and leave Supabase's auth lock before querying.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    recoveryMode = true;
    openAuth("newPassword");
  }
  if (event === 'SIGNED_OUT') recoveryMode = false;
  setTimeout(() => updateSessionUI(session?.user || null), 0);
});

const authError = new URLSearchParams(location.hash.slice(1));
if (authError.has('error')) {
  openAuth('recovery');
  setMsg(authMsg, 'El enlace no es válido o ha caducado. Solicita uno nuevo.', 'error');
  history.replaceState(null, '', location.pathname + location.search);
}
