import React, { useEffect, useMemo, useRef, useState } from "react";
import { uid } from "../../../core/factories";
import { instantiateEffectFromTemplate } from "../../../core/effects";
import { makeDefaultEffect } from "../../caldeirao/EffectForgeEditor";
import { Modal } from "../../shared/components";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";
import {
  NODE_TYPES, SHAPES, defaultCombatState, defaultResourceForm, defaultStatusForm, defaultGenericForm,
  getFichaValueByPath, toAllNodes, getInputPorts, getOutputPorts, canLink, evaluateNodeOutputs,
} from "./combatNodeSystem";

export function TabCombate({ ficha, onUpdate, efeitosCaldeirao = [], onOpenCaldeirao, onNotify }) {
  const state = useMemo(() => ({ ...defaultCombatState(), ...(ficha.combate || {}) }), [ficha.combate]);
  const [collapsed, setCollapsed] = useState({});
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const [resourceEditorOpen, setResourceEditorOpen] = useState(false);
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const [genericEditorOpen, setGenericEditorOpen] = useState(false);
  const [resourceEditorData, setResourceEditorData] = useState(defaultResourceForm());
  const [statusEditorData, setStatusEditorData] = useState(defaultStatusForm());
  const [genericEditorData, setGenericEditorData] = useState(defaultGenericForm());
  const [editing, setEditing] = useState({ kind: null, id: null });
  const [linkDrag, setLinkDrag] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverSlot, setHoverSlot] = useState({});

  const fullscreenRootRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const dragRef = useRef(null);
  const charEffects = ficha.modificadores?.efeitos || [];

  const saveCombate = (next) => onUpdate({ combate: { ...state, ...next } });
  const saveEffects = (next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), efeitos: next } });
  const setTab = (abaAtiva) => saveCombate({ abaAtiva });
  const setRodada = (rodadaAtual) => saveCombate({ rodadaAtual: Math.max(0, rodadaAtual) });
  const updateResourceById = (id, patch) => saveCombate({ recursos: state.recursos.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const updateStatusById = (id, patch) => saveCombate({ statusNodes: (state.statusNodes || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const updateGenericById = (id, patch) => saveCombate({ genericNodes: (state.genericNodes || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const allNodes = useMemo(() => toAllNodes(state), [state]);
  const outputs = useMemo(() => evaluateNodeOutputs(state, ficha), [state, ficha]);
  const links = state.nodeLinks || [];

  const fichaValueOptions = useMemo(() => {
    const out = [];
    Object.keys(ficha?.status || {}).forEach((k) => { out.push({ label: `Status ${k} atual`, value: `status.${k}.val` }); out.push({ label: `Status ${k} max`, value: `status.${k}.max` }); });
    Object.keys(ficha?.atributos || {}).forEach((k) => out.push({ label: `Atributo ${k}`, value: `atributos.${k}.val` }));
    Object.keys(ficha?.pericias || {}).forEach((k) => out.push({ label: `Perícia ${k}`, value: `pericias.${k}` }));
    return out;
  }, [ficha]);

  const activeLembretes = (state.lembretes || []).filter((l) => (l.tipo === "naRodada" ? l.lembrarNaRodada : (l.criadoNaRodada + l.lembrarNaRodada)) === state.rodadaAtual);
  const activeEfeitos = (charEffects || []).filter((e) => e.ativo !== false);
  const notifyingEffects = activeEfeitos.filter((e) => e.sinalizar !== false);

  const proxRodada = () => {
    const recursos = (state.recursos || []).map((r) => ({ ...r, atual: Number(outputs[r.id]?.max ?? r.max) }));
    saveCombate({ rodadaAtual: state.rodadaAtual + 1, recursos });
    onNotify?.("Nova rodada: recursos resetados para o máximo.", "info");
  };

  const ensureItemEffects = () => {
    const invEffects = (ficha.inventario || []).flatMap((entry) => ((entry.item || {}).efeitos || []).filter((ef) => ef?.origemEffectId).map((ef) => ({ ef, item: entry.item || {} })));
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

  const getPortY = (index) => 22 + index * 20;
  const getPortLabel = (port) => ({ atual: "atual", max: "máx", base: "base", val: "valor", value: "valor", cor: "cor", zero: "zero", a: "A", b: "B", trueValue: "true", falseValue: "false", qty: "qtd", faces: "dado", bonus: "bônus", critMin: "crit min", critMax: "crit max", critValue: "valor crit", failValue: "valor falha", crit: "crítico" }[port] || port);
  const getLinkColor = (port, fromNode) => {
    if (port === "cor") return outputs[fromNode?.id || ""]?.cor || fromNode?.cor || "#95a5a6";
    if (port === "zero") return "#f39c12";
    if (port === "crit") return "#ff5f7a";
    return "#7dd3fc";
  };

  const clientToWorld = (clientX, clientY) => {
    if (!canvasWrapRef.current) return { x: 0, y: 0 };
    const r = canvasWrapRef.current.getBoundingClientRect();
    return { x: (clientX - r.left - viewport.x) / viewport.zoom, y: (clientY - r.top - viewport.y) / viewport.zoom };
  };

  const beginLinkDrag = (from, e) => {
    e.preventDefault();
    e.stopPropagation();
    const mouse = clientToWorld(e.clientX, e.clientY);
    setLinkDrag({ from, mouse });
  };

  const completeLinkDrop = (to) => {
    if (!linkDrag) return;
    const fromNode = allNodes.find((n) => n.id === linkDrag.from.id);
    const toNode = allNodes.find((n) => n.id === to.id);
    if (!fromNode || !toNode || !canLink(fromNode, linkDrag.from.port, toNode, to.port)) {
      onNotify?.("Erro: esse node não pode ser ligado a um node desse tipo.", "error");
      setLinkDrag(null);
      return;
    }
    const filtered = links.filter((l) => !(l.to.id === to.id && l.to.port === to.port));
    saveCombate({ nodeLinks: [...filtered, { id: uid(), from: linkDrag.from, to }] });
    setLinkDrag(null);
  };

  const startUnlinkDrag = (to, e) => {
    e.preventDefault();
    e.stopPropagation();
    const existing = links.find((l) => l.to.id === to.id && l.to.port === to.port);
    if (!existing) return;
    saveCombate({ nodeLinks: links.filter((l) => l.id !== existing.id) });
    const mouse = clientToWorld(e.clientX, e.clientY);
    setLinkDrag({ from: existing.from, mouse });
  };

  const onWheelCanvas = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dir = e.deltaY > 0 ? -0.08 : 0.08;
    setViewport((p) => ({ ...p, zoom: Math.max(0.45, Math.min(2.2, Number((p.zoom + dir).toFixed(2)))) }));
  };


  const onCanvasMouseDown = (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    dragRef.current = { kind: "pan", startX: e.clientX, startY: e.clientY, viewX: viewport.x, viewY: viewport.y };
  };

  const onNodeMouseDown = (node, e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button,input,select,textarea")) return;
    e.preventDefault();
    dragRef.current = { kind: "node", nodeId: node.id, startX: e.clientX, startY: e.clientY, nodeX: node.x || 0, nodeY: node.y || 0 };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (linkDrag) {
        setLinkDrag((p) => (p ? { ...p, mouse: clientToWorld(e.clientX, e.clientY) } : p));
      }
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "pan") {
        setViewport((p) => ({ ...p, x: d.viewX + (e.clientX - d.startX), y: d.viewY + (e.clientY - d.startY) }));
        return;
      }
      const dx = (e.clientX - d.startX) / viewport.zoom;
      const dy = (e.clientY - d.startY) / viewport.zoom;
      const patch = { x: Math.round(d.nodeX + dx), y: Math.round(d.nodeY + dy) };
      const node = allNodes.find((x) => x.id === d.nodeId);
      if (!node) return;
      if (node.kind === "resource") updateResourceById(node.id, patch);
      else if (node.kind === "status") updateStatusById(node.id, patch);
      else updateGenericById(node.id, patch);
    };
    const onUp = () => {
      dragRef.current = null;
      setLinkDrag(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [viewport.zoom, allNodes, linkDrag]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === fullscreenRootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const onCanvasEnter = () => { document.body.style.overflow = "hidden"; };
  const onCanvasLeave = () => { document.body.style.overflow = ""; dragRef.current = null; };

  const getCanvasCenterWorld = () => {
    if (!canvasWrapRef.current) return { x: Math.round((420 - viewport.x) / viewport.zoom), y: Math.round((220 - viewport.y) / viewport.zoom) };
    const rect = canvasWrapRef.current.getBoundingClientRect();
    return {
      x: Math.round((rect.width / 2 - viewport.x - 110 * viewport.zoom) / viewport.zoom),
      y: Math.round((rect.height / 2 - viewport.y - 60 * viewport.zoom) / viewport.zoom),
    };
  };

  const openNodeType = (type) => {
    setNodePickerOpen(false);
    setEditing({ kind: null, id: null });
    const c = getCanvasCenterWorld();
    if (type === "Recurso") { setResourceEditorData({ ...defaultResourceForm(), ...c }); setResourceEditorOpen(true); return; }
    if (type === "Barra de Status") { setStatusEditorData({ ...defaultStatusForm(), ...c }); setStatusEditorOpen(true); return; }
    setGenericEditorData({ ...defaultGenericForm(type), ...c });
    setGenericEditorOpen(true);
  };

  const saveResourceEditor = () => {
    const p = { ...resourceEditorData, max: Math.max(0, Number(resourceEditorData.max) || 0), atual: Math.max(0, Math.min(Number(resourceEditorData.atual) || 0, Math.max(0, Number(resourceEditorData.max) || 0))) };
    if (!editing.id) { const c = getCanvasCenterWorld(); saveCombate({ recursos: [...(state.recursos || []), { id: uid(), ...c, ...p }] }); }
    else updateResourceById(editing.id, p);
    setResourceEditorOpen(false);
  };

  const saveStatusEditor = () => {
    const p = { ...statusEditorData, sigla: String(statusEditorData.sigla || "NOV").toUpperCase(), max: Math.max(1, Number(statusEditorData.max || 1)), val: Math.max(0, Math.min(Number(statusEditorData.val || 0), Math.max(1, Number(statusEditorData.max || 1)))) };
    if (!editing.id) { const c = getCanvasCenterWorld(); saveCombate({ statusNodes: [...(state.statusNodes || []), { id: uid(), ...c, ...p }] }); }
    else updateStatusById(editing.id, p);
    setStatusEditorOpen(false);
  };

  const saveGenericEditor = () => {
    const p = { ...genericEditorData };
    if (!editing.id) { const c = getCanvasCenterWorld(); saveCombate({ genericNodes: [...(state.genericNodes || []), { id: uid(), ...c, ...p }] }); }
    else updateGenericById(editing.id, p);
    setGenericEditorOpen(false);
  };

  const toggleFullscreen = async () => {
    if (!fullscreenRootRef.current) return;
    if (document.fullscreenElement === fullscreenRootRef.current) await document.exitFullscreen();
    else await fullscreenRootRef.current.requestFullscreen();
  };

  return (
    <>
      <style>{`@keyframes canvasGlow {0%{background-position:0% 40%}50%{background-position:100% 60%}100%{background-position:0% 40%}} @keyframes nodePop {0%{transform:translateY(0)}50%{transform:translateY(-1px)}100%{transform:translateY(0)}}`}</style>
    <div ref={fullscreenRootRef} style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 12, position: "relative", minHeight: undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2 }}>◈ COMBATE</span>
        {!isFullscreen && <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <HoverButton onClick={() => setRodada(state.rodadaAtual - 1)}>&lt;</HoverButton>
          <span style={{ fontFamily: "monospace", color: "#8ec8ff" }}>Rodada {state.rodadaAtual}</span>
          <HoverButton onClick={() => setRodada(state.rodadaAtual + 1)}>&gt;</HoverButton>
          <HoverButton onClick={proxRodada}>Próx</HoverButton>
        </div>}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, opacity: isFullscreen ? 0.9 : 1 }}>
        {["recursos", "efeitos", "lembretes"].map((aba) => {
          const hasAlert = aba === "lembretes" ? activeLembretes.length > 0 : aba === "efeitos" ? notifyingEffects.length > 0 : false;
          return <button key={aba} onClick={() => setTab(aba)} style={{ ...btnStyle({ padding: "6px 12px" }), borderColor: state.abaAtiva === aba ? "#5dade266" : undefined, color: state.abaAtiva === aba ? "#b6ddff" : undefined, position: "relative" }}>{aba[0].toUpperCase() + aba.slice(1)}{hasAlert && <span style={{ position: "absolute", top: -6, right: -6, color: "#ff4d6d" }}>❗</span>}</button>;
        })}
      </div>

      {state.abaAtiva === "recursos" && (
        <div>
          {!isFullscreen && <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <HoverButton onClick={() => setNodePickerOpen(true)}>+ Novo Nó</HoverButton>
            <HoverButton onClick={() => saveCombate({ recursos: (state.recursos || []).map((r) => ({ ...r, atual: Number(outputs[r.id]?.max ?? r.max) })) })} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3" })}>Resetar Recursos</HoverButton>
            <HoverButton onClick={toggleFullscreen} style={btnStyle({ borderColor: "#3498db55", color: "#8fc8ff" })}>⛶</HoverButton>
          </div>}

          <div
            ref={canvasWrapRef}
            onWheel={onWheelCanvas}
            onMouseDown={onCanvasMouseDown}
            onMouseEnter={onCanvasEnter}
            onMouseLeave={onCanvasLeave}
            style={{ border: "1px solid #2a2a2a", borderRadius: 12, background: "radial-gradient(circle at 20% 20%, #14203a 0, #0b101d 45%, #07090f 100%)", backgroundSize: "120% 120%", animation: "canvasGlow 9s ease-in-out infinite", height: isFullscreen ? "100vh" : 340, overflow: "hidden", position: "relative", cursor: "grab", transition: "all .2s ease" }}
          >
            {isFullscreen && <div style={{ position: "absolute", top: 10, right: 10, zIndex: 30, display: "flex", gap: 6, alignItems: "center", background: "#05070bcc", border: "1px solid #335", borderRadius: 10, padding: "6px 8px" }}>
              <HoverButton onClick={() => setNodePickerOpen(true)} style={btnStyle({ padding: "5px 8px" })}>+ Nó</HoverButton>
              <HoverButton onClick={() => setRodada(state.rodadaAtual - 1)} style={btnStyle({ padding: "5px 8px" })}>&lt;</HoverButton>
              <span style={{ fontFamily: "monospace", color: "#8ec8ff", minWidth: 72, textAlign: "center" }}>Rod {state.rodadaAtual}</span>
              <HoverButton onClick={() => setRodada(state.rodadaAtual + 1)} style={btnStyle({ padding: "5px 8px" })}>&gt;</HoverButton>
              <HoverButton onClick={proxRodada} style={btnStyle({ padding: "5px 8px" })}>Próx</HoverButton>
              <HoverButton onClick={() => saveCombate({ recursos: (state.recursos || []).map((r) => ({ ...r, atual: Number(outputs[r.id]?.max ?? r.max) })) })} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3", padding: "5px 8px" })}>Reset</HoverButton>
              <HoverButton onClick={toggleFullscreen} style={btnStyle({ borderColor: "#3498db55", color: "#8fc8ff", padding: "5px 8px" })}>🡼</HoverButton>
            </div>}

            <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "top left", width: 2000, height: 1400, position: "relative" }}>
              <svg style={{ position: "absolute", inset: 0, width: 2000, height: 1400, pointerEvents: "none", overflow: "visible" }}>
                {links.map((l) => {
                  const from = allNodes.find((n) => n.id === l.from.id);
                  const to = allNodes.find((n) => n.id === l.to.id);
                  if (!from || !to) return null;
                  const fromPorts = getOutputPorts(from);
                  const toPorts = getInputPorts(to);
                  const fromIndex = Math.max(0, fromPorts.indexOf(l.from.port));
                  const toIndex = Math.max(0, toPorts.indexOf(l.to.port));
                  const y1 = (from.y || 0) + getPortY(fromIndex);
                  const y2 = (to.y || 0) + getPortY(toIndex);
                  const x1 = (from.x || 0) + 222;
                  const x2 = (to.x || 0) - 2;
                  const c1 = x1 + Math.max(24, Math.abs(x2 - x1) * 0.32);
                  const c2 = x2 - Math.max(24, Math.abs(x2 - x1) * 0.32);
                  const pathD = `M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`;
                  const stroke = getLinkColor(l.from.port, from);
                  return (
                    <g key={l.id}>
                      <line x1={x1 - 5} y1={y1} x2={x1 + 1} y2={y1} stroke="#000" strokeWidth="4" />
                      <line x1={x2 - 1} y1={y2} x2={x2 + 5} y2={y2} stroke="#000" strokeWidth="4" />
                      <path d={pathD} stroke="#000" fill="none" strokeWidth="6" strokeLinecap="round" />
                      <path d={pathD} stroke={stroke} fill="none" strokeWidth="3" strokeLinecap="round" />
                    </g>
                  );
                })}
                {linkDrag && (() => {
                  const from = allNodes.find((n) => n.id === linkDrag.from.id);
                  if (!from) return null;
                  const fromPorts = getOutputPorts(from);
                  const fromIndex = Math.max(0, fromPorts.indexOf(linkDrag.from.port));
                  const x1 = (from.x || 0) + 222;
                  const y1 = (from.y || 0) + getPortY(fromIndex);
                  const x2 = linkDrag.mouse.x;
                  const y2 = linkDrag.mouse.y;
                  const c1 = x1 + 28;
                  const c2 = x2 - 28;
                  const d = `M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`;
                  const stroke = getLinkColor(linkDrag.from.port, from);
                  return <g><path d={d} stroke="#000" fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray="6 4" /><path d={d} stroke={stroke} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" /></g>;
                })()}
              </svg>
              <div style={{ position: "absolute", left: 1000, top: 0, width: 1, height: 1400, background: "#ffffff14" }} />
              <div style={{ position: "absolute", left: 0, top: 700, width: 2000, height: 1, background: "#ffffff14" }} />
              {allNodes.map((n) => {
                const out = outputs[n.id] || {};
                const cor = out.cor || n.cor || "#95a5a6";
                const inputPorts = getInputPorts(n);
                const outputPorts = getOutputPorts(n);
                const incomingValue = links.find((l) => l.to.id === n.id && l.to.port === "value");
                const hasInputLink = (port) => links.some((l) => l.to.id === n.id && l.to.port === port);
                return (
                  <div key={n.id} onMouseDown={(e) => onNodeMouseDown(n, e)} style={{ position: "absolute", left: n.x || 0, top: n.y || 0, width: 220, border: `1px solid ${cor}77`, borderRadius: 12, background: "#000000bb", padding: 8, boxShadow: "0 0 18px #000", userSelect: "none", animation: "nodePop 4s ease-in-out infinite", transition: "box-shadow .2s ease, border-color .2s ease" }}>
                    <div style={{ position: "absolute", left: -36, top: 14, display: "grid", gap: 4 }}>
                      {inputPorts.map((p, i) => {
                        const linked = links.some((l) => l.to.id === n.id && l.to.port === p);
                        return (
                          <div key={p} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: 18 }}>
                            <button onMouseDown={(e) => startUnlinkDrag({ id: n.id, port: p }, e)} onMouseUp={(e) => { e.stopPropagation(); completeLinkDrop({ id: n.id, port: p }); }} style={{ width: 14, height: 14, borderRadius: "50%", border: `1px solid ${cor}aa`, background: linked ? `radial-gradient(circle at 35% 35%, #fff, ${cor})` : "radial-gradient(circle at 35% 35%, #242b38, #10131a)", boxShadow: linked ? `0 0 6px ${cor}` : "inset 0 0 0 1px #000", cursor: "crosshair", transition: "all .15s ease" }} title={`Input: ${getPortLabel(p)}`} />
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ position: "absolute", right: -36, top: 14, display: "grid", gap: 4 }}>
                      {outputPorts.map((p) => {
                        const active = linkDrag?.from?.id === n.id && linkDrag?.from?.port === p;
                        return (
                          <div key={p} style={{ display: "flex", alignItems: "center", height: 18 }}>
                            <button onMouseDown={(e) => beginLinkDrag({ id: n.id, port: p }, e)} style={{ width: 14, height: 14, borderRadius: "50%", border: `1px solid ${cor}aa`, background: active ? `radial-gradient(circle at 35% 35%, #fff, ${cor})` : "radial-gradient(circle at 35% 35%, #f0f3ff, #1b2030)", boxShadow: active ? `0 0 8px ${cor}` : "inset 0 0 0 1px #000", cursor: "grab", transition: "all .15s ease" }} title={`Output: ${getPortLabel(p)}`} />
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 5, alignItems: "center", marginBottom: 6 }}>
                      <div style={{ color: cor, fontFamily: "'Cinzel',serif", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.kind === "resource" ? n.nome : n.kind === "status" ? `${n.nome} (${n.sigla})` : (n.label || n.nodeType)}</div>
                      <button onClick={() => {
                        if (n.kind === "resource") { setEditing({ kind: "resource", id: n.id }); setResourceEditorData({ ...n }); setResourceEditorOpen(true); }
                        else if (n.kind === "status") { setEditing({ kind: "status", id: n.id }); setStatusEditorData({ ...n }); setStatusEditorOpen(true); }
                        else { setEditing({ kind: "generic", id: n.id }); setGenericEditorData({ ...n }); setGenericEditorOpen(true); }
                      }} style={btnStyle({ padding: "2px 4px" })}>⚙</button>
                      <button onClick={() => {
                        if (n.kind === "resource") saveCombate({ recursos: [...(state.recursos || []), { ...n, id: uid(), x: (n.x || 0) + 24, y: (n.y || 0) + 24, nome: `${n.nome} (cópia)` }] });
                        else if (n.kind === "status") saveCombate({ statusNodes: [...(state.statusNodes || []), { ...n, id: uid(), x: (n.x || 0) + 24, y: (n.y || 0) + 24, nome: `${n.nome} (cópia)` }] });
                        else saveCombate({ genericNodes: [...(state.genericNodes || []), { ...n, id: uid(), x: (n.x || 0) + 24, y: (n.y || 0) + 24, label: `${n.label || n.nodeType} (cópia)` }] });
                      }} style={btnStyle({ padding: "2px 4px" })}>⎘</button>
                      <button onClick={() => {
                        if (n.kind === "resource") saveCombate({ recursos: (state.recursos || []).filter((x) => x.id !== n.id), nodeLinks: links.filter((l) => l.from.id !== n.id && l.to.id !== n.id) });
                        else if (n.kind === "status") saveCombate({ statusNodes: (state.statusNodes || []).filter((x) => x.id !== n.id), nodeLinks: links.filter((l) => l.from.id !== n.id && l.to.id !== n.id) });
                        else saveCombate({ genericNodes: (state.genericNodes || []).filter((x) => x.id !== n.id), nodeLinks: links.filter((l) => l.from.id !== n.id && l.to.id !== n.id) });
                      }} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "2px 4px" })}>✕</button>
                    </div>

                    {n.kind === "resource" && (() => {
                      const maxLinked = hasInputLink("max");
                      const atualLinked = hasInputLink("atual");
                      const max = Math.max(0, Number(out.max ?? n.max ?? 0));
                      const atual = Math.max(0, Math.min(max, Number(out.value ?? n.atual ?? 0)));
                      const hover = hoverSlot[n.id];
                      const preview = Number.isInteger(hover) ? hover + 1 : atual;
                      const gasto = Math.max(0, atual - preview);
                      return (
                        <>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {Array.from({ length: max }).map((_, i) => {
                              const on = i < preview;
                              const style = { width: 18, height: 18, border: `1px solid ${cor}`, background: on ? cor : "#151515", opacity: on ? 1 : 0.35, borderRadius: n.slotShape === "circle" ? "50%" : n.slotShape === "triangle" ? 0 : 4, clipPath: n.slotShape === "triangle" ? "polygon(50% 0, 0 100%, 100% 100%)" : undefined };
                              return <button key={i} disabled={atualLinked} onMouseEnter={() => setHoverSlot((p) => ({ ...p, [n.id]: i }))} onMouseLeave={() => setHoverSlot((p) => ({ ...p, [n.id]: null }))} onClick={() => {
                                if (atualLinked) return;
                                if (atual === 1 && i === 0) updateResourceById(n.id, { atual: 0 });
                                else if (i === atual - 1) updateResourceById(n.id, { atual: Math.max(0, i) });
                                else updateResourceById(n.id, { atual: i + 1 });
                              }} style={{ ...style, cursor: atualLinked ? "not-allowed" : "pointer" }} />;
                            })}
                          </div>
                          <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 10, color: G.muted }}>{atual}/{max} · gasto previsto: {gasto}{maxLinked ? " · máx via link" : ""}{atualLinked ? " · atual via link" : ""}</div>
                        </>
                      );
                    })()}

                    {n.kind === "status" && (() => {
                      const max = Math.max(1, Number(out.max ?? n.max ?? 1));
                      const val = Math.max(0, Math.min(max, Number(out.value ?? n.val ?? 0)));
                      return (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 4 }}>
                            <input type="number" disabled={hasInputLink("val")} value={val} min={0} max={max} onChange={(e) => updateStatusById(n.id, { val: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })} style={inpStyle()} />
                            <input type="number" disabled={hasInputLink("max")} value={max} min={1} onChange={(e) => updateStatusById(n.id, { max: Math.max(1, Number(e.target.value) || 1) })} style={inpStyle()} />
                          </div>
                          <div style={{ height: 10, borderRadius: 5, background: "#111", overflow: "hidden", border: "1px solid #000" }}><div style={{ width: `${(val / max) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${cor}, #ffffff33)` }} /></div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4, fontFamily: "monospace", fontSize: 10, color: G.muted }}><span>base: {Number(out.base ?? n.base ?? 0)}</span><span style={{ textAlign: "right" }}>{Math.round((val / max) * 100)}%</span></div>
                          <div style={{ marginTop: 2, fontFamily: "monospace", fontSize: 10, color: G.muted }}>zero output: {Number(out.zero || 0)}{hasInputLink("base") ? " · base via link" : ""}</div>
                        </>
                      );
                    })()}

                    {n.kind === "generic" && (
                      <>
                        {n.nodeType === "value" && <input type="number" disabled={!!incomingValue || !!n.sourcePath || hasInputLink("value")} value={Number(n.value || 0)} onChange={(e) => updateGenericById(n.id, { value: Number(e.target.value) || 0 })} style={inpStyle()} />}
                        {n.nodeType === "comment" && <div style={{ padding: 6, borderRadius: 6, background: Number(out.value || 0) > 0 ? "#f1c40f22" : "#111", boxShadow: Number(out.value || 0) > 0 ? "0 0 12px #f1c40f99" : "none", color: G.text, minHeight: 34 }}>{n.text || "Comentário"}</div>}
                        {n.nodeType === "dice" && <div style={{ display: "grid", gap: 4 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                            <input type="number" disabled={hasInputLink("qty")} value={Number(n.qty || 1)} onChange={(e) => updateGenericById(n.id, { qty: Math.max(1, Number(e.target.value) || 1) })} style={inpStyle()} />
                            <button onClick={() => {
                              const q = Math.max(1, Number(n.qty || 1));
                              const d = Math.max(2, Number(n.faces || 20));
                              let total = 0; let natural = 0;
                              for (let i = 0; i < q; i += 1) { const r = 1 + Math.floor(Math.random() * d); total += r; if (r > natural) natural = r; }
                              updateGenericById(n.id, { lastRoll: natural, rolledTotal: total });
                            }} style={btnStyle({ padding: "4px 8px" })}>Rolar</button>
                          </div>
                          <div style={{ fontFamily: "monospace", fontSize: 10, color: G.muted }}>d{Number(n.faces || 20)} + {Number(n.bonus || 0)} | nat: {Number(n.lastRoll || 0)} | out: {Number(out.value || 0)} | crit: {Number(out.crit || 0)}</div>
                        </div>}
                        <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 10, color: G.muted }}>out: {String(out.value ?? out.cor ?? 0)}{out.crit !== undefined ? ` · crit: ${String(out.crit)}` : ""}</div>
                      </>
                    )}
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

      {genericEditorOpen && <Modal title={editing.id ? "Configurar Node Genérico" : "Novo Node Genérico"} onClose={() => setGenericEditorOpen(false)}><div style={{ display: "grid", gap: 8 }}><input value={genericEditorData.label || ""} onChange={(e) => setGenericEditorData((p) => ({ ...p, label: e.target.value }))} placeholder="Rótulo" style={inpStyle()} />{genericEditorData.nodeType === "value" && <><input type="number" value={Number(genericEditorData.value || 0)} onChange={(e) => setGenericEditorData((p) => ({ ...p, value: Number(e.target.value) || 0 }))} style={inpStyle()} /><select value={genericEditorData.sourcePath || ""} onChange={(e) => setGenericEditorData((p) => ({ ...p, sourcePath: e.target.value }))} style={inpStyle()}><option value="">Puxar valor: nenhum</option>{fichaValueOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></>}{genericEditorData.nodeType === "math" && <select value={genericEditorData.op || "+"} onChange={(e) => setGenericEditorData((p) => ({ ...p, op: e.target.value }))} style={inpStyle()}><option>+</option><option>-</option><option>*</option><option>/</option></select>}{genericEditorData.nodeType === "conditional" && <><select value={genericEditorData.cmp || ">"} onChange={(e) => setGenericEditorData((p) => ({ ...p, cmp: e.target.value }))} style={inpStyle()}><option value=">">{">"}</option><option value="<">{"<"}</option><option value="=">{"="}</option></select><input type="number" value={Number(genericEditorData.trueValue || 0)} onChange={(e) => setGenericEditorData((p) => ({ ...p, trueValue: Number(e.target.value) || 0 }))} style={inpStyle()} /><input type="number" value={Number(genericEditorData.falseValue || 0)} onChange={(e) => setGenericEditorData((p) => ({ ...p, falseValue: Number(e.target.value) || 0 }))} style={inpStyle()} /></>}{genericEditorData.nodeType === "color" && <input type="color" value={genericEditorData.color || "#95a5a6"} onChange={(e) => setGenericEditorData((p) => ({ ...p, color: e.target.value }))} style={{ ...inpStyle(), height: 38 }} />}{genericEditorData.nodeType === "comment" && <textarea value={genericEditorData.text || ""} onChange={(e) => setGenericEditorData((p) => ({ ...p, text: e.target.value }))} rows={3} style={inpStyle()} />}{genericEditorData.nodeType === "dice" && <><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input type="number" value={Number(genericEditorData.qty || 1)} onChange={(e) => setGenericEditorData((p) => ({ ...p, qty: Math.max(1, Number(e.target.value) || 1) }))} style={inpStyle()} /><input type="number" value={Number(genericEditorData.faces || 20)} onChange={(e) => setGenericEditorData((p) => ({ ...p, faces: Math.max(2, Number(e.target.value) || 2) }))} style={inpStyle()} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input type="number" value={Number(genericEditorData.critMin || 20)} onChange={(e) => setGenericEditorData((p) => ({ ...p, critMin: Number(e.target.value) || 1 }))} style={inpStyle()} /><input type="number" value={Number(genericEditorData.critMax || 20)} onChange={(e) => setGenericEditorData((p) => ({ ...p, critMax: Number(e.target.value) || 1 }))} style={inpStyle()} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}><input type="number" value={Number(genericEditorData.bonus || 0)} onChange={(e) => setGenericEditorData((p) => ({ ...p, bonus: Number(e.target.value) || 0 }))} style={inpStyle()} /><input type="number" value={Number(genericEditorData.critValue || 1)} onChange={(e) => setGenericEditorData((p) => ({ ...p, critValue: Number(e.target.value) || 0 }))} style={inpStyle()} /><input type="number" value={Number(genericEditorData.failValue || -1)} onChange={(e) => setGenericEditorData((p) => ({ ...p, failValue: Number(e.target.value) || 0 }))} style={inpStyle()} /></div></>}<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button onClick={() => setGenericEditorOpen(false)} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button><button onClick={saveGenericEditor} style={btnStyle()}>Salvar</button></div></div></Modal>}
    </div>
    </>
  );
}
