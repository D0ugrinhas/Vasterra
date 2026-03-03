import React, { useMemo, useRef, useState } from "react";
import { uid } from "../../../core/factories";
import { instantiateEffectFromTemplate } from "../../../core/effects";
import { makeDefaultEffect } from "../../caldeirao/EffectForgeEditor";
import { Modal } from "../../shared/components";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";

class NodeBase {
  constructor(data = {}) { this.data = data; }
  output() { return null; }
  static canLink(type, field, sourceType) {
    if (["max", "atual", "val", "cor"].includes(field)) return ["value", "math", "conditional", "color"].includes(sourceType);
    return false;
  }
}
class GenericValueNode extends NodeBase { output() { return Number(this.data.value || 0); } }
class MathNode extends NodeBase { output(ctx) { const a = Number(ctx?.[this.data.inA] ?? 0); const b = Number(ctx?.[this.data.inB] ?? 0); const op = this.data.op || "+"; if (op === "+") return a + b; if (op === "-") return a - b; if (op === "*") return a * b; if (op === "/") return b === 0 ? 0 : a / b; return 0; } }
class ConditionalNode extends NodeBase { output(ctx) { const left = Number(ctx?.[this.data.inA] ?? 0); const right = Number(ctx?.[this.data.inB] ?? 0); const ok = this.data.cmp === ">" ? left > right : this.data.cmp === "<" ? left < right : left === right; return ok ? Number(this.data.trueValue || 0) : Number(this.data.falseValue || 0); } }
class ColorPickerNode extends NodeBase { output() { return this.data.color || "#95a5a6"; } }

const defaultCombate = () => ({
  rodadaAtual: 0,
  abaAtiva: "recursos",
  lembretes: [],
  recursos: [
    { id: uid(), nome: "ACO", cor: "#2ecc71", max: 2, atual: 2, descricao: "", slotIconMode: "shape", slotShape: "square", x: 40, y: 40, links: {} },
    { id: uid(), nome: "MOV", cor: "#3498db", max: 1, atual: 1, descricao: "", slotIconMode: "shape", slotShape: "square", x: 280, y: 40, links: {} },
    { id: uid(), nome: "REA", cor: "#e74c3c", max: 1, atual: 1, descricao: "", slotIconMode: "shape", slotShape: "square", x: 520, y: 40, links: {} },
    { id: uid(), nome: "ESF", cor: "#8b0000", max: 1, atual: 1, descricao: "", slotIconMode: "shape", slotShape: "square", x: 760, y: 40, links: {} },
  ],
  statusNodes: [],
  genericNodes: [],
});

const EFFECT_TARGETS = ["Portador", "Alvo", "Área", "Condição", "Todos"];
const SHAPES = ["square", "circle", "diamond", "triangle", "hex"];
const NODE_TYPES = ["Recurso", "Barra de Status", "Valor", "Math", "Condicionais", "Color picker"];

function parseDice(expr = "") {
  const m = String(expr).trim().match(/^(\d+)d(\d+)$/i);
  if (!m) return null;
  return { n: Number(m[1]), d: Number(m[2]) };
}
function rollDice(expr = "") {
  const parsed = parseDice(expr);
  if (!parsed) return null;
  let total = 0;
  for (let i = 0; i < parsed.n; i += 1) total += 1 + Math.floor(Math.random() * parsed.d);
  return total;
}
function slotShapeStyle(shape, color, active) {
  const base = { width: 20, height: 20, border: `1px solid ${color}`, background: active ? color : "#151515", opacity: active ? 1 : 0.35, boxShadow: active ? `0 0 8px ${color}99` : "none", transition: "all .12s" };
  if (shape === "circle") return { ...base, borderRadius: "50%" };
  if (shape === "diamond") return { ...base, borderRadius: 3, transform: "rotate(45deg)" };
  if (shape === "triangle") return { ...base, clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)", borderRadius: 0 };
  if (shape === "hex") return { ...base, clipPath: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)" };
  return { ...base, borderRadius: 5 };
}

function defaultResourceForm() { return { nome: "NOVO", cor: "#95a5a6", max: 1, atual: 1, descricao: "", slotIconMode: "shape", slotShape: "square", slotIconUrl: "", slotIconData: "", x: 120, y: 120, links: {} }; }
function defaultStatusForm() { return { nome: "Novo Status", sigla: "NOV", cor: "#f39c12", base: 10, max: 10, val: 10, x: 120, y: 240, links: {} }; }
function defaultGenericForm(kind = "Valor") {
  if (kind === "Valor") return { nodeType: "value", label: "Valor", value: 0, x: 420, y: 120 };
  if (kind === "Math") return { nodeType: "math", label: "Math", op: "+", inA: "", inB: "", x: 420, y: 220 };
  if (kind === "Condicionais") return { nodeType: "conditional", label: "Cond", cmp: ">", inA: "", inB: "", trueValue: 1, falseValue: 0, x: 420, y: 320 };
  return { nodeType: "color", label: "Cor", color: "#95a5a6", x: 420, y: 420 };
}

