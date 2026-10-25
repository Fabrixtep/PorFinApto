# Por Fin Apto · código fuente

Esta rama guarda lo necesario para regenerar la web. La web publicada está en la rama `main`.

- `data.js`, `data2.js`, `data3.js`, `data4.js`: banco de preguntas, temas, chuletas y permisos.
- `scenes.js`: señales (SVG) y vídeos de percepción del riesgo.
- `app.js` y `page.html`: la app del test.
- `site/`: configuración (`site.json`), estilos, favicon y las guías (`site/guias/*.html`).
- `build.py`: genera `por-fin-apto.html` (versión de un solo archivo).
- `build_web.py`: genera `web/app/` (versión web instalable).
- `build_site.js`: genera la portada, las guías, los exámenes, las páginas legales, el sitemap y comprueba los enlaces.

## Regenerar la web

1. Copia en `web/` el contenido de la rama `main` (necesitas `web/fonts/` y `web/icons/`).
2. Ejecuta: `python3 build.py && python3 build_web.py && node build_site.js`
3. Publica el contenido de `web/` (sin `LEEME.txt`) en la rama `main`.

Si cambias la app, sube la versión del service worker en `build_web.py` (`pfa-v4` → `pfa-v5`…).
