/* ===== SEÑALES (SVG) Y ESCENAS DE VÍDEO ===== */

function signSVG(spec) {
  const [type, arg] = String(spec).split(":");
  const wrap = (inner, vb = "0 0 100 100", label = "Señal") =>
    `<svg class="sign" viewBox="${vb}" role="img" aria-label="${label}">${inner}</svg>`;
  const txt = (s, size, fill, y = 50) =>
    `<text x="50" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Overpass, Arial, sans-serif" font-weight="800" font-size="${size}" fill="${fill}">${s}</text>`;
  switch (type) {
    case "stop": {
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + i * Math.PI / 4;
        pts.push((50 + 46 * Math.cos(a)).toFixed(1) + "," + (50 + 46 * Math.sin(a)).toFixed(1));
      }
      const inner = pts.map(p => { const [x, y] = p.split(",").map(Number); return (50 + (x - 50) * 0.9).toFixed(1) + "," + (50 + (y - 50) * 0.9).toFixed(1); });
      return wrap(`<polygon points="${pts.join(" ")}" fill="#FFFFFF"/><polygon points="${inner.join(" ")}" fill="#C62828"/>${txt("STOP", 25, "#FFFFFF")}`, undefined, "Señal de STOP");
    }
    case "ceda":
      return wrap(`<polygon points="10,16 90,16 50,88" fill="#FFFFFF" stroke="#C62828" stroke-width="9" stroke-linejoin="round"/>`, undefined, "Ceda el paso");
    case "limit":
      return wrap(`<circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#C62828" stroke-width="10"/>${txt(arg, 36, "#111111", 52)}`, undefined, "Velocidad máxima " + arg);
    case "fin":
      return wrap(`<defs><clipPath id="cfin"><circle cx="50" cy="50" r="43"/></clipPath></defs><circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#222222" stroke-width="2"/>${txt(arg, 36, "#9A9A9A", 52)}<g clip-path="url(#cfin)" stroke="#222222" stroke-width="3">${[-24, -12, 0, 12, 24].map(o => `<line x1="${8 + o}" y1="${92 + o}" x2="${92 + o}" y2="${8 + o}"/>`).join("")}</g>`, undefined, "Fin de limitación de velocidad " + arg);
    case "min":
      return wrap(`<circle cx="50" cy="50" r="45" fill="#1F5DB8"/><circle cx="50" cy="50" r="40" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>${txt(arg, 36, "#FFFFFF", 52)}`, undefined, "Velocidad mínima " + arg);
    case "obras":
      return wrap(`<polygon points="50,10 92,86 8,86" fill="#F6C400" stroke="#C62828" stroke-width="8" stroke-linejoin="round"/><rect x="46" y="36" width="8" height="28" rx="2" fill="#111111"/><circle cx="50" cy="73" r="4.5" fill="#111111"/>`, undefined, "Señal de obras");
    case "peligro":
      return wrap(`<polygon points="50,10 92,86 8,86" fill="#FFFFFF" stroke="#C62828" stroke-width="8" stroke-linejoin="round"/><rect x="46" y="36" width="8" height="28" rx="2" fill="#111111"/><circle cx="50" cy="73" r="4.5" fill="#111111"/>`, undefined, "Peligro");
    case "prior":
      return wrap(`<g transform="rotate(45 50 50)"><rect x="18" y="18" width="64" height="64" fill="#FFFFFF" stroke="#222222" stroke-width="1.5"/><rect x="29" y="29" width="42" height="42" fill="#F6C400"/></g>`, undefined, "Calzada con prioridad");
    case "dirprohib":
      return wrap(`<circle cx="50" cy="50" r="45" fill="#C62828"/><rect x="18" y="42" width="64" height="16" fill="#FFFFFF"/>`, undefined, "Dirección prohibida");
    case "circprohib":
      return wrap(`<circle cx="50" cy="50" r="42" fill="#FFFFFF" stroke="#C62828" stroke-width="10"/>`, undefined, "Circulación prohibida");
    case "semaforo":
      return wrap(`<rect x="8" y="26" width="84" height="48" rx="10" fill="#1E1E1E"/><circle cx="31" cy="50" r="15" fill="#FF3B30"/><circle cx="69" cy="50" r="15" fill="#5A1A17"/><g stroke="#FF3B30" stroke-width="3" stroke-linecap="round"><line x1="31" y1="18" x2="31" y2="10"/><line x1="12" y1="22" x2="7" y2="16"/><line x1="50" y1="22" x2="55" y2="16"/></g>`, undefined, "Luces rojas intermitentes");
    case "carril":
      if (arg === "aspa")
        return wrap(`<rect x="10" y="10" width="80" height="80" rx="8" fill="#151515"/><g stroke="#FF3B30" stroke-width="11" stroke-linecap="round"><line x1="30" y1="30" x2="70" y2="70"/><line x1="70" y1="30" x2="30" y2="70"/></g>`, undefined, "Aspa roja de carril");
      return wrap(`<rect x="10" y="10" width="80" height="80" rx="8" fill="#151515"/><g stroke="#FFC400" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="30" y1="30" x2="66" y2="66"/><polyline points="44,68 68,68 68,44"/></g>`, undefined, "Flecha oblicua de carril");
    case "lineas":
      return `<svg class="sign wide" viewBox="0 0 220 110" role="img" aria-label="Línea continua y discontinua adosadas"><rect x="0" y="0" width="220" height="110" rx="8" fill="#4A5058"/><rect x="0" y="50" width="220" height="3" fill="#FFFFFF"/>${Array.from({length:9},(_,i)=>`<rect x="${i*26}" y="57" width="16" height="3" fill="#FFFFFF"/>`).join("")}<g transform="translate(70 84)"><rect x="-20" y="-10" width="40" height="20" rx="5" fill="#1F5DB8"/><rect x="6" y="-8" width="8" height="16" rx="2" fill="#A9C6F0"/></g><text x="104" y="89" font-family="Overpass, Arial, sans-serif" font-weight="800" font-size="13" fill="#FFFFFF">USTED →</text><text x="12" y="30" font-family="Overpass, Arial, sans-serif" font-weight="600" font-size="12" fill="#D8DDE3">← sentido contrario</text></svg>`;
    /* ---- Ampliación de señales ---- */
    case "noadel": case "finadel": {
      const fin = type === "finadel";
      const car = (cx, col) => `<g fill="${col}" transform="translate(${cx} 52) scale(1.35) translate(${-cx} -52)"><path d="M${cx - 8},50 L${cx - 6},41 Q${cx - 5.5},39 ${cx - 3.5},39 L${cx + 3.5},39 Q${cx + 5.5},39 ${cx + 6},41 L${cx + 8},50 Z"/><rect x="${cx - 11}" y="49" width="22" height="11" rx="3"/><rect x="${cx - 10}" y="59" width="5" height="5" rx="1"/><rect x="${cx + 5}" y="59" width="5" height="5" rx="1"/></g>`;
      if (!fin) return wrap(`<circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#C62828" stroke-width="10"/>${car(33, "#C62828")}${car(67, "#111111")}`, undefined, "Adelantamiento prohibido");
      return wrap(`<defs><clipPath id="cfa"><circle cx="50" cy="50" r="43"/></clipPath></defs><circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#222222" stroke-width="2"/>${car(33, "#A8A8A8")}${car(67, "#A8A8A8")}<g clip-path="url(#cfa)" stroke="#222222" stroke-width="3">${[-24, -12, 0, 12, 24].map(o => `<line x1="${8 + o}" y1="${92 + o}" x2="${92 + o}" y2="${8 + o}"/>`).join("")}</g>`, undefined, "Fin de la prohibición de adelantar");
    }
    case "fintodas":
      return wrap(`<defs><clipPath id="cft"><circle cx="50" cy="50" r="43"/></clipPath></defs><circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#222222" stroke-width="2"/><g clip-path="url(#cft)" stroke="#222222" stroke-width="3">${[-24, -12, 0, 12, 24].map(o => `<line x1="${8 + o}" y1="${92 + o}" x2="${92 + o}" y2="${8 + o}"/>`).join("")}</g>`, undefined, "Fin de prohibiciones");
    case "noestac": case "noparar": {
      const bars = type === "noestac" ? `<line x1="20" y1="20" x2="80" y2="80"/>` : `<line x1="20" y1="20" x2="80" y2="80"/><line x1="80" y1="20" x2="20" y2="80"/>`;
      return wrap(`<defs><clipPath id="c${type}"><circle cx="50" cy="50" r="40"/></clipPath></defs><circle cx="50" cy="50" r="44" fill="#1F5DB8" stroke="#C62828" stroke-width="10"/><g clip-path="url(#c${type})" stroke="#C62828" stroke-width="10">${bars}</g>`, undefined, type === "noestac" ? "Estacionamiento prohibido" : "Parada y estacionamiento prohibidos");
    }
    case "nogiro": {
      const d = arg === "izq" ? "M58,76 L58,52 Q58,40 46,40 L36,40" : "M42,76 L42,52 Q42,40 54,40 L64,40";
      const head = arg === "izq" ? "38,30 24,40 38,50" : "62,30 76,40 62,50";
      return wrap(`<circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#C62828" stroke-width="10"/><path d="${d}" fill="none" stroke="#111111" stroke-width="9"/><polygon points="${head}" fill="#111111"/><line x1="20" y1="20" x2="80" y2="80" stroke="#C62828" stroke-width="8"/>`, undefined, arg === "izq" ? "Giro a la izquierda prohibido" : "Giro a la derecha prohibido");
    }
    case "masa":
      return wrap(`<circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#C62828" stroke-width="10"/>${txt(arg.replace(".", ",") + "t", 26, "#111111", 52)}`, undefined, "Limitación de masa " + arg + " toneladas");
    case "altura":
      return wrap(`<circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#C62828" stroke-width="10"/><polygon points="40,20 60,20 50,30" fill="#111111"/><polygon points="40,80 60,80 50,70" fill="#111111"/>${txt(arg.replace(".", ",") + " m", 22, "#111111", 51)}`, undefined, "Limitación de altura " + arg + " metros");
    case "recto":
      return wrap(`<circle cx="50" cy="50" r="45" fill="#1F5DB8"/><rect x="45" y="36" width="10" height="42" fill="#FFFFFF"/><polygon points="32,40 50,18 68,40" fill="#FFFFFF"/>`, undefined, "Sentido obligatorio de frente");
    case "pasoder":
      return wrap(`<circle cx="50" cy="50" r="45" fill="#1F5DB8"/><g transform="rotate(135 50 50)"><rect x="45" y="36" width="10" height="42" fill="#FFFFFF"/><polygon points="32,40 50,18 68,40" fill="#FFFFFF"/></g>`, undefined, "Paso obligatorio por la derecha");
    case "finmin":
      return wrap(`<circle cx="50" cy="50" r="45" fill="#1F5DB8"/><circle cx="50" cy="50" r="40" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>${txt(arg, 36, "#FFFFFF", 52)}<line x1="22" y1="78" x2="78" y2="22" stroke="#C62828" stroke-width="8"/>`, undefined, "Fin de velocidad mínima " + arg);
    case "ciclos":
      return wrap(`<circle cx="50" cy="50" r="45" fill="#1F5DB8"/><g fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><circle cx="30" cy="60" r="12"/><circle cx="70" cy="60" r="12"/><polyline points="30,60 44,40 62,40 70,60"/><polyline points="44,40 52,60 62,40"/><line x1="40" y1="34" x2="48" y2="34"/><line x1="62" y1="40" x2="60" y2="31"/><line x1="56" y1="31" x2="64" y2="31"/></g>`, undefined, "Vía reservada para ciclos");
    case "curva": {
      const d = arg === "izq" ? "M50,80 L50,62 Q50,48 38,48 L34,48" : "M50,80 L50,62 Q50,48 62,48 L66,48";
      const head = arg === "izq" ? "36,40 24,48 36,56" : "64,40 76,48 64,56";
      return wrap(`<polygon points="50,10 92,86 8,86" fill="#FFFFFF" stroke="#C62828" stroke-width="8" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#111111" stroke-width="7"/><polygon points="${head}" fill="#111111"/>`, undefined, arg === "izq" ? "Curva peligrosa hacia la izquierda" : "Curva peligrosa hacia la derecha");
    }
    case "estrecha":
      return wrap(`<polygon points="50,10 92,86 8,86" fill="#FFFFFF" stroke="#C62828" stroke-width="8" stroke-linejoin="round"/><g fill="none" stroke="#111111" stroke-width="5"><polyline points="36,80 36,66 44,54 44,40"/><polyline points="64,80 64,66 56,54 56,40"/></g>`, undefined, "Estrechamiento de calzada");
    case "interprior":
      return wrap(`<polygon points="50,10 92,86 8,86" fill="#FFFFFF" stroke="#C62828" stroke-width="8" stroke-linejoin="round"/><rect x="45" y="36" width="10" height="44" fill="#111111"/><rect x="28" y="57" width="44" height="4" fill="#111111"/>`, undefined, "Intersección con prioridad");
    case "semaforos":
      return wrap(`<polygon points="50,10 92,86 8,86" fill="#FFFFFF" stroke="#C62828" stroke-width="8" stroke-linejoin="round"/><rect x="42" y="36" width="16" height="44" rx="4" fill="#111111"/><circle cx="50" cy="44" r="5" fill="#FF3B30"/><circle cx="50" cy="58" r="5" fill="#FFB300"/><circle cx="50" cy="72" r="5" fill="#2BD46A"/>`, undefined, "Semáforos");
    case "dossentidos":
      return wrap(`<polygon points="50,10 92,86 8,86" fill="#FFFFFF" stroke="#C62828" stroke-width="8" stroke-linejoin="round"/><g fill="#111111"><rect x="39" y="44" width="6" height="34"/><polygon points="34,74 42,84 50,74"/><rect x="55" y="42" width="6" height="34"/><polygon points="50,46 58,36 66,46"/></g>`, undefined, "Circulación en los dos sentidos");
    case "sentidounico":
      return wrap(`<rect x="6" y="6" width="88" height="88" rx="8" fill="#1F5DB8"/><rect x="45" y="36" width="10" height="46" fill="#FFFFFF"/><polygon points="32,40 50,16 68,40" fill="#FFFFFF"/>`, undefined, "Calzada de sentido único");
    case "sinsalida":
      return wrap(`<rect x="6" y="6" width="88" height="88" rx="8" fill="#1F5DB8"/><rect x="43" y="34" width="14" height="50" fill="#FFFFFF"/><rect x="27" y="22" width="46" height="13" fill="#C62828"/>`, undefined, "Calzada sin salida");
    case "parking":
      return wrap(`<rect x="6" y="6" width="88" height="88" rx="8" fill="#1F5DB8"/>${txt("P", 64, "#FFFFFF", 54)}`, undefined, "Estacionamiento");
    case "novel":
      return wrap(`<rect x="10" y="10" width="80" height="80" rx="4" fill="#1C8A3A"/>${txt("L", 64, "#FFFFFF", 54)}`, undefined, "Placa de conductor novel");
    default:
      return "";
  }
}

