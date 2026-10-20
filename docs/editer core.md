# Resumen de decisiones del proyecto

## 1. Objetivo

Construir una PWA que permita seleccionar fotos del dispositivo, elegir un encuadre de cada una y combinarlas en lienzos divididos en dos mitades verticales. Los lienzos se generan durante un único flujo de edición y después se guardan como imágenes para publicarlas en redes sociales.

No se trata de generación con IA ni de un editor libre de capas.

## 2. Plataforma y stack acordado

- **Plataforma:** PWA, priorizando su uso desde el teléfono.
- **Framework:** Next.js con React.
- **Lenguaje:** TypeScript.
- **Estado temporal:** Zustand.
- **Composición y exportación:** Canvas 2D del navegador.
- **Capa PWA:** manifest y service worker con estrategia cache-first para el app shell.

React Native, Expo y Skia fueron alternativas iniciales, pero no forman parte del stack elegido para esta versión.

Estado: MVP implementado. Dónde está cada cosa:

- `lib/model.ts`: lógica pura (cadena de lienzos, borrado, geometría del recorte). Se comprueba con `npm run check`.
- `lib/store.ts`: estado temporal con Zustand.
- `lib/photo.ts`: miniaturas y decodificación de imágenes.
- `lib/render.ts`: composición en Canvas 2D y guardado en JPEG.
- `components/`: pantallas (formato, lista de lienzos, modal de recorte).
- `app/manifest.ts` y `public/sw.js`: capa PWA.

Pendiente de validar en un Android real.

## 3. Privacidad y alcance de la sesión

- Las fotos originales, sus recortes y los lienzos generados no se suben a ninguna nube ni servidor.
- La selección, edición y composición de imágenes se realizan localmente en el navegador.
- Esta versión no requiere backend, cuentas de usuario ni sincronización.
- El trabajo se realiza en un único flujo; no se incluye guardado ni recuperación de proyectos entre sesiones.
- IndexedDB queda fuera del MVP.
- La carga inicial de la PWA y sus actualizaciones son distintas del procesamiento de fotos: no implican subir imágenes.

## 4. Formatos del lienzo

El usuario elige un formato **una sola vez, antes de empezar**. Ese formato se aplica a todos los lienzos y se bloquea al agregar la primera foto.

| Formato | Uso previsto | Tamaño de exportación |
| --- | --- | --- |
| 4:5 | Publicaciones de Instagram | 1080 × 1350 |
| 1:1 | Publicaciones cuadradas | 1080 × 1080 |
| 9:16 | Historias de Instagram y TikTok | 1080 × 1920 |

El marco de recorte tiene la **proporción del lienzo completo** (1:1, 4:5 o 9:16), no la de media página. El recorte elegido se divide después en dos mitades verticales que se reparten entre lienzos.

Restricción de plataforma: el feed de Instagram admite como máximo 3:4 de alto, así que un lienzo 9:16 no es válido como publicación de feed; está destinado a Historias y a TikTok.

## 5. Creación encadenada de lienzos

1. La primera selección, A, ocupa la mitad izquierda del primer lienzo.
2. Al agregar B, su selección completa la mitad derecha del primero y aparece como mitad izquierda de un nuevo lienzo.
3. Al agregar C, se completa el segundo y se inicia un tercero.
4. Si no se agrega otra foto, la mitad derecha del último lienzo permanece vacía.

```text
Solo A:
Lienzo 1: [ A | vacío ]

Después de agregar B:
Lienzo 1: [ A | B ]
Lienzo 2: [ B | vacío ]

Después de agregar C:
Lienzo 1: [ A | B ]
Lienzo 2: [ B | C ]
Lienzo 3: [ C | vacío ]
```

### Reparto de mitades

Cada foto se recorta una sola vez, al cargarla, con el marco del lienzo completo. Ese recorte se divide en dos mitades verticales y cada aparición muestra una:

- La aparición como **mitad derecha** de un lienzo muestra la **mitad izquierda** del recorte.
- La aparición como **mitad izquierda** de un lienzo muestra la **mitad derecha** del recorte.

