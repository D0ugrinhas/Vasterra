import { uid } from "../../../core/factories";

export const NODE_TYPES = ["Recurso", "Barra de Status", "Valor", "Math", "Condicionais", "Color picker", "Comentário", "Dado", "Lógico"];
export const SHAPES = ["square", "circle", "diamond", "triangle", "hex"];

export const defaultCombatState = () => ({
  rodadaAtual: 0,
  abaAtiva: "recursos",
  lembretes: [],
  nodeLinks: [],
  recursos: [
    { id: uid(), nome: "ACO", cor: "#2ecc71", max: 2, atual: 2, descricao: "", slotShape: "square", x: 40, y: 40 },
    { id: uid(), nome: "MOV", cor: "#3498db", max: 1, atual: 1, descricao: "", slotShape: "square", x: 300, y: 40 },
  ],
  statusNodes: [],
  genericNodes: [],
});

export function defaultResourceForm() { return { nome: "NOVO", cor: "#95a5a6", max: 1, atual: 1, descricao: "", slotShape: "square", x: 120, y: 120 }; }
export function defaultStatusForm() { return { nome: "Novo Status", sigla: "NOV", cor: "#f39c12", base: 10, max: 10, val: 10, x: 120, y: 240 }; }
export function defaultGenericForm(kind = "Valor") {
  if (kind === "Valor") return { nodeType: "value", label: "Valor", value: 0, sourcePath: "", x: 520, y: 120 };
  if (kind === "Math") return { nodeType: "math", label: "Math", op: "+", x: 520, y: 220 };
  if (kind === "Condicionais") return { nodeType: "conditional", label: "Cond", cmp: ">", trueValue: 1, falseValue: 0, x: 520, y: 320 };
  if (kind === "Comentário") return { nodeType: "comment", label: "Comentário", text: "", x: 520, y: 420 };
  if (kind === "Dado") return { nodeType: "dice", label: "Dado", qty: 1, faces: 20, bonus: 0, critMin: 20, critMax: 20, critValue: 1, failValue: -1, lastRoll: 0, x: 520, y: 520 };
  if (kind === "Lógico") return { nodeType: "logic", label: "Lógico", logic: "if", ifTrue: 1, ifFalse: 0, x: 520, y: 620 };
  return { nodeType: "color", label: "Cor", color: "#95a5a6", x: 520, y: 720 };
}

export function getFichaValueByPath(ficha, path) {
  if (!path) return 0;
  if (path.startsWith("status.")) {
    const [_, sig, field] = path.split(".");
    return Number(ficha?.status?.[sig]?.[field] || 0);
  }
  if (path.startsWith("atributos.")) {
    const [_, sig, field] = path.split(".");
    return Number(ficha?.atributos?.[sig]?.[field] || 0);
  }
  if (path.startsWith("pericias.")) {
    const [_, key] = path.split(".");
    return Number(ficha?.pericias?.[key] || 0);
  }
  return 0;
}

export function toAllNodes(state) {
  return [
    ...(state.recursos || []).map((x) => ({ ...x, kind: "resource" })),
    ...(state.statusNodes || []).map((x) => ({ ...x, kind: "status" })),
    ...(state.genericNodes || []).map((x) => ({ ...x, kind: "generic" })),
  ];
}

export function getInputPorts(node) {
  if (node.kind === "resource") return ["max", "atual", "cor"];
  if (node.kind === "status") return ["base", "max", "val", "cor"];
  if (node.kind === "generic" && node.nodeType === "value") return ["value"];
  if (node.kind === "generic" && node.nodeType === "math") return ["a", "b"];
  if (node.kind === "generic" && node.nodeType === "conditional") return ["a", "b", "trueValue", "falseValue"];
  if (node.kind === "generic" && node.nodeType === "comment") return ["value"];
  if (node.kind === "generic" && node.nodeType === "dice") return ["qty", "faces", "bonus", "critMin", "critMax", "critValue", "failValue"];
  if (node.kind === "generic" && node.nodeType === "logic") return ["a", "b", "ifTrue", "ifFalse"];
  return [];
}

export function getOutputPorts(node) {
  if (node.kind === "resource") return ["value", "max", "cor"];
  if (node.kind === "status") return ["value", "base", "max", "cor", "zero"];
  if (node.kind === "generic" && ["value", "math", "conditional"].includes(node.nodeType)) return ["value"];
  if (node.kind === "generic" && node.nodeType === "color") return ["cor"];
  if (node.kind === "generic" && node.nodeType === "dice") return ["value", "crit"];
  if (node.kind === "generic" && node.nodeType === "logic") return ["value"];
  return [];
}

export function canLink(fromNode, fromPort, toNode, toPort) {
  if (!getOutputPorts(fromNode).includes(fromPort) || !getInputPorts(toNode).includes(toPort)) return false;
  const numericOut = ["value", "base", "max", "zero", "crit"].includes(fromPort);
  const colorOut = fromPort === "cor";
  if (toPort === "cor") return colorOut;
  return numericOut;
}

