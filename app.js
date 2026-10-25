"use strict";
const WEB = false; /* true en la versión para web y Google Play */
/* ===== MOTOR DE LA APP ===== */
const KEY = "porfinapto.v1";
const MIN = 60000, DAY = 86400000;
const BOX = [10 * MIN, DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];
const LET = ["A", "B", "C"];
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtDate = ts => new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
const plural = (n, a, b) => n + " " + (n === 1 ? a : b);

function blank() { return { v: 1, upd: 0, created: Date.now(), examDate: "", q: {}, tests: [], lastAmb: 0, amb: { n: 0, ok: 0 }, perm: "", hasB: null, ex: "", done: {}, dates: {} }; }
function trimTests() {
  // Los diagnósticos se guardan siempre; del resto, los 60 últimos de cada examen.
  const cnt = {}, keep = [];
  for (let i = S.tests.length - 1; i >= 0; i--) {
    const t = S.tests[i], x = t.x || "comun";
    cnt[x] = (cnt[x] || 0) + 1;
    if (t.kind === "diag" || cnt[x] <= 60) keep.push(t);
  }
  S.tests = keep.reverse();
}
function migrate(o) {
  if (!o.q) o.q = {}; if (!o.tests) o.tests = []; if (!o.amb) o.amb = { n: 0, ok: 0 };
  o.tests.forEach(t => { if (!t.x) t.x = "comun"; });
  if (o.perm === undefined) o.perm = o.tests.length ? "B" : "";
  if (o.hasB === undefined) o.hasB = null;
  if (!o.ex) o.ex = "";
  if (!o.dates) { o.dates = {}; if (o.examDate) o.dates.comun = o.examDate; }
  if (!o.done) { o.done = {}; o.tests.forEach(t => o.done[t.x] = (o.done[t.x] || 0) + 1); }
  return o;
}
function loadLocal() { try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1) return o; } } catch (e) {} return null; }
let S = migrate(loadLocal() || blank());

/* ---------- Guardado: dispositivo + cuenta (db privada por usuario) ---------- */
let DOC = null, wTimer = 0, writing = false, again = false, retries = 0, syncMode = "local";
function syncText() {
  return syncMode === "cloud" ? "Progreso guardado en tu cuenta" : syncMode === "error" ? "No pude guardar en tu cuenta; queda guardado en este dispositivo" : "Progreso guardado en este dispositivo";
}
function setSync(m) { syncMode = m; const el = $("#sync"); if (el) el.textContent = syncText(); }
function save() {
  S.upd = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  if (DOC) { clearTimeout(wTimer); wTimer = setTimeout(flush, 1200); }
}
async function flush() {
  if (!DOC) return;
  if (writing) { again = true; return; }
  writing = true;
  try { await DOC.set({ s: S, at: Date.now() }); retries = 0; setSync("cloud"); }
  catch (e) {
    const c = e && e.code;
    if (c === "unavailable" && retries < 2) { retries++; setTimeout(flush, 3000 + Math.random() * 2000); }
    else { DOC = null; setSync("error"); }
  }
  writing = false;
  if (again) { again = false; flush(); }
}
async function initRemote() {
  try {
    if (!window.claude || typeof window.claude.use !== "function") return;
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    const ref = db.doc("data/users/" + uid + "/progreso");
    const snap = await ref.get();
    DOC = ref;
    const remote = snap.exists ? (snap.data() || {}).s : null;
    if (remote && remote.v === 1 && (remote.upd || 0) > (S.upd || 0)) {
      S = migrate(JSON.parse(JSON.stringify(remote)));
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
      if (!RUN) { if (!S.perm) VIEW = "perm"; renderView(); }
    } else if ((S.upd || 0) > ((remote && remote.upd) || 0)) flush();
    setSync("cloud");
  } catch (e) { setSync("local"); }
}

/* ---------- Registro de respuestas (repetición espaciada) ---------- */
function rec(id) { return S.q[id] || (S.q[id] = { s: 0, c: 0, w: 0, b: 0, due: 0, lt: 0, lw: -1, fast: 0, flip: 0, slow: 0, lf: 0 }); }
function record(id, ok, orig, ms, flipped) {
  const r = rec(id), now = Date.now();
  r.s++; r.lt = now;
  if (ok) { r.c++; r.b = Math.min(5, r.b + 1); r.due = now + BOX[r.b]; }
  else {
    r.w++; r.b = 0; r.due = now + BOX[0]; r.lw = orig; r.lf = now;
    if (orig >= 0 && ms < 6000) r.fast++;
    if (ms > 45000) r.slow++;
    if (flipped) r.flip++;
  }
}
const seen = id => (S.q[id] ? S.q[id].s : 0);
const PL = () => PERMITS[S.perm] || PERMITS.B;
function permExams(p = S.perm) {
  const P0 = PERMITS[p]; if (!P0) return ["comun"];
  if (!P0.ex.length) return [P0.practice];
  if (P0.askB && S.hasB) return P0.ex.filter(x => x !== "comun");
  return P0.ex;
}
function curX() { const l = permExams(); if (!l.includes(S.ex)) S.ex = l[0]; return S.ex; }
const EXc = () => EXAMS[curX()];
let _pk = "", _pool = [], _pset = new Set();
function POOL() {
  const k = S.perm + "|" + curX();
  if (k !== _pk) { const E = EXAMS[S.ex]; _pool = ALLQ.filter(q => E.pool(q, S.perm)); _pset = new Set(_pool.map(q => q.id)); _pk = k; }
  return _pool;
}
const inPool = id => { POOL(); return _pset.has(id); };
const TPOOL = () => POOL().filter(q => !q.scene);
const xTests = () => S.tests.filter(t => (t.x || "comun") === curX());
const exams = () => xTests().filter(t => t.kind === "diag" || t.kind === "sim");
const diagDone = () => xTests().filter(t => t.kind === "diag").length;
const failRecs = () => Object.entries(S.q).filter(([id, r]) => r.w > 0 && BYID[id] && inPool(id));
const reds = () => failRecs().filter(([, r]) => r.b === 0);
const ambers = () => failRecs().filter(([, r]) => r.b > 0 && r.b < 3);
function dueList() {
  const now = Date.now();
  return failRecs().filter(([id, r]) => r.b < 3 && r.due <= now && !BYID[id].scene)
    .sort((a, b) => a[1].b - b[1].b || a[1].due - b[1].due).map(([id]) => id);
}
function themeStats() {
  const E = EXc(), st = {};
  E.themes.forEach(t => st[t] = { s: 0, w: 0, n: POOL().filter(q => q.t === t).length });
  Object.entries(S.q).forEach(([id, r]) => { const q = BYID[id]; if (q && st[q.t] && inPool(id)) { st[q.t].s += r.s; st[q.t].w += r.w; } });
  return st;
}
function readiness() {
  const E = EXc(), N = E.diag, lim = E.fails - 1;
  const dd = diagDone(), last5 = exams().slice(-5), nRed = reds().length;
  const nov = TPOOL().filter(q => q.k === "novedad");
  const novOk = nov.filter(q => S.q[q.id] && S.q[q.id].c > 0).length;
  const crit = [
    { ok: dd >= N, t: `Diagnóstico completo (${Math.min(dd, N)} de ${N})` },
    { ok: last5.length === 5 && last5.every(t => t.fails <= lim), t: `Últimos 5 tests con ${plural(lim, "fallo", "fallos")} o menos` },
    { ok: xTests().length > 0 && nRed === 0, t: nRed ? `Sin preguntas en rojo (tienes ${nRed})` : "Sin preguntas en rojo" }
  ];
  if (nov.length) crit.push({ ok: novOk === nov.length, t: `Normas nuevas acertadas al menos una vez (${novOk} de ${nov.length})` });
  const avg = last5.length ? last5.reduce((a, t) => a + t.fails, 0) / last5.length : 99;
  let level = "rojo";
  if (crit.every(c => c.ok)) level = "verde";
  else if (dd >= N && avg <= E.fails) level = "ambar";
  const title = level === "verde" ? "Listo para examen" : level === "ambar" ? "Casi, pero no te firmo" : "Todavía no";
  const sub = level === "verde" ? "Cumples todo lo que exijo. Mantén un simulacro al día hasta el examen."
    : level === "ambar" ? "Apruebas a veces. Yo quiero que apruebes siempre, con margen."
    : dd < N ? "Primero el diagnóstico. Sin datos no hay método." : "Tus últimos tests no pasan mi listón.";
  return { level, crit, title, sub, avg, dd, nRed, N, E };
}