/* ---------- Motor de escenas ---------- */
const PAL = { road:"#5A6068", road2:"#4E545B", walk:"#C9CED3", curb:"#9EA5AC", grass:"#6E9A4F", grass2:"#5E8A42", line:"#F4F4F4", tree:"#2F5E2A", tree2:"#3E7535" };

function carG(color, opts = {}) {
  const w = opts.w || 44, h = opts.h || 22;
  const x = -w / 2, y = -h / 2;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${color}"/>`;
  s += `<rect x="${w/2 - 15}" y="${y + 3}" width="7" height="${h - 6}" rx="2" fill="#BFD3EA" opacity=".9"/>`;
  s += `<rect x="${x + 5}" y="${y + 4}" width="5" height="${h - 8}" rx="2" fill="#BFD3EA" opacity=".7"/>`;
  if (opts.haz) s += `<g class="bl"><rect x="${w/2-3}" y="${y-1}" width="4" height="4" fill="#FFB000"/><rect x="${w/2-3}" y="${h/2-3}" width="4" height="4" fill="#FFB000"/><rect x="${x-1}" y="${y-1}" width="4" height="4" fill="#FFB000"/><rect x="${x-1}" y="${h/2-3}" width="4" height="4" fill="#FFB000"/></g>`;
  if (opts.occupant) s += `<circle cx="${-2}" cy="${y + 6}" r="4" fill="#2A2A2A"/>`;
  if (opts.me) s += `<text x="${-4}" y="1" text-anchor="middle" dominant-baseline="central" font-family="Overpass, Arial, sans-serif" font-weight="900" font-size="10" fill="#FFFFFF">TÚ</text>`;
  return s;
}
function busG() {
  return `<rect x="-60" y="-16" width="120" height="32" rx="5" fill="#E2A21B"/><rect x="48" y="-13" width="9" height="26" rx="2" fill="#BFD3EA"/><rect x="-52" y="-12" width="92" height="4" fill="#C98A0E"/><rect x="-52" y="8" width="92" height="4" fill="#C98A0E"/>`;
}
function vanG() {
  return `<rect x="-28" y="-13" width="56" height="26" rx="5" fill="#F1F1EE"/><rect x="14" y="-10" width="8" height="20" rx="2" fill="#BFD3EA"/><rect x="-24" y="-11" width="34" height="22" rx="2" fill="#E1E1DC"/>`;
}
function ambG() {
  return `<rect x="-30" y="-12" width="60" height="24" rx="5" fill="#FFFFFF" stroke="#C62828" stroke-width="1.5"/><rect x="-6" y="-2" width="12" height="4" fill="#C62828"/><rect x="-2" y="-6" width="4" height="12" fill="#C62828"/><g class="bl"><rect x="14" y="-12" width="6" height="7" fill="#2F7BFF"/><rect x="14" y="5" width="6" height="7" fill="#2F7BFF"/></g>`;
}
function pedG() {
  return `<ellipse cx="0" cy="0" rx="5" ry="8" fill="#7A2E8E"/><circle cx="0" cy="0" r="4" fill="#E7B48F"/>`;
}
function bikeG() {
  return `<rect x="-14" y="-2" width="28" height="4" rx="2" fill="#222222"/><ellipse cx="0" cy="0" rx="6" ry="8" fill="#D2382E"/><circle cx="2" cy="0" r="4" fill="#F2F2F2"/>`;
}
function ballG() {
  return `<circle r="6" fill="#FF7A1A" stroke="#FFFFFF" stroke-width="1.5"/><path d="M-6 0 Q0 -3 6 0" stroke="#FFFFFF" stroke-width="1.2" fill="none"/>`;
}
function doorG() {
  return `<rect x="-17" y="-2" width="17" height="3" rx="1" fill="#8B1E1E"/>`;
}
function dashes(y, x0 = 0, x1 = 400, len = 16, gap = 12, w = 3) {
  let s = ""; for (let x = x0; x < x1; x += len + gap) s += `<rect x="${x}" y="${y - w/2}" width="${len}" height="${w}" fill="${PAL.line}"/>`; return s;
}