export function TabCombate({ ficha, onUpdate, efeitosCaldeirao = [], onOpenCaldeirao, onNotify }) {
  const state = useMemo(() => ({ ...defaultCombate(), ...(ficha.combate || {}) }), [ficha.combate]);
  const [collapsed, setCollapsed] = useState({});
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragItemId, setDragItemId] = useState(null);
  const [hoverSlot, setHoverSlot] = useState({});
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const [resourceEditorOpen, setResourceEditorOpen] = useState(false);
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const [genericEditorOpen, setGenericEditorOpen] = useState(false);
  const [resourceEditorData, setResourceEditorData] = useState(defaultResourceForm());
  const [statusEditorData, setStatusEditorData] = useState(defaultStatusForm());
  const [genericEditorData, setGenericEditorData] = useState(defaultGenericForm());
  const [editingId, setEditingId] = useState(null);
  const dragRef = useRef(null);
  const fileInputRef = useRef(null);
  const charEffects = ficha.modificadores?.efeitos || [];

  const saveCombate = (next) => onUpdate({ combate: { ...state, ...next } });
  const saveEffects = (next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), efeitos: next } });
  const updateResourceById = (id, patch) => saveCombate({ recursos: state.recursos.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const updateStatusById = (id, patch) => saveCombate({ statusNodes: (state.statusNodes || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const updateGenericById = (id, patch) => saveCombate({ genericNodes: (state.genericNodes || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const setTab = (abaAtiva) => saveCombate({ abaAtiva });
  const setRodada = (rodadaAtual) => saveCombate({ rodadaAtual: Math.max(0, rodadaAtual) });

  const genericOutputs = useMemo(() => {
    const out = {};
    (state.genericNodes || []).forEach((n) => {
      try {
        if (n.nodeType === "value") out[n.id] = new GenericValueNode(n).output();
        else if (n.nodeType === "math") out[n.id] = new MathNode(n).output(out);
        else if (n.nodeType === "conditional") out[n.id] = new ConditionalNode(n).output(out);
        else if (n.nodeType === "color") out[n.id] = new ColorPickerNode(n).output();
      } catch {
        out[n.id] = 0;
      }
    });
    return out;
  }, [state.genericNodes]);

  const resolveLinked = (obj, field) => {
    const src = obj?.links?.[field];
    if (!src) return obj[field];
    if (!(src in genericOutputs)) return obj[field];
    return genericOutputs[src];
  };

  const proxRodada = () => {
    const recursos = (state.recursos || []).map((r) => ({ ...r, atual: Number(resolveLinked(r, "max") ?? r.max) }));
    saveCombate({ rodadaAtual: state.rodadaAtual + 1, recursos });
    onNotify?.("Nova rodada: recursos resetados para o máximo.", "info");
  };

  const activeLembretes = (state.lembretes || []).filter((l) => {
    const rodadaLembrete = l.tipo === "naRodada" ? l.lembrarNaRodada : (l.criadoNaRodada + l.lembrarNaRodada);
    return rodadaLembrete === state.rodadaAtual;
  });
  const activeEfeitos = (charEffects || []).filter((e) => e.ativo !== false);
  const notifyingEffects = activeEfeitos.filter((e) => e.sinalizar !== false);

  const ensureItemEffects = () => {
    const invEffects = (ficha.inventario || []).flatMap((entry) => {
      const item = entry.item || {};
      return (item.efeitos || []).filter((ef) => ef?.origemEffectId).map((ef) => ({ ef, item }));
    });
    const existingKeys = new Set((charEffects || []).map((e) => `${e.origemEffectId || ""}::${e.origemItem || ""}`));
    const additions = [];
    invEffects.forEach(({ ef, item }) => {
      const tpl = (efeitosCaldeirao || []).find((x) => x.id === ef.origemEffectId) || ef;
      if ((tpl.alvo || "Portador") !== "Portador") return;
      const key = `${tpl.id || ef.origemEffectId}::${item.nome || ""}`;
      if (existingKeys.has(key)) return;
      additions.push(instantiateEffectFromTemplate(tpl, { rodadaInicio: state.rodadaAtual, origemItem: item.nome || "Item", ativo: false, sinalizar: false }));
    });
    if (additions.length) {
      saveEffects([...(charEffects || []), ...additions]);
      onNotify?.(`${additions.length} efeito(s) de item sincronizado(s).`, "success");
    }
  };

  const beginCanvasPan = (e) => {
    if (e.button !== 0) return;
    dragRef.current = { mode: "pan", startX: e.clientX, startY: e.clientY, vx: viewport.x, vy: viewport.y };
    e.preventDefault();
  };
  const beginNodeDrag = (e, nodeId, nodeKind) => {
    const collection = nodeKind === "resource" ? state.recursos : nodeKind === "status" ? (state.statusNodes || []) : (state.genericNodes || []);
    const n = (collection || []).find((x) => x.id === nodeId);
    if (!n) return;
    dragRef.current = { mode: "item", itemId: nodeId, nodeKind, startX: e.clientX, startY: e.clientY, ix: n.x || 0, iy: n.y || 0 };
    setDragItemId(nodeId);
    e.preventDefault();
    e.stopPropagation();
  };
  const onMouseMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.mode === "pan") {
      setViewport((p) => ({ ...p, x: d.vx + dx, y: d.vy + dy }));
      return;
    }
    const patch = { x: d.ix + (dx / viewport.zoom), y: d.iy + (dy / viewport.zoom) };
    if (d.nodeKind === "resource") updateResourceById(d.itemId, patch);
    if (d.nodeKind === "status") updateStatusById(d.itemId, patch);
    if (d.nodeKind === "generic") updateGenericById(d.itemId, patch);
  };
  const stopDrag = () => { dragRef.current = null; setDragItemId(null); };
  const onCanvasWheel = (e) => { e.preventDefault(); const dir = e.deltaY > 0 ? -0.08 : 0.08; setViewport((p) => ({ ...p, zoom: Math.max(0.45, Math.min(2.2, Number((p.zoom + dir).toFixed(2)))) })); };

  const saveResourceEditor = () => {
    const payload = { ...resourceEditorData, max: Math.max(0, Number(resourceEditorData.max) || 0), atual: Math.max(0, Math.min(Number(resourceEditorData.atual) || 0, Math.max(0, Number(resourceEditorData.max) || 0))), x: Number(resourceEditorData.x || 120), y: Number(resourceEditorData.y || 120), links: resourceEditorData.links || {} };
    if (!editingId) saveCombate({ recursos: [...(state.recursos || []), { id: uid(), ...payload }] });
    else updateResourceById(editingId, payload);
    setResourceEditorOpen(false);
  };
  const saveStatusEditor = () => {
    const payload = { ...statusEditorData, sigla: String(statusEditorData.sigla || "NOV").toUpperCase(), base: Number(statusEditorData.base || 0), max: Math.max(1, Number(statusEditorData.max || 1)), val: Math.max(0, Math.min(Number(statusEditorData.val || 0), Math.max(1, Number(statusEditorData.max || 1)))), links: statusEditorData.links || {} };
    if (!editingId) saveCombate({ statusNodes: [...(state.statusNodes || []), { id: uid(), ...payload }] });
    else updateStatusById(editingId, payload);
    setStatusEditorOpen(false);
  };
  const saveGenericEditor = () => {
    const payload = { ...genericEditorData, x: Number(genericEditorData.x || 420), y: Number(genericEditorData.y || 120) };
    if (!editingId) saveCombate({ genericNodes: [...(state.genericNodes || []), { id: uid(), ...payload }] });
    else updateGenericById(editingId, payload);
    setGenericEditorOpen(false);
  };

  const startCreateNode = (type) => {
    setNodePickerOpen(false);
    setEditingId(null);
    if (type === "Recurso") { setResourceEditorData(defaultResourceForm()); setResourceEditorOpen(true); return; }
    if (type === "Barra de Status") { setStatusEditorData(defaultStatusForm()); setStatusEditorOpen(true); return; }
    setGenericEditorData(defaultGenericForm(type));
    setGenericEditorOpen(true);
  };

  const onUploadSlotIcon = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResourceEditorData((p) => ({ ...p, slotIconData: String(reader.result || ""), slotIconMode: "upload" }));
    reader.readAsDataURL(file);
  };

  const linkField = (nodeType, nodeId, field, src) => {
    const sourceNode = (state.genericNodes || []).find((n) => n.id === src);
    if (!sourceNode) return;
    if (!NodeBase.canLink(nodeType, field, sourceNode.nodeType)) {
      onNotify?.(`Erro: esse node não pode ser ligado a este tipo (${nodeType}.${field} <- ${sourceNode.nodeType}).`, "error");
      return;
    }
    const updater = nodeType === "resource" ? updateResourceById : updateStatusById;
    const list = nodeType === "resource" ? state.recursos : (state.statusNodes || []);
    const cur = list.find((x) => x.id === nodeId);
    updater(nodeId, { links: { ...(cur?.links || {}), [field]: src } });
    onNotify?.("Link aplicado ao nó.", "success");
  };

  return (
    <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2 }}>◈ COMBATE</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <HoverButton onClick={() => setRodada(state.rodadaAtual - 1)}>&lt;</HoverButton>
          <span style={{ fontFamily: "monospace", color: "#8ec8ff" }}>Rodada {state.rodadaAtual}</span>
          <HoverButton onClick={() => setRodada(state.rodadaAtual + 1)}>&gt;</HoverButton>
          <HoverButton onClick={proxRodada}>Próx</HoverButton>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {["recursos", "efeitos", "lembretes"].map((aba) => {
          const hasAlert = aba === "lembretes" ? activeLembretes.length > 0 : aba === "efeitos" ? notifyingEffects.length > 0 : false;
          return <button key={aba} onClick={() => setTab(aba)} style={{ ...btnStyle({ padding: "6px 12px" }), borderColor: state.abaAtiva === aba ? "#5dade266" : undefined, color: state.abaAtiva === aba ? "#b6ddff" : undefined, position: "relative" }}>{aba[0].toUpperCase() + aba.slice(1)}{hasAlert && <span style={{ position: "absolute", top: -6, right: -6, color: "#ff4d6d" }}>❗</span>}</button>;
        })}
      </div>

      {state.abaAtiva === "recursos" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <HoverButton onClick={() => setNodePickerOpen(true)}>+ Novo Nó</HoverButton>
            <HoverButton onClick={() => saveCombate({ recursos: (state.recursos || []).map((r) => ({ ...r, atual: Number(resolveLinked(r, "max") || r.max) })) })} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3" })}>Resetar Recursos</HoverButton>
            <HoverButton onClick={() => setViewport((p) => ({ ...p, zoom: Math.max(0.45, Number((p.zoom - 0.1).toFixed(2))) }))}>− Zoom</HoverButton>
            <HoverButton onClick={() => setViewport((p) => ({ ...p, zoom: Math.min(2.2, Number((p.zoom + 0.1).toFixed(2))) }))}>+ Zoom</HoverButton>
            <span style={{ fontFamily: "monospace", color: G.muted, fontSize: 11 }}>Zoom {Math.round(viewport.zoom * 100)}%</span>
          </div>

          <div
            onMouseDown={beginCanvasPan}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={() => { stopDrag(); document.body.style.overflow = ""; }}
            onMouseEnter={() => { document.body.style.overflow = "hidden"; }}
            onWheel={onCanvasWheel}
            style={{ border: "1px solid #2a2a2a", borderRadius: 12, background: "radial-gradient(circle at 20% 20%, #101726 0, #09090a 50%, #060606 100%)", height: 320, overflow: "hidden", position: "relative", cursor: dragRef.current?.mode === "pan" ? "grabbing" : "grab" }}
          >
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#1a1a1a33 1px, transparent 1px), linear-gradient(90deg, #1a1a1a33 1px, transparent 1px)", backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`, backgroundPosition: `${viewport.x}px ${viewport.y}px` }} />
            <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "top left", width: 1600, height: 1200, position: "relative" }}>
              {(state.recursos || []).map((r) => {
                const max = Math.max(0, Number(resolveLinked(r, "max") ?? r.max));
                const atual = Math.max(0, Math.min(max, Number(resolveLinked(r, "atual") ?? r.atual)));
                const cor = resolveLinked(r, "cor") || r.cor;
                const hoverIndex = hoverSlot[r.id];
                const preview = Number.isInteger(hoverIndex) ? hoverIndex + 1 : atual;
                const gastoPreview = Math.max(0, atual - preview);
                return (
                  <div key={r.id} style={{ position: "absolute", left: r.x || 0, top: r.y || 0, width: 220, border: `1px solid ${cor}66`, borderRadius: 10, background: dragItemId === r.id ? "#000000cc" : "#000000aa", padding: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 5, alignItems: "center", marginBottom: 6 }}>
                      <button onMouseDown={(e) => beginNodeDrag(e, r.id, "resource")} style={btnStyle({ padding: "2px 4px" })}>⠿</button>
                      <div style={{ color: cor, fontFamily: "'Cinzel',serif", fontSize: 11 }}>{r.nome}</div>
                      <button onClick={() => { setEditingId(r.id); setResourceEditorData({ ...r }); setResourceEditorOpen(true); }} style={btnStyle({ padding: "2px 4px" })}>⚙</button>
                      <button onClick={() => saveCombate({ recursos: [...(state.recursos || []), { ...r, id: uid(), nome: `${r.nome} (cópia)`, x: (r.x || 0) + 30, y: (r.y || 0) + 30 }] })} style={btnStyle({ padding: "2px 4px" })}>⎘</button>
                      <button onClick={() => saveCombate({ recursos: (state.recursos || []).filter((x) => x.id !== r.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "2px 4px" })}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {Array.from({ length: max }).map((_, i) => {
                        const on = i < preview;
                        return (
                          <button key={i} onMouseEnter={() => setHoverSlot((p) => ({ ...p, [r.id]: i }))} onMouseLeave={() => setHoverSlot((p) => ({ ...p, [r.id]: null }))} onClick={() => {
                            // if only one left and clicking first slot: consume to zero
                            if (atual === 1 && i === 0) updateResourceById(r.id, { atual: 0 });
                            else if (i === atual - 1) updateResourceById(r.id, { atual: Math.max(0, i) });
                            else updateResourceById(r.id, { atual: i + 1 });
                          }} style={{ ...slotShapeStyle(r.slotShape || "square", cor, on), overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {r.slotIconMode === "url" && r.slotIconUrl && <img src={r.slotIconUrl} alt="" style={{ width: 14, height: 14 }} />}
                            {r.slotIconMode === "upload" && r.slotIconData && <img src={r.slotIconData} alt="" style={{ width: 14, height: 14 }} />}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 10, color: G.muted }}>{r.descricao || "—"} · {atual}/{max} · gasto previsto: {gastoPreview}</div>
                  </div>
                );
              })}

              {(state.statusNodes || []).map((s) => {
                const cor = resolveLinked(s, "cor") || s.cor || "#f39c12";
                const max = Math.max(1, Number(resolveLinked(s, "max") ?? s.max));
                const val = Math.max(0, Math.min(max, Number(resolveLinked(s, "val") ?? s.val)));
                const pct = max > 0 ? (val / max) * 100 : 0;
                return (
                  <div key={s.id} style={{ position: "absolute", left: s.x || 0, top: s.y || 0, width: 230, border: `1px solid ${cor}66`, borderRadius: 10, background: "#000000aa", padding: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 5, alignItems: "center", marginBottom: 6 }}>
                      <button onMouseDown={(e) => beginNodeDrag(e, s.id, "status")} style={btnStyle({ padding: "2px 4px" })}>⠿</button>
                      <div style={{ color: cor, fontFamily: "'Cinzel',serif", fontSize: 11 }}>{s.nome} ({s.sigla})</div>
                      <button onClick={() => { setEditingId(s.id); setStatusEditorData({ ...s }); setStatusEditorOpen(true); }} style={btnStyle({ padding: "2px 4px" })}>⚙</button>
                      <button onClick={() => saveCombate({ statusNodes: [...(state.statusNodes || []), { ...s, id: uid(), nome: `${s.nome} (cópia)`, x: (s.x || 0) + 30, y: (s.y || 0) + 30 }] })} style={btnStyle({ padding: "2px 4px" })}>⎘</button>
                      <button onClick={() => saveCombate({ statusNodes: (state.statusNodes || []).filter((x) => x.id !== s.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "2px 4px" })}>✕</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 5 }}>
                      <input type="number" value={val} min={0} max={max} onChange={(e) => updateStatusById(s.id, { val: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })} style={inpStyle()} />
                      <input type="number" value={max} min={1} onChange={(e) => updateStatusById(s.id, { max: Math.max(1, Number(e.target.value) || 1), val: Math.min(val, Math.max(1, Number(e.target.value) || 1)) })} style={inpStyle()} />
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "#111", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: cor, transition: "width .2s" }} /></div>
                  </div>
                );
              })}

              {(state.genericNodes || []).map((n) => (
                <div key={n.id} style={{ position: "absolute", left: n.x || 0, top: n.y || 0, width: 170, border: "1px solid #666", borderRadius: 8, background: "#000000aa", padding: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 4, alignItems: "center", marginBottom: 4 }}>
                    <button onMouseDown={(e) => beginNodeDrag(e, n.id, "generic")} style={btnStyle({ padding: "2px 4px" })}>⠿</button>
                    <div style={{ fontFamily: "monospace", color: G.text, fontSize: 11 }}>{n.label || n.nodeType}</div>
                    <button onClick={() => { setEditingId(n.id); setGenericEditorData({ ...n }); setGenericEditorOpen(true); }} style={btnStyle({ padding: "2px 4px" })}>⚙</button>
                    <button onClick={() => saveCombate({ genericNodes: (state.genericNodes || []).filter((x) => x.id !== n.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "2px 4px" })}>✕</button>
                  </div>
                  <div style={{ fontFamily: "monospace", color: "#7fb3ff", fontSize: 10 }}>out: {String(genericOutputs[n.id] ?? 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.abaAtiva === "efeitos" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 6, marginBottom: 8 }}>
            <select defaultValue="" onChange={(ev) => {
              const ref = (efeitosCaldeirao || []).find((x) => x.id === ev.target.value);
              if (!ref) return;
              const next = instantiateEffectFromTemplate(ref, { rodadaInicio: state.rodadaAtual, ativo: false });
              saveEffects([next, ...(charEffects || [])]);
              ev.target.value = "";
            }} style={inpStyle()}>
              <option value="">Adicionar efeito do Caldeirão...</option>
              {(efeitosCaldeirao || []).map((ef) => <option key={ef.id} value={ef.id}>{ef.nome} · {ef.efeitoMecanico || "—"}</option>)}
            </select>
            <HoverButton onClick={() => onOpenCaldeirao?.()}>Criar no Caldeirão</HoverButton>
            <HoverButton onClick={() => saveEffects([instantiateEffectFromTemplate(makeDefaultEffect(), { nome: "Novo efeito local", origem: "Local", origemDetalhe: "Combate", ativo: false, rodadaInicio: state.rodadaAtual, sinalizar: false }), ...(charEffects || [])])} style={btnStyle({ borderColor: "#8e44ad55", color: "#dcb3ff" })}>Criar local</HoverButton>
            <HoverButton onClick={ensureItemEffects} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3" })}>Sincronizar itens</HoverButton>
            <HoverButton onClick={() => saveEffects([...(charEffects || [])])}>Atualizar</HoverButton>
          </div>
          {(charEffects || []).map((e) => {
            const isCollapsed = collapsed[e.id] ?? true;
            return (
              <div key={e.id} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, marginBottom: 8, background: "#0a0a0a", display: "grid", gap: 6 }}>
                <div style={{ display: "grid", gridTemplateColumns: "24px 80px 24px 24px 1fr auto auto", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={e.ativo !== false} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, ativo: ev.target.checked } : x))} />
                  <select value={e.tipo || "Buff"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, tipo: ev.target.value } : x))} style={inpStyle()}><option>Buff</option><option>Debuff</option></select>
                  <button onClick={() => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, sinalizar: !(x.sinalizar !== false) } : x))} style={btnStyle({ padding: "2px 4px" })}>{e.sinalizar !== false ? "🔔" : "🔕"}</button>
                  <button onClick={() => setCollapsed((p) => ({ ...p, [e.id]: !isCollapsed }))} style={btnStyle({ padding: "2px 4px" })}>{isCollapsed ? "▸" : "▾"}</button>
                  <input value={e.nome || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, nome: ev.target.value } : x))} style={inpStyle()} />
                  <HoverButton onClick={() => saveEffects([{ ...e, id: uid(), nome: `${e.nome || "Efeito"} (cópia)` }, ...(charEffects || [])])}>⎘</HoverButton>
                  <HoverButton onClick={() => saveEffects(charEffects.filter((x) => x.id !== e.id))} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton>
                </div>
                {isCollapsed ? <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>{e.tipo || "—"} · {e.nome || "Sem nome"} · {e.efeitoMecanico || "—"}</div> : <textarea value={e.descricao || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, descricao: ev.target.value } : x))} rows={2} style={inpStyle({ resize: "vertical" })} />}
              </div>
            );
          })}
        </div>
      )}

      {state.abaAtiva === "lembretes" && (
        <div>
          {(state.lembretes || []).map((l) => (
            <div key={l.id} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, marginBottom: 8, background: "#0a0a0a", display: "grid", gridTemplateColumns: "1fr 140px 140px auto auto", gap: 6, alignItems: "center" }}>
              <input value={l.texto} onChange={(ev) => saveCombate({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, texto: ev.target.value } : x) })} style={inpStyle()} />
              <select value={l.tipo || "emX"} onChange={(ev) => saveCombate({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, tipo: ev.target.value } : x) })} style={inpStyle()}><option value="emX">Em X rodadas</option><option value="naRodada">Na rodada</option></select>
              <input type="number" value={l.lembrarNaRodada} onChange={(ev) => saveCombate({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, lembrarNaRodada: Math.max(0, Number(ev.target.value) || 0) } : x) })} style={inpStyle()} />
              <HoverButton onClick={() => saveCombate({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, criadoNaRodada: state.rodadaAtual } : x) })}>🔄</HoverButton>
              <HoverButton onClick={() => saveCombate({ lembretes: state.lembretes.filter((x) => x.id !== l.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton>
            </div>
          ))}
          <HoverButton onClick={() => saveCombate({ lembretes: [...(state.lembretes || []), { id: uid(), texto: "Novo lembrete", criadoNaRodada: state.rodadaAtual, lembrarNaRodada: state.rodadaAtual + 1, tipo: "emX" }] })}>+ Novo Lembrete</HoverButton>
        </div>
      )}

      {nodePickerOpen && (
        <Modal title="Novo Nó" onClose={() => setNodePickerOpen(false)}>
          <div style={{ display: "grid", gap: 8 }}>{NODE_TYPES.map((t) => <button key={t} onClick={() => startCreateNode(t)} style={btnStyle()}>{t}</button>)}</div>
        </Modal>
      )}

      {resourceEditorOpen && (
        <Modal title={editingId ? "Configurar Recurso" : "Novo Recurso"} onClose={() => setResourceEditorOpen(false)}>
          <div style={{ display: "grid", gap: 8 }}>
            <input value={resourceEditorData.nome || ""} onChange={(e) => setResourceEditorData((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome" style={inpStyle()} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="color" value={resourceEditorData.cor || "#95a5a6"} onChange={(e) => setResourceEditorData((p) => ({ ...p, cor: e.target.value }))} style={{ ...inpStyle(), height: 38 }} />
              <input value={resourceEditorData.descricao || ""} onChange={(e) => setResourceEditorData((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição (opcional)" style={inpStyle()} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="number" min={0} value={Number(resourceEditorData.max || 0)} onChange={(e) => setResourceEditorData((p) => ({ ...p, max: Math.max(0, Number(e.target.value) || 0) }))} placeholder="Máximo" style={inpStyle()} />
              <input type="number" min={0} value={Number(resourceEditorData.atual || 0)} onChange={(e) => setResourceEditorData((p) => ({ ...p, atual: Math.max(0, Number(e.target.value) || 0) }))} placeholder="Atual" style={inpStyle()} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select value={resourceEditorData.slotIconMode || "shape"} onChange={(e) => setResourceEditorData((p) => ({ ...p, slotIconMode: e.target.value }))} style={inpStyle()}><option value="shape">Forma geométrica</option><option value="url">URL</option><option value="upload">Imagem local</option></select>
              {(resourceEditorData.slotIconMode || "shape") === "shape" ? <select value={resourceEditorData.slotShape || "square"} onChange={(e) => setResourceEditorData((p) => ({ ...p, slotShape: e.target.value }))} style={inpStyle()}>{SHAPES.map((x) => <option key={x} value={x}>{x}</option>)}</select> : resourceEditorData.slotIconMode === "url" ? <input value={resourceEditorData.slotIconUrl || ""} onChange={(e) => setResourceEditorData((p) => ({ ...p, slotIconUrl: e.target.value }))} placeholder="https://..." style={inpStyle()} /> : <button onClick={() => fileInputRef.current?.click()} style={btnStyle()}>Escolher imagem</button>}
            </div>
            <div>
              <label style={{ fontSize: 10, color: G.muted, display: "block", marginBottom: 2 }}>Link max/atual/cor por node genérico</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <select value={resourceEditorData.links?.max || ""} onChange={(e) => { if (e.target.value) linkField("resource", editingId, "max", e.target.value); setResourceEditorData((p) => ({ ...p, links: { ...(p.links || {}), max: e.target.value } })); }} style={inpStyle()}><option value="">sem link max</option>{(state.genericNodes || []).map((n) => <option key={n.id} value={n.id}>{n.label || n.nodeType}</option>)}</select>
                <select value={resourceEditorData.links?.atual || ""} onChange={(e) => { if (e.target.value) linkField("resource", editingId, "atual", e.target.value); setResourceEditorData((p) => ({ ...p, links: { ...(p.links || {}), atual: e.target.value } })); }} style={inpStyle()}><option value="">sem link atual</option>{(state.genericNodes || []).map((n) => <option key={n.id} value={n.id}>{n.label || n.nodeType}</option>)}</select>
                <select value={resourceEditorData.links?.cor || ""} onChange={(e) => { if (e.target.value) linkField("resource", editingId, "cor", e.target.value); setResourceEditorData((p) => ({ ...p, links: { ...(p.links || {}), cor: e.target.value } })); }} style={inpStyle()}><option value="">sem link cor</option>{(state.genericNodes || []).map((n) => <option key={n.id} value={n.id}>{n.label || n.nodeType}</option>)}</select>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => onUploadSlotIcon(e.target.files?.[0])} style={{ display: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button onClick={() => setResourceEditorOpen(false)} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button><button onClick={saveResourceEditor} style={btnStyle()}>Salvar</button></div>
          </div>
        </Modal>
      )}

      {statusEditorOpen && (
        <Modal title={editingId ? "Configurar Barra de Status" : "Nova Barra de Status"} onClose={() => setStatusEditorOpen(false)}>
          <div style={{ display: "grid", gap: 8 }}>
            <input value={statusEditorData.nome || ""} onChange={(e) => setStatusEditorData((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome" style={inpStyle()} />
            <input value={statusEditorData.sigla || ""} onChange={(e) => setStatusEditorData((p) => ({ ...p, sigla: e.target.value.toUpperCase() }))} placeholder="Sigla (ex: BEL)" style={inpStyle()} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <input type="number" value={Number(statusEditorData.base || 0)} onChange={(e) => setStatusEditorData((p) => ({ ...p, base: Number(e.target.value) || 0 }))} placeholder="Valor base" style={inpStyle()} />
              <input type="number" value={Number(statusEditorData.max || 1)} onChange={(e) => setStatusEditorData((p) => ({ ...p, max: Math.max(1, Number(e.target.value) || 1) }))} placeholder="Valor máximo" style={inpStyle()} />
              <input type="number" value={Number(statusEditorData.val || 0)} onChange={(e) => setStatusEditorData((p) => ({ ...p, val: Math.max(0, Number(e.target.value) || 0) }))} placeholder="Valor atual" style={inpStyle()} />
            </div>
            <input type="color" value={statusEditorData.cor || "#f39c12"} onChange={(e) => setStatusEditorData((p) => ({ ...p, cor: e.target.value }))} style={{ ...inpStyle(), height: 38 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <select value={statusEditorData.links?.val || ""} onChange={(e) => { if (e.target.value) linkField("status", editingId, "val", e.target.value); setStatusEditorData((p) => ({ ...p, links: { ...(p.links || {}), val: e.target.value } })); }} style={inpStyle()}><option value="">sem link val</option>{(state.genericNodes || []).map((n) => <option key={n.id} value={n.id}>{n.label || n.nodeType}</option>)}</select>
              <select value={statusEditorData.links?.max || ""} onChange={(e) => { if (e.target.value) linkField("status", editingId, "max", e.target.value); setStatusEditorData((p) => ({ ...p, links: { ...(p.links || {}), max: e.target.value } })); }} style={inpStyle()}><option value="">sem link max</option>{(state.genericNodes || []).map((n) => <option key={n.id} value={n.id}>{n.label || n.nodeType}</option>)}</select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button onClick={() => setStatusEditorOpen(false)} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button><button onClick={saveStatusEditor} style={btnStyle()}>Salvar</button></div>
          </div>
        </Modal>
      )}

      {genericEditorOpen && (
        <Modal title={editingId ? "Configurar Node Genérico" : "Novo Node Genérico"} onClose={() => setGenericEditorOpen(false)}>
          <div style={{ display: "grid", gap: 8 }}>
            <input value={genericEditorData.label || ""} onChange={(e) => setGenericEditorData((p) => ({ ...p, label: e.target.value }))} placeholder="Rótulo" style={inpStyle()} />
            {genericEditorData.nodeType === "value" && <input type="number" value={Number(genericEditorData.value || 0)} onChange={(e) => setGenericEditorData((p) => ({ ...p, value: Number(e.target.value) || 0 }))} placeholder="Valor" style={inpStyle()} />}
            {genericEditorData.nodeType === "math" && (
              <>
                <select value={genericEditorData.op || "+"} onChange={(e) => setGenericEditorData((p) => ({ ...p, op: e.target.value }))} style={inpStyle()}><option>+</option><option>-</option><option>*</option><option>/</option></select>
                <select value={genericEditorData.inA || ""} onChange={(e) => setGenericEditorData((p) => ({ ...p, inA: e.target.value }))} style={inpStyle()}><option value="">entrada A</option>{(state.genericNodes || []).map((n) => <option key={n.id} value={n.id}>{n.label || n.nodeType}</option>)}</select>
                <select value={genericEditorData.inB || ""} onChange={(e) => setGenericEditorData((p) => ({ ...p, inB: e.target.value }))} style={inpStyle()}><option value="">entrada B</option>{(state.genericNodes || []).map((n) => <option key={n.id} value={n.id}>{n.label || n.nodeType}</option>)}</select>
              </>
            )}
            {genericEditorData.nodeType === "conditional" && (
              <>
                <select value={genericEditorData.cmp || ">"} onChange={(e) => setGenericEditorData((p) => ({ ...p, cmp: e.target.value }))} style={inpStyle()}><option value=">">{">"}</option><option value="<">{"<"}</option><option value="=">{"="}</option></select>
                <select value={genericEditorData.inA || ""} onChange={(e) => setGenericEditorData((p) => ({ ...p, inA: e.target.value }))} style={inpStyle()}><option value="">entrada A</option>{(state.genericNodes || []).map((n) => <option key={n.id} value={n.id}>{n.label || n.nodeType}</option>)}</select>
                <select value={genericEditorData.inB || ""} onChange={(e) => setGenericEditorData((p) => ({ ...p, inB: e.target.value }))} style={inpStyle()}><option value="">entrada B</option>{(state.genericNodes || []).map((n) => <option key={n.id} value={n.id}>{n.label || n.nodeType}</option>)}</select>
                <input type="number" value={Number(genericEditorData.trueValue || 0)} onChange={(e) => setGenericEditorData((p) => ({ ...p, trueValue: Number(e.target.value) || 0 }))} placeholder="true" style={inpStyle()} />
                <input type="number" value={Number(genericEditorData.falseValue || 0)} onChange={(e) => setGenericEditorData((p) => ({ ...p, falseValue: Number(e.target.value) || 0 }))} placeholder="false" style={inpStyle()} />
              </>
            )}
            {genericEditorData.nodeType === "color" && <input type="color" value={genericEditorData.color || "#95a5a6"} onChange={(e) => setGenericEditorData((p) => ({ ...p, color: e.target.value }))} style={{ ...inpStyle(), height: 38 }} />}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button onClick={() => setGenericEditorOpen(false)} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button><button onClick={saveGenericEditor} style={btnStyle()}>Salvar</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