/* ---------- Construcción de tests ---------- */
function pickLeast(pool, n, ex) {
  const arr = shuffle(pool.filter(q => !ex.has(q.id)));
  arr.sort((a, b) => seen(a.id) - seen(b.id));
  const out = arr.slice(0, n); out.forEach(q => ex.add(q.id)); return out.map(q => q.id);
}
function dueFailed(n, ex, maxBox = 2) {
  const out = failRecs().filter(([id, r]) => r.b < maxBox && !BYID[id].scene && !ex.has(id))
    .sort((a, b) => a[1].b - b[1].b || b[1].w - a[1].w || a[1].due - b[1].due).slice(0, n).map(([id]) => id);
  out.forEach(id => ex.add(id)); return out;
}
function withVideo(ids, ex) {
  const v = pickLeast(VIDEOS, 1, ex)[0];
  const pos = 3 + ((Math.random() * (ids.length - 3)) | 0);
  ids.splice(pos, 0, v); return ids;
}
function buildDiag() {
  const E = EXc(), ex = new Set(), n = E.q - (E.video ? 1 : 0), T = TPOOL();
  let ids = dueFailed(Math.round(n / 5), ex);
  ids = ids.concat(pickLeast(T.filter(q => q.f === 1), n - ids.length, ex));
  if (ids.length < n) ids = ids.concat(pickLeast(T, n - ids.length, ex));
  ids = shuffle(ids);
  return E.video ? withVideo(ids, ex) : ids;
}
function buildSim() {
  const E = EXc(), ex = new Set(), n = E.q - (E.video ? 1 : 0), T = TPOOL();
  let ids = dueFailed(Math.round(n * 0.27), ex);
  ids = ids.concat(pickLeast(T.filter(q => q.k === "novedad"), E.q >= 30 ? 3 : 2, ex));
  const ts = themeStats();
  const weak = {}; E.themes.forEach(t => weak[t] = (ts[t].w + 1) / (ts[t].s + 3));
  const capN = Math.ceil(n / 4);
  const cap = {}; ids.forEach(id => { const t = BYID[id].t; cap[t] = (cap[t] || 0) + 1; });
  let cand = T.filter(q => !ex.has(q.id));
  while (ids.length < n && cand.length) {
    const ws = cand.map(q => (cap[q.t] || 0) >= capN ? 0 : (weak[q.t] || 0.3) * (q.f ? 1.3 : 1) / (1 + seen(q.id)));
    const tot = ws.reduce((a, b) => a + b, 0);
    let i = 0;
    if (tot <= 0) i = (Math.random() * cand.length) | 0;
    else { let r = Math.random() * tot; while (i < ws.length - 1 && r > ws[i]) { r -= ws[i]; i++; } if (!ws[i]) i = ws.findIndex(w => w > 0); }
    const q = cand[i]; ids.push(q.id); ex.add(q.id); cap[q.t] = (cap[q.t] || 0) + 1; cand.splice(i, 1);
  }
  ids = shuffle(ids);
  return E.video ? withVideo(ids, ex) : ids;
}
function rankForPractice(pool) {
  const score = q => { const r = S.q[q.id]; if (!r) return 2; if (r.w > 0 && r.b === 0) return 0; return 1 + (r.c / (r.s || 1)) + r.b * 0.1; };
  return shuffle(pool.slice()).sort((a, b) => score(a) - score(b) || seen(a.id) - seen(b.id));
}
function buildMode(mode) {
  const [m, arg] = mode.split(":");
  const E = EXc();
  if (m === "diag") { const n = diagDone() + 1; return { kind: "diag", n, title: `Diagnóstico ${n} de ${E.diag}`, ids: buildDiag(), fb: "end", limit: E.min * MIN }; }
  if (m === "sim") return { kind: "sim", title: "Simulacro", ids: buildSim(), fb: "end", limit: E.min * MIN };
  if (m === "repaso") {
    const ids = failRecs().filter(([id, r]) => r.b < 3).sort((a, b) => a[1].b - b[1].b || b[1].w - a[1].w).slice(0, 20).map(([id]) => id);
    return { kind: "repaso", title: "Repaso de fallos", ids, fb: "instant" };
  }
  if (m === "cifras") return { kind: "cifras", title: "Ráfaga de cifras", ids: rankForPractice(TPOOL().filter(q => q.k === "cifra")).slice(0, 12).map(q => q.id), fb: "instant" };
  if (m === "nov") return { kind: "nov", title: "Normas nuevas", ids: rankForPractice(TPOOL().filter(q => q.k === "novedad")).slice(0, 12).map(q => q.id), fb: "instant" };
  if (m === "riesgo") return { kind: "riesgo", title: "Percepción del riesgo", ids: shuffle(VIDEOS.map(v => v.id)), fb: "instant" };
  if (m === "tema") {
    const pool = POOL().filter(q => q.t === arg);
    return { kind: "tema", title: THEMES[arg].n, ids: rankForPractice(pool).slice(0, 10).map(q => q.id), fb: "instant" };
  }
  if (m === "trampa") {
    const failed = failRecs().filter(([id]) => BYID[id].k === arg).sort((a, b) => b[1].w - a[1].w).map(([id]) => id);
    const extra = rankForPractice(POOL().filter(q => q.k === arg && !failed.includes(q.id))).map(q => q.id);
    return { kind: "trampa", title: "Trampa: " + TRAPS[arg].n, ids: failed.concat(extra).slice(0, 12), fb: "instant" };
  }
  if (m === "ids") return { kind: "repaso", title: "Repaso de este test", ids: arg.split(",").filter(id => BYID[id]), fb: "instant" };
  return null;
}

/* ---------- Ejecución de un test ---------- */
let RUN = null, stopVid = null;
function startRun(mode) {
  const cfg = buildMode(mode);
  if (!cfg || !cfg.ids.length) { toast("No hay preguntas para este modo todavía."); return; }
  closeModal();
  cfg.x = curX(); cfg.pl = PL().l;
  RUN = Object.assign(cfg, {
    items: cfg.ids.map(id => ({ id, order: shuffle([0, 1, 2]), sel: -1, hist: [], ms: 0, views: 0, done: false, ok: null })),
    i: 0, t0: Date.now(), shown: performance.now(), tid: 0, confirmFinish: false, confirmQuit: false, result: null, grid: false
  });
  $("#exam").hidden = false; document.body.classList.add("lock");
  if (RUN.limit) RUN.tid = setInterval(tick, 1000);
  renderRun(); tick();
}
function curItem() { return RUN.items[RUN.i]; }
function stopVideo() { if (stopVid) { stopVid(); stopVid = null; } }
function account() { const it = curItem(); if (it && !(RUN.fb === "instant" && it.done)) { it.ms += performance.now() - RUN.shown; } RUN.shown = performance.now(); }
function goto(i) { if (!RUN || i < 0 || i >= RUN.items.length) return; stopVideo(); account(); RUN.i = i; RUN.grid = false; RUN.confirmFinish = false; renderRun(); $("#examBodyWrap").scrollTop = 0; }
function tick() {
  if (!RUN || !RUN.limit || RUN.result) return;
  const left = Math.max(0, RUN.limit - (Date.now() - RUN.t0));
  const el = $("#timer");
  if (el) { const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000); el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; el.classList.toggle("warn", left < 5 * MIN); }
  if (left <= 0) finishRun(true);
}
function quitRun() { stopVideo(); clearInterval(RUN && RUN.tid); RUN = null; $("#exam").hidden = true; document.body.classList.remove("lock"); renderView(); setTimeout(() => maybeAmbush("tab"), 600); }

