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

const sanitize = (s = "") => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function parseMechanicalEffect(raw = "") {
  const txt = sanitize(raw).replace(/\s+/g, "");
  const m = txt.match(/^([+-]?\d+(?:[\.,]\d+)?)([A-Z0-9_-]+)$/);
  if (!m) return null;
  const value = Number(String(m[1]).replace(",", "."));
  const code = m[2];
  const attr = ATTR_ALIAS[code];
  if (attr) return { scope: "atributos", key: attr, value };
  const status = STATUS_ALIAS[code];
  if (status) return { scope: "status", key: status, value };
  return { scope: "pericias", key: code, value };
}

export function normalizeEffectList(list = [], source = "Outro") {
  return (list || []).flatMap((it) => {
    if (!it?.ativo) return [];
    const parsed = parseMechanicalEffect(it.valor || it.efeito || "");
    if (!parsed) return [];
    return [{
      id: it.id || Math.random().toString(36).slice(2, 9),
      tipo: parsed.value >= 0 ? "Buff" : "Debuff",
      nome: it.nome || it.titulo || "Efeito",
      efeito: `${parsed.value >= 0 ? "+" : ""}${parsed.value}${parsed.key}`,
      valor: parsed.value,
      origem: source,
      origemDetalhe: it.origemDetalhe || "",
      scope: parsed.scope,
      key: parsed.key,
    }];
  });
}

export function aggregateModifiers(mods = [], scope) {
  const map = {};
  (mods || []).forEach((m) => {
    const parsed = parseMechanicalEffect(m.efeito || m.valor || "");
    if (!parsed || parsed.scope !== scope) return;
    map[parsed.key] = (map[parsed.key] || 0) + parsed.value;
  });
  return map;
}

export function normalizePericiaKey(label = "") {
  return sanitize(label).replace(/[^A-Z0-9]/g, "");
}
