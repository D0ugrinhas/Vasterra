const ATTR_ALIAS = {
  FOR: "FOR", FORCA: "FOR",
  VIG: "VIG", VIGOR: "VIG",
  DES: "DES", DESTREZA: "DES", AGILIDADE: "DES",
  CONST: "CONST", CONSTITUICAO: "CONST", CONSTITUIÇÃO: "CONST",
  INT: "INT", INTELIGENCIA: "INT", INTELIGÊNCIA: "INT",
  SAB: "SAB", SABEDORIA: "SAB",
  CAR: "CAR", CARISMA: "CAR",
  MENT: "MENT", MENTALIDADE: "MENT",
};

const STATUS_ALIAS = {
  VIT: "VIT", VITALIDADE: "VIT",
  EST: "EST", ESTAMINA: "EST",
  MAN: "MAN", MANA: "MAN",
  SAN: "SAN", SANIDADE: "SAN",
  CONS: "CONS", CONSCIENCIA: "CONS", CONSCIÊNCIA: "CONS",
};

const BODY_ALIAS = {
  OSSOS: "ossos", OSSO: "ossos",
  MUSCULOS: "musculos", MUSCULO: "musculos",
  PELE: "pele",
  SAUDE: "saude",
};

const ESSENCIA_ALIAS = {
  ETER: "Éter", SABEDORIA: "Éter", PUREZA: "Cristal", CRISTAL: "Cristal", FURIA: "Sangue", GULA: "Víscera", INVEJA: "Sombra", SOBERBA: "Ouro", LUXURIA: "Néctar", PREGUICA: "Corrosão", TEMPERANCA: "Água", DILIGENCIA: "Mecânico", PACIENCIA: "Raiz", HUMILDADE: "O Cinza", CARIDADE: "Luz",
};

const sanitize = (s = "") => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normalizeToken = (s = "") => sanitize(s).replace(/[^A-Z0-9]/g, "");

function detectStatusTarget(code, canonical) {
  const suffix = code.slice(canonical.length);
  if (!suffix) return "base";
  if (suffix === "ATUAL" || suffix === "CURRENT") return "current";
  if (suffix === "MAX" || suffix === "MAXIMO") return "max";
  return null;
}


function resolveMechanicalRaw(it = {}) {
  return it.efeitosMecanicos || it.efeitoMecanico || it.efeito || it.valor || "";
}

export function parseMechanicalEffect(raw = "") {
  const cleaned = sanitize(raw).replace(/\s+/g, "").replace(/^DE/, "");
  const m = cleaned.match(/^([+-]?\d+(?:[\.,]\d+)?)(%?)([A-Z0-9_-]+)$/);
  if (!m) return null;

  const value = Number(String(m[1]).replace(",", "."));
  const isPct = m[2] === "%";
  const code = normalizeToken(m[3]);

  const attr = ATTR_ALIAS[code];
  if (attr) return { scope: "atributos", key: attr, value, isPct, target: "base", raw: `${value >= 0 ? "+" : ""}${value}${isPct ? "%" : ""}${attr}` };

  for (const alias of Object.keys(STATUS_ALIAS)) {
    const canonical = STATUS_ALIAS[alias];
    if (!code.startsWith(alias)) continue;
    const target = detectStatusTarget(code, alias);
    if (!target) continue;
    return {
      scope: "status",
      key: canonical,
      value,
      isPct,
      target,
      raw: `${value >= 0 ? "+" : ""}${value}${isPct ? "%" : ""}${canonical}${target === "current" ? "ATUAL" : target === "max" ? "MAX" : ""}`,
    };
  }

  const body = BODY_ALIAS[code];
  if (body) return { scope: "corpo", key: body, value, isPct, target: "base", raw: `${value >= 0 ? "+" : ""}${value}${isPct ? "%" : ""}${code}` };

  const ess = ESSENCIA_ALIAS[code];
  if (ess) return { scope: "essencia", key: ess, value, isPct, target: "base", raw: `${value >= 0 ? "+" : ""}${value}${isPct ? "%" : ""}${ess}` };

  const genericStatus = code.match(/^([A-Z0-9]{2,6})(ATUAL|CURRENT|MAX|MAXIMO)?$/);
  if (genericStatus) {
    const key = genericStatus[1];
    const suffix = genericStatus[2] || "";
    const target = suffix === "ATUAL" || suffix === "CURRENT" ? "current" : (suffix === "MAX" || suffix === "MAXIMO" ? "max" : "base");
    return { scope: "status", key, value, isPct, target, raw: `${value >= 0 ? "+" : ""}${value}${isPct ? "%" : ""}${key}${target === "current" ? "ATUAL" : target === "max" ? "MAX" : ""}` };
  }

  return { scope: "pericias", key: code, value, isPct, target: "base", raw: `${value >= 0 ? "+" : ""}${value}${isPct ? "%" : ""}${code}` };
}

