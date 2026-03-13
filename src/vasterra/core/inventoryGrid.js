import { uid } from "./factories";

export const GRID_ROWS = 8;
export const GRID_COLS = 10;

export const BASE_SHAPES = {
  "1x1": [[0, 0]],
  "1x2": [[0, 0], [0, 1]],
  "2x1": [[0, 0], [1, 0]],
  "1x3": [[0, 0], [0, 1], [0, 2]],
  "3x1": [[0, 0], [1, 0], [2, 0]],
  "2x2": [[0, 0], [0, 1], [1, 0], [1, 1]],
  "2x3": [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
  L: [[0, 0], [1, 0], [2, 0], [2, 1]],
  T: [[0, 0], [0, 1], [0, 2], [1, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
};

export const GRID_TEMPLATES = [
  { id: "g_t1", nome: "Adaga", categoria: "arma", shapeKey: "2x1", cor: "#9a9aaa", peso: 1, valor: 15, partes: ["left_hand", "right_hand"], deg: true, durMax: 100 },
  { id: "g_t2", nome: "Espada Longa", categoria: "arma", shapeKey: "3x1", cor: "#b0b8c0", peso: 4, valor: 100, partes: ["left_hand", "right_hand"], deg: true, durMax: 200 },
  { id: "g_t3", nome: "Escudo", categoria: "escudo", shapeKey: "2x2", cor: "#8b6040", peso: 3, valor: 40, partes: ["left_hand"], deg: true, durMax: 120 },
  { id: "g_t4", nome: "Poção Vida", categoria: "consumivel", shapeKey: "1x1", cor: "#c03048", peso: 0.5, valor: 30, partes: [], maxQtd: 10, usavel: true },
  { id: "g_t5", nome: "Elmo de Ferro", categoria: "armadura", shapeKey: "2x2", cor: "#808898", peso: 3, valor: 60, partes: ["head"], deg: true, durMax: 120 },
  { id: "g_t6", nome: "Peitoral", categoria: "armadura", shapeKey: "2x3", cor: "#686878", peso: 8, valor: 200, partes: ["torso"], deg: true, durMax: 250 },
];

export function normalizeGridState(raw = {}) {
  return {
    rows: Number(raw?.rows || GRID_ROWS),
    cols: Number(raw?.cols || GRID_COLS),
    items: Array.isArray(raw?.items) ? raw.items : [],
  };
}

export function rotateShapeCW(shape = []) {
  const rotated = shape.map(([row, col]) => [col, -row]);
  const minRow = Math.min(...rotated.map(([r]) => r));
  const minCol = Math.min(...rotated.map(([, c]) => c));
  return rotated.map(([r, c]) => [r - minRow, c - minCol]);
}

export function getShape(shapeKey, rotation = 0) {
  let shape = BASE_SHAPES[shapeKey] || BASE_SHAPES["1x1"];
  for (let i = 0; i < (rotation % 4); i += 1) shape = rotateShapeCW(shape);
  return shape;
}

export function shapeBounds(shape = []) {
  return {
    rows: Math.max(...shape.map(([r]) => r), 0) + 1,
    cols: Math.max(...shape.map(([, c]) => c), 0) + 1,
  };
}

export function buildGridOccupancy(items = []) {
  const occ = {};
  (items || []).forEach((item) => {
    if (!item?.anchor) return;
    const shape = getShape(item.shapeKey, item.rotation || 0);
    shape.forEach(([dr, dc]) => {
      occ[`${item.anchor.row + dr},${item.anchor.col + dc}`] = item.id;
    });
  });
  return occ;
}

export function canPlaceGridItem(item, row, col, occupancy = {}, rows = GRID_ROWS, cols = GRID_COLS, excludeId = null) {
  const shape = getShape(item.shapeKey, item.rotation || 0);
  for (const [dr, dc] of shape) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const occ = occupancy[`${r},${c}`];
    if (occ && occ !== excludeId) return false;
  }
  return true;
}

export function autoPlaceGridItem(item, items = [], rows = GRID_ROWS, cols = GRID_COLS) {
  const occ = buildGridOccupancy(items);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (canPlaceGridItem(item, r, c, occ, rows, cols, item.id)) return { row: r, col: c };
    }
  }
  return null;
}

export function makeGridItemFromTemplate(template, patch = {}) {
  if (!template) return null;
  return {
    id: uid(),
    templateId: template.id,
    nome: template.nome,
    categoria: template.categoria,
    shapeKey: template.shapeKey || "1x1",
    rotation: 0,
    cor: template.cor || "#888",
    peso: Number(template.peso || 0),
    valor: Number(template.valor || 0),
    partes: Array.isArray(template.partes) ? template.partes : [],
    deg: Boolean(template.deg),
    durMax: template.durMax ? Number(template.durMax) : null,
    dur: template.durMax ? Number(template.durMax) : null,
    maxQtd: template.maxQtd ? Number(template.maxQtd) : null,
    qtd: template.maxQtd ? Math.max(1, Number(patch.qtd || 1)) : null,
    usavel: Boolean(template.usavel),
    efeitoUso: template.efeitoUso || "",
    equipadoEm: null,
    anchor: null,
    ...patch,
  };
}
