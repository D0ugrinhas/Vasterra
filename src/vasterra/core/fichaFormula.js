import { aggregateModifiers, aggregateResourceModifiers, aggregateStatusModifiers } from "./effects";
import { evaluateMathExpression } from "./mathExpression";

export const normalizeFichaCode = (raw = "") => String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");

function parseFichaNumber(value, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const normalized = raw.replace(",", ".").replace(/[^0-9.+-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildFichaExpressionVars(ficha = {}, bonuses = {}) {
  const vars = {};
  const put = (key, value) => {
    const code = String(key || "").trim();
    const n = Number(value);
    if (!code || !Number.isFinite(n)) return;
    vars[code] = n;
    const compact = code.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}_]/gu, "");
    if (compact) vars[compact] = n;
    if (compact) vars[compact.toUpperCase()] = n;
  };

  const allEffects = Array.isArray(bonuses?.effects)
    ? bonuses.effects
    : Array.isArray(ficha?.modificadores?.efeitos)
      ? ficha.modificadores.efeitos
      : [];
  const attributeMods = bonuses?.attributeMods || aggregateModifiers(allEffects, "atributos");
  const skillMods = bonuses?.skillMods || aggregateModifiers(allEffects, "pericias");
  const statusMods = bonuses?.statusMods || aggregateStatusModifiers(allEffects);
  const resourceMods = bonuses?.resourceMods || aggregateResourceModifiers(allEffects);

  Object.entries(ficha?.atributos || {}).forEach(([k, v]) => {
    const code = normalizeFichaCode(k);
    const base = Number(v?.val || 0);
    put(k, base + Number(attributeMods?.[code] || 0));
  });
  Object.entries(ficha?.pericias || {}).forEach(([k, v]) => {
    const code = normalizeFichaCode(k);
    put(k, Number(v || 0) + Number(skillMods?.[code] || 0));
  });
  Object.entries(ficha?.status || {}).forEach(([k, v]) => {
    const code = normalizeFichaCode(k);
    const mod = statusMods?.[code] || { base: 0, current: 0, max: 0 };
    const baseShift = Number(mod.base || 0) + Number(mod.current || 0);
    const maxShift = Number(mod.base || 0) + Number(mod.max || 0) + Math.max(0, Number(mod.current || 0));
    put(code, Number(v?.val || 0) + baseShift);
    put(`${code}MAX`, Number(v?.max || 1) + maxShift);
  });
  Object.entries(ficha?.recursos || {}).forEach(([k, v]) => {
    const total = Number(v?.total || 0);
    const used = Number(v?.usado || 0);
    put(k, Math.max(0, total - used));
    put(`${k}MAX`, total);
  });
  (ficha?.combate?.recursos || []).forEach((r) => {
    const code = normalizeFichaCode(r?.codigo || r?.nome);
    if (!code) return;
    const mod = resourceMods?.[code] || { current: 0, max: 0 };
    put(code, Number(r?.atual || 0) + Number(mod.current || 0));
    put(`${code}MAX`, Number(r?.total || 0) + Number(mod.max || 0) + Math.max(0, Number(mod.current || 0)));
  });

  const info = ficha?.informacoes || {};
  put("ALTURA", parseFichaNumber(info.altura, 0));
  put("PESO", parseFichaNumber(info.peso, 0));

  return vars;
}

export function evaluateFichaFormula(expr, fallback, ficha, constraints = {}) {
  const vars = buildFichaExpressionVars(ficha);
  return evaluateMathExpression(expr, {
    fallback,
    min: constraints.min ?? -Infinity,
    max: constraints.max ?? Infinity,
    precision: constraints.precision ?? 4,
    variables: vars,
  });
}