function signHTML(q) { return q.img ? `<div class="signbox">${signSVG(q.img)}</div>` : ""; }
function optsHTML(q, it, reveal) {
  return `<div class="opts">${it.order.map((orig, pos) => {
    let cls = "opt";
    if (reveal) { if (orig === 0) cls += " ok"; else if (pos === it.sel) cls += " ko"; else cls += " dim"; }
    else if (pos === it.sel) cls += " sel";
    return `<button class="${cls}" data-act="pick" data-pos="${pos}" ${reveal ? "disabled" : ""} aria-pressed="${pos === it.sel}"><span class="let">${LET[pos]}</span><span class="otx">${esc(q.o[orig])}</span></button>`;
  }).join("")}</div>`;
}
function videoHTML(q, it) {
  const left = 3 - it.views;
  const poster = sceneMarkup(q.scene, SCENES[q.scene].poster);
  return `<div class="vid"><div class="stage" id="stage">${poster}</div>
    ${it.views === 0 ? `<button class="vidcover" data-act="play"><span class="playbtn" aria-hidden="true"></span><span class="vc1">Haga clic para ver el vídeo</span><span class="vc2">Le quedan 3 visualizaciones antes de ver la pregunta</span></button>`
      : `<div class="vidbar"><span>${left > 0 ? plural(left, "visualización restante", "visualizaciones restantes") : "Sin visualizaciones restantes"}</span>${left > 0 ? `<button class="btn ghost sm" data-act="play">Ver de nuevo</button>` : ""}</div>`}</div>`;
}
function revealHTML(q, it) {
  const r = S.q[q.id] || {};
  const note = it.ok ? okLine() : behaviourNote(it, r);
  return `<div class="reveal ${it.ok ? "good" : "bad"}"><p class="verdict">${it.ok ? "Correcta" : "Fallo"}</p>
    <p class="why"><span class="chip">${esc(TRAPS[q.k].n)}</span>${esc(q.e)}</p>${note ? `<p class="hand">${esc(note)}</p>` : ""}</div>`;
}
function okLine() { const a = ["Bien. Que no se te suba.", "Correcta. Ahora acierta también la siguiente.", "Así sí.", "Bien leída.", "Esa ya no te pilla. De momento."]; return a[(Math.random() * a.length) | 0]; }
function behaviourNote(it, r) {
  const ms = it.ansMs != null ? it.ansMs : it.ms;
  const s = Math.round(ms / 1000);
  if (it.sel >= 0 && ms < 6000) return `Respondiste en ${s} s. Ni el radar de tramo va tan rápido: lee la pregunta entera.`;
  if (it.flipped) return "Tenías la buena y la cambiaste. Tu primera respuesta sabía más que tú.";
  if (ms > 45000) return `${s} s dudando. Si dudas tanto, no lo sabes: a la chuleta del tema.`;
  if (r.w >= 2) return `Ya van ${r.w} fallos en esta. Ya no es despiste: apúntatela.`;
  return "";
}

