# edtr

PWA para elegir fotos del dispositivo, encuadrarlas y montarlas en lienzos de dos
mitades verticales, listos para publicar en Instagram o TikTok. Todo ocurre en el
navegador: ninguna foto sale del dispositivo.

Las decisiones del proyecto están en [docs/editer core.md](<docs/editer core.md>).

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000. La cámara del teléfono sirve para probar imágenes
reales; para probar desde el móvil en la red local hace falta HTTPS o un túnel,
porque la PWA no se instala sobre `http://` en una IP.

## Comprobaciones

```bash
npm run check   # lógica pura de la cadena de lienzos y del recorte
npm run lint
npm run build
```

## Estructura

- `lib/model.ts`: tipos y lógica pura (cadena, borrado, geometría del recorte).
- `lib/store.ts`: estado temporal con Zustand.
- `lib/photo.ts`: miniaturas y carga de imágenes.
- `lib/render.ts`: composición en Canvas 2D y guardado en JPEG.
- `components/`: pantallas y modal de recorte.
- `app/manifest.ts`, `public/sw.js`: capa PWA.
