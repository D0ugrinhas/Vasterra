import { uid } from "./factories";

export const EXTRA_CONDITION_TYPES = ["atributo", "pericia", "item", "efeito", "narrativo"];

export const defaultExtraCondition = () => ({
  id: uid(),
  type: "atributo",
  key: "FOR",
  min: 0,
  text: "",
});

export const defaultPrestigioTree = (skill = "") => ({
  skill,
  maxPrestigios: 0,
  tags: [],
  centralNodeId: "",
  nodes: [],
  links: [],
});

export const defaultPrestigioNode = () => ({
  id: uid(),
  x: 180,
  y: 140,
  nome: "Nova Estrela",
  descricao: "",
  efeitoNarrativo: "",
  isChoiceGate: false,
  requires: {
    minSkillLevel: 0,
    requiredNodeIds: [],
    attributes: [],
    extra: [],
  },
});

const normalizeExtra = (c) => ({
  ...defaultExtraCondition(),
  ...c,
  min: Math.max(0, Number(c?.min || 0)),
  type: EXTRA_CONDITION_TYPES.includes(c?.type) ? c.type : "atributo",
});

export const normalizePrestigioTree = (tree, skill = "") => {
  const base = defaultPrestigioTree(skill);
  const src = tree || {};
  return {
    ...base,
    ...src,
    skill: src.skill || skill || base.skill,
    maxPrestigios: Math.max(0, Number(src.maxPrestigios || 0)),
    tags: Array.isArray(src.tags) ? src.tags : [],
    centralNodeId: String(src.centralNodeId || ""),
    nodes: Array.isArray(src.nodes)
      ? src.nodes.map((n) => ({
          ...defaultPrestigioNode(),
          ...n,
          isChoiceGate: !!n?.isChoiceGate,
          requires: {
            minSkillLevel: Math.max(0, Number(n?.requires?.minSkillLevel || 0)),
            requiredNodeIds: Array.isArray(n?.requires?.requiredNodeIds) ? n.requires.requiredNodeIds : [],
            attributes: Array.isArray(n?.requires?.attributes)
              ? n.requires.attributes.map((a) => ({ attr: a?.attr || "FOR", min: Math.max(0, Number(a?.min || 0)) }))
              : [],
            extra: Array.isArray(n?.requires?.extra) ? n.requires.extra.map(normalizeExtra) : [],
          },
        }))
      : [],
    links: Array.isArray(src.links)
      ? src.links.filter((l) => l?.from && l?.to).map((l) => ({ id: l.id || uid(), from: l.from, to: l.to }))
      : [],
  };
};

const hasChoiceBranchConflict = ({ node, tree, unlockedSet }) => {
  const incoming = (tree.links || []).filter((l) => l.to === node.id).map((l) => l.from);
  for (const fromId of incoming) {
    const parent = (tree.nodes || []).find((n) => n.id === fromId);
    if (!parent?.isChoiceGate || !unlockedSet.has(parent.id)) continue;
    const siblings = (tree.links || []).filter((l) => l.from === fromId).map((l) => l.to).filter((id) => id !== node.id);
    if (siblings.some((sib) => unlockedSet.has(sib))) return true;
  }
  return false;
};

const checkExtraCondition = (cond, ficha) => {
  if (!cond) return true;
  if (cond.type === "narrativo") return true;
  if (cond.type === "atributo") return Number(ficha?.atributos?.[cond.key]?.val || 0) >= Number(cond.min || 0);
  if (cond.type === "pericia") return Number(ficha?.pericias?.[cond.key] || 0) >= Number(cond.min || 0);
  if (cond.type === "item") {
    const itemNames = (ficha?.inventario || []).map((x) => String(x?.item?.nome || "").toLowerCase());
    return itemNames.includes(String(cond.key || "").toLowerCase());
  }
  if (cond.type === "efeito") {
    const effects = (ficha?.modificadores?.efeitos || []).filter((e) => e?.ativo !== false).map((e) => String(e?.nome || e?.origemDetalhe || "").toLowerCase());
    return effects.includes(String(cond.key || "").toLowerCase());
  }
  return true;
};

export const canActivatePrestigioNode = ({ node, unlockedIds, tree, ficha, skillName }) => {
  if (!node) return false;
  const req = node.requires || {};
  const level = Number(ficha?.pericias?.[skillName] || 0);
  if (level < Number(req.minSkillLevel || 0)) return false;
  const unlockedSet = new Set(unlockedIds || []);
  if ((req.requiredNodeIds || []).some((id) => !unlockedSet.has(id))) return false;
  if ((req.attributes || []).some((a) => Number(ficha?.atributos?.[a.attr]?.val || 0) < Number(a.min || 0))) return false;
  if ((req.extra || []).some((c) => !checkExtraCondition(c, ficha))) return false;

  const hasIncoming = (tree?.links || []).some((l) => l.to === node.id);
  if (hasIncoming && !(tree?.links || []).some((l) => l.to === node.id && unlockedSet.has(l.from))) return false;
  if (hasChoiceBranchConflict({ node, tree, unlockedSet })) return false;
  return true;
};

export const getEffectivePrestigio = ({ tree, ficha, unlockedIds, skillName }) => {
  const normalized = normalizePrestigioTree(tree, skillName);
  const selected = Array.isArray(unlockedIds) ? unlockedIds : [];
  const activeIds = normalized.nodes.filter((node) => selected.includes(node.id) && canActivatePrestigioNode({ node, unlockedIds: selected, tree: normalized, ficha, skillName })).map((n) => n.id);
  return {
    tree: normalized,
    activeIds,
    activeNodes: normalized.nodes.filter((n) => activeIds.includes(n.id)),
  };
};