Así, el borde derecho de un lienzo y el borde izquierdo del siguiente son las dos mitades de la misma foto: al avanzar en el carrusel, la foto continúa.

Excepción: la **primera foto**, que solo aparece a la izquierda del lienzo 1, muestra su **mitad izquierda**, que es el inicio del recorrido. Su mitad derecha no se usa.

La **última foto** sigue la regla general: su mitad izquierda queda a la derecha del último lienzo completo (el final del carrusel) y su mitad derecha a la izquierda del lienzo provisional.

La mitad que muestra cada aparición se deduce de su posición y no se guarda en el estado.

### Regla de agregado

La cadena solo se aplica al **crear**. Al agregar una foto:

- Si el último lienzo tiene la mitad derecha vacía, se rellena con la nueva foto y se añade un lienzo nuevo con esa foto a la izquierda.
- Si el último lienzo está completo, se añade un lienzo nuevo con esa foto a la izquierda.

Un borrado puede romper la cadena, y esta **no se repara** al recalcular. Los lienzos posteriores conservan lo que tengan.

Límite: **35 lienzos** (el tope de un carrusel de TikTok). Al llegar, se desactiva el botón de agregar foto con un aviso. Instagram admite 20 por carrusel, así que una serie de más de 20 no se puede publicar completa allí.

## 6. Reglas de ocupación y eliminación

### Estados válidos

- `[ A | vacío ]`
- `[ A | B ]`

### Estados no permitidos

- `[ vacío | B ]`: ningún lienzo puede tener la mitad izquierda vacía. La mitad izquierda es la «cabeza» del lienzo.
- `[ vacío | vacío ]`: un lienzo completamente vacío no se conserva.

### Eliminación

- **Mitad derecha:** se elimina la aparición y el lienzo conserva su mitad izquierda (`[ A | B ]` → `[ A | vacío ]`). Sin confirmación.
- **Mitad izquierda:** elimina el lienzo completo, incluida su mitad derecha. Se muestra un popup de confirmación advirtiendo que se borrará el lienzo entero. No existe la acción «borrar solo la mitad izquierda».
- Eliminar una aparición no elimina las otras apariciones de la misma foto. Borrar la izquierda del lienzo 1 borra su derecha, pero esa foto sobrevive como cabeza del lienzo 2.

Ejemplo:

```text
Antes:
Lienzo 1: [ A | B ]
Lienzo 2: [ B | vacío ]

Eliminar la instancia izquierda de B en el lienzo 2 (con popup):
Lienzo 1: [ A | B ]
```

## 7. Modelo de estado

Guardar explícitamente los lienzos, en lugar de reconstruirlos siempre como parejas consecutivas. Así, una mitad eliminada no reaparece al recalcular la composición.

Separar tres conceptos:

1. **Foto original:** archivo seleccionado desde el dispositivo.
2. **Selección:** encuadre con proporción de lienzo completo. Una por foto.
3. **Instancia de mitad:** aparición de una selección en un espacio concreto de un lienzo.

```ts
type Selection = {
  id: string;
  photoId: string;
  crop: { offsetX: number; offsetY: number; scale: number };
};

type HalfInstance = {
  id: string;
  selectionId: string;
};

type Canvas = {
  id: string;
  left: HalfInstance;
  right: HalfInstance | null;
};

type Project = {
  id: string;
  format: "4:5" | "1:1" | "9:16";
  canvases: Canvas[];
};
```

La mitad izquierda es obligatoria en el modelo; la derecha es opcional. Las fotos y selecciones se almacenan aparte, dentro del estado temporal de la sesión.

Las fotos se guardan como `File`/`Blob` y solo se decodifican al recortar o al exportar. Decodificar 35 originales a la vez no cabe en la memoria de un teléfono de gama media.

## 8. Exportación

