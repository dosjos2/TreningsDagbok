'use strict';
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = {
  me: { authenticated: false },
  exercises: [], byId: {},
  draft: load('draft', { id: null, name: '', items: [] }),
  lib: { q: '', cat: 'Alle', eq: 'Alle', lvl: 0 },
  gen: load('gen', { minutes: 25, focus: 'full', equipment: 'both', level: 2 }),
  run: null,
};
function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
const saveDraft = () => localStorage.setItem('draft', JSON.stringify(state.draft));
const saveGen = () => localStorage.setItem('gen', JSON.stringify(state.gen));

// ---------- Hjelpere ----------
const TRANSITION = 20;
const unit = (it) => state.byId[it.exerciseId];
const workPerSet = (it) => { const e = unit(it); return it.seconds > 0 ? it.seconds * (e.unilateral ? 2 : 1) : it.reps * (e.unilateral ? 6 : 3); };
const itemSec = (it) => it.sets * workPerSet(it) + Math.max(0, it.sets - 1) * it.rest;
const estimate = (items) => items.reduce((s, i) => s + itemSec(i), 0) + Math.max(0, items.length - 1) * TRANSITION;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const mins = (s) => `${Math.max(1, Math.round(s / 60))} min`;
const defItem = (e) => ({ exerciseId: e.id, sets: e.sets, reps: e.reps, seconds: e.seconds, rest: e.rest });
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isoLocal = (d) => `${dstr(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const parseD = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const dayIdx = (d) => (d.getDay() + 6) % 7;
const prettyDate = (s) => { const d = parseD(s); return `${DAYS[dayIdx(d)]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`; };

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600);
}
async function api(url, opts = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (r.status === 401) { state.me.authenticated = false; renderUser(); throw new Error('Logg inn for å bruke denne funksjonen.'); }
  if (!r.ok) throw new Error((await r.text()) || 'Noe gikk galt');
  if (r.status === 204) return null;
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}
const loginHref = () => '/auth/login';

function openModal(html) {
  const m = $('#modal'); m.innerHTML = `<div class="sheet"><button class="icon-btn close" data-a="closeModal" aria-label="Lukk">✕</button>${html}</div>`;
  m.hidden = false; document.body.style.overflow = 'hidden';
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; document.body.style.overflow = ''; }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function renderUser() {
  const u = $('#user'), me = state.me;
  u.innerHTML = me.authenticated
    ? `<span class="uname">👤 ${esc(me.name || 'Bruker')}</span><a class="btn ghost sm" href="/auth/logout">Logg ut</a>`
    : me.googleEnabled
      ? `<a class="btn sm" href="${loginHref()}">Logg inn med Google</a>`
      : me.devLogin ? `<a class="btn sm" href="/auth/dev-login">Dev-innlogging</a>` : '';
}

function loginBanner(text = 'Logg inn med Google for å lagre økter og følge fremgangen din.') {
  const me = state.me;
  const href = me.googleEnabled ? loginHref() : me.devLogin ? '/auth/dev-login' : null;
  return `<div class="banner"><span>🔒 ${text}</span>${href ? `<a class="btn sm alt" href="${href}">${me.googleEnabled ? 'Logg inn med Google' : 'Dev-innlogging'}</a>` : '<span class="small">Google-innlogging er ikke konfigurert.</span>'}</div>`;
}

// ---------- Router ----------
const routes = { '': home, ovelser: library, okt: builder, planlegg: myWorkouts, dagbok: diary, kjor: runPage };
let timerHandle = null;
async function route() {
  clearInterval(timerHandle);
  const r = (location.hash.replace(/^#\/?/, '').split('?')[0]) || '';
  document.querySelectorAll('[data-r]').forEach((a) => a.classList.toggle('on', a.dataset.r === r || (r === 'kjor' && a.dataset.r === 'okt')));
  window.scrollTo(0, 0);
  try { await (routes[r] || home)(); } catch (e) { app.innerHTML = `<div class="card empty"><div class="big">😕</div>${esc(e.message)}</div>`; }
}
window.addEventListener('hashchange', route);

// ---------- Hjem ----------
function home() {
  const total = state.exercises.length, kb = state.exercises.filter((e) => e.equipment === 'Kettlebell').length, db = state.exercises.filter((e) => e.equipment === 'Manual').length;
  const hero = state.byId['knebøy'], hero2 = state.byId['kb-swing'];
  app.innerHTML = `
  <section class="hero">
    <div class="illus-wrap thumbless">${illustration(hero2)}</div>
    <h1>Tren smartere hjemme.<br>20–30 minutter er nok.</h1>
    <p>${total} øvelser med illustrasjoner, ferdige anbefalinger og automatisk tidsberegning. Bygg økten selv eller la oss generere den for deg.</p>
    <div class="row" style="margin-top:1.2rem">
      <a class="btn alt lg" href="#/okt" data-a="quickGen">⚡ Generer en økt</a>
      <a class="btn ghost lg" style="color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.5)" href="#/ovelser">Se øvelsene</a>
    </div>
  </section>
  <section class="grid cols-3" style="margin-top:1.2rem">
    <div class="card feature"><div class="ico">📚</div><div><h3>Øvelsesbibliotek</h3><p class="muted small">${total - kb - db} øvelser uten utstyr, ${kb} med kettlebell og ${db} med lette manualer. Alle med bilde, forklaring og anbefalt sett, repetisjoner og pause.</p></div></div>
    <div class="card feature"><div class="ico">⏱️</div><div><h3>Tid som stemmer</h3><p class="muted small">Total tid regnes ut fra utførelse pluss pauser, slik at du treffer 20–30 minutter.</p></div></div>
    <div class="card feature"><div class="ico">📈</div><div><h3>Treningsdagbok</h3><p class="muted small">Fullførte økter havner i dagboken med statistikk, ukerekke og oversikt over hva du har trent.</p></div></div>
  </section>
  <section class="card" style="margin-top:1.2rem">
    <div class="row between"><h2>Dagens tips</h2><span class="chip cat">${esc(hero.category)}</span></div>
    <div class="grid cols-2" style="align-items:center">
      <div class="thumb" style="max-width:380px;width:100%;margin:0 auto">${illustration(hero)}</div>
      <div><h3>${esc(hero.name)}</h3><p class="muted">${esc(hero.tip)}</p>
        <button class="btn" data-a="openEx" data-id="${hero.id}">Se hele øvelsen</button></div>
    </div>
  </section>`;
}

// ---------- Øvelsesbibliotek ----------
function recLine(e) {
  const work = e.seconds > 0 ? `${e.seconds} sek` : `${e.reps} rep`;
  return `<div class="rec"><b>${e.sets} sett</b><b>${work}${e.unilateral ? ' / side' : ''}</b><b>${e.rest}s pause</b></div>`;
}
function equipChip(e, showNone = false) {
  return e.equipment === 'Kettlebell' ? '<span class="chip kb">Kettlebell</span>' : e.equipment === 'Manual' ? '<span class="chip db">Lette manualer</span>' : showNone ? '<span class="chip">Uten utstyr</span>' : '';
}
const catIcon = { 'Bein og rumpe': '🦵', Overkropp: '💪', Kjerne: '🎯', Kondisjon: '🔥', Helkropp: '⚡' };
function exCard(e, extra = '') {
  return `<button class="card ex-card" data-a="openEx" data-id="${e.id}">
    <div class="thumb">${illustration(e)}</div>
    <div class="row"><span class="chip cat">${catIcon[e.category] || ''} ${esc(e.category)}</span>${equipChip(e)}</div>
    <h3>${esc(e.name)}</h3><div class="muted small">${esc(e.muscles)}</div>${recLine(e)}${extra}</button>`;
}
function filtered() {
  const f = state.lib, q = f.q.toLowerCase();
  return state.exercises.filter((e) =>
    (f.cat === 'Alle' || e.category === f.cat) && (f.eq === 'Alle' || e.equipment === f.eq) && (!f.lvl || e.level === f.lvl) &&
    (!q || e.name.toLowerCase().includes(q) || e.muscles.toLowerCase().includes(q)));
}
function library() {
  const cats = ['Alle', ...new Set(state.exercises.map((e) => e.category))];
  const f = state.lib;
  const pills = (arr, cur, a) => arr.map((c) => { const [v, l] = Array.isArray(c) ? c : [c, c]; return `<button class="pill ${String(cur) === String(v) ? 'on' : ''}" data-a="${a}" data-v="${esc(v)}">${esc(l)}</button>`; }).join('');
  app.innerHTML = `
  <h1>Øvelsesbibliotek</h1>
  <p class="muted">Delt for alle. Trykk på en øvelse for å se hvordan den utføres.</p>
  <div class="filters">
    <input id="q" type="search" placeholder="Søk etter øvelse eller muskel …" value="${esc(f.q)}">
    <div class="pills">${pills(cats, f.cat, 'fcat')}</div>
    <div class="pills">${pills(['Alle', 'Ingen', 'Kettlebell', 'Manual'].map((v) => [v, v === 'Ingen' ? 'Uten utstyr' : v === 'Manual' ? 'Manualer' : v]), f.eq, 'feq')}
      ${pills([[0, 'Alle nivåer'], [1, 'Lett'], [2, 'Middels'], [3, 'Krevende']], f.lvl, 'flvl')}</div>
  </div>
  <div id="exlist"></div>`;
  const draw = () => {
    const l = filtered();
    $('#exlist').innerHTML = l.length ? `<div class="ex-grid">${l.map((e) => exCard(e)).join('')}</div>` : '<div class="card empty"><div class="big">🔍</div>Ingen øvelser funnet.</div>';
  };
  draw();
  $('#q').addEventListener('input', (e) => { state.lib.q = e.target.value; draw(); });
}

const lvlName = ['', 'Lett', 'Middels', 'Krevende'];
function openEx(id) {
  const e = state.byId[id];
  openModal(`
    <div class="row"><span class="chip cat">${catIcon[e.category] || ''} ${esc(e.category)}</span>${equipChip(e, true)}<span class="chip lvl${e.level}">${lvlName[e.level]}</span></div>
    <h2 style="margin-top:.6rem">${esc(e.name)}</h2>
    <div class="thumb">${illustration(e, 'both')}</div>
    <p class="muted small" style="text-align:center;margin:.4rem 0 0">${e.poseA === e.poseB ? 'Hold posisjonen' : 'Start → slutt'} · trener ${esc(e.muscles.toLowerCase())}</p>
    <div class="stat-pair">
      <div><b>${e.sets}</b><span>sett</span></div>
      <div><b>${e.seconds > 0 ? e.seconds + ' s' : e.reps}</b><span>${e.seconds > 0 ? 'varighet' : 'repetisjoner'}${e.unilateral ? ' per side' : ''}</span></div>
      <div><b>${e.rest} s</b><span>pause</span></div>
      <div><b>${mins(itemSec(defItem(e)))}</b><span>ca. tid</span></div>
    </div>
    <h3>Slik gjør du det</h3>
    <ol class="steps">${e.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="tip">💡 ${esc(e.tip)}</div>
    <div class="row" style="margin-top:1rem"><button class="btn" data-a="addEx" data-id="${e.id}">＋ Legg til i økt</button><button class="btn ghost" data-a="closeModal">Lukk</button></div>`);
}
function addEx(id) {
  state.draft.items.push(defItem(state.byId[id])); saveDraft();
  toast(`«${state.byId[id].name}» lagt til i økten (${state.draft.items.length})`);
}

// ---------- Bygg økt ----------
function gauge(sec) {
  const m = sec / 60, max = 45;
  const cls = m >= 20 && m <= 30 ? 'good' : m < 15 || m > 35 ? 'warn' : '';
  const msg = !sec ? 'Legg til øvelser for å se tiden.' : m < 20 ? `Litt kort – ${Math.ceil(20 - m)} min til for å nå 20 min.` : m <= 30 ? '✅ Perfekt lengde for en hjemmeøkt.' : `Litt lang – prøv å kutte ca. ${Math.ceil(m - 30)} min.`;
  return `<div class="gauge"><div class="zone" style="left:${20 / max * 100}%;width:${10 / max * 100}%"></div><div class="fill ${cls}" style="width:${Math.min(100, m / max * 100)}%"></div></div><div class="small muted">${msg}</div>`;
}
function builder() {
  const d = state.draft, g = state.gen, sec = estimate(d.items);
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`).join('');
  app.innerHTML = `
  <h1>Bygg økt</h1>
  <div class="layout">
    <div class="stack">
      <div class="card">
        <label class="f">Navn på økten<input id="wname" maxlength="80" placeholder="F.eks. Morgenøkt" value="${esc(d.name)}"></label>
      </div>
      <div id="items"></div>
      <div class="row"><button class="btn" data-a="picker">＋ Legg til øvelse</button><a class="btn ghost" href="#/ovelser">Bla i biblioteket</a></div>
    </div>
    <aside class="side stack">
      <div class="card" id="summary"></div>
      <div class="card">
        <h3>⚡ Autogenerer økt</h3>
        <div class="stack" style="--g:.7rem">
          <label class="f">Lengde: <b id="gm">${g.minutes} min</b><input type="range" id="gmin" min="15" max="45" step="5" value="${g.minutes}"></label>
          <label class="f">Fokus<select id="gfocus">${opt([['full', 'Hele kroppen'], ['lower', 'Bein og rumpe'], ['upper', 'Overkropp og kjerne'], ['core', 'Kjerne'], ['cardio', 'Kondisjon']], g.focus)}</select></label>
          <label class="f">Utstyr<select id="geq">${opt([['both', 'Alt utstyr'], ['none', 'Kun kroppsvekt'], ['kettlebell', 'Kun kettlebell'], ['dumbbell', 'Kun lette manualer']], g.equipment)}</select></label>
          <label class="f">Nivå<select id="glvl">${opt([[1, 'Lett'], [2, 'Middels'], [3, 'Krevende']], g.level)}</select></label>
          <button class="btn alt" data-a="generate">🎲 Generer</button>
        </div>
      </div>
    </aside>
  </div>`;
  drawItems();
  $('#wname').addEventListener('input', (e) => { state.draft.name = e.target.value; saveDraft(); });
  $('#gmin').addEventListener('input', (e) => { state.gen.minutes = +e.target.value; $('#gm').textContent = e.target.value + ' min'; saveGen(); });
  for (const [id, k, num] of [['gfocus', 'focus'], ['geq', 'equipment'], ['glvl', 'level', 1]])
    $('#' + id).addEventListener('change', (e) => { state.gen[k] = num ? +e.target.value : e.target.value; saveGen(); });
}
function drawItems() {
  const d = state.draft, box = $('#items'); if (!box) return;
  box.innerHTML = d.items.length ? d.items.map((it, i) => {
    const e = unit(it), timed = it.seconds > 0;
    return `<div class="card item">
      <div class="thumb">${illustration(e)}</div>
      <div><h3 style="margin:0">${i + 1}. ${esc(e.name)}</h3>
        <div class="muted small">${esc(e.muscles)} · <b>${mins(itemSec(it))}</b></div>
        <div class="ctrls">
          <span class="stepper" title="Sett"><button data-a="adj" data-i="${i}" data-f="sets" data-d="-1">−</button><span>${it.sets} sett</span><button data-a="adj" data-i="${i}" data-f="sets" data-d="1">+</button></span>
          <span class="stepper" title="${timed ? 'Sekunder' : 'Repetisjoner'}"><button data-a="adj" data-i="${i}" data-f="${timed ? 'seconds' : 'reps'}" data-d="${timed ? -5 : -1}">−</button><span>${timed ? it.seconds + ' sek' : it.reps + ' rep'}</span><button data-a="adj" data-i="${i}" data-f="${timed ? 'seconds' : 'reps'}" data-d="${timed ? 5 : 1}">+</button></span>
          <span class="stepper" title="Pause"><button data-a="adj" data-i="${i}" data-f="rest" data-d="-5">−</button><span>${it.rest}s pause</span><button data-a="adj" data-i="${i}" data-f="rest" data-d="5">+</button></span>
        </div></div>
      <div class="side-btns"><button class="icon-btn" data-a="mv" data-i="${i}" data-d="-1" aria-label="Opp">↑</button><button class="icon-btn" data-a="mv" data-i="${i}" data-d="1" aria-label="Ned">↓</button><button class="icon-btn" data-a="rm" data-i="${i}" aria-label="Fjern">✕</button></div>
    </div>`;
  }).join('') : `<div class="card empty"><div class="big">🏋️</div><p>Økten er tom.<br>Legg til øvelser, eller generer en økt.</p></div>`;
  const sec = estimate(d.items), work = d.items.reduce((s, i) => s + i.sets * workPerSet(i), 0);
  $('#summary').innerHTML = `
    <div class="muted small">Forventet tid</div>
    <div class="big-time">${sec ? mins(sec) : '–'}</div>
    ${gauge(sec)}
    <div class="row small muted" style="margin:.6rem 0">
      <span>🏃 ${mins(work)} trening</span><span>😮‍💨 ${mins(Math.max(0, sec - work))} pause</span><span>${d.items.length} øvelser</span></div>
    <div class="stack" style="--g:.6rem">
      <button class="btn lg" style="width:100%" data-a="start" ${d.items.length ? '' : 'disabled'}>▶ Start økt</button>
      <div class="row" style="gap:.4rem"><button class="btn ghost sm" data-a="saveTpl" ${d.items.length ? '' : 'disabled'}>💾 Lagre${d.id ? '' : ' som mal'}</button>
        <input type="date" id="pdate" value="${dstr(new Date())}" style="flex:1 1 130px;min-width:0;padding:.35rem .5rem">
        <button class="btn ghost sm" data-a="plan" ${d.items.length ? '' : 'disabled'}>📅 Planlegg</button></div>
      <button class="btn danger sm" data-a="clear" ${d.items.length || d.id ? '' : 'disabled'}>Tøm økt</button>
    </div>`;
}
function picker() {
  const list = (q = '') => state.exercises.filter((e) => !q || (e.name + e.muscles).toLowerCase().includes(q.toLowerCase()))
    .map((e) => `<div class="list-item card" style="box-shadow:none;border:1.5px solid var(--line)"><div style="width:74px" class="thumb">${illustration(e)}</div>
      <div style="flex:1;min-width:120px"><b>${esc(e.name)}</b><div class="muted small">${esc(e.category)} · ${e.sets}×${e.seconds ? e.seconds + 's' : e.reps}</div></div>
      <button class="btn sm" data-a="pickAdd" data-id="${e.id}">＋</button></div>`).join('');
  openModal(`<h2>Legg til øvelse</h2><input id="pq" type="search" placeholder="Søk …" style="width:100%;margin-bottom:.8rem"><div id="plist">${list()}</div>`);
  $('#pq').addEventListener('input', (e) => ($('#plist').innerHTML = list(e.target.value)));
}