export function evaluateNodeOutputs(state, ficha) {
  const nodes = toAllNodes(state);
  const links = state.nodeLinks || [];
  const outputs = {};

  const findSourceValue = (toId, toPort) => {
    const link = links.find((l) => l.to.id === toId && l.to.port === toPort);
    if (!link) return undefined;
    return outputs[link.from.id]?.[link.from.port];
  };

  for (let pass = 0; pass < 5; pass += 1) {
    nodes.forEach((n) => {
      if (n.kind === "resource") {
        outputs[n.id] = {
          value: Number(findSourceValue(n.id, "atual") ?? n.atual ?? 0),
          max: Number(findSourceValue(n.id, "max") ?? n.max ?? 0),
          cor: String(findSourceValue(n.id, "cor") ?? n.cor ?? "#95a5a6"),
        };
        return;
      }
      if (n.kind === "status") {
        const base = Number(findSourceValue(n.id, "base") ?? n.base ?? 0);
        const max = Math.max(1, Number(findSourceValue(n.id, "max") ?? n.max ?? 1));
        const value = Number(findSourceValue(n.id, "val") ?? n.val ?? base);
        outputs[n.id] = {
          value: Math.max(0, Math.min(max, value)),
          base,
          max,
          cor: String(findSourceValue(n.id, "cor") ?? n.cor ?? "#f39c12"),
          zero: value <= 0 ? 1 : 0,
        };
        return;
      }
      if (n.nodeType === "value") {
        const linked = findSourceValue(n.id, "value");
        const v = linked ?? (n.sourcePath ? getFichaValueByPath(ficha, n.sourcePath) : Number(n.value || 0));
        outputs[n.id] = { value: Number(v || 0) };
        return;
      }
      if (n.nodeType === "math") {
        const a = Number(findSourceValue(n.id, "a") || 0);
        const b = Number(findSourceValue(n.id, "b") || 0);
        const op = n.op || "+";
        outputs[n.id] = { value: op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : (b === 0 ? 0 : a / b) };
        return;
      }
      if (n.nodeType === "conditional") {
        const a = Number(findSourceValue(n.id, "a") || 0);
        const b = Number(findSourceValue(n.id, "b") || 0);
        const trueValue = Number(findSourceValue(n.id, "trueValue") ?? n.trueValue ?? 0);
        const falseValue = Number(findSourceValue(n.id, "falseValue") ?? n.falseValue ?? 0);
        const ok = n.cmp === ">" ? a > b : n.cmp === "<" ? a < b : a === b;
        outputs[n.id] = { value: ok ? trueValue : falseValue };
        return;
      }
      if (n.nodeType === "color") {
        outputs[n.id] = { cor: n.color || "#95a5a6" };
        return;
      }
      if (n.nodeType === "comment") {
        outputs[n.id] = { value: Number(findSourceValue(n.id, "value") || 0) };
        return;
      }

      if (n.nodeType === "logic") {
        const a = Number(findSourceValue(n.id, "a") || 0);
        const b = Number(findSourceValue(n.id, "b") || 0);
        const ifTrue = Number(findSourceValue(n.id, "ifTrue") ?? n.ifTrue ?? 1);
        const ifFalse = Number(findSourceValue(n.id, "ifFalse") ?? n.ifFalse ?? 0);
        const op = n.logic || "if";
        const cond = op === "or" ? (a > 0 || b > 0)
          : op === "xor" ? ((a > 0) !== (b > 0))
          : op === "and" ? (a > 0 && b > 0)
          : op === "else" ? !(a > 0)
          : op === "not" ? !(a > 0)
          : a > b;
        outputs[n.id] = { value: cond ? ifTrue : ifFalse };
        return;
      }
      if (n.nodeType === "dice") {
        const qty = Math.max(1, Math.floor(Number(findSourceValue(n.id, "qty") ?? n.qty ?? 1)));
        const faces = Math.max(2, Math.floor(Number(findSourceValue(n.id, "faces") ?? n.faces ?? 20)));
        const bonus = Number(findSourceValue(n.id, "bonus") ?? n.bonus ?? 0);
        const critMin = Math.floor(Number(findSourceValue(n.id, "critMin") ?? n.critMin ?? 20));
        const critMax = Math.floor(Number(findSourceValue(n.id, "critMax") ?? n.critMax ?? 20));
        const critValue = Number(findSourceValue(n.id, "critValue") ?? n.critValue ?? 1);
        const failValue = Number(findSourceValue(n.id, "failValue") ?? n.failValue ?? -1);
        const roll = Number(n.lastRoll ?? 0);
        const crit = roll >= critMin && roll <= critMax ? critValue : (roll === 1 ? failValue : 0);
        outputs[n.id] = { value: roll + bonus, crit };
      }
    });
  }

  return outputs;
}