function renderRun() {
  const R = RUN; if (!R) return;
  if (R.result) return renderResult();
  const it = curItem(), q = BYID[it.id], isV = !!q.scene;
  const answered = R.items.filter(x => x.sel >= 0).length;
  const instantDone = R.fb === "instant" && it.done;
  $("#examHead").innerHTML = `
    <button class="iconbtn" data-act="quit" aria-label="Salir del test">${R.confirmQuit ? "¿Salir? Se pierde" : "✕"}</button>
    <div class="eh-mid"><p class="eh-t">${esc(R.title)}</p><p class="eh-s">${R.fb === "end" ? `${esc(R.pl)} · ` : ""}Pregunta ${R.i + 1} de ${R.items.length}</p></div>
    ${R.limit ? `<p class="timer" id="timer" aria-label="Tiempo restante">${String(R.limit / MIN).padStart(2, "0")}:00</p>` : `<p class="eh-s">${plural(R.items.filter(x => x.done && !x.ok).length, "fallo", "fallos")}</p>`}`;
  const prog = `<div class="prog"><span style="width:${((R.i + 1) / R.items.length * 100).toFixed(1)}%"></span></div>`;
  let body = prog;
  if (R.grid) {
    body += `<div class="grid">${R.items.map((x, i) => `<button class="gcell ${x.sel >= 0 ? "on" : ""} ${i === R.i ? "cur" : ""}" data-act="jump" data-i="${i}">${i + 1}</button>`).join("")}</div>`;
  } else {
    body += `<article class="qcard"><p class="qnum">${R.i + 1}</p>`;
    if (isV) body += videoHTML(q, it);
    if (!isV || it.views > 0) {
      body += signHTML(q) + `<h2 class="qtext">${esc(q.q)}</h2>` + optsHTML(q, it, instantDone);
      if (instantDone) body += revealHTML(q, it);
    }
    body += `</article>`;
  }
  $("#examBody").innerHTML = body;
  let bar = "";
  if (R.fb === "end") {
    let last = R.i === R.items.length - 1;
    const unans = R.items.length - answered;
    if (R.grid) last = true;
    bar = `<button class="btn ghost" data-act="prev" ${R.i === 0 ? "disabled" : ""}>Anterior</button>
      <button class="btn ghost" data-act="grid">${R.grid ? "Volver" : "Índice"}</button>
      ${last || R.confirmFinish ? `<button class="btn primary" data-act="finish">${R.confirmFinish && unans ? `Quedan ${unans} en blanco. Corregir igual` : "Corregir examen"}</button>` : `<button class="btn primary" data-act="next">Siguiente</button>`}`;
  } else {
    bar = instantDone ? `<button class="btn primary wide" data-act="cont">${R.i === R.items.length - 1 ? "Ver resultado" : "Siguiente"}</button>`
      : `<p class="barhint">${isV && it.views === 0 ? "Mira el vídeo para ver la pregunta" : "Elige una respuesta"}</p>`;
  }
  $("#examBar").innerHTML = bar;
  tick();
}
function pick(pos) {
  const R = RUN, it = curItem(); if (!R || R.result) return;
  const q = BYID[it.id];
  if (q.scene && it.views === 0) return;
  if (R.fb === "instant") {
    if (it.done) return;
    it.sel = pos; it.ms += performance.now() - R.shown; R.shown = performance.now();
    it.ok = it.order[pos] === 0; it.done = true; it.flipped = false; it.ansMs = it.ms;
    record(it.id, it.ok, it.order[pos], it.ms, false); save();
  } else {
    if (it.sel >= 0 && it.sel !== pos) it.hist.push(it.sel);
    it.sel = pos;
  }
  renderRun();
}
function contRun() {
  const R = RUN;
  if (R.i < R.items.length - 1) goto(R.i + 1);
  else finishRun(false);
}
function finishRun(auto) {
  const R = RUN; if (!R || R.result) return;
  stopVideo(); account(); clearInterval(R.tid);
  let res;
  if (R.fb === "end") {
    res = R.items.map(it => {
      const orig = it.sel < 0 ? -1 : it.order[it.sel];
      const ok = orig === 0;
      it.ok = ok; it.flipped = !ok && it.hist.some(p => it.order[p] === 0);
      record(it.id, ok, orig, it.ms, it.flipped);
      return { id: it.id, ok, orig, it };
    });
  } else {
    res = R.items.filter(it => it.done).map(it => ({ id: it.id, ok: it.ok, orig: it.order[it.sel], it }));
  }
  const fails = res.filter(r => !r.ok);
  const entry = { kind: R.kind, x: R.x, n: R.n || 0, ts: Date.now(), total: res.length, fails: fails.length, ids: fails.map(r => r.id), dur: Date.now() - R.t0, blank: res.filter(r => r.orig < 0).length };
  if (res.length) { S.tests.push(entry); S.done[R.x] = (S.done[R.x] || 0) + 1; trimTests(); }
  save();
  R.result = { res, entry, auto };
  renderResult();
}
function verdictLine(f, m) {
  if (f === 0) return "Cero fallos. Me fastidia no tener nada que corregir. Repítelo mañana para ver si es método o suerte.";
  if (f < m) return `${f === 1 ? "Un fallo" : f + " fallos"}. APTO con margen. Así sí. Pero un día bueno no es un método: quiero cinco seguidos.`;
  if (f === m) return `APTO por los pelos. Para la DGT vale; para mí, ${m} fallos es jugar a la ruleta.`;
  if (f <= m + 2) return `NO APTO con ${f}. Te has quedado a nada, y a nada se queda también el que se sale en la curva.`;
  if (f <= m + 6) return `NO APTO con ${f}. Con esto no te dejo ni arrancar en el garaje. Repaso de fallos antes de otro test.`;
  return `NO APTO con ${f}. Esto no es un test, es una declaración de intenciones. Volvemos a la chuleta.`;
}
function renderResult() {
  const R = RUN, { res, entry, auto } = R.result;
  const f = entry.fails, isExam = R.fb === "end", maxF = EXAMS[R.x || "comun"].fails;
  const apto = f <= maxF;
  $("#examHead").innerHTML = `<button class="iconbtn" data-act="quit" aria-label="Cerrar">✕</button><div class="eh-mid"><p class="eh-t">${esc(R.title)}</p><p class="eh-s">Resultado${auto ? " · tiempo agotado" : ""}</p></div><span></span>`;
  const byK = {}; res.filter(r => !r.ok).forEach(r => { const k = BYID[r.id].k; byK[k] = (byK[k] || 0) + 1; });
  const topK = Object.entries(byK).sort((a, b) => b[1] - a[1])[0];
  let h = `<section class="result">`;
  if (isExam) h += `<div class="stamp ${apto ? "apto" : "noapto"}" role="img" aria-label="${apto ? "Apto" : "No apto"}">${apto ? "APTO" : "NO APTO"}</div>`;
  h += `<div class="rnums"><p><b>${f}</b><span>${f === 1 ? "fallo" : "fallos"}</span></p><p><b>${entry.total - f}</b><span>aciertos</span></p><p><b>${Math.floor(entry.dur / 60000)}:${String(Math.floor(entry.dur % 60000 / 1000)).padStart(2, "0")}</b><span>tiempo</span></p>${entry.blank ? `<p><b>${entry.blank}</b><span>en blanco</span></p>` : ""}</div>`;
  h += `<p class="hand big">${esc(isExam ? verdictLine(f, maxF) : f === 0 ? "Todas bien. Pasa a la siguiente tanda." : `${plural(f, "fallo", "fallos")} en ${entry.total}. Esas vuelven a por ti en forma de emboscada.`)}</p>`;
  if (topK && f >= 2) h += `<p class="rcause">Patrón de hoy: <b>${esc(TRAPS[topK[0]].n)}</b> (${topK[1]} de ${f}). ${esc(TRAPS[topK[0]].d)}</p>`;
  h += `</section>`;
  const fl = res.filter(r => !r.ok);
  if (fl.length) {
    h += `<h3 class="sec">Tus fallos, uno a uno</h3>`;
    h += fl.map(r => failCard(BYID[r.id], r.orig, r.it)).join("");
  }
  $("#examBody").innerHTML = h;
  $("#examBar").innerHTML = `${fl.length ? `<button class="btn ghost" data-act="start" data-mode="ids:${fl.map(r => r.id).join(",")}">Repasar estos fallos</button>` : ""}<button class="btn primary" data-act="quit">Terminar</button>`;
  $("#examBodyWrap").scrollTop = 0;
}
function failCard(q, orig, it) {
  const r = S.q[q.id] || {};
  const note = it ? behaviourNote(it, r) : "";
  return `<article class="fail">${signHTML(q)}<p class="fq">${esc(q.q)}</p>
    <p class="mine"><span>Marcaste</span>${orig < 0 ? "En blanco (cuenta como fallo)" : esc(q.o[orig])}</p>
    <p class="good"><span>Correcta</span>${esc(q.o[0])}</p>
    <p class="why"><span class="chip">${esc(TRAPS[q.k].n)}</span>${esc(q.e)}</p>${note ? `<p class="hand">${esc(note)}</p>` : ""}</article>`;
}

/* ---------- Emboscadas ---------- */
let AMB = null;
function maybeAmbush(reason) {
  if (RUN || AMB || !S.perm || VIEW === "perm") return;
  if (!xTests().length) return;
  if (Date.now() - (S.lastAmb || 0) < 4 * MIN) return;
  const due = dueList(); if (!due.length) return;
  if (reason !== "load" && Math.random() > 0.45) return;
  setTimeout(() => { if (!RUN && !AMB) openAmbush(due[(Math.random() * Math.min(3, due.length)) | 0]); }, reason === "load" ? 900 : 500);
}
function openAmbush(id) {
  const r = S.q[id];
  AMB = { id, it: { id, order: shuffle([0, 1, 2]), sel: -1, done: false, ok: null, ms: 0 }, t0: performance.now(), lf: r ? r.lf || r.lt : 0, w: r ? r.w : 0 };
  S.lastAmb = Date.now(); save();
  renderAmbush(); $("#modal").hidden = false;
  setTimeout(() => { const h = $("#ambT"); if (h) h.focus({ preventScroll: true }); }, 50);
}
function renderAmbush() {
  const q = BYID[AMB.id], it = AMB.it;
  const more = dueList().filter(x => x !== AMB.id).length;
  $("#sheet").innerHTML = `<header class="amb-h">${signSVG("peligro")}<div><p class="eyebrow red">Emboscada del profe</p><h2 id="ambT" tabindex="-1">Esta la fallaste ${AMB.lf ? "el " + fmtDate(AMB.lf) : "antes"}${AMB.w > 1 ? ` (${AMB.w} veces)` : ""}</h2><p class="muted">Sin mirar apuntes. A ver si aprendiste o solo pasaste página.</p></div></header>
    ${signHTML(q)}<p class="qtext sm">${esc(q.q)}</p>${optsHTML(q, it, it.done)}
    ${it.done ? `<div class="reveal ${it.ok ? "good" : "bad"}"><p class="verdict">${it.ok ? "Superada" : "Otra vez"}</p><p class="why"><span class="chip">${esc(TRAPS[q.k].n)}</span>${esc(q.e)}</p><p class="hand">${it.ok ? "Bien. La dejo descansar unos días y volverá cuando menos te lo esperes." : "Esta ya es personal. Vuelve dentro de 10 minutos."}</p></div>
      <div class="amb-f">${more ? `<button class="btn ghost" data-act="amb-next">Otra emboscada (${more})</button>` : ""}<button class="btn primary" data-act="amb-close">Seguir</button></div>` : `<div class="amb-f"><button class="btn ghost sm" data-act="amb-close">Ahora no</button></div>`}`;
}
function ambPick(pos) {
  const it = AMB.it; if (it.done) return;
  it.sel = pos; it.ms = performance.now() - AMB.t0; it.ok = it.order[pos] === 0; it.done = true;
  record(AMB.id, it.ok, it.order[pos], it.ms, false);
  S.amb.n++; if (it.ok) S.amb.ok++;
  save(); renderAmbush();
}
function closeModal() { AMB = null; const m = $("#modal"); if (m) m.hidden = true; if (!RUN) renderView(); }

