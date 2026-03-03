import React, { useMemo, useRef, useState } from "react";
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
  recursos: [
    { id: uid(), nome: "MOV", cor: "#2ecc71", max: 2, atual: 2, descricao: "", slotIconMode: "shape", slotShape: "square", x: 40, y: 40 },
    { id: uid(), nome: "ACO", cor: "#3498db", max: 1, atual: 1, descricao: "", slotIconMode: "shape", slotShape: "square", x: 280, y: 40 },
    { id: uid(), nome: "REA", cor: "#e74c3c", max: 1, atual: 1, descricao: "", slotIconMode: "shape", slotShape: "square", x: 520, y: 40 },
    { id: uid(), nome: "ESF", cor: "#8b0000", max: 1, atual: 1, descricao: "", slotIconMode: "shape", slotShape: "square", x: 760, y: 40 },
  ],
});

const EFFECT_TARGETS = ["Portador", "Alvo", "Área", "Condição", "Todos"];
const DEFAULT_RESOURCE_COLORS = { MOV: "#2ecc71", ACO: "#3498db", REA: "#e74c3c", ESF: "#8b0000" };
const SHAPES = ["square", "circle", "diamond", "triangle", "hex"];

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
  const base = {
    width: 22,
    height: 22,
    border: `1px solid ${color}`,
    background: active ? color : "#151515",
    opacity: active ? 1 : 0.35,
    boxShadow: active ? `0 0 10px ${color}99` : "none",
    transition: "all .14s",
  };
  if (shape === "circle") return { ...base, borderRadius: "50%" };
  if (shape === "diamond") return { ...base, transform: "rotate(45deg)", borderRadius: 4 };
  if (shape === "triangle") return { width: 0, height: 0, background: "transparent", borderLeft: "11px solid transparent", borderRight: "11px solid transparent", borderBottom: `22px solid ${active ? color : "#444"}`, boxShadow: "none", opacity: active ? 1 : 0.5 };
  if (shape === "hex") return { ...base, clipPath: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)" };
  return { ...base, borderRadius: 6 };
}

function defaultResourceForm() {
  return { nome: "NOVO", cor: "#95a5a6", max: 1, atual: 1, descricao: "", slotIconMode: "shape", slotShape: "square", slotIconUrl: "", slotIconData: "" };
}