async function generate() {
  const g = state.gen;
  const r = await api('/api/generate', { method: 'POST', body: { minutes: g.minutes, focus: g.focus, equipment: g.equipment, level: g.level } });
  if (!r.items.length) return toast('Fant ingen øvelser for disse valgene.');
  state.draft.items = r.items; state.draft.id = state.draft.id && state.draft.items.length ? state.draft.id : null;
  if (!state.draft.name) state.draft.name = `${g.minutes} min økt`;
  saveDraft(); builder(); toast(`Generert økt: ca. ${mins(r.estimatedSec)}`);
}

async function persist(status, extra = {}) {
  const d = state.draft;
  if (!d.items.length) return null;
  const w = await api('/api/workouts', { method: 'POST', body: { id: status === 'completed' ? null : d.id, name: d.name || 'Treningsøkt', status, items: d.items, ...extra } });
  return w;
}

// ---------- Mine økter / planlegging ----------
async function myWorkouts() {
  app.innerHTML = '<h1>Mine økter</h1>' + (state.me.authenticated ? '<div class="card empty">Laster …</div>' : loginBanner('Logg inn for å lagre og planlegge økter.'));
  if (!state.me.authenticated) return;
  const all = await api('/api/workouts');
  const planned = all.filter((w) => w.status === 'planned').sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  const tpl = all.filter((w) => w.status === 'template');
  const today = new Date(), mon = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayIdx(today));
  const days = [...Array(7)].map((_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
  const evs = (d) => all.filter((w) => (w.status === 'planned' && w.plannedDate.slice(0, 10) === dstr(d)) || (w.status === 'completed' && w.completedAt.slice(0, 10) === dstr(d)));
  const sub = (w) => `${w.items.length} øvelser · ca. ${mins(w.status === 'completed' ? w.actualSec : w.estimatedSec)}`;
  const row = (w, badge = '') => `<div class="card list-item">${badge}<div style="flex:1;min-width:140px"><b>${esc(w.name)}</b><div class="muted small">${sub(w)}</div></div>
    <div class="row"><button class="btn sm" data-a="startSaved" data-id="${w.id}">▶ Start</button><button class="btn ghost sm" data-a="editSaved" data-id="${w.id}">Rediger</button>
    ${w.status === 'template' ? `<button class="btn ghost sm" data-a="planSaved" data-id="${w.id}">📅</button>` : ''}<button class="btn danger sm" data-a="delW" data-id="${w.id}">🗑</button></div></div>`;
  window._all = all;
  app.innerHTML = `<h1>Mine økter</h1>
    <h2>Denne uken</h2>
    <div class="wk">${days.map((d) => `<div class="day ${dstr(d) === dstr(today) ? 'today' : ''}"><h4>${DAYS[dayIdx(d)]} ${d.getDate()}.</h4>${evs(d).map((w) => `<div class="ev ${w.status === 'completed' ? 'done' : ''}" data-a="${w.status === 'planned' ? 'startSaved' : 'noop'}" data-id="${w.id}">${w.status === 'completed' ? '✓ ' : ''}${esc(w.name)}</div>`).join('')}</div>`).join('')}</div>
    <h2 style="margin-top:1.6rem">Planlagte økter</h2>
    ${planned.length ? planned.map((w) => { const d = parseD(w.plannedDate); return row(w, `<div class="date-badge"><small>${MONTHS[d.getMonth()]}</small>${d.getDate()}</div>`); }).join('') : '<div class="card empty small">Ingen planlagte økter. Bygg en økt og trykk «Planlegg».</div>'}
    <h2 style="margin-top:1.6rem">Lagrede maler</h2>
    ${tpl.length ? tpl.map((w) => row(w, '<div class="date-badge" style="background:var(--accent-soft);color:#c2410c">📋</div>')).join('') : '<div class="card empty small">Ingen lagrede maler ennå.</div>'}`;
}

// ---------- Dagbok ----------
async function diary() {
  app.innerHTML = '<h1>Treningsdagbok</h1>' + (state.me.authenticated ? '<div class="card empty">Laster …</div>' : loginBanner());
  if (!state.me.authenticated) return;
  const [s, all, wt] = await Promise.all([api('/api/stats?today=' + dstr(new Date())), api('/api/workouts'), api('/api/weight')]);
  const done = all.filter((w) => w.status === 'completed');
  const weightHtml = weightCard(wt);
  if (!done.length) {
    app.innerHTML = `<h1>Treningsdagbok</h1><div class="card empty"><div class="big">📓</div><p>Ingen fullførte økter ennå.<br>Fullfør din første økt, så dukker statistikken opp her!</p><a class="btn" href="#/okt">Bygg en økt</a></div><div style="margin-top:1rem">${weightHtml}</div>`;
    return;
  }
  const hh = (m) => (m >= 60 ? `${Math.floor(m / 60)} t ${m % 60} min` : `${m} min`);
  const kpi = (ic, v, l) => `<div class="card kpi"><span class="ic">${ic}</span><div class="v">${v}</div><div class="l">${l}</div></div>`;
  const maxW = Math.max(1, ...s.weekly.map((w) => w.minutes)), maxD = Math.max(1, ...s.weekdays);
  const maxC = Math.max(1, ...s.categories.map((c) => c.sets)), maxT = Math.max(1, ...s.topExercises.map((c) => c.sets));
  const pct = Math.min(100, Math.round(s.thisWeek.count / s.weekGoal * 100));
  const hl = (m) => (m === 0 ? '' : m < 15 ? 'l1' : m < 30 ? 'l2' : 'l3');
  const hbars = (arr, mx, lab) => arr.map((c) => `<div class="hrow"><span>${esc(lab(c))}</span><div class="t"><i style="width:${(c.sets ?? c.v) / mx * 100}%"></i></div><b>${c.sets ?? c.v}</b></div>`).join('');
  app.innerHTML = `<h1>Treningsdagbok</h1>
  <div class="grid cols-2" style="grid-template-columns:auto 1fr;align-items:center">
    <div class="card row" style="gap:1.2rem"><div class="ring" style="--p:${pct}"><div><span>${s.thisWeek.count}/${s.weekGoal}<small>denne uken</small></span></div></div>
      <div><h3>Ukemål</h3><p class="muted small" style="margin:0">${s.thisWeek.count >= s.weekGoal ? '🎉 Målet er nådd!' : `${s.weekGoal - s.thisWeek.count} økt${s.weekGoal - s.thisWeek.count > 1 ? 'er' : ''} igjen`}<br>${hh(s.thisWeek.minutes)} trent</p></div></div>
    <div class="grid cols-4" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      ${kpi('🔥', s.streakWeeks + ' uk', 'Ukerekke (beste ' + s.bestStreakWeeks + ')')}${kpi('✅', s.workouts, 'Økter totalt')}${kpi('⏱️', hh(s.totalMinutes), 'Total treningstid')}${kpi('📅', s.last30, 'Økter siste 30 dager')}</div>
  </div>
  <div class="grid cols-4" style="margin-top:1rem;grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
    ${kpi('⌛', s.avgMinutes + ' min', 'Snitt per økt')}${kpi('🏁', s.longestMinutes + ' min', 'Lengste økt')}${kpi('🔁', s.totalReps.toLocaleString('nb-NO'), 'Repetisjoner totalt')}${kpi('🧱', s.totalSets, 'Sett totalt')}
    ${kpi('⏲️', mins(s.totalHoldSeconds), 'Tid i statiske hold')}${kpi('😤', s.avgRpe ?? '–', 'Snitt innsats (1–10)')}</div>
  <div class="grid cols-2" style="margin-top:1rem">
    <div class="card"><h3>Treningstid per uke (min)</h3><div class="bars">${s.weekly.map((w) => `<div class="bar"><b>${w.minutes || ''}</b><i style="height:${w.minutes / maxW * 100}%"></i>u${weekNo(parseD(w.weekStart))}</div>`).join('')}</div></div>
    <div class="card"><h3>Hvilke dager trener du?</h3><div class="bars">${s.weekdays.map((v, i) => `<div class="bar"><b>${v || ''}</b><i style="height:${v / maxD * 100}%"></i>${DAYS[i]}</div>`).join('')}</div></div>
    <div class="card"><h3>Muskelgrupper (antall sett)</h3>${hbars(s.categories, maxC, (c) => c.name)}</div>
    <div class="card"><h3>Mest brukte øvelser</h3>${hbars(s.topExercises, maxT, (c) => c.name)}</div>
  </div>
  <div class="card" style="margin-top:1rem"><h3>Siste 12 uker</h3><div class="heat">${s.heatmap.map((h) => `<i class="${hl(h.minutes)}" title="${prettyDate(h.date)}: ${h.minutes} min"></i>`).join('')}</div>
    <div class="small muted" style="margin-top:.5rem">Mørkere = lengre økt den dagen.</div></div>
  <div style="margin-top:1rem">${weightHtml}</div>
  <h2 style="margin-top:1.6rem">Historikk</h2>
  ${done.map((w) => `<details class="card log"><summary><div class="date-badge"><small>${MONTHS[parseD(w.completedAt).getMonth()]}</small>${parseD(w.completedAt).getDate()}</div>
    <div><b>${esc(w.name)}</b><div class="muted small">${w.items.length} øvelser${w.rpe ? ` · innsats ${w.rpe}/10` : ''}${w.togetherWith ? ` · 👥 sammen med ${esc(w.togetherWith)}` : ''}</div></div><div class="meta"><b>${mins(w.actualSec)}</b></div></summary>
    <div class="body"><ul>${w.items.map((i) => { const e = state.byId[i.exerciseId]; return e ? `<li>${esc(e.name)} – ${i.sets} × ${i.seconds ? i.seconds + ' sek' : i.reps + ' rep'}</li>` : ''; }).join('')}</ul>
    ${w.notes ? `<p class="muted">📝 ${esc(w.notes)}</p>` : ''}<div class="row"><button class="btn ghost sm" data-a="startSaved" data-id="${w.id}">🔁 Kjør igjen</button><button class="btn danger sm" data-a="delW" data-id="${w.id}" data-back="dagbok">Slett</button></div></div></details>`).join('')}`;
  window._all = all;
}
function weightCard(wt) {
  const es = wt.entries, goal = wt.goalKg, last = es[es.length - 1], first = es[0];
  const kg = (v) => v.toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const kpi = (l, v) => `<div class="card kpi" style="box-shadow:none;background:var(--bg)"><div class="v">${v}</div><div class="l">${l}</div></div>`;
  let chart = '<p class="muted small">Registrer vekten din for å se utviklingen.</p>';
  if (es.length) {
    const pts = es.slice(-60), vals = pts.map((e) => e.kg).concat(goal ? [goal] : []);
    const lo = Math.min(...vals) - 1, hi = Math.max(...vals) + 1;
    const x = (i) => (pts.length === 1 ? 150 : 10 + i * 280 / (pts.length - 1)), y = (v) => 110 - (v - lo) / (hi - lo) * 100;
    chart = `<svg viewBox="0 0 300 120" class="wchart" role="img" aria-label="Vektutvikling">
      ${goal ? `<line x1="0" x2="300" y1="${y(goal)}" y2="${y(goal)}" class="wgoal"/><text x="298" y="${y(goal) - 3}" text-anchor="end" class="wlbl">Mål ${kg(goal)}</text>` : ''}
      <polyline points="${pts.map((e, i) => `${x(i)},${y(e.kg)}`).join(' ')}" class="wline"/>
      ${pts.map((e, i) => `<circle cx="${x(i)}" cy="${y(e.kg)}" r="3.5" class="wdot"><title>${prettyDate(e.date)}: ${kg(e.kg)} kg</title></circle>`).join('')}</svg>`;
  }
  const diff = last && first ? last.kg - first.kg : 0;
  const toGoal = last && goal ? last.kg - goal : null;
  return `<div class="card"><div class="row between"><h3>⚖️ Kroppsvekt</h3></div>
    <div class="row" style="margin:.4rem 0 .8rem;align-items:flex-end">
      <label class="f">Dato<input type="date" id="wdate" value="${dstr(new Date())}"></label>
      <label class="f">Vekt (kg)<input type="number" id="wkg" step="0.1" min="20" max="400" inputmode="decimal" style="width:7rem" placeholder="${last ? kg(last.kg) : '75,0'}"></label>
      <button class="btn" data-a="addWeight">Registrer</button>
      <label class="f" style="margin-left:auto">Vektmål (kg)<span class="row" style="flex-wrap:nowrap"><input type="number" id="wgoal" step="0.1" min="20" max="400" inputmode="decimal" style="width:7rem" value="${goal ?? ''}"><button class="btn ghost" data-a="setGoal">Lagre</button></span></label></div>
    ${es.length ? `<div class="grid cols-3" style="margin-bottom:.8rem">${kpi('Nåværende', kg(last.kg) + ' kg')}${kpi('Endring siden start', (diff > 0 ? '+' : '') + kg(diff) + ' kg')}${kpi(toGoal === null ? 'Vektmål' : toGoal > 0 ? 'Igjen til målet (ned)' : toGoal < 0 ? 'Igjen til målet (opp)' : 'Mål nådd 🎉', toGoal === null ? '–' : kg(Math.abs(toGoal)) + ' kg')}</div>` : ''}
    ${chart}
    ${es.length ? `<details style="margin-top:.6rem"><summary class="muted small" style="cursor:pointer">Alle målinger</summary>${es.slice().reverse().map((e) => `<div class="row between small" style="padding:.3rem 0;border-bottom:1px solid var(--line)"><span>${prettyDate(e.date)}</span><span><b>${kg(e.kg)} kg</b> <button class="icon-btn" data-a="delWeight" data-id="${e.id}" aria-label="Slett">✕</button></span></div>`).join('')}</details>` : ''}</div>`;
}
function weekNo(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); }

