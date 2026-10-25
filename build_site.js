/* Genera la web pública: portada, guías, páginas de examen, páginas legales, sitemap y anuncios.
   Uso: node build_site.js   (después de python3 build_web.py, que genera web/app/) */
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const D = __dirname, W = path.join(D, "web"), S = path.join(D, "site");
const cfg = JSON.parse(fs.readFileSync(path.join(S, "site.json"), "utf8"));
const BASE = (cfg.domain ? `https://${cfg.domain}/` : cfg.base).replace(/\/?$/, "/");
const BASEPATH = new URL(BASE).pathname; // "/PorFinApto/" o "/"
const ADS = !!cfg.adsense_client;

if (ADS) {
  const miss = ["email", "titular", "nif", "domicilio"].filter(k => !cfg[k]);
  if (miss.length) { console.error("Faltan datos para activar anuncios (aviso legal y contacto): " + miss.join(", ")); process.exit(1); }
}

/* ---- Datos de la app (preguntas, señales, permisos, temas) ---- */
const ctx = {}; vm.createContext(ctx);
const src = ["data.js", "data2.js", "data3.js", "data4.js", "scenes.js"].map(f => fs.readFileSync(path.join(D, f), "utf8").replace(/^if \(typeof module[^\n]*$/gm, "")).join("\n");
vm.runInContext(src + "\n;this.__ = { BYID, ALLQ, PERMITS, EXAMS, THEMES, CHULETA, signSVG };", ctx);
const { BYID, ALLQ, PERMITS, EXAMS, THEMES, CHULETA, signSVG } = ctx.__;
const NQ = ALLQ.length;

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const LET = ["A", "B", "C"];
const ld = o => `<script type="application/ld+json">${JSON.stringify(Object.assign({ "@context": "https://schema.org" }, o)).replace(/</g, "\\u003c")}</script>`;
const crumbsLD = items => ld({ "@type": "BreadcrumbList", "itemListElement": items.map(([name, rel], i) => ({ "@type": "ListItem", "position": i + 1, "name": name, "item": BASE + rel })) });
const ORG = { "@type": "Organization", "name": "Por Fin Apto", "url": BASE };

function adUnit() {
  if (!ADS) return "";
  if (!cfg.ad_slot) return ""; // con anuncios automáticos, Google decide dónde
  return `<div class="ad"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(cfg.adsense_client)}" data-ad-slot="${esc(cfg.ad_slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}
function practice(ids) {
  return (Array.isArray(ids) ? ids : ids.split(",")).map((id, n) => {
    const q = BYID[id.trim()]; if (!q) throw new Error("Pregunta inexistente: " + id);
    const r = hash(q.id) % 3, order = [0, 1, 2].map(i => (i + r) % 3), okPos = order.indexOf(0);
    const sign = q.img ? signSVG(q.img).replace('class="sign wide"', 'class="sign"') : "";
    return `<div class="pq"><p class="pq-n">Pregunta ${n + 1}</p>${sign}<p class="pq-q">${esc(q.q)}</p>
<ol class="pq-o">${order.map((o, i) => `<li><button type="button" data-c="${o === 0 ? 1 : 0}"><span class="k">${LET[i]}</span><span>${esc(q.o[o])}</span></button></li>`).join("")}</ol>
<details><summary>Ver respuesta</summary><p><strong>Correcta: ${LET[okPos]}.</strong> ${esc(q.e)}</p></details></div>`;
  }).join("\n");
}
function cta(perm, depth) {
  const P = PERMITS[perm];
  const href = `${depth}app/${P ? "?p=" + perm : ""}`;
  const what = P ? `el teórico del permiso ${P.l}` : "el teórico de tu permiso";
  return `<div class="cta-box"><h2>Practica con el método completo</h2><p>Diagnóstico con las preguntas que más se fallan, tus fallos de vuelta cuando estás a punto de olvidarlos y por qué fallas. Gratis y sin registro, para ${esc(what)}.</p><a class="btn" href="${href}">Empezar el test</a></div>`;
}

/* ---- Plantilla ---- */
function page({ title, desc, rel, body, depth = "", type = "website", noindex = false, head = "" }) {
  const url = BASE + rel;
  const adsHead = ADS && !noindex ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(cfg.adsense_client)}" crossorigin="anonymous"></script>\n` : "";
  const legal = [`<a href="${depth}privacidad.html">Privacidad</a>`];
  if (cfg.titular) legal.push(`<a href="${depth}aviso-legal.html">Aviso legal</a>`);
  if (cfg.email) legal.push(`<a href="${depth}contacto.html">Contacto</a>`);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">\n' : `<link rel="canonical" href="${url}">\n`}<meta name="theme-color" content="#0B4EA2">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Por Fin Apto">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}og.png">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${depth}favicon.ico" sizes="any">
<link rel="icon" href="${depth}icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="${depth}icons/apple-touch-icon.png">
<link rel="stylesheet" href="${depth}site.css">
${head}${adsHead}</head>
<body>
<header class="top"><div class="wrap top-in">
<a class="brand" href="${depth || "./"}" aria-label="Por Fin Apto, inicio"><span class="brand-in"><span class="l" aria-hidden="true">L</span><b>Por fin apto</b></span></a>
<nav class="topnav" aria-label="Principal"><a class="hide-sm" href="${depth}guia/">Guías</a><a class="hide-sm" href="${depth}test/">Exámenes</a><a class="cta" href="${depth}app/">Hacer el test</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer class="site"><div class="wrap">
<nav aria-label="Pie"><a href="${depth || "./"}">Inicio</a><a href="${depth}app/">Test</a><a href="${depth}test/">Exámenes</a><a href="${depth}guia/">Guías</a><a href="${depth}sobre.html">Sobre la web</a>${legal.join("")}</nav>
<p>Por Fin Apto es una web no oficial. No está afiliada a la Dirección General de Tráfico (DGT) ni a ningún organismo público. Las preguntas son propias, redactadas a partir de la normativa vigente; no son el banco oficial de la DGT. Información oficial en <a href="https://www.dgt.es" rel="noopener">dgt.es</a>.</p>
</div></footer>
<script src="${depth}site.js" defer></script>
</body>
</html>
`;
}
const OUT = {}; // rel → html (se escribe al final, con el comprobador de enlaces)
const emit = (rel, html, inSitemap = true) => { OUT[rel] = { html, inSitemap }; };
const fileOf = rel => path.join(W, rel.endsWith("/") || rel === "" ? rel + "index.html" : rel);

/* ---- Guías ---- */
const CATS = [["empieza", "Empieza aquí"], ["normas", "Normas de circulación"], ["seguridad", "Seguridad, documentos y puntos"], ["moto", "Ciclomotor y moto"], ["pro", "Camión, autobús y remolques"]];
const GD = path.join(S, "guias");
const guides = fs.readdirSync(GD).filter(f => f.endsWith(".html")).map(f => {
  const raw = fs.readFileSync(path.join(GD, f), "utf8");
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->\n/); if (!m) throw new Error("Sin cabecera: " + f);
  const g = Object.assign(JSON.parse(m[1]), { slug: f.replace(/\.html$/, ""), raw: raw.slice(m[0].length) });
  if (!CATS.some(([k]) => k === g.cat)) throw new Error("Categoría desconocida en " + f + ": " + g.cat);
  return g;
}).sort((a, b) => a.order - b.order);
const bySlug = Object.fromEntries(guides.map(g => [g.slug, g]));
const usedInGuides = new Set(guides.flatMap(g => [...g.raw.matchAll(/<!--Q:([^>]*)-->/g)].flatMap(m => m[1].split(",").map(s => s.trim()))));
const gcard = (g, prefix) => `<a class="gcard" href="${prefix}${g.slug}.html"><b>${esc(g.h1)}</b><span>${esc(g.desc)}</span></a>`;

function renderGuide(g) {
  const h = g.raw
    .replace(/<table>/g, '<div class="tablewrap"><table>').replace(/<\/table>/g, "</table></div>")
    .replace(/<!--Q:([^>]*)-->/g, (_, ids) => practice(ids))
    .replace(/<!--S:([^>]*)-->/g, (_, s) => signSVG(s))
    .replace(/<!--AD-->/g, adUnit())
    .replace(/<!--CTA:([^>]*)-->/g, (_, p) => cta(p, "../"));
  const rel = (g.related || []).map(s => { if (!bySlug[s]) throw new Error(`Guía relacionada inexistente en ${g.slug}: ${s}`); return bySlug[s]; });
  const words = g.raw.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const catName = CATS.find(([k]) => k === g.cat)[1];
  const body = `<p class="crumbs"><a href="../">Inicio</a> › <a href="./">Guías</a> › ${esc(catName)}</p>
<article>
<h1>${esc(g.h1)}</h1>
<p class="meta">Actualizada con la reforma del Reglamento de octubre de 2026 · Lectura de ${Math.max(3, Math.round(words / 220))} minutos</p>
${h}
${rel.length ? `<h2>Sigue leyendo</h2><div class="related">${rel.map(r => gcard(r, "")).join("")}</div>` : ""}
</article>
${ld({ "@type": "Article", "headline": g.h1, "description": g.desc, "inLanguage": "es-ES", "mainEntityOfPage": BASE + `guia/${g.slug}.html`, "image": BASE + "og.png", "author": ORG, "publisher": ORG })}
${crumbsLD([["Inicio", ""], ["Guías", "guia/"], [g.h1, `guia/${g.slug}.html`]])}`;
  return page({ title: `${g.title} | Por Fin Apto`, desc: g.desc, rel: `guia/${g.slug}.html`, body, depth: "../", type: "article" });
}
guides.forEach(g => emit(`guia/${g.slug}.html`, renderGuide(g)));
emit("guia/", page({
  title: "Guías del teórico de conducir | Por Fin Apto",
  desc: `${guides.length} guías para preparar el examen teórico de conducir: velocidades, alcohol, prioridad, adelantamientos, señales, estacionamiento, autopistas, mal tiempo, permisos de moto, camión y autobús, remolques y la reforma de 2026.`,
  rel: "guia/", depth: "../",
  body: `<p class="crumbs"><a href="../">Inicio</a> › Guías</p><article><h1>Guías del teórico de conducir</h1><p class="lead">Lo que más se pregunta y más se falla en el examen, explicado con tablas, trampas típicas y preguntas de práctica. ${guides.length} guías, ordenadas por tema.</p>
${CATS.map(([k, n]) => { const gs = guides.filter(g => g.cat === k); return gs.length ? `<h2>${esc(n)}</h2><div class="gcards">${gs.map(g => gcard(g, "")).join("")}</div>` : ""; }).join("\n")}
</article>
${crumbsLD([["Inicio", ""], ["Guías", "guia/"]])}`
}));

/* ---- Páginas de examen ---- */
const TESTS = [
  { slug: "permiso-b", ex: "comun", perm: "B", name: "permiso B",
    title: "Test del permiso B gratis: el teórico común con explicaciones",
    h1: "Test del permiso B: cómo es el examen teórico común y preguntas de prueba",
    desc: "El examen teórico común del permiso B, que también hacen el A1 y el A2: 30 preguntas, máximo 3 fallos y una pregunta con vídeo. Temario, trampas típicas y 10 preguntas de prueba con explicación.",
    intro: "Es el examen que hace casi todo el mundo. Lo piden el permiso B y también el A1 y el A2 si todavía no tienes el B. Son 30 preguntas de normas, señales y seguridad, una de ellas con un vídeo de percepción del riesgo, y solo puedes fallar 3. Eso es acertar el 90 %: no se aprueba «sabiéndose lo básico».",
    guides: ["como-aprobar-el-teorico", "reforma-reglamento-octubre-2026", "velocidades-maximas", "prioridad-de-paso", "senales-que-mas-se-fallan", "parada-y-estacionamiento"] },
  { slug: "permiso-am", ex: "am", perm: "AM", name: "permiso AM",
    title: "Test del permiso AM gratis: examen teórico del ciclomotor",
    h1: "Test del permiso AM: cómo es el examen del ciclomotor y preguntas de prueba",
    desc: "El examen teórico del permiso AM (ciclomotor, desde los 15 años): 20 preguntas y máximo 2 fallos. Qué temas entran, trampas típicas y 10 preguntas de prueba con explicación.",
    intro: "El teórico del AM es el primer examen de conducir que puedes hacer, desde los 15 años. Es más corto que el del coche, pero no más fácil: 20 preguntas y solo 2 fallos. Mezcla normas generales (señales, prioridad, alcohol) con lo propio del ciclomotor: por dónde puede circular, pasajeros, casco y equipamiento.",
    guides: ["permiso-am-ciclomotor", "senales-que-mas-se-fallan", "prioridad-de-paso", "cinturon-sillas-infantiles-y-casco"] },
  { slug: "moto", ex: "moto", perm: "A2", name: "específico de moto",
    title: "Test del específico de moto (A1 y A2) gratis con explicaciones",
    h1: "Test del específico de moto: el examen del A1 y el A2 y preguntas de prueba",
    desc: "El examen teórico específico de moto para los permisos A1 y A2: 20 preguntas y máximo 2 fallos. Cifras de los permisos, equipamiento de 2026, pasajeros y técnica, con 10 preguntas de prueba.",
    intro: "Si vas a por el A1 o el A2, además del teórico común te toca el específico de moto; si ya tienes el B, solo este. Son 20 preguntas con 2 fallos de margen: cifras de los permisos (kW, cm³ y kW/kg), equipamiento, pasajeros y técnica de conducción de la moto.",
    guides: ["permiso-de-moto-a1-a2", "reforma-reglamento-octubre-2026", "permisos-de-conducir"] },
  { slug: "camion", ex: "camion", perm: "C", name: "específico de camión",
    title: "Test del permiso C y C1 gratis: el específico de camión",
    h1: "Test del específico de camión (C1 y C): cómo es el examen y preguntas de prueba",
    desc: "El examen teórico específico de camión para el C1 y el C: 20 preguntas y máximo 2 fallos. Masas, dimensiones, carga, frenos y tiempos de conducción, con 10 preguntas de prueba explicadas.",
    intro: "El específico de camión lo hacen quienes van a por el C1 o el C. Como ya tienes el B, el común no se repite: aquí todo es del camión. Masas, dimensiones, velocidades, carga, frenos y, sobre todo, tiempos de conducción y descanso. Son 20 preguntas y 2 fallos de margen.",
    guides: ["permiso-de-camion-c1-c", "tiempos-de-conduccion-y-descanso", "remolques-b-codigo-96-be"] },
  { slug: "autobus", ex: "bus", perm: "D", name: "específico de autobús",
    title: "Test del permiso D y D1 gratis: el específico de autobús",
    h1: "Test del específico de autobús (D1 y D): cómo es el examen y preguntas de prueba",
    desc: "El examen teórico específico de autobús para el D1 y el D: 20 preguntas y máximo 2 fallos. Viajeros, paradas, velocidades, tiempos de conducción y emergencias, con 10 preguntas de prueba.",
    intro: "El específico de autobús es para el D1 y el D. Comparte con el de camión los tiempos de conducción y los frenos, y añade todo lo que tiene que ver con llevar personas: plazas, cinturones de los viajeros, paradas, escolares y evacuación. Son 20 preguntas y 2 fallos.",
    guides: ["permiso-de-autobus-d1-d", "tiempos-de-conduccion-y-descanso", "reforma-reglamento-octubre-2026"] },
  { slug: "remolque", ex: "remolque", perm: "BE", name: "específico de remolque",
    title: "Test del permiso B+E y remolques gratis: el específico de remolque",
    h1: "Test del específico de remolque (B+E, C+E, D+E): cómo es el examen y preguntas de prueba",
    desc: "El examen teórico específico de remolque para el B+E, C1+E, C+E, D1+E y D+E: 20 preguntas y máximo 2 fallos. Masas de los conjuntos, enganche, frenos, serpenteo y circulación, con 10 preguntas de prueba.",
    intro: "Lo hacen quienes van a por una E: B+E, C1+E, C+E, D1+E o D+E. Masas y permisos de los conjuntos, enganche, freno de inercia, serpenteo, carga y circulación con un remolque detrás. Son 20 preguntas y 2 fallos. Y ojo: para llevar un remolque grande con el B, muchas veces no necesitas la E, sino el código 96.",
    guides: ["remolques-b-codigo-96-be", "permisos-de-conducir", "velocidades-maximas"] }
];
const permsOf = ex => Object.values(PERMITS).filter(p => p.ex.includes(ex)).map(p => p.l).sort((a, b) => (b === "B") - (a === "B"));
const cap = s => s[0].toUpperCase() + s.slice(1);
const themeCount = t => ALLQ.filter(q => q.t === t).length;
const examPool = ex => ALLQ.filter(q => EXAMS[ex].themes.includes(q.t));
function pickQs(ex, n) {
  const E = EXAMS[ex], byT = {};
  ALLQ.filter(q => E.themes.includes(q.t) && !q.sc && !usedInGuides.has(q.id))
    .sort((a, b) => (b.f - a.f) || (hash(a.id + ex) - hash(b.id + ex)))
    .forEach(q => (byT[q.t] = byT[q.t] || []).push(q));
  const out = [];
  while (out.length < n && E.themes.some(t => byT[t] && byT[t].length))
    for (const t of E.themes) { if (out.length >= n) break; const q = byT[t] && byT[t].shift(); if (q) out.push(q.id); }
  return out;
}
const and = a => a.length > 1 ? a.slice(0, -1).join(", ") + " y " + a[a.length - 1] : a[0];

function renderTest(T) {
  const E = EXAMS[T.ex], perms = permsOf(T.ex), ok = E.q - E.fails;
  const themes = E.themes.filter(t => themeCount(t));
  const top = themes.filter(t => THEMES[t].tier === 1 && t !== "rie" && CHULETA[t]).slice(0, 3);
  const body = `<p class="crumbs"><a href="../">Inicio</a> › <a href="./">Exámenes</a> › ${esc(cap(T.name))}</p>
<article>
<h1>${esc(T.h1)}</h1>
<p class="lead">${esc(T.intro)}</p>
<div class="kpis"><div class="kpi"><b>${E.q}</b><span>preguntas</span></div><div class="kpi"><b>${E.fails}</b><span>fallos como máximo</span></div><div class="kpi"><b>${ok}</b><span>aciertos para aprobar</span></div>${E.video ? `<div class="kpi"><b>1</b><span>pregunta con vídeo</span></div>` : ""}</div>
<h2>Quién tiene que hacerlo</h2>
<p>Lo piden ${perms.length > 1 ? "los permisos" : "el permiso"} <strong>${esc(and(perms))}</strong>.${T.ex === "comun" ? " Si ya tienes el B, para el A1 o el A2 solo te queda el específico de moto." : ""} Cada pregunta tiene tres respuestas y solo una es correcta. Antes de presentarte, confirma con tu autoescuela o en la DGT el formato y la duración de tu prueba.</p>
<h2>Qué temas entran</h2>
<table><thead><tr><th>Tema</th><th>Preguntas en Por Fin Apto</th></tr></thead><tbody>
${themes.map(t => `<tr><td>${esc(THEMES[t].n)}</td><td>${themeCount(t)}</td></tr>`).join("\n")}
</tbody></table>
<p>En total, <strong>${examPool(T.ex).length} preguntas</strong> propias para este examen, cada una con su explicación.</p>
${adUnit()}
<h2>Las trampas que más suspenden</h2>
${top.map(t => `<div class="trap"><b>${esc(THEMES[t].n)}</b><ul>${CHULETA[t].t.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("\n")}
<h2>10 preguntas de prueba</h2>
<p>Elegidas entre las que más se fallan. Contesta antes de mirar la explicación: la que dudas es la que te va a caer.</p>
${practice(pickQs(T.ex, 10))}
${cta(T.perm, "../")}
<h2>Guías para este examen</h2>
<div class="related">${T.guides.map(s => { if (!bySlug[s]) throw new Error("Guía inexistente en examen " + T.slug + ": " + s); return gcard(bySlug[s], "../guia/"); }).join("")}</div>
<h2>Otros exámenes</h2>
<ul class="chips">${TESTS.filter(x => x !== T).map(x => `<li><a href="${x.slug}.html">${esc(cap(x.name))}</a></li>`).join("")}</ul>
</article>
${crumbsLD([["Inicio", ""], ["Exámenes", "test/"], [cap(T.name), `test/${T.slug}.html`]])}`;
  return page({ title: `${T.title} | Por Fin Apto`, desc: T.desc, rel: `test/${T.slug}.html`, body, depth: "../" });
}
TESTS.forEach(T => emit(`test/${T.slug}.html`, renderTest(T)));
emit("test/", page({
  title: "Exámenes teóricos de conducir: formato de cada permiso | Por Fin Apto",
  desc: "Cómo es cada examen teórico de conducir en España: común (B), AM, específico de moto, camión, autobús y remolque. Preguntas, fallos permitidos, quién lo hace y preguntas de prueba.",
  rel: "test/", depth: "../",
  body: `<p class="crumbs"><a href="../">Inicio</a> › Exámenes</p><article><h1>Los exámenes teóricos de conducir, uno por uno</h1>
<p class="lead">No hay un único teórico: depende del permiso. Aquí tienes los seis exámenes que existen, cuántas preguntas tiene cada uno, cuántos fallos te permiten y quién tiene que hacerlos.</p>
<table><thead><tr><th>Examen</th><th>Preguntas</th><th>Fallos máx.</th><th>Lo piden</th></tr></thead><tbody>
${TESTS.map(T => { const E = EXAMS[T.ex]; return `<tr><td><a href="${T.slug}.html">${esc(cap(T.name))}</a></td><td>${E.q}</td><td>${E.fails}</td><td>${esc(and(permsOf(T.ex)))}</td></tr>`; }).join("\n")}
</tbody></table>
<p>El permiso <strong>A</strong> no tiene examen teórico: se obtiene con dos años de A2 y un curso. Y si ya tienes un permiso, normalmente no repites el común: para el A1 o el A2 con el B, solo haces el específico de moto; para el C o el D, el específico de camión o de autobús.</p>
<div class="gcards">${TESTS.map(T => `<a class="gcard" href="${T.slug}.html"><b>${esc(T.h1)}</b><span>${esc(T.desc)}</span></a>`).join("")}</div>
${cta("", "../")}
</article>
${crumbsLD([["Inicio", ""], ["Exámenes", "test/"]])}`
}));

/* ---- Portada ---- */
const permGroups = ["Ciclomotor y moto", "Coche", "Camión", "Autobús"];
const pcards = permGroups.map(gr => Object.entries(PERMITS).filter(([, p]) => p.g === gr)
  .map(([k, p]) => `<a class="pcard" href="app/?p=${k}"><span class="plabel">${esc(p.l)}</span><span class="pn">${esc(p.n)}</span><span class="pe">Desde ${esc(p.edad.split(" (")[0])}</span></a>`).join("")).join("");
const faq = [
  ["¿Es gratis?", "Sí. Puedes hacer todos los tests, sin límite y sin registrarte."],
  ["¿Son las preguntas oficiales de la DGT?", "No. El banco oficial de la DGT no es público. Las preguntas de Por Fin Apto son propias, redactadas al estilo del examen a partir de la normativa vigente, incluida la reforma de octubre de 2026. Por eso cada una trae su explicación: el objetivo es que entiendas la norma, no que memorices una frase."],
  ["¿Qué permisos puedo preparar?", "Todos los teóricos de los permisos de conducir: AM, A1, A2, A, B, B+E, C1, C1+E, C, C+E, D1, D1+E, D y D+E. No incluye las licencias LCM y LVA ni los exámenes del CAP y del ADR."],
  ["¿Necesito crear una cuenta?", "No. Tu progreso se guarda en tu propio dispositivo."],
  ["¿Funciona sin conexión?", "Sí. Puedes instalar el test en tu móvil desde el navegador y usarlo sin internet."],
  ["¿Cuándo estoy listo para presentarme?", "Cuando hayas terminado el diagnóstico, encadenes 5 tests seguidos con al menos un fallo de margen y no te queden preguntas falladas sin repasar. El semáforo de la app te lo dice."]
];
const FEATURED = ["como-aprobar-el-teorico", "reforma-reglamento-octubre-2026", "velocidades-maximas", "prioridad-de-paso", "senales-que-mas-se-fallan", "permisos-de-conducir"];
const home = `<section class="hero">
<p class="eyebrow">Test del teórico de conducir · Todos los permisos</p>
<h1>Aprueba el teórico con un método, no a base de hacer tests</h1>
<p class="sub">Primero descubrimos dónde fallas. Después te devolvemos cada fallo justo cuando estás a punto de olvidarlo, y te explicamos por qué caes. ${NQ} preguntas propias, actualizadas con la reforma de octubre de 2026.</p>
<div class="ctas"><a class="btn primary" href="app/">Empezar el test gratis</a><a class="btn ghost" href="guia/">Leer las guías</a></div>
<p class="hand">Aquí no se hacen tests como churros. Se viene a entender por qué fallas. — El profe</p>
</section>
<section class="block"><h2>Elige tu permiso</h2><div class="pgrid">${pcards}</div></section>
${adUnit()}
<section class="block"><h2>Cómo funciona</h2><ol class="steps">
<li><b>Diagnóstico</b>Tests con el formato real del examen y las preguntas que más se fallan, para saber exactamente dónde estás.</li>
<li><b>Por qué fallas</b>Cada fallo se clasifica: cifras, excepciones, lectura rápida, señales, prioridad… Y detectamos si contestas demasiado rápido o si cambias la buena por la mala.</li>
<li><b>Emboscadas</b>Tus fallos vuelven solos, con repetición espaciada, hasta que los dominas.</li>
<li><b>Semáforo de aptitud</b>Más exigente que el propio examen: te da luz verde cuando apruebas con margen, no de milagro.</li>
</ol></section>
<section class="block"><h2>Cómo es tu examen</h2><p>Preguntas, fallos permitidos, temario y preguntas de prueba de cada teórico:</p><ul class="chips">${TESTS.map(T => `<li><a href="test/${T.slug}.html">${esc(cap(T.name))}</a></li>`).join("")}</ul></section>
<section class="block"><h2>Guías del teórico</h2><div class="gcards">${FEATURED.map(s => gcard(bySlug[s], "guia/")).join("")}</div><a class="more" href="guia/">Ver las ${guides.length} guías →</a></section>
<section class="block faq"><h2>Preguntas frecuentes</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>
${ld({ "@type": "FAQPage", "mainEntity": faq.map(([q, a]) => ({ "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a } })) })}
${ld({ "@type": "WebSite", "name": "Por Fin Apto", "url": BASE, "inLanguage": "es-ES" })}`;
emit("", page({
  title: "Test del teórico de conducir para todos los permisos | Por Fin Apto",
  desc: `Prepara el examen teórico de conducir (AM, A, B, C, D y remolques) con un método: diagnóstico de tus fallos, repetición espaciada y explicaciones. ${NQ} preguntas actualizadas con la reforma de 2026. Gratis.`,
  rel: "", body: home
}));

/* ---- Páginas legales y de información ---- */
const legalPage = (rel, title, desc, inner, noindex = false) => emit(rel, page({ title: `${title} | Por Fin Apto`, desc, rel, noindex, body: `<article class="legal"><h1>${esc(title)}</h1>${inner}</article>` }), !noindex);

legalPage("sobre.html", "Sobre Por Fin Apto", "Qué es Por Fin Apto, cómo se hacen las preguntas y por qué no es una web oficial.", `
<p class="lead">Por Fin Apto nace de una idea sencilla: la mayoría de la gente suspende el teórico no por falta de tests, sino porque nadie le explica por qué falla.</p>
<h2>Qué es</h2><p>Una herramienta gratuita para preparar el examen teórico de cualquier permiso de conducir en España. Combina tests con el formato real del examen, un diagnóstico de tus errores, repetición espaciada de las preguntas que fallas y guías explicadas.</p>
<h2>Cómo se hacen las preguntas</h2><p>Las ${NQ} preguntas son propias. Se redactan a partir de la normativa publicada (Reglamento General de Circulación, Reglamento General de Conductores, Reglamento General de Vehículos, Ley de Tráfico y, para camión y autobús, el Reglamento (CE) 561/2006), incluida la reforma en vigor desde el 1 de octubre de 2026 (Real Decreto 518/2026). No se copian preguntas de otras plataformas ni del banco de la DGT, que no es público.</p>
<h2>Lo que no es</h2><p>No es una web oficial. No está afiliada a la Dirección General de Tráfico ni a ningún organismo público. Para cualquier trámite o información oficial, consulta <a href="https://www.dgt.es" rel="noopener">dgt.es</a>.</p>
<h2>¿Has visto un error?</h2><p>Las normas cambian y cualquier error es importante.${cfg.email ? ` Escríbenos a <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a> indicando la pregunta y lo corregiremos.` : ""}</p>`);

for (const [f, need] of [["contacto.html", cfg.email], ["aviso-legal.html", cfg.titular]]) if (!need && fs.existsSync(path.join(W, f))) fs.unlinkSync(path.join(W, f));
if (cfg.email) legalPage("contacto.html", "Contacto", "Cómo contactar con Por Fin Apto.", `
<p>Para dudas, sugerencias o para avisar de un error en una pregunta, escribe a <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>.</p>
<p>Si es sobre una pregunta concreta, copia el enunciado: así la encontramos antes.</p>`);

if (cfg.titular) legalPage("aviso-legal.html", "Aviso legal", "Datos del titular de Por Fin Apto y condiciones de uso.", `
<h2>Titular</h2><p>En cumplimiento de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), se informa de que esta web es titularidad de:</p>
<ul><li><strong>Titular:</strong> ${esc(cfg.titular)}</li><li><strong>NIF:</strong> ${esc(cfg.nif)}</li><li><strong>Domicilio:</strong> ${esc(cfg.domicilio)}</li><li><strong>Correo electrónico:</strong> <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></li></ul>
<h2>Condiciones de uso</h2><p>El contenido de esta web tiene finalidad educativa. Aunque se revisa con cuidado, puede contener errores o quedar desactualizado por cambios normativos. No sustituye a la información oficial de la DGT ni a la formación de una autoescuela.</p>
<h2>Propiedad intelectual</h2><p>Los textos, preguntas, explicaciones y diseño de Por Fin Apto son propios. No se permite su reproducción total o parcial sin autorización.</p>
<h2>Enlaces</h2><p>Los enlaces a webs de terceros se ofrecen solo como referencia; no nos hacemos responsables de su contenido.</p>`);

const privAds = ADS ? `
<h2>Publicidad y cookies</h2>
<p>Esta web muestra anuncios de <strong>Google AdSense</strong>. Google y sus socios pueden usar cookies e identificadores para mostrar anuncios, limitar cuántas veces ves uno, medir su rendimiento y, si lo aceptas, personalizarlos según tus intereses.</p>
<p>La primera vez que entras te mostramos un aviso de consentimiento para que elijas si aceptas o no el uso de cookies con fines publicitarios. Puedes cambiar tu decisión en cualquier momento desde el enlace de configuración de privacidad que aparece en la web.</p>
<p>Más información sobre cómo usa Google los datos: <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">policies.google.com/technologies/partner-sites</a>. Puedes gestionar la personalización de anuncios en <a href="https://adssettings.google.com" rel="noopener">adssettings.google.com</a>.</p>
<p>Responsable del tratamiento de los datos de contacto: ${esc(cfg.titular)} (${esc(cfg.email)}). Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ese correo, y reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" rel="noopener">aepd.es</a>).</p>` : `
<h2>Publicidad y cookies</h2>
<p>Actualmente esta web no muestra publicidad ni usa cookies de terceros. Si en el futuro se incorporan anuncios, esta política se actualizará y se te pedirá el consentimiento antes de usar cookies publicitarias.</p>`;
legalPage("privacidad.html", "Política de privacidad", "Qué datos usa Por Fin Apto y cómo se guardan.", `
<h2>Tu progreso se queda en tu dispositivo</h2>
<p>El test no requiere registro. Tus respuestas, tu progreso, el permiso elegido y la fecha de examen que indiques se guardan únicamente en el almacenamiento local de tu navegador. No se envían a ningún servidor y nadie más puede verlos. Si borras los datos del navegador o pulsas «Empezar de cero», se eliminan.</p>
<h2>Alojamiento</h2>
<p>La web se sirve desde GitHub Pages. Como cualquier servidor web, el proveedor de alojamiento puede registrar datos técnicos de las visitas (como la dirección IP) por motivos de seguridad. Por Fin Apto no tiene acceso a esos registros ni los usa.</p>
${privAds}
<h2>Menores</h2>
<p>El permiso AM puede obtenerse desde los 15 años. El test puede usarse sin facilitar ningún dato personal.</p>
${cfg.email ? `<h2>Contacto</h2><p>Para cualquier cuestión sobre privacidad: <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>.</p>` : ""}`);

/* ---- 404 (GitHub Pages la sirve en cualquier ruta: enlaces absolutos) ---- */
emit("404.html", page({
  title: "Página no encontrada | Por Fin Apto", desc: "Esta página no existe.", rel: "404.html", depth: BASEPATH, noindex: true,
  body: `<section class="nf"><span class="plate404" aria-hidden="true">404</span><h1>Te has salido de la vía</h1><p class="lead">Esta página no existe o ha cambiado de sitio. Ni marcha atrás ni cambio de sentido: toma la siguiente salida.</p><div class="ctas"><a class="btn primary" href="${BASEPATH}app/">Hacer el test</a><a class="btn ghost" href="${BASEPATH}guia/">Ver las guías</a><a class="btn ghost" href="${BASEPATH}">Ir al inicio</a></div></section>`
}), false);

/* ---- Escritura, fechas de modificación y sitemap ---- */
const LMF = path.join(S, "lastmod.json");
const lastmod = fs.existsSync(LMF) ? JSON.parse(fs.readFileSync(LMF, "utf8")) : {};
const today = new Date().toISOString().slice(0, 10);
fs.mkdirSync(path.join(W, "guia"), { recursive: true });
fs.mkdirSync(path.join(W, "test"), { recursive: true });
/* Borra guías o exámenes generados antes que ya no existen */
for (const dir of ["guia", "test"]) for (const f of fs.readdirSync(path.join(W, dir))) {
  const rel = f === "index.html" ? dir + "/" : `${dir}/${f}`;
  if (f.endsWith(".html") && !OUT[rel]) fs.unlinkSync(path.join(W, dir, f));
}
for (const [rel, { html }] of Object.entries(OUT)) {
  fs.writeFileSync(fileOf(rel), html);
  const h = crypto.createHash("sha1").update(html.split(BASE).join("")).digest("hex").slice(0, 12);
  if (!lastmod[rel] || lastmod[rel].h !== h) lastmod[rel] = { h, d: today };
}
const appIndex = path.join(W, "app", "index.html");
if (fs.existsSync(appIndex)) {
  const h = crypto.createHash("sha1").update(fs.readFileSync(appIndex)).digest("hex").slice(0, 12);
  if (!lastmod["app/"] || lastmod["app/"].h !== h) lastmod["app/"] = { h, d: today };
}
for (const k of Object.keys(lastmod)) if (k !== "app/" && !OUT[k]) delete lastmod[k];
fs.writeFileSync(LMF, JSON.stringify(lastmod, null, 1) + "\n");
const urls = ["", "test/", "guia/", "app/", ...Object.keys(OUT).filter(r => OUT[r].inSitemap && !["", "test/", "guia/"].includes(r))];
fs.writeFileSync(path.join(W, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${BASE}${u}</loc>${lastmod[u] ? `<lastmod>${lastmod[u].d}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`);

/* ---- Archivos técnicos ---- */
fs.writeFileSync(path.join(W, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);
if (ADS) fs.writeFileSync(path.join(W, "ads.txt"), `google.com, ${cfg.adsense_client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`);
else if (fs.existsSync(path.join(W, "ads.txt"))) fs.unlinkSync(path.join(W, "ads.txt"));
if (cfg.domain) fs.writeFileSync(path.join(W, "CNAME"), cfg.domain + "\n");
else if (fs.existsSync(path.join(W, "CNAME"))) fs.unlinkSync(path.join(W, "CNAME"));
fs.copyFileSync(path.join(S, "site.css"), path.join(W, "site.css"));
fs.copyFileSync(path.join(S, "favicon.ico"), path.join(W, "favicon.ico"));
fs.writeFileSync(path.join(W, "site.js"), `document.addEventListener("click",e=>{const b=e.target.closest(".pq-o button");if(!b)return;const q=b.closest(".pq");q.querySelectorAll(".pq-o button").forEach(x=>{x.disabled=true;if(x.dataset.c==="1")x.classList.add("ok")});if(b.dataset.c!=="1")b.classList.add("ko");const d=q.querySelector("details");if(d)d.open=true;});\n`);
/* Desinstala el service worker antiguo de la raíz (la app ahora vive en /app/) */
fs.writeFileSync(path.join(W, "sw.js"), `self.addEventListener("install",()=>self.skipWaiting());\nself.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))).then(()=>self.registration.unregister()));});\n`);
const og = path.join(D, "play-store", "grafico-destacado-1024x500.png");
if (fs.existsSync(og)) fs.copyFileSync(og, path.join(W, "og.png"));
fs.writeFileSync(path.join(W, ".nojekyll"), "");

/* ---- Comprobador de enlaces internos ---- */
const broken = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!f.endsWith(".html")) continue;
    const html = fs.readFileSync(p, "utf8");
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      let u = m[1];
      if (/^(https?:|mailto:|tel:|data:|javascript:|#)/.test(u) || u.includes("${")) continue;
      u = u.replace(/[?#].*$/, ""); if (!u) continue;
      let target = u.startsWith("/") ? path.join(W, u.slice(BASEPATH.length - 1)) : path.join(path.dirname(p), u);
      if (u.endsWith("/") || (fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, "index.html");
      if (!fs.existsSync(target)) broken.push(`${path.relative(W, p)} → ${m[1]}`);
    }
  }
})(W);
if (broken.length) { console.error("Enlaces rotos:\n  " + broken.join("\n  ")); process.exit(1); }

console.log(`ok: ${guides.length} guías, ${TESTS.length} exámenes, ${NQ} preguntas, ${urls.length} URL en el sitemap, enlaces internos correctos, anuncios ${ADS ? "ACTIVADOS" : "desactivados"}, base ${BASE}`);