/* ---------- Vistas ---------- */
let VIEW = S.perm ? "home" : "perm", PENDING = null;
function go(v) {
  if (!S.perm && v !== "perm") v = "perm";
  VIEW = v; $$(".tab").forEach(b => b.setAttribute("aria-current", b.dataset.go === v ? "page" : "false"));
  renderView(); window.scrollTo(0, 0); maybeAmbush("tab");
}
function renderView() {
  const m = $("#main"); if (!m) return;
  m.innerHTML = VIEW === "perm" ? permHTML() : VIEW === "home" ? homeHTML() : VIEW === "tests" ? testsHTML() : VIEW === "why" ? whyHTML() : topicsHTML();
  renderHeader(); setSync(syncMode);
}
function renderHeader() {
  const nav = $(".tabs"); if (nav) nav.hidden = !S.perm;
  const el = $("#plateR"); if (!el) return;
  el.innerHTML = S.perm ? `<button class="plate-p" data-act="perm" aria-label="Cambiar de permiso"><span>Permiso</span><b>${esc(PL().l)}</b></button>`
    : `<p>Teórico<br>de conducir</p>`;
}
function profeHome(R) {
  const ex = exams(), last = ex[ex.length - 1], nRed = R.nRed, m = R.E.fails;
  if (!xTests().length) return "Primera norma de mi autoescuela: aquí no se hacen tests como churros. Se viene a entender por qué fallas. Empieza por el diagnóstico 1 y no hagas trampas mirando el móvil.";
  if (R.level === "verde") return "Luz verde. Yo te firmaría el APTO, pero el examinador no soy yo. Un simulacro al día hasta el examen y nada de confiarse.";
  if (nRed >= 10) return `Tienes ${nRed} preguntas en rojo. Son ${nRed} formas de suspender que ya conoces. Repaso de fallos antes de cualquier test nuevo.`;
  if (last && last.fails > m) return `Último test: ${plural(last.fails, "fallo", "fallos")}. Eso no es mala suerte, es estadística. Mira «Por qué fallas» antes del siguiente.`;
  if (last && last.fails < m) return `${plural(last.fails, "fallo", "fallos")} en el último. Bien. Ahora demuéstrame que no ha sido casualidad.`;
  return "Ni bien ni mal. Y «ni bien ni mal» en el examen es suspenso. Sigue el plan.";
}
function examLine(x) { const E = EXAMS[x]; return `${E.q} preguntas · ${E.min} min · máx. ${E.fails} fallos${E.video ? " · 1 con vídeo" : ""}`; }
function permCardHTML() {
  const P0 = PL(), list = permExams(), E = EXc();
  const sub = list.length > 1 ? "Dos exámenes teóricos. Elige cuál preparas:" : P0.ex.length ? `${E.n}: ${E.q} preguntas, ${E.min} minutos, máximo ${E.fails} fallos.` : "Sin examen teórico.";
  let h = `<section class="permcard"><div class="pc-top"><span class="plabel">${esc(P0.l)}</span><div><p class="eyebrow">Tu permiso</p><h2>${esc(P0.n)}</h2></div><button class="btn ghost sm" data-act="perm">Cambiar</button></div>${P0.course ? "" : `<p class="pc-ex">${esc(sub)}</p>`}`;
  if (list.length > 1) h += `<div class="steps">${list.map((x, i) => `<button class="step ${x === S.ex ? "on" : ""}" data-act="setex" data-x="${x}" aria-pressed="${x === S.ex}"><b>Examen ${i + 1}</b>${esc(EXAMS[x].n)}<span>${EXAMS[x].q} preguntas · máx. ${EXAMS[x].fails} fallos</span></button>`).join("")}</div>`;
  if (P0.course) h += `<p class="notice small">${esc(P0.course)}</p>`;
  return h + `</section>`;
}
function permInfoHTML() {
  const P0 = PL(), E = EXc();
  const exText = !P0.ex.length ? "Sin examen teórico." : P0.askB ? (S.hasB ? "Solo el específico de moto: el común ya lo tienes." : "Teórico común (30 preguntas) y específico de moto (20 preguntas).") : `${E.n}: ${examLine(curX())}.`;
  return `<details class="topic"><summary><span class="tn">Requisitos del permiso ${esc(P0.l)}</span><span class="pill">${esc(P0.n.toLowerCase())}</span></summary><dl class="pdl">
    <dt>Edad mínima</dt><dd>${esc(P0.edad)}</dd><dt>Qué puedes conducir</dt><dd>${esc(P0.conduce)}</dd>
    <dt>Permiso previo</dt><dd>${esc(P0.prev)}</dd><dt>Teórico</dt><dd>${esc(exText)}</dd><dt>Práctico</dt><dd>${esc(P0.prac)}</dd>
    ${P0.cap ? `<dt>Para trabajar</dt><dd>Además del permiso necesitas el CAP.</dd>` : ""}
    <dt>Validez de los aprobados</dt><dd>2 años para superar todas las pruebas.</dd></dl></details>`;
}
function permHTML() {
  const groups = ["Ciclomotor y moto", "Coche", "Camión", "Autobús"];
  const edadCorta = e => e.split(" (")[0];
  let h = `<h2 class="vt">${S.perm ? "Cambiar de permiso" : "¿Qué permiso quieres sacarte?"}</h2><p class="muted lead">Mismo método para todos: diagnóstico, emboscadas con tus fallos y por qué fallas. El progreso de cada examen se guarda aunque cambies.</p>`;
  if (PENDING) {
    const P0 = PERMITS[PENDING];
    h += `<section class="askb"><p class="eyebrow">Permiso ${esc(P0.l)}</p><h3>¿Ya tienes el permiso B, o el teórico común aprobado hace menos de 2 años?</h3><p class="small muted">Si es así, solo te falta el específico de moto.</p>${PENDING === "A2" ? `<p class="small muted">¿Tienes el A1 desde hace 2 años o más? Para el A2 no hay teórico: solo la prueba práctica.</p>` : ""}
      <div class="ctas"><button class="btn primary" data-act="setb" data-v="1">Sí, solo el de moto</button><button class="btn ghost" data-act="setb" data-v="0">No, necesito los dos</button></div></section>`;
  }
  groups.forEach(g => {
    h += `<h3 class="sec">${g}</h3><div class="pgrid">${Object.entries(PERMITS).filter(([, p]) => p.g === g).map(([k, p]) => `<button class="pcard ${S.perm === k ? "on" : ""}" data-act="setperm" data-p="${k}"><span class="plabel">${esc(p.l)}</span><span class="pn">${esc(p.n)}</span><span class="pe">Desde ${esc(edadCorta(p.edad))}</span></button>`).join("")}</div>`;
  });
  h += `<p class="muted small">No incluye las licencias LCM y LVA ni las pruebas del CAP y del ADR, que tienen exámenes propios.</p>`;
  return h + footHTML();
}
function lightsHTML(level) {
  return `<div class="lights" aria-hidden="true"><i class="l r ${level === "rojo" ? "on" : ""}"></i><i class="l a ${level === "ambar" ? "on" : ""}"></i><i class="l g ${level === "verde" ? "on" : ""}"></i></div>`;
}
function countdownHTML() {
  const dt = (S.dates || {})[curX()] || "";
  if (!dt) return `<p class="muted">Pon la fecha y te digo cuántos tests al día necesitas.</p>`;
  const [y, mo, d] = dt.split("-").map(Number);
  const ex = new Date(y, mo - 1, d), t = new Date(); t.setHours(0, 0, 0, 0);
  const days = Math.round((ex - t) / DAY);
  if (days < 0) return `<p class="muted">Esa fecha ya pasó. Si tienes nueva convocatoria, cámbiala.</p>`;
  if (days === 0) return `<p class="cd"><b>Es hoy.</b> Lee la pregunta entera, dos veces. Y respira.</p>`;
  const left = Math.max(0, EXc().diag - diagDone());
  const perDay = left ? Math.ceil(left / days) : 1;
  return `<p class="cd"><b>${plural(days, "día", "días")}</b> para el examen. ${left ? `Te quedan ${plural(left, "diagnóstico", "diagnósticos")}: mínimo ${plural(perDay, "test", "tests")} al día.` : "Diagnóstico hecho: un simulacro al día, mínimo."}</p>`;
}
function homeHTML() {
  const R = readiness(), dd = R.dd, ex = exams(), N = R.N, m = R.E.fails;
  const diagTests = xTests().filter(t => t.kind === "diag");
  const last5 = ex.slice(-5);
  const nAmb = ambers().length;
  const cta = dd < N ? `<button class="btn primary big" data-act="start" data-mode="diag">Hacer el diagnóstico ${dd + 1} de ${N}</button>` : `<button class="btn primary big" data-act="start" data-mode="sim">Hacer un simulacro</button>`;
  const cta2 = R.nRed ? `<button class="btn ghost" data-act="start" data-mode="repaso">Repasar ${plural(R.nRed, "fallo en rojo", "fallos en rojo")}</button>` : "";
  let h = permCardHTML() + `<section class="status lvl-${R.level}">${lightsHTML(R.level)}<div class="st-txt"><p class="eyebrow">Semáforo · ${esc(R.E.n)}</p><h2>${esc(R.title)}</h2><p>${esc(R.sub)}</p></div></section>
  <ul class="crit">${R.crit.map(c => `<li class="${c.ok ? "ok" : ""}"><span class="tick" aria-hidden="true">${c.ok ? "✓" : ""}</span>${esc(c.t)}</li>`).join("")}</ul>
  <div class="ctas">${cta}${cta2}</div>
  <p class="hand note">${esc(profeHome(R))}<span class="sig">— El profe</span></p>
  <section class="block"><div class="bh"><h3>Diagnóstico</h3><span class="muted">${Math.min(dd, N)}/${N}</span></div>
    <div class="strip" style="grid-template-columns:repeat(${N},minmax(0,1fr))">${Array.from({ length: N }, (_, i) => { const t = diagTests[i]; return `<div class="cell ${t ? (t.fails <= m ? "pass" : "fail") : i === dd ? "next" : ""}"><span>${i + 1}</span><b>${t ? t.fails : ""}</b></div>`; }).join("")}</div>
    <p class="muted small">Cada casilla muestra los fallos de ese test. Verde: ${m} o menos.</p></section>
  <section class="block stats">
    <div><b>${Math.max(S.done[curX()] || 0, xTests().length)}</b><span>tests hechos</span></div>
    <div><b>${last5.length ? R.avg.toFixed(1).replace(".", ",") : "–"}</b><span>media de fallos, últimos 5</span></div>
    <div><b class="${R.nRed ? "redt" : ""}">${R.nRed}</b><span>en rojo · ${nAmb} en ámbar</span></div>
    <div><b>${S.amb.n ? S.amb.ok + "/" + S.amb.n : "–"}</b><span>emboscadas superadas</span></div>
  </section>
  <section class="block"><div class="bh"><h3>Fecha de tu examen</h3></div>
    <label class="datefield" for="examDate"><span>Día del examen: ${esc(EXc().n.toLowerCase())}</span><input type="date" id="examDate" value="${esc((S.dates || {})[curX()] || "")}"></label>
    <div id="countdown">${countdownHTML()}</div></section>`;
  const hist = xTests();
  if (hist.length) {
    h += `<section class="block"><div class="bh"><h3>Últimos tests</h3></div><ul class="hist">${hist.slice(-6).reverse().map(t => `<li><span class="hk">${kindName(t)}</span><span class="muted">${fmtDate(t.ts)}</span><b class="${(t.kind === "diag" || t.kind === "sim") ? (t.fails <= m ? "pt" : "ft") : ""}">${t.fails}/${t.total}</b></li>`).join("")}</ul></section>`;
  }
  h += footHTML();
  return h;
}
function kindName(t) { return { diag: `Diagnóstico ${t.n}`, sim: "Simulacro", repaso: "Repaso", cifras: "Cifras", nov: "Novedades", riesgo: "Riesgo", tema: "Tema", trampa: "Trampa" }[t.kind] || t.kind; }
let resetArm = false;
function footHTML() {
  return `<footer class="foot"><p id="sync">${syncText()}</p>${S.tests.length || Object.keys(S.q).length ? `<button class="link" data-act="reset">${resetArm ? "Pulsa otra vez: se borra el progreso de todos los permisos" : "Empezar de cero"}</button>` : ""}
    <p class="disc">App no oficial. No está afiliada a la DGT ni a ningún organismo público. Información oficial en <a href="https://www.dgt.es" target="_blank" rel="noopener">dgt.es</a>${WEB ? ` · <a href="../guia/">Guías</a> · <a href="../privacidad.html">Privacidad</a>` : ""}</p></footer>`;
}
function testsHTML() {
  const E = EXc(), N = E.diag, dd = diagDone(), nRed = reds().length, nAmb = ambers().length, T = TPOOL();
  const nCif = T.filter(q => q.k === "cifra").length, nNov = T.filter(q => q.k === "novedad").length;
  const row = (mode, name, meta, desc, extra = "", dis = false) => `<button class="mode" data-act="start" data-mode="${mode}" ${dis ? "disabled" : ""}><span class="m-n">${name}</span><span class="m-meta">${meta}</span><span class="m-d">${desc}</span>${extra}</button>`;
  const fmt = `${E.q} · ${E.min} min · máx. ${E.fails} fallos`;
  let h = `<h2 class="vt">Tests</h2><p class="muted lead">${esc(E.n)} del permiso ${esc(PL().l)}: ${E.q} preguntas, ${E.min} minutos y máximo ${E.fails} fallos${E.video ? ", una con vídeo" : ""}. Diagnóstico y simulacro son como el examen y se corrigen al final; el resto corrige al momento.</p>`;
  h += `<div class="modes">`;
  h += row("diag", dd < N ? `Diagnóstico ${dd + 1} de ${N}` : "Diagnóstico completado", fmt, "Preguntas trampa de las que más se fallan, más las que ya has fallado tú.", dd < N ? `<span class="m-tag">Toca ahora</span>` : "", dd >= N);
  h += row("sim", "Simulacro", fmt, "Se adapta a ti: tus fallos pendientes, tus temas flojos y las normas nuevas.", dd < N ? `<span class="m-tag soft">Mejor tras el diagnóstico</span>` : "");
  h += row("repaso", "Repaso de fallos", `${nRed} en rojo · ${nAmb} en ámbar`, "Solo lo que has fallado y aún no dominas. Corrige al momento.", "", nRed + nAmb === 0);
  if (nCif >= 5) h += row("cifras", "Ráfaga de cifras", `${Math.min(12, nCif)} preguntas`, "Las cifras exactas del examen. Donde más se suspende.");
  if (nNov >= 4) h += row("nov", "Normas nuevas", `${Math.min(12, nNov)} preguntas`, curX() === "comun" ? "V-16, carril de emergencia, ciclistas, patinetes, cinturón y motos." : "Lo que cambió con la reforma del Reglamento de octubre de 2026.");
  if (E.video) h += row("riesgo", "Percepción del riesgo", "7 vídeos", "Como la pregunta de vídeo del examen: máximo 3 visualizaciones.");
  h += `</div><h3 class="sec">Practicar un tema</h3><div class="chips">${E.themes.map(k => `<button class="chipbtn" data-act="start" data-mode="tema:${k}">${esc(THEMES[k].n)}</button>`).join("")}</div>`;
  h += footHTML();
  return h;
}
function bar(label, val, max, sub, act) {
  const pct = max ? Math.round(val / max * 100) : 0;
  return `<div class="bar" ${act ? `data-act="start" data-mode="${act}" role="button" tabindex="0"` : ""}><div class="brow"><span>${esc(label)}</span><b>${sub}</b></div><div class="btrack"><span style="width:${pct}%"></span></div></div>`;
}
function trapAction(k) { return k === "cifra" ? "cifras" : k === "novedad" ? "nov" : k === "riesgo" ? "riesgo" : "trampa:" + k; }
function whyHTML() {
  const fr = failRecs(), W = fr.reduce((a, [, r]) => a + r.w, 0);
  const answered = Object.entries(S.q).reduce((a, [id, r]) => a + (inPool(id) ? r.s : 0), 0);
  let h = `<h2 class="vt">Por qué fallas</h2><p class="muted small">${esc(EXc().n)} · permiso ${esc(PL().l)}</p>`;
  if (!W) {
    h += `<p class="hand note">${answered ? "Ni un fallo todavía. O eres un genio o has hecho muy pocas preguntas. Me inclino por lo segundo." : "Sin fallos no hay diagnóstico. Haz el primer test y vuelve aquí: te diré exactamente dónde te pillan."}<span class="sig">— El profe</span></p>`;
    h += `<div class="ctas"><button class="btn primary big" data-act="start" data-mode="${diagDone() < EXc().diag ? "diag" : "sim"}">${diagDone() < EXc().diag ? `Hacer el diagnóstico ${diagDone() + 1}` : "Hacer un simulacro"}</button></div>`;
    return h + footHTML();
  }
  const byK = {}; fr.forEach(([id, r]) => { const k = BYID[id].k; byK[k] = (byK[k] || 0) + r.w; });
  const kSorted = Object.entries(byK).sort((a, b) => b[1] - a[1]);
  const [k1, n1] = kSorted[0];
  const minA = EXc().q * 2;
  if (answered < minA) h += `<p class="muted small notice">Llevas ${answered} respuestas. Con menos de ${minA} el diagnóstico es orientativo: termina más tests para que sea fiable.</p>`;
  h += `<section class="cause"><p class="eyebrow red">Tu fallo número uno</p><h3>${esc(TRAPS[k1].n)}</h3><p class="c-share">${Math.round(n1 / W * 100)} % de tus fallos</p><p>${esc(TRAPS[k1].d)}</p><p class="hand">${esc(TRAPS[k1].r)}</p><button class="btn primary" data-act="start" data-mode="${trapAction(k1)}">Atacar esta trampa</button></section>`;
  h += `<section class="block"><div class="bh"><h3>Tipo de trampa</h3><span class="muted small">pulsa para practicar</span></div>${kSorted.map(([k, n]) => bar(TRAPS[k].n, n, W, `${Math.round(n / W * 100)} %`, trapAction(k))).join("")}</section>`;
  const ts = themeStats();
  const tRows = Object.entries(ts).filter(([, s]) => s.s > 0).map(([t, s]) => [t, s.w / s.s, s]).sort((a, b) => b[1] - a[1]);
  h += `<section class="block"><div class="bh"><h3>Temas: porcentaje de fallo</h3></div>${tRows.map(([t, rate, s]) => bar(THEMES[t].n, rate, 1, `${Math.round(rate * 100)} % · ${s.s} resp.`, "tema:" + t)).join("")}</section>`;
  const fast = fr.reduce((a, [, r]) => a + (r.fast || 0), 0), flip = fr.reduce((a, [, r]) => a + (r.flip || 0), 0), slow = fr.reduce((a, [, r]) => a + (r.slow || 0), 0);
  h += `<section class="block"><div class="bh"><h3>Cómo fallas</h3></div><div class="beh">
    <div><b>${fast}</b><span>respondidas en menos de 6 s y mal</span><p class="muted small">${fast >= 3 ? "Lees en diagonal. Obligatorio: leer el enunciado dos veces." : "Bien, no vas con prisa."}</p></div>
    <div><b>${flip}</b><span>tenías la buena y la cambiaste</span><p class="muted small">${flip >= 2 ? "Dudas de ti. Cambia solo si encuentras un motivo concreto en el enunciado." : "No es tu problema."}</p></div>
    <div><b>${slow}</b><span>más de 45 s dudando y mal</span><p class="muted small">${slow >= 2 ? "Si tardas tanto es que no lo sabes. A la chuleta del tema." : "Sin bloqueos serios."}</p></div></div></section>`;
  const reinc = fr.filter(([, r]) => r.w >= 2).sort((a, b) => b[1].w - a[1].w).slice(0, 8);
  const red = fr.filter(([, r]) => r.b === 0).sort((a, b) => b[1].w - a[1].w);
  const list = reinc.length ? reinc : red.slice(0, 8);
  if (list.length) {
    h += `<section class="block"><div class="bh"><h3>${reinc.length ? "Reincidentes" : "Pendientes en rojo"}</h3><span class="muted small">${reinc.length ? "falladas 2 veces o más" : "falladas la última vez"}</span></div>${list.map(([id, r]) => {
      const q = BYID[id];
      return `<details class="qd"><summary><span class="qd-w">${r.w}×</span><span class="qd-q">${esc(q.q)}</span></summary>${failCard(q, r.lw, null)}</details>`;
    }).join("")}</section>`;
  }
  const dd = diagDone(), nRed = red.length, N = EXc().diag, lim = EXc().fails - 1;
  const steps = [];
  if (dd < N) steps.push([`Termina el diagnóstico: te ${N - dd === 1 ? "queda 1" : "quedan " + (N - dd)}.`, "diag"]);
  if (nRed) steps.push([`Repasa tus ${nRed} en rojo antes de hacer más tests.`, "repaso"]);
  steps.push([TRAPS[k1].r, trapAction(k1)]);
  if (tRows.length) steps.push([`Lee la chuleta de ${THEMES[tRows[0][0]].n} en Temas y haz 10 preguntas.`, "tema:" + tRows[0][0]]);
  if (dd >= N) steps.push([`Un simulacro al día hasta encadenar 5 con ${plural(lim, "fallo", "fallos")} o menos.`, "sim"]);
  h += `<section class="block plan"><div class="bh"><h3>Plan del profe para hoy</h3></div><ol>${steps.map(([t, a]) => `<li><span>${esc(t)}</span><button class="btn ghost sm" data-act="start" data-mode="${a}">Hacer</button></li>`).join("")}</ol></section>`;
  return h + footHTML();
}
/* Guía de la web que desarrolla cada tema (solo en la versión web) */
const GUIDE_OF = {
  sen: "senales-que-mas-se-fallan", pri: "prioridad-de-paso", vel: "velocidades-maximas", ade: "adelantamientos",
  alc: "tasas-de-alcohol", vul: "reforma-reglamento-octubre-2026", via: "autopistas-autovias-y-tuneles",
  luz: "alumbrado-y-senales-acusticas", seg: "cinturon-sillas-infantiles-y-casco", acc: "que-hacer-en-un-accidente",
  doc: "carnet-por-puntos", amv: "permiso-am-ciclomotor", amc: "permiso-am-ciclomotor", ams: "permiso-am-ciclomotor",
  mop: "permiso-de-moto-a1-a2", mot: "permiso-de-moto-a1-a2", mof: "permiso-de-moto-a1-a2", moe: "permiso-de-moto-a1-a2", moc: "permiso-de-moto-a1-a2",
  cpe: "permiso-de-camion-c1-c", dim: "permiso-de-camion-c1-c", cpc: "permiso-de-camion-c1-c", fre: "permiso-de-camion-c1-c",
  tie: "tiempos-de-conduccion-y-descanso", pro: "tiempos-de-conduccion-y-descanso",
  dpe: "permiso-de-autobus-d1-d", dpa: "permiso-de-autobus-d1-d", dci: "permiso-de-autobus-d1-d",
  rpe: "remolques-b-codigo-96-be", rac: "remolques-b-codigo-96-be", rca: "remolques-b-codigo-96-be", rci: "remolques-b-codigo-96-be"
};
function topicsHTML() {
  const ts = themeStats();
  const card = t => {
    const c = CHULETA[t], s = ts[t];
    const rate = s.s ? Math.round(s.w / s.s * 100) : null;
    return `<details class="topic"><summary><span class="tn">${esc(THEMES[t].n)}</span><span class="pill ${rate == null ? "" : rate >= 25 ? "bad" : rate >= 10 ? "mid" : "good"}">${rate == null ? "sin datos" : rate + " % fallo"}</span></summary>
      <ul class="rules">${c.r.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <p class="eyebrow red">Trampas típicas</p><ul class="traps">${c.t.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="topic-acts"><button class="btn primary sm" data-act="start" data-mode="tema:${t}">Practicar ${t === "rie" ? "los vídeos" : "10 preguntas"}</button>${WEB && GUIDE_OF[t] ? `<a class="btn ghost sm" href="../guia/${GUIDE_OF[t]}.html">Leer la guía</a>` : ""}</div></details>`;
  };
  const E = EXc(), th = E.themes.filter(t => ts[t] && ts[t].n);
  const t1 = th.filter(t => THEMES[t].tier === 1), t2 = th.filter(t => THEMES[t].tier === 2);
  const cif = CIFRAS_EX[curX()] || CIFRAS;
  let h = `<h2 class="vt">Temas</h2><p class="muted small">${esc(E.n)} · permiso ${esc(PL().l)}</p>
  ${permInfoHTML()}
  <details class="topic cifras" open><summary><span class="tn">Tabla de cifras</span><span class="pill">imprescindible</span></summary><div class="tablewrap"><table class="ctab"><tbody>${cif.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div><button class="btn primary sm" data-act="start" data-mode="cifras">Ráfaga de cifras</button></details>
  <h3 class="sec">Los que más caen</h3>${t1.map(card).join("")}
  ${t2.length ? `<h3 class="sec">Si te sobra tiempo</h3>${t2.map(card).join("")}` : ""}
  <section class="about"><h3>Sobre estas preguntas</h3>
  <p>Las ha redactado el profe al estilo del examen con la normativa vigente: la reforma del Reglamento General de Circulación (RD 518/2026, en vigor desde el 1 de octubre de 2026), la V-16 obligatoria y, para camión y autobús, los tiempos de conducción del Reglamento (CE) 561/2006. No son el banco oficial de la DGT, que no es público, y esta app no está afiliada a la DGT ni a ningún organismo público.</p>
  <p>El orden de los temas es el peso que suelen tener en el examen, no una estadística oficial. Confirma con tu autoescuela el formato de tu prueba antes de presentarte.</p>
  <p>Fuentes: <a href="https://www.dgt.es/comunicacion/notas-de-prensa/20260930-reforma-del-reglamento-de-circulacion-usuarios-vulnerables/" target="_blank" rel="noopener">DGT, reforma del Reglamento</a> · <a href="https://www.dgt.es/comunicacion/noticias/20251020-examen-teorico-la-importancia-de-conocer-el-riesgo" target="_blank" rel="noopener">DGT, vídeo de riesgo en el examen</a></p></section>`;
  return h + footHTML();
}

