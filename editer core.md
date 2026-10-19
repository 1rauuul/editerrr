# Resumen de decisiones del proyecto

## 1. Objetivo

Construir una PWA que permita seleccionar fotos del dispositivo, elegir un encuadre de cada una y combinarlas en lienzos divididos en dos mitades verticales. Los lienzos se generan durante un único flujo de edición y después se exportan como imágenes.

No se trata de generación con IA ni de un editor libre de capas.

## 2. Plataforma y stack acordado

- **Plataforma:** PWA, priorizando su uso desde el teléfono.
- **Framework:** Next.js con React.
- **Lenguaje:** TypeScript.
- **Estado temporal:** Zustand.
- **Composición y exportación:** Canvas 2D del navegador.
- **Capa PWA:** manifest y service worker; la estrategia concreta de caché queda pendiente.

React Native, Expo y Skia fueron alternativas iniciales, pero no forman parte del stack elegido para esta versión.

## 3. Privacidad y alcance de la sesión

- Las fotos originales, sus recortes y los lienzos generados no se suben a ninguna nube ni servidor.
- La selección, edición y composición de imágenes se realizan localmente en el navegador.
- Esta versión no requiere backend, cuentas de usuario ni sincronización.
- El trabajo se realiza en un único flujo; no se incluye guardado ni recuperación de proyectos entre sesiones.
- IndexedDB queda fuera del MVP.
- La carga inicial de la PWA y sus actualizaciones son distintas del procesamiento de fotos: no implican subir imágenes.

## 4. Formatos del lienzo

El usuario podrá elegir entre:

| Proporción | Uso previsto por el usuario |
| --- | --- |
| 4:5 | Publicaciones de Instagram |
| 1:1 | Publicaciones cuadradas |
| 9:16 | Historias de Instagram o publicaciones de TikTok |

Estos usos describen el objetivo del producto, no una validación de requisitos actuales de esas plataformas.

Cada mitad ocupa el 50% del ancho y el 100% de la altura del lienzo. Por tanto, el marco de recorte corresponde a media página, no a la proporción del lienzo completo.

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

La conversación ha utilizado el mismo recorte en las dos apariciones de una selección. Debe confirmarse antes de implementar si se pretende repetir exactamente el encuadre o utilizar secciones contiguas de la foto.

## 6. Reglas de ocupación y eliminación

### Estados válidos

- `[ A | vacío ]`
- `[ A | B ]`

### Estados no permitidos

- `[ vacío | B ]`: ningún lienzo existente puede tener la mitad izquierda vacía.
- `[ vacío | vacío ]`: un lienzo completamente vacío no debe conservarse.

### Eliminación confirmada

- Se pueden eliminar apariciones de mitades.
- Eliminar una aparición no elimina las otras apariciones de la misma foto.
- Si se elimina la mitad izquierda del último lienzo cuando su derecha está vacía, también se elimina ese lienzo.

Ejemplo principal:

```text
Antes:
Lienzo 1: [ A | B ]
Lienzo 2: [ B | vacío ]

Eliminar B del lienzo 2:
Lienzo 1: [ A | B ]
```

### Reglas propuestas, pendientes de confirmar

- Eliminar una mitad derecha conserva el lienzo con su mitad izquierda.
- No permitir eliminar aisladamente una mitad izquierda si la derecha está ocupada; ofrecer eliminar el lienzo completo.
- Si se agrega una foto cuando el último lienzo está completo porque se eliminó el lienzo provisional siguiente, iniciar un nuevo lienzo sin modificar el anterior.

## 7. Modelo de estado propuesto

Guardar explícitamente los lienzos, en lugar de reconstruirlos siempre como parejas consecutivas. Así, una mitad eliminada no reaparece al recalcular la composición.

Separar tres conceptos:

1. **Foto original:** archivo seleccionado desde el dispositivo.
2. **Selección:** encuadre elegido dentro de la foto.
3. **Instancia de mitad:** aparición de una selección en un espacio concreto de un lienzo.

```ts
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

La mitad izquierda es obligatoria en el modelo; la derecha es opcional. Las fotos y selecciones se almacenarían aparte dentro del estado temporal de la sesión.

## 8. Exportación

### Confirmado

- El usuario debe poder exportar los lienzos generados en el flujo.
- La exportación no requiere subir las imágenes a un servidor.

### Propuesta técnica

- Renderizar cada lienzo al tamaño de salida mediante Canvas 2D.
- Generar los archivos mediante `canvas.toBlob()`.
- No depender de una captura de pantalla de la vista previa.
- Mantener la sesión después de exportar para permitir correcciones y nuevas exportaciones.

### Pendiente de definir

- Exportar individualmente, todos a la vez o ambas opciones.
- Formato de archivo: PNG, JPEG o ambos.
- Resolución final.
- Forma de entregar varios archivos: descargas individuales, ZIP u otra alternativa.
- Permitir exportar lienzos incompletos y definir el fondo de la mitad vacía. Se propuso blanco, pero no se confirmó.

## 9. Propuestas de experiencia de uso aún no confirmadas

- Elegir el formato antes de comenzar a recortar.
- Ajustar el encuadre moviendo y ampliando la foto detrás de un marco fijo.
- Impedir que el encuadre deje espacios sin cubrir.
- Descartar el trabajo no exportado al cerrar o recargar, e informar al usuario de esta limitación.
- Separar las acciones «Exportar lienzos» y «Nuevo proyecto».

## 10. Fuera del alcance de la primera versión

- Almacenamiento de fotos en la nube.
- Cuentas y autenticación.
- Backend para procesar imágenes.
- Sincronización entre dispositivos.
- Persistencia y recuperación de proyectos.
- Generación de imágenes mediante IA.
- Editor libre de capas tipo Canva.

## 11. Validación inicial propuesta

Probar en el teléfono objetivo este recorrido:

1. Seleccionar el formato.
2. Importar A y elegir su encuadre.
3. Importar B y verificar `[A | B]` y `[B | vacío]`.
4. Eliminar la aparición de B del segundo lienzo y comprobar que desaparece ese lienzo sin alterar el primero.
5. Exportar el resultado.
6. Comprobar que ninguna operación envía fotos a servicios externos.

La instalación PWA, el comportamiento offline y la exportación en los navegadores objetivo también deben validarse. No se ha elegido todavía una biblioteca específica para el recorte ni una implementación concreta del service worker.