export function parseMechanicalEffects(raw = "") {
  if (Array.isArray(raw)) {
    return raw.flatMap((part) => parseMechanicalEffects(part));
  }
  if (raw && typeof raw === "object") {
    if (typeof raw.raw === "string") return parseMechanicalEffects(raw.raw);
    if (typeof raw.valor === "string") return parseMechanicalEffects(raw.valor);
    if (typeof raw.expr === "string") return parseMechanicalEffects(raw.expr);
  }
  const cleaned = String(raw || "").replace(/"[^"]*"/g, " ");
  return cleaned
    .split(",")
    .map((part) => parseMechanicalEffect(part.trim()))
    .filter(Boolean);
}


export function normalizeEffectList(list = [], source = "Outro") {
  return (list || []).flatMap((it) => {
    if (it?.ativo === false) return [];
    return parseMechanicalEffects(resolveMechanicalRaw(it)).map((parsed) => ({
      id: it.id || Math.random().toString(36).slice(2, 9),
      tipo: parsed.value >= 0 ? "Buff" : "Debuff",
      nome: it.nome || it.titulo || "Efeito",
      efeito: parsed.raw,
      valor: parsed.value,
      origem: source,
      origemDetalhe: it.origemDetalhe || "",
      scope: parsed.scope,
      key: parsed.key,
      isPct: parsed.isPct,
      target: parsed.target,
    }));
  });
}

export function aggregateModifiers(mods = [], scope) {
  const map = {};
  (mods || []).forEach((m) => {
    if (m?.ativo === false) return;
    parseMechanicalEffects(resolveMechanicalRaw(m)).forEach((parsed) => {
      if (!parsed || parsed.scope !== scope || parsed.isPct) return;
      map[parsed.key] = (map[parsed.key] || 0) + parsed.value;
    });
  });
  return map;
}

export function aggregateStatusModifiers(mods = []) {
  const status = {};
  (mods || []).forEach((m) => {
    if (m?.ativo === false) return;
    parseMechanicalEffects(resolveMechanicalRaw(m)).forEach((parsed) => {
      if (!parsed || parsed.scope !== "status" || parsed.isPct) return;
      if (!status[parsed.key]) status[parsed.key] = { base: 0, current: 0, max: 0 };
      status[parsed.key][parsed.target || "base"] += parsed.value;
    });
  });
  return status;
}

export function normalizePericiaKey(label = "") {
  return normalizeToken(label);
}


export function instantiateEffectFromTemplate(template = {}, overrides = {}) {
  return {
    ...template,
    id: overrides.id || Math.random().toString(36).slice(2, 10),
    origemEffectId: template.id || overrides.origemEffectId || "",
    efeitoMecanico: template.efeitoMecanico || template.efeito || template.valor || "",
    ativo: overrides.ativo ?? true,
    rodadaInicio: overrides.rodadaInicio ?? 0,
    duracaoRolada: overrides.duracaoRolada ?? null,
    origemItem: overrides.origemItem || "",
    sinalizar: overrides.sinalizar ?? template.sinalizar ?? true,
    origem: overrides.origem || template.origem || "Efeito",
    origemDetalhe: overrides.origemDetalhe || template.nome || "Caldeirão",
    ...overrides,
  };
}