// ---------- Kjør økt ----------
function beep(f = 880, ms = 160) {
  try { const c = beep.c ||= new (window.AudioContext || window.webkitAudioContext)(); const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = .08; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + ms / 1000); } catch { /* ingen lyd */ }
}
function askStart(items, name) {
  if (!state.me.authenticated) return startRun(items, name);
  state.pending = { items, name, partners: [] };
  drawPartnerModal();
}
function drawPartnerModal() {
  const p = state.pending;
  openModal(`<h2>Start «${esc(p.name)}»</h2>
    <p class="muted">Trener du sammen med noen? Legg til e-posten deres (de må ha logget inn her før). Økten havner da også i deres dagbok.</p>
    <div class="row" style="flex-wrap:nowrap"><input id="pemail" type="email" placeholder="venn@eksempel.no" style="flex:1;min-width:0"><button class="btn" data-a="partnerAdd">Legg til</button></div>
    <div class="pills" style="margin:.8rem 0">${p.partners.map((x, i) => `<span class="chip cat">👥 ${esc(x.name)} <button class="icon-btn" style="width:22px;height:22px" data-a="partnerRm" data-i="${i}" aria-label="Fjern">✕</button></span>`).join('')}</div>
    <button class="btn lg" data-a="startNow">▶ Start${p.partners.length ? ' sammen' : ''}</button>`);
  const inp = $('#pemail'); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('[data-a=partnerAdd]').click(); });
}
function startRun(items, name, partners = []) {
  const steps = [];
  items.forEach((it, i) => {
    for (let s = 1; s <= it.sets; s++) {
      steps.push({ t: 'work', it, set: s, n: i + 1 });
      if (s < it.sets) steps.push({ t: 'rest', sec: it.rest, next: it, label: `Neste sett (${s + 1}/${it.sets})` });
      else if (i < items.length - 1) steps.push({ t: 'rest', sec: TRANSITION, next: items[i + 1], label: 'Neste øvelse' });
    }
  });
  state.run = { name, items, steps, partners, i: 0, left: 0, elapsed: 0, paused: false, started: new Date(), done: false };
  setStepTimer(); location.hash = '#/kjor';
}
function setStepTimer() {
  const r = state.run, s = r.steps[r.i];
  r.left = s.t === 'rest' ? s.sec : (s.it.seconds > 0 ? workPerSet(s.it) : 0);
}
function runPage() {
  const r = state.run;
  if (!r) { location.hash = '#/okt'; return; }
  drawRun();
  let last = Date.now();
  timerHandle = setInterval(() => {
    const now = Date.now(), dt = (now - last) / 1000; last = now;
    if (r.paused || r.done) return;
    r.elapsed += dt;
    const s = r.steps[r.i];
    if (s.t === 'rest' || s.it.seconds > 0) {
      r.left -= dt;
      if (r.left <= 3 && r.left > 0 && Math.ceil(r.left) !== r._b) { r._b = Math.ceil(r.left); beep(660, 90); }
      if (r.left <= 0) { beep(990, 250); nextStep(); return; }
    }
    updateTimer();
  }, 250);
}
function nextStep() {
  const r = state.run;
  if (r.i >= r.steps.length - 1) { r.done = true; drawRun(); return; }
  r.i++; setStepTimer(); drawRun();
}
function updateTimer() {
  const r = state.run, el = $('#tm'); if (!el) return;
  el.textContent = mmss(Math.max(0, Math.ceil(r.left)));
  const total = $('#tot'); if (total) total.textContent = mmss(r.elapsed);
}
function drawRun() {
  const r = state.run;
  if (r.done) return drawSummary();
  const s = r.steps[r.i], pct = Math.round(r.i / r.steps.length * 100);
  let body;
  if (s.t === 'work') {
    const e = unit(s.it), timed = s.it.seconds > 0;
    body = `<span class="phase">Øvelse ${s.n}/${r.items.length} · sett ${s.set}/${s.it.sets}</span>
      <h2 style="margin:.6rem 0">${esc(e.name)}</h2><div class="thumb" style="max-width:560px;margin:0 auto .8rem">${illustration(e, 'both')}</div>
      ${timed ? `<div class="timer" id="tm">${mmss(Math.ceil(r.left))}</div><p class="muted">${e.unilateral ? 'Halvparten på hver side' : 'Hold ut!'}</p>`
        : `<div class="timer">${s.it.reps}<span style="font-size:1.4rem"> rep${e.unilateral ? ' / side' : ''}</span></div><p class="muted">Trykk når du er ferdig med settet</p><button class="btn lg" data-a="runNext">✓ Ferdig med settet</button>`}
      <details style="text-align:left;margin-top:1rem"><summary class="muted small" style="cursor:pointer">Vis forklaring</summary><ol class="steps">${e.steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></details>`;
  } else {
    const e = unit(s.next);
    body = `<span class="phase rest">Pause</span><div class="timer rest" id="tm" style="margin:.8rem 0">${mmss(Math.ceil(r.left))}</div>
      <p class="muted">${esc(s.label)}: <b>${esc(e.name)}</b></p><div class="thumb" style="max-width:420px;margin:0 auto 1rem">${illustration(e, 'both')}</div>
      <div class="row" style="justify-content:center"><button class="btn ghost" data-a="runAdd">+15 s</button><button class="btn" data-a="runNext">Hopp over ›</button></div>`;
  }
  app.innerHTML = `<div class="player"><div class="progress"><i style="width:${pct}%"></i></div>
    <div class="row between small muted" style="margin-bottom:.6rem"><span>⏱ <b id="tot">${mmss(r.elapsed)}</b></span><span>${esc(r.name)}</span>
      <span><button class="btn ghost sm" data-a="runPause">${r.paused ? '▶ Fortsett' : '⏸ Pause'}</button> <button class="btn danger sm" data-a="runQuit">Avbryt</button></span></div>
    <div class="card stage">${body}</div></div>`;
}
function drawSummary() {
  const r = state.run; clearInterval(timerHandle);
  const sec = Math.round(r.elapsed);
  app.innerHTML = `<div class="player"><div class="card stage stack"><div style="font-size:3rem">🎉</div><h1>Bra jobbet!</h1>
    <p class="muted">${esc(r.name)} · ${mins(sec)} · ${r.items.length} øvelser${r.partners.length ? `<br>👥 Sammen med ${esc(r.partners.map((x) => x.name).join(', '))} – økten lagres også hos dem` : ''}</p>
    <div><div class="muted small" style="margin-bottom:.4rem">Hvor tøff var økten? (1–10)</div><div class="rpe" id="rpe">${[...Array(10)].map((_, i) => `<button data-a="rpe" data-v="${i + 1}">${i + 1}</button>`).join('')}</div></div>
    <textarea id="notes" rows="3" placeholder="Notater (valgfritt)" style="width:100%"></textarea>
    ${state.me.authenticated ? '<button class="btn lg" data-a="saveRun">💾 Lagre i dagboken</button>' : loginBanner('Logg inn for å lagre økten i dagboken. (Du mister denne økten om du forlater siden.)')}
    <a class="btn ghost" href="#/okt" data-a="runDiscard">Forkast</a></div></div>`;
}

