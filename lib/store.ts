import { create } from "zustand";
import {
  MAX_CANVASES,
  appendPhoto,
  removeHalf,
  uid,
  type Canvas,
  type Crop,
  type Format,
  type Photo,
  type Selection,
} from "./model";
import { clearImageCache } from "./photo";

type State = {
  format: Format | null;
  canvases: Canvas[];
  photos: Record<string, Photo>;
  selections: Record<string, Selection>;
  chooseFormat: (format: Format) => void;
  addPhoto: (photo: Photo, crop: Crop) => void;
  updateCrop: (selectionId: string, crop: Crop) => void;
  remove: (canvasId: string, side: "left" | "right") => void;
  reset: () => void;
};

export const useEditor = create<State>((set) => ({  format: null,
  canvases: [],
  photos: {},
  selections: {},

  chooseFormat: (format) => set({ format }),

  addPhoto: (photo, crop) =>
    set((s) => {
      if (s.canvases.length >= MAX_CANVASES) return s;
      const selectionId = uid();
      return {
        canvases: appendPhoto(s.canvases, selectionId),
        photos: { ...s.photos, [photo.id]: photo },
        selections: { ...s.selections, [selectionId]: { id: selectionId, photoId: photo.id, crop } },
      };
    }),

  updateCrop: (selectionId, crop) =>
    set((s) => ({
      selections: { ...s.selections, [selectionId]: { ...s.selections[selectionId], crop } },
    })),

  remove: (canvasId, side) =>
    set((s) => ({ canvases: removeHalf(s.canvases, canvasId, side) })),

  reset: () =>
    set((s) => {
      Object.values(s.photos).forEach((p) => {
        URL.revokeObjectURL(p.url);
        if (p.thumbUrl !== p.url) URL.revokeObjectURL(p.thumbUrl);
      });
      clearImageCache();
      return { format: null, canvases: [], photos: {}, selections: {} };
    }),
}));

