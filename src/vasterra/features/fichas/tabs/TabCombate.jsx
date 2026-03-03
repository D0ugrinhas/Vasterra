import React, { useEffect, useMemo, useRef, useState } from "react";
import { uid } from "../../../core/factories";
import { instantiateEffectFromTemplate } from "../../../core/effects";
import { makeDefaultEffect } from "../../caldeirao/EffectForgeEditor";
import { Modal } from "../../shared/components";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";

const defaultCombate = () => ({
  rodadaAtual: 0,
  abaAtiva: "recursos",
  lembretes: [],
  nodeLinks: [],
  recursos: [
    { id: uid(), nome: "ACO", cor: "#2ecc71", max: 2, atual: 2, descricao: "", slotShape: "square", x: 40, y: 40 },
    { id: uid(), nome: "MOV", cor: "#3498db", max: 1, atual: 1, descricao: "", slotShape: "square", x: 280, y: 40 },
  ],
  statusNodes: [],
  genericNodes: [],
});

const SHAPES = ["square", "circle", "diamond", "triangle", "hex"];
const NODE_TYPES = ["Recurso", "Barra de Status", "Valor", "Math", "Condicionais", "Color picker"];

function slotShapeStyle(shape, color, active) {
  const base = { width: 18, height: 18, border: `1px solid ${color}`, background: active ? color : "#151515", opacity: active ? 1 : 0.35 };
  if (shape === "circle") return { ...base, borderRadius: "50%" };
  if (shape === "diamond") return { ...base, transform: "rotate(45deg)", borderRadius: 3 };
  if (shape === "triangle") return { ...base, clipPath: "polygon(50% 0, 0 100%, 100% 100%)", borderRadius: 0 };
  if (shape === "hex") return { ...base, clipPath: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)" };
  return { ...base, borderRadius: 4 };
}

function defaultResourceForm() { return { nome: "NOVO", cor: "#95a5a6", max: 1, atual: 1, descricao: "", slotShape: "square", x: 120, y: 120 }; }
function defaultStatusForm() { return { nome: "Novo Status", sigla: "NOV", cor: "#f39c12", base: 10, max: 10, val: 10, x: 120, y: 240 }; }
function defaultGenericForm(kind = "Valor") {
  if (kind === "Valor") return { nodeType: "value", label: "Valor", value: 0, sourcePath: "", x: 420, y: 120 };
  if (kind === "Math") return { nodeType: "math", label: "Math", op: "+", x: 420, y: 220 };
  if (kind === "Condicionais") return { nodeType: "conditional", label: "Cond", cmp: ">", trueValue: 1, falseValue: 0, x: 420, y: 320 };
  return { nodeType: "color", label: "Cor", color: "#95a5a6", x: 420, y: 420 };
}

const parseDice = (expr = "") => { const m = String(expr).trim().match(/^(\d+)d(\d+)$/i); return m ? { n: Number(m[1]), d: Number(m[2]) } : null; };
const rollDice = (expr = "") => { const p = parseDice(expr); if (!p) return null; let t = 0; for (let i = 0; i < p.n; i += 1) t += 1 + Math.floor(Math.random() * p.d); return t; };

function getFichaValueByPath(ficha, path) {
  if (!path) return 0;
  if (path.startsWith("status.")) {
    const [_, sig, field] = path.split(".");
    return Number(ficha?.status?.[sig]?.[field] || 0);
  }
  if (path.startsWith("atributos.")) {
    const [_, sig, field] = path.split(".");
    return Number(ficha?.atributos?.[sig]?.[field] || 0);
  }
  return 0;
}

