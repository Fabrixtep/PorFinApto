import pathlib, json, re
d=pathlib.Path(__file__).parent; W=d/'web'/'app'; W.mkdir(parents=True, exist_ok=True)
page=(d/'page.html').read_text()
for ph,f in [('/*__DATA__*/','data.js'),('/*__DATA2__*/','data2.js'),('/*__DATA3__*/','data3.js'),('/*__DATA4__*/','data4.js'),('/*__SCENES__*/','scenes.js'),('/*__APP__*/','app.js')]:
    page=page.replace(ph,(d/f).read_text())
page=page.replace('const WEB = false;','const WEB = true;',1)
page=page.replace('<h1>Por fin apto</h1>','<h1><a href="../" style="color:inherit;text-decoration:none">Por fin apto</a></h1>',1)
cfg=json.load(open(d/'site'/'site.json')); BASE=('https://'+cfg['domain']+'/') if cfg.get('domain') else cfg['base'].rstrip('/')+'/'
page=page.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
page=re.sub(r'<link rel="preconnect"[^>]*>\n','',page)
page=re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n','',page)
FONTS=[("Atkinson Hyperlegible",400,"atkinson-hyperlegible-latin-400-normal"),("Atkinson Hyperlegible",700,"atkinson-hyperlegible-latin-700-normal"),
("Overpass",600,"overpass-latin-600-normal"),("Overpass",800,"overpass-latin-800-normal"),("Overpass",900,"overpass-latin-900-normal"),
("Overpass Mono",500,"overpass-mono-latin-500-normal"),("Overpass Mono",700,"overpass-mono-latin-700-normal"),("Kalam",700,"kalam-latin-700-normal")]
ff="".join(f'@font-face{{font-family:"{n}";font-style:normal;font-weight:{w};font-display:swap;src:url(../fonts/{f}.woff2) format("woff2")}}\n' for n,w,f in FONTS)
i=page.index('</style>')+len('</style>')
head,body=page[:i],page[i:]
HEADX=('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
 '<meta name="theme-color" content="#0B4EA2">\n<meta name="description" content="Prepara el examen teórico de cualquier permiso de conducir (AM, A1, A2, B, B+E, C, C+E, D, D+E…) con el método del profe: diagnósticos, emboscadas con tus fallos y por qué fallas. App no oficial.">\n'
 '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="../icons/icon-192.png" type="image/png">\n<link rel="apple-touch-icon" href="../icons/apple-touch-icon.png">\n<link rel="canonical" href="__BASE__app/">\n'
 f'<style>{ff}:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}img{{max-width:100%}}</style>\n')
SW='<script>if("serviceWorker" in navigator){addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));}</script>\n'
(W/'index.html').write_text(('<!doctype html>\n<html lang="es">\n<head>\n'+HEADX+head+'\n</head>\n<body>'+body+'\n'+SW+'</body>\n</html>\n').replace('__BASE__',BASE))
man={"name":"Por Fin Apto · Teórico de conducir","short_name":"Por Fin Apto","description":"El método del profe para aprobar el teórico de todos los permisos de conducir: diagnósticos, emboscadas con tus fallos y por qué fallas. App no oficial.",
 "lang":"es","dir":"ltr","id":"./","start_url":"./","scope":"./","display":"standalone","orientation":"portrait",
 "background_color":"#F1F3F5","theme_color":"#0B4EA2","categories":["education"],
 "icons":[{"src":"../icons/icon-192.png","sizes":"192x192","type":"image/png","purpose":"any"},{"src":"../icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any"},{"src":"../icons/maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
(W/'manifest.webmanifest').write_text(json.dumps(man,ensure_ascii=False,indent=2))
assets=["./","index.html","manifest.webmanifest","../privacidad.html","../icons/icon-192.png","../icons/icon-512.png","../icons/maskable-512.png","../icons/apple-touch-icon.png"]+[f"../fonts/{f}.woff2" for _,_,f in FONTS]
sw=f"""const V = "pfa-v4";
const ASSETS = {json.dumps(assets)};
self.addEventListener("install", e => {{ e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); }});
self.addEventListener("activate", e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener("fetch", e => {{
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (r.mode === "navigate") {{
    e.respondWith(fetch(r).then(res => {{ const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }})
      .catch(() => caches.match(r).then(h => h || caches.match("index.html"))));
    return;
  }}
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {{ if (res.ok) {{ const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }} return res; }})));
}});
"""
(W/'sw.js').write_text(sw)
print("ok", len((W/'index.html').read_text()))