/* ---------- Avisos ---------- */
let toastT = 0;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

/* ---------- Eventos ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act],[data-go]");
  if (!b || b.disabled) return;
  if (b.dataset.go) { go(b.dataset.go); return; }
  const a = b.dataset.act;
  if (a !== "reset" && resetArm) { resetArm = false; }
  switch (a) {
    case "start": startRun(b.dataset.mode); break;
    case "pick": if (AMB && b.closest("#sheet")) ambPick(+b.dataset.pos); else pick(+b.dataset.pos); break;
    case "prev": goto(RUN.i - 1); break;
    case "next": goto(RUN.i + 1); break;
    case "grid": account(); RUN.grid = !RUN.grid; renderRun(); break;
    case "jump": goto(+b.dataset.i); break;
    case "cont": contRun(); break;
    case "finish": {
      const unans = RUN.items.filter(x => x.sel < 0).length;
      if (unans && !RUN.confirmFinish) { RUN.confirmFinish = true; renderRun(); }
      else finishRun(false);
      break;
    }
    case "quit":
      if (RUN.result || RUN.fb === "instant" && !RUN.items.some(x => x.done)) { quitRun(); break; }
      if (RUN.fb === "instant") { finishRun(false); break; }
      if (!RUN.confirmQuit) { RUN.confirmQuit = true; renderRun(); setTimeout(() => { if (RUN && !RUN.result) { RUN.confirmQuit = false; renderRun(); } }, 3500); }
      else quitRun();
      break;
    case "play": {
      const it = curItem(), q = BYID[it.id];
      if (it.views >= 3) break;
      const host = $("#stage"); if (!host) break;
      const cover = $(".vidcover"); if (cover) cover.remove();
      const vb = $(".vidbar"); if (vb) vb.innerHTML = `<span>Reproduciendo…</span>`;
      stopVideo();
      stopVid = playScene(host, q.scene, () => { stopVid = null; it.views++; renderRun(); });
      break;
    }
    case "amb-next": { const d = dueList().filter(x => x !== AMB.id); AMB = null; if (d.length) openAmbush(d[0]); else closeModal(); break; }
    case "amb-close": closeModal(); break;
    case "perm": PENDING = null; go("perm"); break;
    case "setperm": {
      const p = b.dataset.p;
      if (PERMITS[p].askB) { PENDING = p; renderView(); window.scrollTo(0, 0); break; }
      PENDING = null; S.perm = p; S.hasB = null; S.ex = ""; curX(); save(); go("home");
      break;
    }
    case "setb": S.perm = PENDING; S.hasB = b.dataset.v === "1"; S.ex = ""; PENDING = null; curX(); save(); go("home"); break;
    case "setex": S.ex = b.dataset.x; save(); renderView(); break;
    case "reset":
      if (!resetArm) { resetArm = true; renderView(); setTimeout(() => { if (resetArm) { resetArm = false; renderView(); } }, 4000); }
      else { resetArm = false; S = blank(); save(); go("perm"); toast("Progreso borrado. Desde cero."); }
      break;
  }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.matches(".bar[data-act]")) { e.target.click(); return; }
  if (!RUN || RUN.result || e.target.matches("input,textarea")) return;
  const k = e.key.toLowerCase();
  const map = { a: 0, b: 1, c: 2, "1": 0, "2": 1, "3": 2 };
  if (k in map) { pick(map[k]); e.preventDefault(); }
  else if (e.key === "ArrowRight" && RUN.fb === "end") goto(RUN.i + 1);
  else if (e.key === "ArrowLeft" && RUN.fb === "end") goto(RUN.i - 1);
});
document.addEventListener("change", e => {
  if (e.target.id === "examDate") { if (!S.dates) S.dates = {}; S.dates[curX()] = e.target.value || ""; save(); const c = $("#countdown"); if (c) c.innerHTML = countdownHTML(); }
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") maybeAmbush("tab"); });

/* Enlace directo a un permiso desde la web: ?p=B, ?p=C… */
(function () {
  if (typeof location === "undefined") return;
  const p = new URLSearchParams(location.search).get("p");
  if (p && history.replaceState) { try { history.replaceState(null, "", location.pathname); } catch (e) {} }
  if (!p || !PERMITS[p] || S.perm === p) return;
  if (PERMITS[p].askB) { PENDING = p; VIEW = "perm"; return; }
  S.perm = p; S.hasB = null; S.ex = ""; curX(); save(); VIEW = "home";
})();
go(VIEW);
initRemote();
maybeAmbush("load");