- Un botón **Guardar** por lienzo, que descarga esa imagen individualmente. Se guarda el lienzo compuesto ya montado (sus dos mitades y el fondo), no las fotos originales. No hay exportación por lotes ni ZIP en esta versión.
- En móvil la imagen se entrega con la hoja nativa de compartir (guardar en Fotos/Files o enviar a Instagram). `download` no funciona en la PWA de iOS ni en varios navegadores in-app.
- Composición a tamaño de salida mediante Canvas 2D; nunca una captura de la vista previa.
- Salida **JPEG**, calidad ~90, sRGB, sin metadatos, a 1080 px de ancho (1350 / 1080 / 1920 de alto según el formato).
- La mitad vacía se rellena de **blanco** (JPEG no admite transparencia).
- Nombre de archivo: `edtr-<ddMM>-<aleatorio>.jpg`, con la fecha de guardado y 4 caracteres aleatorios; por ejemplo `edtr-1910-a7f2.jpg`.
- La sesión se mantiene después de guardar, para permitir correcciones y nuevas exportaciones.

Cada foto ocupa media página: a 1080 px de ancho, cada mitad se ve a 540 px en la red social. Ese es el techo real de nitidez, no el tamaño del archivo exportado.

Alternativas descartadas por ahora: ZIP (dependencia extra) y exportación por lotes. Se puede reconsiderar si aparece la necesidad.

## 9. Experiencia de uso

- El formato se elige antes de recortar y queda bloqueado.
- Los lienzos se muestran en horizontal, uno por pantalla, como los slides de una publicación: se desliza lateralmente y hay contador y flechas.
- Al agregar una foto, la vista salta al lienzo nuevo.
- El marco de recorte muestra la división en mitades, para que el usuario vea dónde se cortará la foto.
- El encuadre se ajusta moviendo y ampliando la foto detrás del marco fijo.
- El encuadre no puede dejar espacios sin cubrir: nunca se puede alejar por debajo del marco.
- Se advierte al usuario, al cerrar o recargar con cambios sin guardar, que el trabajo se perderá.
- Acciones separadas: **Guardar** cada lienzo y **Nuevo proyecto**.

## 10. Fuera del alcance de la primera versión

- Almacenamiento de fotos en la nube.
- Cuentas y autenticación.
- Backend para procesar imágenes.
- Sincronización entre dispositivos.
- Persistencia y recuperación de proyectos.
- Generación de imágenes mediante IA.
- Editor libre de capas tipo Canva.
- Reordenar lienzos: el orden de creación es el orden de publicación.

## 11. Validación

Recorrido en el teléfono objetivo (Android/Chrome principal; iOS/Safari como comprobación secundaria):

1. Elegir el formato.
2. Importar A y elegir su encuadre.
3. Importar B y verificar `[A | B]` y `[B | vacío]`, con la mitad izquierda de B a la derecha del lienzo 1 y la mitad derecha de B a la izquierda del lienzo 2.
4. Intentar eliminar la instancia izquierda de B en el lienzo 2: debe aparecer el popup y, al confirmar, desaparecer el lienzo sin alterar el primero.
5. Guardar un lienzo y comprobar que la imagen descargada tiene el tamaño del formato, el fondo blanco donde corresponde y el reparto de mitades esperado.
6. Abrir DevTools → Network y comprobar que ninguna operación envía imágenes a servicios externos.

También deben validarse la instalación de la PWA, el comportamiento offline y la exportación en los navegadores objetivo.

## 12. Pendientes

- Los archivos guardados el mismo día se ordenan por el sufijo aleatorio, no por el orden del carrusel; el orden real se conserva por la hora de descarga.
- Verificar el peso real de los JPEG en un dispositivo; si se usan anuncios de TikTok, el tope es 500 KB por imagen y habría que ajustar la calidad.
- Decidir si exportar a 2× aporta nitidez tras la recompresión de Instagram (a 1080 el resultado ya es el nativo de la app).
- Medir en el teléfono el peso y la calidad de los JPEG guardados, y ajustar la calidad si hacen falta menos de 500 KB por imagen.
