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

export function buildFichaExpressionVars(ficha = {}) {
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

  Object.entries(ficha?.atributos || {}).forEach(([k, v]) => put(k, Number(v?.val || 0)));
  Object.entries(ficha?.pericias || {}).forEach(([k, v]) => put(k, Number(v || 0)));
  Object.entries(ficha?.status || {}).forEach(([k, v]) => {
    const code = normalizeFichaCode(k);
    put(code, Number(v?.val || 0));
    put(`${code}MAX`, Number(v?.max || 1));
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
    put(code, Number(r?.atual || 0));
    put(`${code}MAX`, Number(r?.total || 0));
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
