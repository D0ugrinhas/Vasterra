import { uid } from "./factories";

export const defaultPrestigioTree = (skill = "") => ({
  skill,
  maxPrestigios: 0,
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
  requires: {
    minSkillLevel: 0,
    requiredNodeIds: [],
    attributes: [],
  },
});

export const normalizePrestigioTree = (tree, skill = "") => {
  const base = defaultPrestigioTree(skill);
  const src = tree || {};
  return {
    ...base,
    ...src,
    skill: src.skill || skill || base.skill,
    maxPrestigios: Math.max(0, Number(src.maxPrestigios || 0)),
    nodes: Array.isArray(src.nodes)
      ? src.nodes.map((n) => ({
          ...defaultPrestigioNode(),
          ...n,
          requires: {
            minSkillLevel: Math.max(0, Number(n?.requires?.minSkillLevel || 0)),
            requiredNodeIds: Array.isArray(n?.requires?.requiredNodeIds) ? n.requires.requiredNodeIds : [],
            attributes: Array.isArray(n?.requires?.attributes)
              ? n.requires.attributes.map((a) => ({ attr: a?.attr || "FOR", min: Math.max(0, Number(a?.min || 0)) }))
              : [],
          },
        }))
      : [],
    links: Array.isArray(src.links)
      ? src.links.filter((l) => l?.from && l?.to).map((l) => ({ from: l.from, to: l.to }))
      : [],
  };
};

export const canActivatePrestigioNode = ({ node, unlockedIds, tree, ficha, skillName }) => {
  if (!node) return false;
  const req = node.requires || {};
  const level = Number(ficha?.pericias?.[skillName] || 0);
  if (level < Number(req.minSkillLevel || 0)) return false;
  const unlockedSet = new Set(unlockedIds || []);
  if ((req.requiredNodeIds || []).some((id) => !unlockedSet.has(id))) return false;
  if ((req.attributes || []).some((a) => Number(ficha?.atributos?.[a.attr]?.val || 0) < Number(a.min || 0))) return false;

  const hasIncoming = (tree?.links || []).some((l) => l.to === node.id);
  if (!hasIncoming) return true;
  return (tree?.links || []).some((l) => l.to === node.id && unlockedSet.has(l.from));
};

export const getEffectivePrestigio = ({ tree, ficha, unlockedIds, skillName }) => {
  const normalized = normalizePrestigioTree(tree, skillName);
  const activeIds = [];
  const selected = Array.isArray(unlockedIds) ? unlockedIds : [];
  normalized.nodes.forEach((node) => {
    if (!selected.includes(node.id)) return;
    if (canActivatePrestigioNode({ node, unlockedIds: selected, tree: normalized, ficha, skillName })) {
      activeIds.push(node.id);
    }
  });
  return {
    tree: normalized,
    activeIds,
    activeNodes: normalized.nodes.filter((n) => activeIds.includes(n.id)),
  };
};