export function TabCombate({ ficha, onUpdate, efeitosCaldeirao = [], onOpenCaldeirao, onNotify }) {
  const state = useMemo(() => ({ ...defaultCombate(), ...(ficha.combate || {}) }), [ficha.combate]);
  const [collapsed, setCollapsed] = useState({});
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragItemId, setDragItemId] = useState(null);
  const [hoverSlot, setHoverSlot] = useState({});
  const [resourceEditorOpen, setResourceEditorOpen] = useState(false);
  const [resourceEditorData, setResourceEditorData] = useState(defaultResourceForm());
  const [editingResourceId, setEditingResourceId] = useState(null);
  const dragRef = useRef(null);
  const fileInputRef = useRef(null);
  const charEffects = ficha.modificadores?.efeitos || [];

  const saveCombate = (next) => onUpdate({ combate: { ...state, ...next } });
  const saveEffects = (next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), efeitos: next } });

  // keep API centralized for future remote integration
  const updateResourceById = (id, patch) => saveCombate({ recursos: state.recursos.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const consumeResource = (id, amount = 1) => {
    const r = (state.recursos || []).find((x) => x.id === id);
    if (!r) return;
    updateResourceById(id, { atual: Math.max(0, (r.atual || 0) - amount) });
  };

  const setTab = (abaAtiva) => saveCombate({ abaAtiva });
  const setRodada = (rodadaAtual) => saveCombate({ rodadaAtual: Math.max(0, rodadaAtual) });

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
    if (!invEffects.length) return;

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

  const beginResourceDrag = (e, id) => {
    const r = (state.recursos || []).find((x) => x.id === id);
    if (!r) return;
    dragRef.current = { mode: "item", itemId: id, startX: e.clientX, startY: e.clientY, ix: r.x || 0, iy: r.y || 0 };
    setDragItemId(id);
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
    if (d.mode === "item") {
      updateResourceById(d.itemId, { x: d.ix + (dx / viewport.zoom), y: d.iy + (dy / viewport.zoom) });
    }
  };

  const stopDrag = () => {
    dragRef.current = null;
    setDragItemId(null);
  };

  const onCanvasWheel = (e) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? -0.08 : 0.08;
    setViewport((p) => ({ ...p, zoom: Math.max(0.45, Math.min(2.2, Number((p.zoom + dir).toFixed(2)))) }));
  };

  const openResourceEditor = (resource = null) => {
    setEditingResourceId(resource?.id || null);
    setResourceEditorData(resource ? { ...defaultResourceForm(), ...resource } : defaultResourceForm());
    setResourceEditorOpen(true);
  };

  const saveResourceEditor = () => {
    const payload = {
      ...resourceEditorData,
      nome: String(resourceEditorData.nome || "NOVO").trim() || "NOVO",
      cor: resourceEditorData.cor || "#95a5a6",
      max: Math.max(0, Number(resourceEditorData.max) || 0),
      atual: Math.max(0, Math.min(Number(resourceEditorData.atual) || 0, Math.max(0, Number(resourceEditorData.max) || 0))),
      x: Number(resourceEditorData.x || 80),
      y: Number(resourceEditorData.y || 80),
    };
    if (!editingResourceId) {
      saveCombate({ recursos: [...(state.recursos || []), { id: uid(), ...payload }] });
      onNotify?.("Novo recurso criado.", "success");
    } else {
      updateResourceById(editingResourceId, payload);
      onNotify?.("Recurso atualizado.", "success");
    }
    setResourceEditorOpen(false);
  };

  const onUploadSlotIcon = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResourceEditorData((p) => ({ ...p, slotIconData: String(reader.result || ""), slotIconMode: "upload" }));
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 12 }}>
      <style>{`@keyframes pulseSlot {0% {transform: scale(1);} 50% {transform: scale(1.08);} 100% {transform: scale(1);} }`}</style>
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
          return (
            <button key={aba} onClick={() => setTab(aba)} style={{ ...btnStyle({ padding: "6px 12px" }), borderColor: state.abaAtiva === aba ? "#5dade266" : undefined, color: state.abaAtiva === aba ? "#b6ddff" : undefined, position: "relative" }}>
              {aba[0].toUpperCase() + aba.slice(1)}
              {hasAlert && <span style={{ position: "absolute", top: -6, right: -6, color: "#ff4d6d" }}>❗</span>}
            </button>
          );
        })}
      </div>

      {state.abaAtiva === "recursos" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <HoverButton onClick={() => openResourceEditor()}>+ Novo recurso</HoverButton>
            <HoverButton onClick={() => saveCombate({ recursos: (state.recursos || []).map((r) => ({ ...r, atual: r.max })) })} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3" })}>Resetar Recursos</HoverButton>
            <HoverButton onClick={() => setViewport((p) => ({ ...p, zoom: Math.max(0.45, Number((p.zoom - 0.1).toFixed(2))) }))}>− Zoom</HoverButton>
            <HoverButton onClick={() => setViewport((p) => ({ ...p, zoom: Math.min(2.2, Number((p.zoom + 0.1).toFixed(2))) }))}>+ Zoom</HoverButton>
            <span style={{ fontFamily: "monospace", color: G.muted, fontSize: 11 }}>Zoom {Math.round(viewport.zoom * 100)}%</span>
          </div>

          <div
            onMouseDown={beginCanvasPan}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onWheel={onCanvasWheel}
            style={{
              border: "1px solid #2a2a2a", borderRadius: 12,
              background: "radial-gradient(circle at 20% 20%, #101726 0, #09090a 50%, #060606 100%)",
              height: 300, overflow: "hidden", position: "relative", cursor: dragRef.current?.mode === "pan" ? "grabbing" : "grab",
            }}
          >
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#1a1a1a33 1px, transparent 1px), linear-gradient(90deg, #1a1a1a33 1px, transparent 1px)", backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`, backgroundPosition: `${viewport.x}px ${viewport.y}px` }} />
            <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "top left", width: 1400, height: 900, position: "relative" }}>
              {(state.recursos || []).map((r) => {
                const max = Math.max(0, Number(r.max || 0));
                const atual = Math.max(0, Math.min(max, Number(r.atual || 0)));
                const cor = r.cor || DEFAULT_RESOURCE_COLORS[r.nome] || "#95a5a6";
                const hoverIndex = hoverSlot[r.id];
                const previewAtual = Number.isInteger(hoverIndex) ? hoverIndex + 1 : atual;

                return (
                  <div key={r.id} style={{ position: "absolute", left: r.x || 0, top: r.y || 0, width: 210, border: `1px solid ${cor}66`, borderRadius: 10, background: dragItemId === r.id ? "#000000cc" : "#000000aa", padding: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 5, alignItems: "center", marginBottom: 6 }}>
                      <button onMouseDown={(e) => beginResourceDrag(e, r.id)} style={btnStyle({ padding: "2px 4px" })} title="Arrastar recurso">⠿</button>
                      <div style={{ color: cor, fontFamily: "'Cinzel',serif", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nome}</div>
                      <button onClick={() => openResourceEditor(r)} style={btnStyle({ padding: "2px 4px" })} title="Configurar">⚙</button>
                      <button onClick={() => saveCombate({ recursos: [...(state.recursos || []), { ...r, id: uid(), nome: `${r.nome} (cópia)`, x: (r.x || 0) + 24, y: (r.y || 0) + 24 }] })} style={btnStyle({ padding: "2px 4px" })} title="Duplicar">⎘</button>
                      <button onClick={() => saveCombate({ recursos: (state.recursos || []).filter((x) => x.id !== r.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c", padding: "2px 4px" })} title="Apagar">✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                      {Array.from({ length: max }).map((_, i) => {
                        const on = i < previewAtual;
                        return (
                          <button
                            key={i}
                            onMouseEnter={() => setHoverSlot((p) => ({ ...p, [r.id]: i }))}
                            onMouseLeave={() => setHoverSlot((p) => ({ ...p, [r.id]: null }))}
                            onClick={() => updateResourceById(r.id, { atual: i + 1 })}
                            style={{ ...slotShapeStyle(r.slotShape || "square", cor, on), cursor: "pointer", animation: i < atual ? "pulseSlot 1.2s ease-in-out infinite" : "none", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}
                            title={`Clicar aqui define ${i + 1}/${max}`}
                          >
                            {r.slotIconMode === "url" && r.slotIconUrl && <img src={r.slotIconUrl} alt="" style={{ width: 14, height: 14, objectFit: "cover" }} />}
                            {r.slotIconMode === "upload" && r.slotIconData && <img src={r.slotIconData} alt="" style={{ width: 14, height: 14, objectFit: "cover" }} />}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 10, color: G.muted }}>
                      {r.descricao || "—"} · atual {atual}/{max}{Number.isInteger(hoverIndex) ? ` · clique: ${hoverIndex + 1}/${max}` : ""}
                    </div>
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
              onNotify?.(`Efeito anexado: ${next.nome}`, "success");
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
                  <input type="checkbox" checked={e.ativo !== false} onChange={(ev) => { saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, ativo: ev.target.checked } : x)); onNotify?.(`Efeito ${ev.target.checked ? "ativado" : "desativado"}: ${e.nome || "Sem nome"}`, "info"); }} />
                  <select value={e.tipo || "Buff"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, tipo: ev.target.value } : x))} style={inpStyle()}><option>Buff</option><option>Debuff</option></select>
                  <button onClick={() => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, sinalizar: !(x.sinalizar !== false) } : x))} style={btnStyle({ padding: "2px 4px" })}>{e.sinalizar !== false ? "🔔" : "🔕"}</button>
                  <button onClick={() => setCollapsed((p) => ({ ...p, [e.id]: !isCollapsed }))} style={btnStyle({ padding: "2px 4px" })}>{isCollapsed ? "▸" : "▾"}</button>
                  <input value={e.nome || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, nome: ev.target.value } : x))} style={inpStyle()} />
                  <HoverButton onClick={() => saveEffects([{ ...e, id: uid(), nome: `${e.nome || "Efeito"} (cópia)` }, ...(charEffects || [])])}>⎘</HoverButton>
                  <HoverButton onClick={() => saveEffects(charEffects.filter((x) => x.id !== e.id))} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton>
                </div>
                {isCollapsed ? <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>{e.tipo || "—"} · {e.nome || "Sem nome"} · {e.efeitoMecanico || "—"}</div> : (
                  <>
                    <textarea value={e.descricao || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, descricao: ev.target.value } : x))} rows={2} style={inpStyle({ resize: "vertical" })} />
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 6 }}>
                      <input value={e.rank || "Comum"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, rank: ev.target.value } : x))} style={inpStyle()} />
                      <input value={e.efeitoMecanico || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, efeitoMecanico: ev.target.value } : x))} placeholder="-2FOR, +2VIT" style={inpStyle()} />
                      <select value={e.alvo || "Portador"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, alvo: ev.target.value } : x))} style={inpStyle()}>{EFFECT_TARGETS.map((t) => <option key={t}>{t}</option>)}</select>
                    </div>
                  </>
                )}
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

      {resourceEditorOpen && (
        <Modal title={editingResourceId ? "Configurar Recurso" : "Novo Recurso"} onClose={() => setResourceEditorOpen(false)}>
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
              <select value={resourceEditorData.slotIconMode || "shape"} onChange={(e) => setResourceEditorData((p) => ({ ...p, slotIconMode: e.target.value }))} style={inpStyle()}>
                <option value="shape">Forma geométrica</option>
                <option value="url">URL</option>
                <option value="upload">Imagem local</option>
              </select>
              {(resourceEditorData.slotIconMode || "shape") === "shape" ? (
                <select value={resourceEditorData.slotShape || "square"} onChange={(e) => setResourceEditorData((p) => ({ ...p, slotShape: e.target.value }))} style={inpStyle()}>{SHAPES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              ) : (resourceEditorData.slotIconMode === "url" ? (
                <input value={resourceEditorData.slotIconUrl || ""} onChange={(e) => setResourceEditorData((p) => ({ ...p, slotIconUrl: e.target.value }))} placeholder="https://..." style={inpStyle()} />
              ) : (
                <button onClick={() => fileInputRef.current?.click()} style={btnStyle()}>Escolher imagem</button>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => onUploadSlotIcon(e.target.files?.[0])} style={{ display: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setResourceEditorOpen(false)} style={btnStyle({ background: "transparent", borderColor: "#333", color: G.muted })}>Cancelar</button>
              <button onClick={saveResourceEditor} style={btnStyle()}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
