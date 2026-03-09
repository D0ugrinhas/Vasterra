export function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function getMechanicalText(effect = {}) {
  if (Array.isArray(effect?.efeitosMecanicos) && effect.efeitosMecanicos.length) return effect.efeitosMecanicos.join(", ");
  return effect?.efeitoMecanico || effect?.efeito || effect?.valor || "";
}

export function parseDurationRounds(effect) {
  if (effect?.duracaoRolada != null && Number(effect?.duracaoRolada) > 0) {
    return Math.max(0, Math.floor(Number(effect?.duracaoRolada)));
  }
  const raw = String(effect?.duracaoExpressao ?? effect?.duracao ?? effect?.duracaoRodadas ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.toLowerCase().replace(/rodadas?/g, "").replace(/\s+/g, "").replace(/,/g, ".");
  if (!normalized) return 0;
  if (/^[+-]?\d+(\.\d+)?$/.test(normalized)) return Math.max(0, Math.floor(Number(normalized)));
  const diceRegex = /(\d*)d(\d+)/g;
  let expr = normalized;
  let m;
  while ((m = diceRegex.exec(normalized)) !== null) {
    const qtd = Math.max(1, Number(m[1] || 1));
    const faces = Math.max(2, Number(m[2] || 2));
    let total = 0;
    for (let i = 0; i < qtd; i += 1) total += 1 + Math.floor(Math.random() * faces);
    expr = expr.replace(m[0], String(total));
  }
  if (!/^[0-9+\-*/().]+$/.test(expr)) return 0;
  try {
    const val = Function(`"use strict"; return (${expr});`)();
    return Math.max(0, Math.floor(Number(val) || 0));
  } catch {
    return 0;
  }
}

export function evaluateStatusFormula(expression, context = {}) {
  const raw = String(expression || "").trim();
  if (!raw) return null;
  let normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\^/g, "**");
  for (let i = 0; i < 4; i += 1) normalized = normalized.replace(/([a-z_][a-z0-9_]*)\s+([a-z_][a-z0-9_]*)/g, "$1_$2");
  if (!/^[a-z0-9_+\-*/().\s]+$/.test(normalized)) return null;
  const vars = {
    x: Number(context.x || 0),
    ...Object.fromEntries(Object.entries(context.vars || {}).map(([k, v]) => [String(k).toLowerCase(), Number(v || 0)])),
  };
  try {
    const keys = Object.keys(vars);
    const values = keys.map((k) => vars[k]);
    const fn = Function(...keys, `return (${normalized});`);
    const value = Number(fn(...values));
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function buildFormulaVars(ficha = {}, statusState = {}) {
  const vars = {};
  Object.entries(ficha?.atributos || {}).forEach(([k, v]) => {
    const num = Number((v && typeof v === "object") ? (v.val ?? v.valor ?? 0) : (v || 0));
    vars[String(k).toLowerCase()] = Number.isFinite(num) ? num : 0;
    vars[String(k).toUpperCase()] = Number.isFinite(num) ? num : 0;
  });
  const attrAlias = {
    forca: "for", força: "for", vigor: "vig", destreza: "des", agilidade: "des",
    constituicao: "const", constituição: "const", inteligencia: "int", inteligência: "int",
    sabedoria: "sab", carisma: "car", mentalidade: "ment", vontade: "vont",
  };
  Object.entries(attrAlias).forEach(([alias, source]) => { vars[alias] = Number(vars[source] || 0); });

  Object.entries(ficha?.pericias || {}).forEach(([k, v]) => {
    const key = String(k).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const num = Number((v && typeof v === "object") ? (v.val ?? v.valor ?? 0) : (v || 0));
    if (key) vars[key] = Number.isFinite(num) ? num : 0;
    vars[String(k)] = Number.isFinite(num) ? num : 0;
  });

  Object.entries(statusState || {}).forEach(([k, v]) => {
    vars[k.toLowerCase()] = Number(v?.val || 0);
    vars[k.toUpperCase()] = Number(v?.val || 0);
    vars[`${k.toLowerCase()}max`] = Number(v?.max || 0);
    vars[`${k.toUpperCase()}MAX`] = Number(v?.max || 0);
  });
  return vars;
}