// ---------- Hendelser ----------
document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a, d = el.dataset, d_ = state.draft;
  const run = async (fn) => { try { await fn(); } catch (e) { toast(e.message); } };
  switch (a) {
    case 'closeModal': return closeModal();
    case 'openEx': return openEx(d.id);
    case 'addEx': closeModal(); return addEx(d.id);
    case 'pickAdd': addEx(d.id); return drawItems();
    case 'picker': return picker();
    case 'fcat': state.lib.cat = d.v; return library();
    case 'feq': state.lib.eq = d.v; return library();
    case 'flvl': state.lib.lvl = +d.v; return library();
    case 'quickGen': ev.preventDefault(); return run(async () => { location.hash = '#/okt'; await new Promise((r) => setTimeout(r, 30)); await generate(); });
    case 'generate': return run(generate);
    case 'adj': { const it = d_.items[+d.i], f = d.f, lim = { sets: [1, 10], reps: [1, 100], seconds: [5, 300], rest: [0, 300] }[f]; it[f] = Math.min(lim[1], Math.max(lim[0], it[f] + +d.d)); saveDraft(); return drawItems(); }
    case 'mv': { const i = +d.i, j = i + +d.d; if (j < 0 || j >= d_.items.length) return; [d_.items[i], d_.items[j]] = [d_.items[j], d_.items[i]]; saveDraft(); return drawItems(); }
    case 'rm': d_.items.splice(+d.i, 1); saveDraft(); return drawItems();
    case 'clear': if (confirm('Tømme økten?')) { state.draft = { id: null, name: '', items: [] }; saveDraft(); builder(); } return;
    case 'start': return askStart(d_.items, d_.name || 'Treningsøkt');
    case 'saveTpl': return run(async () => { const w = await persist('template'); d_.id = w.id; saveDraft(); toast('Økten er lagret under «Mine økter»'); });
    case 'plan': return run(async () => { const dt = $('#pdate').value; if (!dt) return toast('Velg dato'); await persist('planned', { plannedDate: dt }); state.draft = { id: null, name: '', items: [] }; saveDraft(); toast('Økten er planlagt'); location.hash = '#/planlegg'; });
    case 'startSaved': { const w = window._all.find((x) => x.id == d.id); if (w) askStart(w.items, w.name); return; }
    case 'partnerAdd': return run(async () => {
      const em = $('#pemail').value.trim(); if (!em) return;
      let u; try { u = await api('/api/users/lookup?email=' + encodeURIComponent(em)); } catch { return toast('Fant ingen bruker med den e-posten (de må ha logget inn først).'); }
      if (!state.pending.partners.some((x) => x.id === u.id)) state.pending.partners.push(u);
      drawPartnerModal();
    });
    case 'partnerRm': state.pending.partners.splice(+d.i, 1); return drawPartnerModal();
    case 'startNow': { const p = state.pending; closeModal(); return startRun(p.items, p.name, p.partners); }
    case 'addWeight': return run(async () => {
      const kg = parseFloat($('#wkg').value.replace(',', '.')); if (!kg) return toast('Skriv inn vekt');
      await api('/api/weight', { method: 'POST', body: { date: $('#wdate').value, kg } }); toast('Vekt registrert'); diary();
    });
    case 'setGoal': return run(async () => {
      const v = $('#wgoal').value.replace(',', '.');
      await api('/api/weight/goal', { method: 'PUT', body: { goalKg: v ? parseFloat(v) : null } }); toast('Vektmål lagret'); diary();
    });
    case 'delWeight': return run(async () => { await api('/api/weight/' + d.id, { method: 'DELETE' }); diary(); });
    case 'editSaved': { const w = window._all.find((x) => x.id == d.id); state.draft = { id: w.status === 'completed' ? null : w.id, name: w.name, items: w.items }; saveDraft(); location.hash = '#/okt'; return; }
    case 'planSaved': { const dt = prompt('Dato (ÅÅÅÅ-MM-DD):', dstr(new Date())); if (!dt || isNaN(parseD(dt))) return; const w = window._all.find((x) => x.id == d.id); return run(async () => { await api('/api/workouts', { method: 'POST', body: { name: w.name, status: 'planned', plannedDate: dt, items: w.items } }); toast('Planlagt'); myWorkouts(); }); }
    case 'delW': return run(async () => { if (!confirm('Slette økten?')) return; await api('/api/workouts/' + d.id, { method: 'DELETE' }); d.back ? diary() : myWorkouts(); });
    case 'runNext': return nextStep();
    case 'runPause': state.run.paused = !state.run.paused; return drawRun();
    case 'runAdd': state.run.left += 15; return updateTimer();
    case 'runQuit': if (confirm('Avbryte økten?')) { clearInterval(timerHandle); state.run = null; location.hash = '#/okt'; } return;
    case 'runDiscard': state.run = null; return;
    case 'rpe': document.querySelectorAll('#rpe button').forEach((b) => b.classList.toggle('on', b === el)); state.run.rpe = +d.v; return;
    case 'saveRun': return run(async () => {
      const r = state.run;
      await api('/api/workouts', { method: 'POST', body: { name: r.name, status: 'completed', items: r.items, actualSec: Math.round(r.elapsed), completedAt: isoLocal(new Date()), rpe: r.rpe ?? null, notes: $('#notes').value, partnerIds: r.partners.map((x) => x.id) } });
      state.run = null; toast('Økten er lagret i dagboken 🎉'); location.hash = '#/dagbok';
    });
  }
});

// ---------- Init ----------
(async function init() {
  try {
    const [me, ex] = await Promise.all([fetch('/api/me', { credentials: 'same-origin' }).then((r) => r.json()), fetch('/api/exercises').then((r) => r.json())]);
    state.me = me; state.exercises = ex; state.byId = Object.fromEntries(ex.map((e) => [e.id, e]));
    state.draft.items = state.draft.items.filter((i) => state.byId[i.exerciseId]);
  } catch { app.innerHTML = '<div class="card empty">Kunne ikke laste data. Prøv å laste siden på nytt.</div>'; return; }
  renderUser(); route();
})();
