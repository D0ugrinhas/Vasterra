import { normalizeEffectList } from "./effects";

export function getEntryItem(entry, arsenal) {
  if (!entry) return null;
  return entry.tipo === "arsenal" ? arsenal.find((a) => a.id === entry.itemId) : entry.item;
}

export function calcVastosTotal(v = {}) {
  return (Number(v.cobre) || 0) + (Number(v.prata) || 0) * 100 + (Number(v.ouro) || 0) * 10000 + (Number(v.platina) || 0) * 1000000;
}

export function inventoryItemModifiers(inventario = [], arsenal = []) {
  return inventario.flatMap((entry) => {
    const item = getEntryItem(entry, arsenal);
    if (!item) return [];
    const qtd = Math.max(1, Number(entry.qtd) || 1);
    const baseEffects = [...(item.bonus || []), ...(item.efeitos || [])];
    const effects = normalizeEffectList(baseEffects, "Item");
    return effects.map((ef) => ({ ...ef, valor: ef.valor * qtd, efeito: `${ef.valor * qtd >= 0 ? "+" : ""}${ef.valor * qtd}${ef.key}`, origemDetalhe: item.nome }));
  });
}
