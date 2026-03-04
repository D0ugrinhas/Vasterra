const normalizeKey = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const keyFromFicha = (ficha, key) => {
  const clean = normalizeKey(key);
  if (!clean) return 0;

  const attrPair = Object.entries(ficha?.atributos || {}).find(([k]) => normalizeKey(k) === clean);
  if (attrPair) return Number(attrPair[1]?.val || 0);

  const periciaPair = Object.entries(ficha?.pericias || {}).find(([k]) => normalizeKey(k) === clean);
  if (periciaPair) return Number(periciaPair[1] || 0);

  if (clean === "nivel" || clean === "level") {
    const total = Object.values(ficha?.pericias || {}).reduce((acc, v) => acc + Number(v || 0), 0);
    return Math.max(1, Math.floor(total / 10));
  }

  return 0;
};

const evaluateExpr = (expr, vars, ficha) => {
  const raw = String(expr || "").trim();
  if (!raw) return 0;

  const pct = raw.match(/^(\d+(?:[\.,]\d+)?)\s*%\s*(.+)$/);
  if (pct) {
    const rate = Number(String(pct[1]).replace(",", "."));
    const baseToken = String(pct[2] || "").trim();
    const base = Object.prototype.hasOwnProperty.call(vars, baseToken)
      ? Number(vars[baseToken] || 0)
      : keyFromFicha(ficha, baseToken);
    return Math.floor(base * (rate / 100));
  }

  if (/^-?\d+(?:[\.,]\d+)?$/.test(raw)) return Number(raw.replace(",", "."));

  if (Object.prototype.hasOwnProperty.call(vars, raw)) return Number(vars[raw] || 0);
  return keyFromFicha(ficha, raw);
};

export function resolveSkillCode(descricaoCode = "", ficha) {
  const lines = String(descricaoCode || "").split("\n");
  const vars = {};
  const resolved = [];

  for (const line of lines) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.+)\s*$/);
    if (!m) continue;
    const key = m[1];
    const expr = m[2];
    vars[key] = evaluateExpr(expr, vars, ficha);
    resolved.push(`${key} = ${vars[key]}`);
  }

  const resolvedCode = lines.map((line) => {
    let next = line;
    Object.entries(vars).forEach(([k, v]) => {
      next = next.replace(new RegExp(`\\b${k}\\b`, "g"), String(v));
    });
    return next;
  }).join("\n");

  return {
    vars,
    resolved,
    resolvedCode,
  };
}