export function TabCombate({ ficha, onUpdate, efeitosCaldeirao = [], onOpenCaldeirao, onNotify }) {
  const state = useMemo(() => ({ ...defaultCombate(), ...(ficha.combate || {}) }), [ficha.combate]);
  const [collapsed, setCollapsed] = useState({});
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [hoverSlot, setHoverSlot] = useState({});
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const [resourceEditorOpen, setResourceEditorOpen] = useState(false);
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const [genericEditorOpen, setGenericEditorOpen] = useState(false);
  const [resourceEditorData, setResourceEditorData] = useState(defaultResourceForm());
  const [statusEditorData, setStatusEditorData] = useState(defaultStatusForm());
  const [genericEditorData, setGenericEditorData] = useState(defaultGenericForm());
  const [editing, setEditing] = useState({ kind: null, id: null });
  const [linkDrag, setLinkDrag] = useState(null);
  const dragRef = useRef(null);
  const canvasRef = useRef(null);
  const charEffects = ficha.modificadores?.efeitos || [];

  const saveCombate = (next) => onUpdate({ combate: { ...state, ...next } });
  const saveEffects = (next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), efeitos: next } });

  const setTab = (abaAtiva) => saveCombate({ abaAtiva });
  const setRodada = (rodadaAtual) => saveCombate({ rodadaAtual: Math.max(0, rodadaAtual) });
  const updateResourceById = (id, patch) => saveCombate({ recursos: state.recursos.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const updateStatusById = (id, patch) => saveCombate({ statusNodes: (state.statusNodes || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const updateGenericById = (id, patch) => saveCombate({ genericNodes: (state.genericNodes || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const fichaValueOptions = useMemo(() => {
    const out = [];
    Object.keys(ficha?.status || {}).forEach((k) => { out.push({ label: `Status ${k} atual`, value: `status.${k}.val` }); out.push({ label: `Status ${k} max`, value: `status.${k}.max` }); });
    Object.keys(ficha?.atributos || {}).forEach((k) => out.push({ label: `Atributo ${k}`, value: `atributos.${k}.val` }));
    return out;
  }, [ficha]);

  const links = state.nodeLinks || [];
  const incomingFor = (nodeId, input) => links.find((l) => l.to.id === nodeId && l.to.port === input) || null;

  const nodeOutput = (node) => {
    const n = node;
    if (n.kind === "resource") return { value: Number(n.atual || 0), max: Number(n.max || 0), color: n.cor || "#95a5a6" };
    if (n.kind === "status") return { value: Number(n.val || 0), max: Number(n.max || 0), color: n.cor || "#f39c12" };
    if (n.kind === "generic") {
      if (n.nodeType === "value") {
        const source = incomingFor(n.id, "value");
        if (source) return { value: 0, color: "#95a5a6" };
        if (n.sourcePath) return { value: Number(getFichaValueByPath(ficha, n.sourcePath) || 0), color: "#95a5a6" };
        return { value: Number(n.value || 0), color: "#95a5a6" };
      }
      if (n.nodeType === "math") {
        const a = Number(resolveInputValue(n.id, "a") || 0); const b = Number(resolveInputValue(n.id, "b") || 0);
        if (n.op === "+") return { value: a + b }; if (n.op === "-") return { value: a - b }; if (n.op === "*") return { value: a * b }; return { value: b === 0 ? 0 : a / b };
      }
      if (n.nodeType === "conditional") {
        const a = Number(resolveInputValue(n.id, "a") || 0); const b = Number(resolveInputValue(n.id, "b") || 0);
        const ok = n.cmp === ">" ? a > b : n.cmp === "<" ? a < b : a === b;
        return { value: ok ? Number(n.trueValue || 0) : Number(n.falseValue || 0) };
      }
      if (n.nodeType === "color") return { color: n.color || "#95a5a6", value: 0 };
    }
    return { value: 0, max: 0, color: "#95a5a6" };
  };

  function resolveInputValue(nodeId, inputPort) {
    const ln = incomingFor(nodeId, inputPort);
    if (!ln) return 0;
    const src = allNodes.find((x) => x.id === ln.from.id);
    if (!src) return 0;
    return nodeOutput(src).value || 0;
  }

  const allNodes = useMemo(() => [
    ...(state.recursos || []).map((x) => ({ ...x, kind: "resource" })),
    ...((state.statusNodes || []).map((x) => ({ ...x, kind: "status" }))),
    ...((state.genericNodes || []).map((x) => ({ ...x, kind: "generic" }))),
  ], [state.recursos, state.statusNodes, state.genericNodes]);

  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  const canLink = (fromNode, toNode, toPort) => {
    const fromType = toPort === "cor" ? "color" : "value";
    if (toPort === "cor") return fromNode.kind === "generic" && fromNode.nodeType === "color";
    return ["resource", "status", "generic"].includes(toNode.kind) && (fromNode.kind === "generic" || fromNode.kind === "resource" || fromNode.kind === "status") && fromType === "value";
  };

  const beginLink = (from) => setLinkDrag({ from, x: 0, y: 0 });
  const endLink = (to) => {
    if (!linkDrag) return;
    const fromNode = allNodes.find((n) => n.id === linkDrag.from.id);
    const toNode = allNodes.find((n) => n.id === to.id);
    if (!fromNode || !toNode || !canLink(fromNode, toNode, to.port)) {
      onNotify?.("Erro: esse node não pode ser ligado a um node desse tipo.", "error");
      setLinkDrag(null);
      return;
    }
    const filtered = links.filter((l) => !(l.to.id === to.id && l.to.port === to.port));
    saveCombate({ nodeLinks: [...filtered, { id: uid(), from: linkDrag.from, to }] });
    setLinkDrag(null);
  };

  const beginCanvasPan = (e) => {
    if (e.button !== 0) return;
    dragRef.current = { mode: "pan", startX: e.clientX, startY: e.clientY, vx: viewport.x, vy: viewport.y };
    e.preventDefault();
  };
  const beginNodeDrag = (e, nodeId, nodeKind) => {
    const n = allNodes.find((x) => x.id === nodeId && x.kind === nodeKind);
    if (!n) return;
    dragRef.current = { mode: "item", itemId: nodeId, nodeKind, startX: e.clientX, startY: e.clientY, ix: n.x || 0, iy: n.y || 0 };
    e.preventDefault();
    e.stopPropagation();
  };
  const onMouseMove = (e) => {
    if (linkDrag) setLinkDrag((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : p));
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.mode === "pan") { setViewport((p) => ({ ...p, x: d.vx + dx, y: d.vy + dy })); return; }
    const patch = { x: d.ix + (dx / viewport.zoom), y: d.iy + (dy / viewport.zoom) };
    if (d.nodeKind === "resource") updateResourceById(d.itemId, patch);
    if (d.nodeKind === "status") updateStatusById(d.itemId, patch);
    if (d.nodeKind === "generic") updateGenericById(d.itemId, patch);
  };
  const stopDrag = () => { dragRef.current = null; };
  const onCanvasWheel = (e) => { e.preventDefault(); e.stopPropagation(); const dir = e.deltaY > 0 ? -0.08 : 0.08; setViewport((p) => ({ ...p, zoom: Math.max(0.45, Math.min(2.2, Number((p.zoom + dir).toFixed(2)))) })); };

  const proxRodada = () => {
    const recursos = (state.recursos || []).map((r) => ({ ...r, atual: r.max }));
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
    if (additions.length) saveEffects([...(charEffects || []), ...additions]);
  };

  const openNodeType = (type) => {
    setNodePickerOpen(false);
    setEditing({ kind: null, id: null });
    if (type === "Recurso") { setResourceEditorData(defaultResourceForm()); setResourceEditorOpen(true); return; }
    if (type === "Barra de Status") { setStatusEditorData(defaultStatusForm()); setStatusEditorOpen(true); return; }
    setGenericEditorData(defaultGenericForm(type));
    setGenericEditorOpen(true);
  };

  const saveResourceEditor = () => {
    const payload = { ...resourceEditorData, max: Math.max(0, Number(resourceEditorData.max) || 0), atual: Math.max(0, Math.min(Number(resourceEditorData.atual) || 0, Math.max(0, Number(resourceEditorData.max) || 0))) };
    if (!editing.id) saveCombate({ recursos: [...(state.recursos || []), { id: uid(), ...payload }] });
    else updateResourceById(editing.id, payload);
    setResourceEditorOpen(false);
  };
  const saveStatusEditor = () => {
    const payload = { ...statusEditorData, sigla: String(statusEditorData.sigla || "NOV").toUpperCase(), max: Math.max(1, Number(statusEditorData.max || 1)), val: Math.max(0, Math.min(Number(statusEditorData.val || 0), Math.max(1, Number(statusEditorData.max || 1)))) };
    if (!editing.id) saveCombate({ statusNodes: [...(state.statusNodes || []), { id: uid(), ...payload }] });
    else updateStatusById(editing.id, payload);
    setStatusEditorOpen(false);
  };
  const saveGenericEditor = () => {
    const payload = { ...genericEditorData };
    if (!editing.id) saveCombate({ genericNodes: [...(state.genericNodes || []), { id: uid(), ...payload }] });
    else updateGenericById(editing.id, payload);
    setGenericEditorOpen(false);
  };

  const onUploadIcon = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResourceEditorData((p) => ({ ...p, slotIconData: String(reader.result || ""), slotIconMode: "upload" }));
    reader.readAsDataURL(file);
  };

  const getNodePos = (node) => ({ x: (node.x || 0) * viewport.zoom + viewport.x, y: (node.y || 0) * viewport.zoom + viewport.y });

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
            <HoverButton onClick={() => saveCombate({ recursos: (state.recursos || []).map((r) => ({ ...r, atual: r.max })) })} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3" })}>Resetar Recursos</HoverButton>
            <HoverButton onClick={() => setViewport((p) => ({ ...p, zoom: Math.max(0.45, Number((p.zoom - 0.1).toFixed(2))) }))}>− Zoom</HoverButton>
            <HoverButton onClick={() => setViewport((p) => ({ ...p, zoom: Math.min(2.2, Number((p.zoom + 0.1).toFixed(2))) }))}>+ Zoom</HoverButton>
          </div>

          <div
            ref={canvasRef}
            onMouseDown={beginCanvasPan}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={() => { stopDrag(); document.body.style.overflow = ""; }}
            onMouseEnter={() => { document.body.style.overflow = "hidden"; }}
            onWheel={onCanvasWheel}
            style={{ border: "1px solid #2a2a2a", borderRadius: 12, background: "radial-gradient(circle at 20% 20%, #101726 0, #09090a 50%, #060606 100%)", height: 340, overflow: "hidden", position: "relative", cursor: dragRef.current?.mode === "pan" ? "grabbing" : "grab" }}
          >
            <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {links.map((l) => {
                const from = allNodes.find((n) => n.id === l.from.id);
                const to = allNodes.find((n) => n.id === l.to.id);
                if (!from || !to) return null;
                const fp = getNodePos(from); const tp = getNodePos(to);
                return <line key={l.id} x1={fp.x + 210} y1={fp.y + 24} x2={tp.x} y2={tp.y + 24} stroke="#7aa9d8" strokeWidth="2" />;
              })}
              {linkDrag && <line x1={getNodePos(allNodes.find((n) => n.id === linkDrag.from.id) || { x: 0, y: 0 }).x + 210} y1={getNodePos(allNodes.find((n) => n.id === linkDrag.from.id) || { x: 0, y: 0 }).y + 24} x2={linkDrag.x} y2={linkDrag.y} stroke="#b388ff" strokeWidth="2" />}
            </svg>

            <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "top left", width: 1800, height: 1200, position: "relative" }}>
              {allNodes.map((n) => {
                const isResource = n.kind === "resource";
                const isStatus = n.kind === "status";
                const isGeneric = n.kind === "generic";
                const cor = n.cor || (isResource ? "#95a5a6" : "#f39c12");
                return (
                  <div key={n.id} style={{ position: "absolute", left: n.x || 0, top: n.y || 0, width: 220, border: `1px solid ${cor}66`, borderRadius: 10, background: "#000000aa", padding: 8 }}>
                    <div style={{ position: "absolute", left: -8, top: 20, display: "grid", gap: 4 }}>
                      {(isResource || isStatus || (isGeneric && ["math", "conditional", "value"].includes(n.nodeType))) && <button onMouseUp={() => endLink({ id: n.id, port: isGeneric && n.nodeType !== "value" ? "a" : "value" })} style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid #9cf", background: "#123" }} />}
                      {(isGeneric && ["math", "conditional"].includes(n.nodeType)) && <button onMouseUp={() => endLink({ id: n.id, port: "b" })} style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid #9cf", background: "#123" }} />}
                    </div>
                    <div style={{ position: "absolute", right: -8, top: 20, display: "grid", gap: 4 }}>
                      <button onMouseDown={() => beginLink({ id: n.id, port: "out" })} style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid #f9c", background: "#312" }} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 5, alignItems: "center", marginBottom: 6 }}>
                      <button onMouseDown={(e) => beginNodeDrag(e, n.id, n.kind)} style={btnStyle({ padding: "2px 4px" })}>⠿</button>
                      <div style={{ color: cor, fontFamily: "'Cinzel',serif", fontSize: 11 }}>{isResource ? n.nome : isStatus ? `${n.nome} (${n.sigla})` : (n.label || n.nodeType)}</div>
                      <button onClick={() => {
                        if (isResource) { setEditing({ kind: "resource", id: n.id }); setResourceEditorData({ ...n }); setResourceEditorOpen(true); }
                        else if (isStatus) { setEditing({ kind: "status", id: n.id }); setStatusEditorData({ ...n }); setStatusEditorOpen(true); }
                        else { setEditing({ kind: "generic", id: n.id }); setGenericEditorData({ ...n }); setGenericEditorOpen(true); }
                      }} style={btnStyle({ padding: "2px 4px" })}>⚙</button>
                      <button onClick={() => {
                        if (isResource) saveCombate({ recursos: [...(state.recursos || []), { ...n, id: uid(), x: (n.x || 0) + 30, y: (n.y || 0) + 30, nome: `${n.nome} (cópia)` }] });
                        if (isStatus) saveCombate({ statusNodes: [...(state.statusNodes || []), { ...n, id: uid(), x: (n.x || 0) + 30, y: (n.y || 0) + 30, nome: `${n.nome} (cópia)` }] });
                        if (isGeneric) saveCombate({ genericNodes: [...(state.genericNodes || []), { ...n, id: uid(), x: (n.x || 0) + 30, y: (n.y || 0) + 30, label: `${n.label || n.nodeType} (cópia)` }] });
                      }} style={btnStyle({ padding: "2px 4px" })}>⎘</button>
                      <button onClick={() => {
                        if (isResource) saveCombate({ recursos: (state.recursos || []).filter((x) => x.id !== n.id), nodeLinks: links.filter((l) => l.from.id !== n.id && l.to.id !== n.id) });
                        if (isStatus) saveCombate({ statusNodes: (state.statusNodes || []).filter((x) => x.id !== n.id), nodeLinks: links.filter((l) => l.from.id !== n.id && l.to.id !== n.id) });
                        if (isGeneric) saveCombate({ genericNodes: (state.genericNodes || []).filter((x) => x.id !== n.id), nodeLinks: links.filter((l) => l.from.id !== n.id && l.to.id !== n.id) });
                      }} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "2px 4px" })}>✕</button>
                    </div>

                    {isResource && (() => {
                      const max = Math.max(0, Number(n.max || 0));
                      const atual = Math.max(0, Math.min(max, Number(n.atual || 0)));
                      const hover = hoverSlot[n.id];
                      const preview = Number.isInteger(hover) ? hover + 1 : atual;
                      const gasto = Math.max(0, atual - preview);
                      return (
                        <>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {Array.from({ length: max }).map((_, i) => {
                              const on = i < preview;
                              return <button key={i} onMouseEnter={() => setHoverSlot((p) => ({ ...p, [n.id]: i }))} onMouseLeave={() => setHoverSlot((p) => ({ ...p, [n.id]: null }))} onClick={() => {
                                if (atual === 1 && i === 0) updateResourceById(n.id, { atual: 0 });
                                else if (i === atual - 1) updateResourceById(n.id, { atual: Math.max(0, i) });
                                else updateResourceById(n.id, { atual: i + 1 });
                              }} style={slotShapeStyle(n.slotShape || "square", n.cor || "#95a5a6", on)} />;
                            })}
                          </div>
                          <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 10, color: G.muted }}>{atual}/{max} · gasto previsto: {gasto}</div>
                        </>
                      );
                    })()}

                    {isStatus && (() => {
                      const max = Math.max(1, Number(n.max || 1));
                      const val = Math.max(0, Math.min(max, Number(n.val || 0)));
                      return (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 5 }}>
                            <input type="number" value={val} min={0} max={max} onChange={(e) => updateStatusById(n.id, { val: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })} style={inpStyle()} />
                            <input type="number" value={max} min={1} onChange={(e) => updateStatusById(n.id, { max: Math.max(1, Number(e.target.value) || 1) })} style={inpStyle()} />
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: "#111", overflow: "hidden" }}><div style={{ width: `${(val / max) * 100}%`, height: "100%", background: n.cor || "#f39c12" }} /></div>
                        </>
                      );
                    })()}

                    {isGeneric && (() => {
                      const incoming = incomingFor(n.id, "value");
                      return (
                        <>
                          {n.nodeType === "value" && <input type="number" disabled={!!incoming || !!n.sourcePath} value={Number(n.value || 0)} onChange={(e) => updateGenericById(n.id, { value: Number(e.target.value) || 0 })} style={inpStyle()} />}
                          <div style={{ fontFamily: "monospace", color: "#7fb3ff", fontSize: 10, marginTop: 4 }}>out: {String(nodeOutput(n).value ?? nodeOutput(n).color ?? 0)}</div>
                        </>
                      );
                    })()}
                  </div>
                );
              })}
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
            }} style={inpStyle()}><option value="">Adicionar efeito do Caldeirão...</option>{(efeitosCaldeirao || []).map((ef) => <option key={ef.id} value={ef.id}>{ef.nome} · {ef.efeitoMecanico || "—"}</option>)}</select>
            <HoverButton onClick={() => onOpenCaldeirao?.()}>Criar no Caldeirão</HoverButton>
            <HoverButton onClick={() => saveEffects([instantiateEffectFromTemplate(makeDefaultEffect(), { nome: "Novo efeito local", origem: "Local", origemDetalhe: "Combate", ativo: false, rodadaInicio: state.rodadaAtual, sinalizar: false }), ...(charEffects || [])])} style={btnStyle({ borderColor: "#8e44ad55", color: "#dcb3ff" })}>Criar local</HoverButton>
            <HoverButton onClick={ensureItemEffects} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3" })}>Sincronizar itens</HoverButton>
            <HoverButton onClick={() => saveEffects([...(charEffects || [])])}>Atualizar</HoverButton>
          </div>
          {(charEffects || []).map((e) => {
            const isCollapsed = collapsed[e.id] ?? true;
            return <div key={e.id} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, marginBottom: 8, background: "#0a0a0a", display: "grid", gap: 6 }}><div style={{ display: "grid", gridTemplateColumns: "24px 80px 24px 24px 1fr auto auto", gap: 6, alignItems: "center" }}><input type="checkbox" checked={e.ativo !== false} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, ativo: ev.target.checked } : x))} /><select value={e.tipo || "Buff"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, tipo: ev.target.value } : x))} style={inpStyle()}><option>Buff</option><option>Debuff</option></select><button onClick={() => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, sinalizar: !(x.sinalizar !== false) } : x))} style={btnStyle({ padding: "2px 4px" })}>{e.sinalizar !== false ? "🔔" : "🔕"}</button><button onClick={() => setCollapsed((p) => ({ ...p, [e.id]: !isCollapsed }))} style={btnStyle({ padding: "2px 4px" })}>{isCollapsed ? "▸" : "▾"}</button><input value={e.nome || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, nome: ev.target.value } : x))} style={inpStyle()} /><HoverButton onClick={() => saveEffects([{ ...e, id: uid(), nome: `${e.nome || "Efeito"} (cópia)` }, ...(charEffects || [])])}>⎘</HoverButton><HoverButton onClick={() => saveEffects(charEffects.filter((x) => x.id !== e.id))} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton></div>{isCollapsed ? <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>{e.tipo || "—"} · {e.nome || "Sem nome"} · {e.efeitoMecanico || "—"}</div> : <textarea value={e.descricao || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, descricao: ev.target.value } : x))} rows={2} style={inpStyle({ resize: "vertical" })} />}</div>;
          })}
        </div>
      )}

      {state.abaAtiva === "lembretes" && <div><HoverButton onClick={() => saveCombate({ lembretes: [...(state.lembretes || []), { id: uid(), texto: "Novo lembrete", criadoNaRodada: state.rodadaAtual, lembrarNaRodada: state.rodadaAtual + 1, tipo: "emX" }] })}>+ Novo Lembrete</HoverButton></div>}

      {nodePickerOpen && <Modal title="Novo Nó" onClose={() => setNodePickerOpen(false)}><div style={{ display: "grid", gap: 8 }}>{NODE_TYPES.map((t) => <button key={t} onClick={() => openNodeType(t)} style={btnStyle()}>{t}</button>)}</div></Modal>}

      {resourceEditorOpen && <Modal title={editing.id ? "Configurar Recurso" : "Novo Recurso"} onClose={() => setResourceEditorOpen(false)}><div style={{ display: "grid", gap: 8 }}><input value={resourceEditorData.nome || ""} onChange={(e) => setResourceEditorData((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome" style={inpStyle()} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input type="color" value={resourceEditorData.cor || "#95a5a6"} onChange={(e) => setResourceEditorData((p) => ({ ...p, cor: e.target.value }))} style={{ ...inpStyle(), height: 38 }} /><input value={resourceEditorData.descricao || ""} onChange={(e) => setResourceEditorData((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição" style={inpStyle()} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input type="number" min={0} value={Number(resourceEditorData.max || 0)} onChange={(e) => setResourceEditorData((p) => ({ ...p, max: Math.max(0, Number(e.target.value) || 0) }))} style={inpStyle()} /><input type="number" min={0} value={Number(resourceEditorData.atual || 0)} onChange={(e) => setResourceEditorData((p) => ({ ...p, atual: Math.max(0, Number(e.target.value) || 0) }))} style={inpStyle()} /></div><select value={resourceEditorData.slotShape || "square"} onChange={(e) => setResourceEditorData((p) => ({ ...p, slotShape: e.target.value }))} style={inpStyle()}>{SHAPES.map((x) => <option key={x} value={x}>{x}</option>)}</select><div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button onClick={() => setResourceEditorOpen(false)} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button><button onClick={saveResourceEditor} style={btnStyle()}>Salvar</button></div></div></Modal>}

      {statusEditorOpen && <Modal title={editing.id ? "Configurar Barra de Status" : "Nova Barra de Status"} onClose={() => setStatusEditorOpen(false)}><div style={{ display: "grid", gap: 8 }}><input value={statusEditorData.nome || ""} onChange={(e) => setStatusEditorData((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome" style={inpStyle()} /><input value={statusEditorData.sigla || ""} onChange={(e) => setStatusEditorData((p) => ({ ...p, sigla: e.target.value.toUpperCase() }))} placeholder="Sigla" style={inpStyle()} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}><input type="number" value={Number(statusEditorData.base || 0)} onChange={(e) => setStatusEditorData((p) => ({ ...p, base: Number(e.target.value) || 0 }))} style={inpStyle()} /><input type="number" value={Number(statusEditorData.max || 1)} onChange={(e) => setStatusEditorData((p) => ({ ...p, max: Math.max(1, Number(e.target.value) || 1) }))} style={inpStyle()} /><input type="number" value={Number(statusEditorData.val || 0)} onChange={(e) => setStatusEditorData((p) => ({ ...p, val: Math.max(0, Number(e.target.value) || 0) }))} style={inpStyle()} /></div><div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button onClick={() => setStatusEditorOpen(false)} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button><button onClick={saveStatusEditor} style={btnStyle()}>Salvar</button></div></div></Modal>}

      {genericEditorOpen && <Modal title={editing.id ? "Configurar Node Genérico" : "Novo Node Genérico"} onClose={() => setGenericEditorOpen(false)}><div style={{ display: "grid", gap: 8 }}><input value={genericEditorData.label || ""} onChange={(e) => setGenericEditorData((p) => ({ ...p, label: e.target.value }))} placeholder="Rótulo" style={inpStyle()} />{genericEditorData.nodeType === "value" && <><input type="number" value={Number(genericEditorData.value || 0)} onChange={(e) => setGenericEditorData((p) => ({ ...p, value: Number(e.target.value) || 0 }))} style={inpStyle()} /><select value={genericEditorData.sourcePath || ""} onChange={(e) => setGenericEditorData((p) => ({ ...p, sourcePath: e.target.value }))} style={inpStyle()}><option value="">Puxar valor: nenhum</option>{fichaValueOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></>}{genericEditorData.nodeType === "math" && <><select value={genericEditorData.op || "+"} onChange={(e) => setGenericEditorData((p) => ({ ...p, op: e.target.value }))} style={inpStyle()}><option>+</option><option>-</option><option>*</option><option>/</option></select></>}{genericEditorData.nodeType === "conditional" && <><select value={genericEditorData.cmp || ">"} onChange={(e) => setGenericEditorData((p) => ({ ...p, cmp: e.target.value }))} style={inpStyle()}><option value=">">{">"}</option><option value="<">{"<"}</option><option value="=">{"="}</option></select><input type="number" value={Number(genericEditorData.trueValue || 0)} onChange={(e) => setGenericEditorData((p) => ({ ...p, trueValue: Number(e.target.value) || 0 }))} style={inpStyle()} /><input type="number" value={Number(genericEditorData.falseValue || 0)} onChange={(e) => setGenericEditorData((p) => ({ ...p, falseValue: Number(e.target.value) || 0 }))} style={inpStyle()} /></>}{genericEditorData.nodeType === "color" && <input type="color" value={genericEditorData.color || "#95a5a6"} onChange={(e) => setGenericEditorData((p) => ({ ...p, color: e.target.value }))} style={{ ...inpStyle(), height: 38 }} />}<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button onClick={() => setGenericEditorOpen(false)} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button><button onClick={saveGenericEditor} style={btnStyle()}>Salvar</button></div></div></Modal>}
    </div>
  );
}
