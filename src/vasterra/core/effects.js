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

const ESSENCIA_ALIAS = {
  ETER: "Éter", SABEDORIA: "Éter", PUREZA: "Cristal", CRISTAL: "Cristal", FURIA: "Sangue", GULA: "Víscera", INVEJA: "Sombra", SOBERBA: "Ouro", LUXURIA: "Néctar", PREGUICA: "Corrosão", TEMPERANCA: "Água", DILIGENCIA: "Mecânico", PACIENCIA: "Raiz", HUMILDADE: "O Cinza", CARIDADE: "Luz",
};

const sanitize = (s = "") => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function parseMechanicalEffect(raw = "") {
  const cleaned = sanitize(raw).replace(/\s+/g, "").replace(/^DE/, "");
  const m = cleaned.match(/^([+-]?\d+(?:[\.,]\d+)?)(%?)([A-Z0-9_-]+)$/);
  if (!m) return null;
  const value = Number(String(m[1]).replace(",", "."));
  const isPct = m[2] === "%";
  const code = m[3];

  const attr = ATTR_ALIAS[code];
  if (attr) return { scope: "atributos", key: attr, value, isPct, raw: `${value >= 0 ? "+" : ""}${value}${isPct ? "%" : ""}${attr}` };
  const status = STATUS_ALIAS[code];
  if (status) return { scope: "status", key: status, value, isPct, raw: `${value >= 0 ? "+" : ""}${value}${isPct ? "%" : ""}${status}` };
  const ess = ESSENCIA_ALIAS[code];
  if (ess) return { scope: "essencia", key: ess, value, isPct, raw: `${value >= 0 ? "+" : ""}${value}%${ess}` };
  return { scope: "pericias", key: code, value, isPct, raw: `${value >= 0 ? "+" : ""}${value}${isPct ? "%" : ""}${code}` };
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
      efeito: parsed.raw,
      valor: parsed.value,
      origem: source,
      origemDetalhe: it.origemDetalhe || "",
      scope: parsed.scope,
      key: parsed.key,
      isPct: parsed.isPct,
    }];
  });
}

export function aggregateModifiers(mods = [], scope) {
  const map = {};
  (mods || []).forEach((m) => {
    const parsed = parseMechanicalEffect(m.efeito || m.valor || "");
    if (!parsed || parsed.scope !== scope || parsed.isPct) return;
    map[parsed.key] = (map[parsed.key] || 0) + parsed.value;
  });
  return map;
}

export function normalizePericiaKey(label = "") {
  return sanitize(label).replace(/[^A-Z0-9]/g, "");
}
