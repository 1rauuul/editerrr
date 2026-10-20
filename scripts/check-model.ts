import assert from "node:assert/strict";
import {
  appendPhoto,
  clampCrop,
  cropHalf,
  exportWidth,
  halfForCanvas,
  initialCrop,
  removeHalf,
  type Canvas,
} from "../lib/model.ts";

// Cadena de creación: n fotos producen n lienzos y cada foto aparece dos veces.
let canvases: Canvas[] = [];
canvases = appendPhoto(canvases, "selA");
assert.equal(canvases.length, 1);
assert.equal(canvases[0].left.selectionId, "selA");
assert.equal(canvases[0].right, null);

canvases = appendPhoto(canvases, "selB");
assert.equal(canvases.length, 2);
assert.equal(canvases[0].right?.selectionId, "selB");
assert.equal(canvases[1].left.selectionId, "selB");
assert.notEqual(canvases[0].right?.id, canvases[1].left.id);
assert.equal(canvases[1].right, null);

canvases = appendPhoto(canvases, "selC");
assert.equal(canvases.length, 3);
assert.equal(canvases[1].right?.selectionId, "selC");

// La mitad derecha se borra sin confirmación y el lienzo sobrevive.
const afterRight = removeHalf(canvases, canvases[1].id, "right");
assert.equal(afterRight.length, 3);
assert.equal(afterRight[1].right, null);

// La mitad izquierda se lleva el lienzo completo.
const afterLeft = removeHalf(canvases, canvases[1].id, "left");
assert.equal(afterLeft.length, 2);
assert.ok(!afterLeft.some((c) => c.id === canvases[1].id));

// Al agregar con el último lienzo completo se abre uno nuevo sin tocar el anterior.
const broken = removeHalf(canvases, canvases[2].id, "left");
assert.equal(broken.length, 2);
const appended = appendPhoto(broken, "selD");
assert.equal(appended.length, 3);
assert.equal(appended[1].right?.selectionId, "selC");
assert.equal(appended[2].left.selectionId, "selD");

// Una derecha vacía se rellena y se abre el lienzo siguiente.
const filled = appendPhoto(afterRight, "selE");
assert.equal(filled.length, 4);
assert.equal(filled[2].right?.selectionId, "selE");
assert.equal(filled[3].left.selectionId, "selE");

// Reparto de mitades.
assert.equal(halfForCanvas(true, true), "left");
assert.equal(halfForCanvas(false, true), "right");
assert.equal(halfForCanvas(false, false), "left");
assert.equal(halfForCanvas(true, false), "left");

const crop = { x: 10, y: 20, w: 100, h: 125 };
assert.deepEqual(cropHalf(crop, "left"), { x: 10, y: 20, w: 50, h: 125 });
assert.deepEqual(cropHalf(crop, "right"), { x: 60, y: 20, w: 50, h: 125 });
assert.equal(cropHalf(crop, "left").x + cropHalf(crop, "left").w, crop.x + crop.w / 2);

// Encuadre inicial: la región mayor con la proporción pedida, centrada.
const wide = initialCrop(4000, 3000, 0.8);
assert.equal(wide.h, 3000);
assert.equal(wide.w, 2400);
assert.equal(wide.x, 800);
assert.equal(wide.y, 0);

const tall = initialCrop(3000, 4000, 1);
assert.equal(tall.w, 3000);
assert.equal(tall.h, 3000);
assert.equal(tall.x, 0);
assert.equal(tall.y, 500);

// El encuadre nunca deja huecos.
assert.deepEqual(clampCrop({ x: -50, y: -50, w: 100, h: 100 }, 1000, 1000), {
  x: 0,
  y: 0,
  w: 100,
  h: 100,
});
assert.deepEqual(clampCrop({ x: 950, y: 950, w: 100, h: 100 }, 1000, 1000), {
  x: 900,
  y: 900,
  w: 100,
  h: 100,
});

// Ancho de exportación: 2× como máximo, sin inventar detalle.
const sel = (id: string, w: number) => ({ id, photoId: "p" + id, crop: { x: 0, y: 0, w, h: w * 1.25 } });
const photos: Record<string, { id: string; url: string; thumbUrl: string; width: number; height: number }> = {
  pa: { id: "pa", url: "", thumbUrl: "", width: 4000, height: 5000 },
  pb: { id: "pb", url: "", thumbUrl: "", width: 1000, height: 1250 },
};
const selections = { a: sel("a", 4000), b: sel("b", 1000), big: sel("big", 6000) };
assert.equal(
  exportWidth({ id: "c", left: { id: "l", selectionId: "a" }, right: { id: "r", selectionId: "b" } }, selections, photos),
  1000,
);
assert.equal(
  exportWidth({ id: "c", left: { id: "l", selectionId: "big" }, right: null }, selections, photos),
  2160,
);
assert.equal(
  exportWidth({ id: "c", left: { id: "l", selectionId: "b" }, right: null }, selections, photos),
  1000,
);

console.log("modelo ok");