const SCENES = {
  pelota: {
    dur: 4.8, poster: 1.2,
    bg: () => `<rect width="400" height="240" fill="${PAL.walk}"/><rect y="48" width="400" height="144" fill="${PAL.road}"/><rect y="46" width="400" height="3" fill="${PAL.curb}"/><rect y="191" width="400" height="3" fill="${PAL.curb}"/>${dashes(104)}`,
    actors: [
      ...[60, 115, 170, 230, 290, 348].map((x, i) => ({ g: carG(["#8C8F93","#B23A3A","#3D6E99","#2F2F2F","#C7C7C2","#5E7B3A"][i]), kf: [[0, x, 174, 0]] })),
      { g: ballG(), kf: [[0, 260, 214, 0], [2.0, 260, 214, 0], [2.6, 260, 178, 180], [3.4, 260, 132, 420], [4.8, 260, 78, 760]] },
      { g: carG("#1F5DB8", { me: 1 }), kf: [[0, -30, 136, 0], [4.8, 205, 136, 0]] }
    ]
  },
  bus: {
    dur: 4.8, poster: 1.2,
    bg: () => `<rect width="400" height="240" fill="${PAL.walk}"/><rect y="48" width="400" height="144" fill="${PAL.road}"/><rect y="46" width="400" height="3" fill="${PAL.curb}"/><rect y="191" width="400" height="3" fill="${PAL.curb}"/>${dashes(120)}<rect x="230" y="200" width="70" height="10" rx="2" fill="#2B6CB0"/><text x="265" y="225" text-anchor="middle" font-family="Overpass, Arial, sans-serif" font-weight="800" font-size="11" fill="#2B3A4A">PARADA</text>`,
    actors: [
      { g: busG(), kf: [[0, 285, 162, 0]] },
      { g: pedG(), kf: [[0, 356, 218, 0], [2.6, 356, 218, 0], [4.8, 356, 166, 0]] },
      { g: carG("#7E7E7E"), kf: [[0, 440, 84, 180], [4.8, 110, 84, 180]] },
      { g: carG("#1F5DB8", { me: 1 }), kf: [[0, -30, 162, 0], [2.6, 110, 162, 0], [4.8, 168, 162, 0]] }
    ]
  },
  puerta: {
    dur: 4.8, poster: 1.2,
    bg: () => `<rect width="400" height="240" fill="${PAL.walk}"/><rect y="48" width="400" height="144" fill="${PAL.road}"/><rect y="46" width="400" height="3" fill="${PAL.curb}"/><rect y="191" width="400" height="3" fill="${PAL.curb}"/>${dashes(104)}`,
    actors: [
      ...[70, 128, 250, 308, 366].map((x, i) => ({ g: carG(["#8C8F93","#2F2F2F","#6B4C8A","#C7C7C2","#3D6E99"][i], { occupant: x === 250 }), kf: [[0, x, 174, 0]] })),
      { g: doorG(), kf: [[0, 258, 163, 0], [3.0, 258, 163, 0], [3.8, 258, 163, 38], [4.8, 258, 163, 42]] },
      { g: carG("#1F5DB8", { me: 1 }), kf: [[0, -30, 140, 0], [4.8, 182, 140, 0]] }
    ]
  },
  ciclista: {
    dur: 4.8, poster: 1.4,
    bg: () => {
      const path = "M -20 125 L 250 125 Q 330 125 368 52 L 402 -20";
      return `<rect width="400" height="240" fill="${PAL.grass}"/><path d="${path}" stroke="${PAL.line}" stroke-width="96" fill="none"/><path d="${path}" stroke="${PAL.road}" stroke-width="90" fill="none"/><path d="M -20 125 L 190 125" stroke="${PAL.line}" stroke-width="3" stroke-dasharray="16 12" fill="none"/><path d="M 190 125 L 250 125 Q 330 125 368 52 L 402 -20" stroke="${PAL.line}" stroke-width="3" fill="none"/>${[[262,22,24],[296,30,20],[288,62,22],[322,8,18],[250,58,16],[318,70,14]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${PAL.tree}"/><circle cx="${x-4}" cy="${y-4}" r="${r*0.55}" fill="${PAL.tree2}"/>`).join("")}<g transform="translate(205 196)"><rect x="-1.5" y="0" width="3" height="22" fill="#666"/><polygon points="0,-18 17,10 -17,10" fill="#FFFFFF" stroke="#C62828" stroke-width="4" stroke-linejoin="round"/><path d="M -5 4 Q 0 -10 5 -4" stroke="#111" stroke-width="2.5" fill="none"/></g>`;
    },
    actors: [
      { g: carG("#B23A3A"), kf: [[0, 410, -40, 118], [3.0, 410, -40, 118], [3.6, 372, 30, 118], [4.2, 330, 92, 150], [4.8, 268, 106, 178]] },
      { g: bikeG(), kf: [[0, 148, 152, 0], [4.8, 214, 152, 0]] },
      { g: carG("#1F5DB8", { me: 1 }), kf: [[0, -30, 146, 0], [4.8, 126, 146, 0]] }
    ]
  },
  retencion: {
    dur: 4.8, poster: 1.2,
    bg: () => `<rect width="400" height="240" fill="${PAL.grass}"/><rect y="30" width="400" height="8" fill="#9DA3A8"/><rect y="40" width="400" height="176" fill="${PAL.road}"/><rect y="44" width="400" height="3" fill="${PAL.line}"/>${dashes(122, 0, 400, 22, 16)}<rect y="196" width="400" height="3" fill="${PAL.line}"/>`,
    actors: [
      { g: carG("#6B4C8A", { haz: 1 }), kf: [[0, 282, 84, 0], [2.4, 328, 84, 0], [4.8, 344, 84, 0]] },
      { g: carG("#C7C7C2", { haz: 1 }), kf: [[0, 306, 160, 0], [2.4, 352, 160, 0], [4.8, 364, 160, 0]] },
      { g: carG("#3D6E99", { haz: 1 }), kf: [[0, 372, 84, 0], [2.4, 392, 84, 0], [4.8, 398, 84, 0]] },
      { g: carG("#1F5DB8", { me: 1 }), kf: [[0, -30, 160, 0], [4.8, 190, 160, 0]] }
    ]
  },
  emergencia: {
    dur: 4.8, poster: 2.4,
    bg: () => `<rect width="400" height="240" fill="${PAL.grass}"/><rect y="22" width="400" height="196" fill="${PAL.road}"/><rect y="26" width="400" height="3" fill="${PAL.line}"/>${dashes(88, 0, 400, 22, 16)}${dashes(150, 0, 400, 22, 16)}<rect y="210" width="400" height="3" fill="${PAL.line}"/><text x="392" y="60" text-anchor="end" font-family="Overpass, Arial, sans-serif" font-weight="800" font-size="10" fill="#E8E8E8">IZQ</text><text x="392" y="122" text-anchor="end" font-family="Overpass, Arial, sans-serif" font-weight="800" font-size="10" fill="#E8E8E8">CENTRAL</text><text x="392" y="184" text-anchor="end" font-family="Overpass, Arial, sans-serif" font-weight="800" font-size="10" fill="#E8E8E8">DCHO</text>`,
    actors: [
      ...[[205,57],[265,57],[325,57],[205,119],[265,119],[325,119],[205,181],[265,181],[325,181],[80,57],[80,181]].map(([x,y],i)=>({ g: carG(["#8C8F93","#B23A3A","#2F2F2F","#C7C7C2","#6B4C8A","#3D6E99","#5E7B3A","#8C8F93","#B23A3A","#C7C7C2","#2F2F2F"][i], { haz: x >= 325 }), kf: [[0, x, y, 0]] })),
      { g: carG("#1F5DB8", { me: 1 }), kf: [[0, 145, 119, 0]] },
      { g: ambG(), kf: [[0, -60, 88, 0], [1.4, -60, 88, 0], [4.8, 28, 88, 0]] }
    ]
  },
  paso: {
    dur: 4.8, poster: 1.2,
    bg: () => `<rect width="400" height="240" fill="${PAL.walk}"/><rect y="48" width="400" height="144" fill="${PAL.road}"/><rect y="46" width="400" height="3" fill="${PAL.curb}"/><rect y="191" width="400" height="3" fill="${PAL.curb}"/>${dashes(120)}${Array.from({length:7},(_,i)=>`<rect x="306" y="${54 + i*19}" width="30" height="10" fill="${PAL.line}"/>`).join("")}<text x="20" y="34" font-family="Overpass, Arial, sans-serif" font-weight="800" font-size="11" fill="#2B3A4A">MISMO SENTIDO EN LOS DOS CARRILES →</text>`,
    actors: [
      { g: vanG(), kf: [[0, 222, 86, 0], [1.6, 266, 86, 0], [2.4, 274, 86, 0]] },
      { g: pedG(), kf: [[0, 322, 30, 0], [2.2, 322, 30, 0], [3.2, 322, 62, 0], [4.8, 322, 98, 0]] },
      { g: carG("#1F5DB8", { me: 1 }), kf: [[0, -30, 158, 0], [4.8, 196, 158, 0]] }
    ]
  }
};

function lerpKF(kf, t) {
  if (t <= kf[0][0]) return kf[0];
  for (let i = 1; i < kf.length; i++) {
    if (t <= kf[i][0]) {
      const a = kf[i - 1], b = kf[i], u = (t - a[0]) / (b[0] - a[0] || 1);
      const e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const k = (a === kf[0] && kf.length === 2) ? u : e;
      return [t, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, (a[3] || 0) + ((b[3] || 0) - (a[3] || 0)) * k];
    }
  }
  return kf[kf.length - 1];
}

function sceneMarkup(name, t) {
  const sc = SCENES[name];
  const acts = sc.actors.map((a, i) => {
    const p = lerpKF(a.kf, t);
    return `<g data-a="${i}" transform="translate(${p[1].toFixed(1)} ${p[2].toFixed(1)}) rotate(${(p[3] || 0).toFixed(1)})">${a.g}</g>`;
  }).join("");
  return `<svg class="scene" viewBox="0 0 400 240" role="img" aria-label="Escena de tráfico vista desde arriba">${sc.bg()}${acts}</svg>`;
}

function playScene(host, name, onEnd) {
  const sc = SCENES[name];
  host.innerHTML = sceneMarkup(name, 0);
  const svg = host.querySelector("svg");
  const groups = Array.from(svg.querySelectorAll("g[data-a]"));
  const blinks = Array.from(svg.querySelectorAll(".bl"));
  const t0 = performance.now();
  let raf = 0, stopped = false;
  function frame(now) {
    if (stopped) return;
    const t = Math.min(sc.dur, (now - t0) / 1000);
    sc.actors.forEach((a, i) => {
      if (a.kf.length < 2) return;
      const p = lerpKF(a.kf, t);
      groups[i].setAttribute("transform", `translate(${p[1].toFixed(1)} ${p[2].toFixed(1)}) rotate(${(p[3] || 0).toFixed(1)})`);
    });
    const on = Math.floor(t / 0.35) % 2 === 0;
    blinks.forEach(b => b.setAttribute("opacity", on ? "1" : "0.15"));
    if (t < sc.dur) raf = requestAnimationFrame(frame);
    else { stopped = true; onEnd && onEnd(); }
  }
  raf = requestAnimationFrame(frame);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}

if (typeof module !== "undefined") module.exports = { signSVG, SCENES, sceneMarkup, lerpKF };
