import React, { useEffect, useMemo, useRef, useState } from "react";
import { uid } from "../../../core/factories";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";
import { Modal, ItemIcon } from "../../shared/components";

const CARD_W = 220;
const CARD_H = 144;
const SIDES = ["top", "right", "bottom", "left"];
const SIDE_OFFSET = {
  top: { x: CARD_W / 2, y: 0, vx: 0, vy: -1 },
  right: { x: CARD_W, y: CARD_H / 2, vx: 1, vy: 0 },
  bottom: { x: CARD_W / 2, y: CARD_H, vx: 0, vy: 1 },
  left: { x: 0, y: CARD_H / 2, vx: -1, vy: 0 },
};

const defaultCorpo = () => ({ pontosTotal: 1000, partes: [], links: [] });
const num = (v, min = 0) => Math.max(min, Number(v) || 0);

const ATTACH_META = {
  item_armadura: { icon: "🛡", tint: "#7be3ff", label: "Armadura" },
  item_acessorio: { icon: "💍", tint: "#a4d8ff", label: "Acessório" },
  item_vestimenta: { icon: "🧥", tint: "#9fc6ff", label: "Vestimenta" },
  item: { icon: "🎒", tint: "#9fd0ff", label: "Item" },
  effect_buff: { icon: "✨", tint: "#73e2ab", label: "Buff" },
  effect_debuff: { icon: "☠", tint: "#ffac86", label: "Debuff" },
  effect_maldicao: { icon: "🕯", tint: "#dca3ff", label: "Maldição" },
  effect: { icon: "✦", tint: "#9ed4ff", label: "Efeito" },
};

function normalizeCorpo(raw) {
  const src = raw || {};
  return {
    pontosTotal: num(src.pontosTotal, 1) || 1000,
    links: Array.isArray(src.links) ? src.links : [],
    partes: Array.isArray(src.partes) ? src.partes.map(normalizePart) : [],
  };
}

function normalizePart(p) {
  return {
    id: p?.id || uid(),
    nome: p?.nome || "Parte",
    x: Number(p?.x) || 120,
    y: Number(p?.y) || 120,
    cor: p?.cor || "#4aa3ff",
    icone: p?.icone || "",
    saude: num(p?.saude, 0),
    ossos: num(p?.ossos, 0),
    pele: num(p?.pele, 0),
    musculos: num(p?.musculos, 0),
    bonus: Number(p?.bonus) || 0,
    anexos: Array.isArray(p?.anexos) ? p.anexos : [],
    interno: normalizeCorpo(p?.interno),
  };
}

function inferItemKind(item) {
  const t = String(item?.tipo || "").toLowerCase();
  if (t.includes("armadura")) return "item_armadura";
  if (t.includes("acess")) return "item_acessorio";
  if (t.includes("vest") || t.includes("roupa")) return "item_vestimenta";
  return "item";
}

function inferEffectKind(ef) {
  const t = String(ef?.tipo || "").toLowerCase();
  if (t.includes("mald")) return "effect_maldicao";
  if (t.includes("debuff")) return "effect_debuff";
  if (t.includes("buff")) return "effect_buff";
  return "effect";
}

function metaOf(kind) {
  return ATTACH_META[kind] || ATTACH_META.effect;
}

function portWorld(part, side) {
  const o = SIDE_OFFSET[side] || SIDE_OFFSET.right;
  return { x: (part.x || 0) + o.x, y: (part.y || 0) + o.y, vx: o.vx, vy: o.vy };
}

function MiniBodyCanvas({ title, state, onChange, selectedId, onSelect, canCreate = true, compact = false }) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const [viewport, setViewport] = useState({ x: compact ? 30 : 80, y: compact ? 20 : 80, zoom: compact ? 0.9 : 1 });
  const [linkDrag, setLinkDrag] = useState(null);

  const parts = state.partes || [];
  const links = state.links || [];

  const worldFromClient = (clientX, clientY) => {
    if (!wrapRef.current) return { x: 0, y: 0 };
    const r = wrapRef.current.getBoundingClientRect();
    return { x: (clientX - r.left - viewport.x) / viewport.zoom, y: (clientY - r.top - viewport.y) / viewport.zoom };
  };

  const patchPart = (id, patch) => {
    const latest = normalizeCorpo(state);
    onChange({ ...latest, partes: (latest.partes || []).map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };

  const centerView = () => {
    if (!wrapRef.current || !parts.length) {
      setViewport((v) => ({ ...v, x: compact ? 30 : 80, y: compact ? 20 : 80, zoom: compact ? 0.9 : 1 }));
      return;
    }
    const minX = Math.min(...parts.map((p) => p.x || 0));
    const maxX = Math.max(...parts.map((p) => (p.x || 0) + CARD_W));
    const minY = Math.min(...parts.map((p) => p.y || 0));
    const maxY = Math.max(...parts.map((p) => (p.y || 0) + CARD_H));
    const w = Math.max(200, maxX - minX + 80);
    const h = Math.max(160, maxY - minY + 80);
    const vw = wrapRef.current.clientWidth;
    const vh = wrapRef.current.clientHeight;
    const zoom = Math.max(0.45, Math.min(1.4, Math.min(vw / w, vh / h)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setViewport({ x: vw / 2 - cx * zoom, y: vh / 2 - cy * zoom, zoom });
  };

  const createPart = () => {
    if (!canCreate) return;
    const n = normalizePart({
      id: uid(),
      nome: compact ? "Subparte" : "Parte",
      x: Math.round((220 - viewport.x) / viewport.zoom),
      y: Math.round((140 - viewport.y) / viewport.zoom),
    });
    onChange({ ...state, partes: [...parts, n] });
    onSelect?.(n.id);
  };

  const deletePart = (id) => {
    onChange({ ...state, partes: parts.filter((p) => p.id !== id), links: links.filter((l) => l.from.id !== id && l.to.id !== id) });
    if (selectedId === id) onSelect?.(null);
  };

  const beginLink = (from, e) => {
    e.preventDefault();
    e.stopPropagation();
    const existing = links.find((l) => l.from.id === from.id && l.from.side === from.side);
    if (existing) onChange({ ...state, links: links.filter((l) => l.id !== existing.id) });
    setLinkDrag({ from, mouse: worldFromClient(e.clientX, e.clientY) });
  };

  const finishLink = (to) => {
    if (!linkDrag || linkDrag.from.id === to.id) {
      setLinkDrag(null);
      return;
    }
    const already = links.find((l) => l.to.id === to.id && l.to.side === to.side);
    const out = already ? links.filter((l) => l.id !== already.id) : [...links];
    out.push({ id: uid(), from: linkDrag.from, to });
    onChange({ ...state, links: out });
    setLinkDrag(null);
  };

  const onDownCanvas = (e) => {
    if (e.button === 1) {
      e.preventDefault();
      dragRef.current = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: viewport.x, vy: viewport.y };
      return;
    }
    if (e.button === 0 && !e.target.closest("[data-node-card='1']")) onSelect?.(null);
  };

  const onDownNode = (part, e) => {
    if (e.button !== 0) return;
    if (!e.target.closest("[data-drag-handle='1']") && e.target.closest("button,input,select,textarea")) return;
    e.preventDefault();
    onSelect?.(part.id);
    dragRef.current = { kind: "node", id: part.id, sx: e.clientX, sy: e.clientY, x: part.x || 0, y: part.y || 0 };
  };

  const handleWheelZoom = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const d = e.deltaY > 0 ? -0.08 : 0.08;
    setViewport((p) => ({ ...p, zoom: Math.max(0.45, Math.min(2, Number((p.zoom + d).toFixed(2)))) }));
  };

  useEffect(() => {
    const target = wrapRef.current;
    if (!target) return undefined;
    const onNativeWheel = (e) => handleWheelZoom(e);
    target.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => target.removeEventListener("wheel", onNativeWheel);
  }, [viewport.zoom]);

  useEffect(() => {
    const onMove = (e) => {
      if (linkDrag) setLinkDrag((p) => (p ? { ...p, mouse: worldFromClient(e.clientX, e.clientY) } : p));
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "pan") {
        setViewport((p) => ({ ...p, x: d.vx + (e.clientX - d.sx), y: d.vy + (e.clientY - d.sy) }));
        return;
      }
      const dx = (e.clientX - d.sx) / viewport.zoom;
      const dy = (e.clientY - d.sy) / viewport.zoom;
      const nx = Math.round(d.x + dx);
      const ny = Math.round(d.y + dy);
      patchPart(d.id, { x: nx, y: ny });
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
  }, [viewport.zoom, linkDrag, state]);

  return (
    <div style={{ border: "1px solid #2a3444", borderRadius: 12, background: compact ? "#0a1320" : "#090f19", padding: 8, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: compact ? "#9ac4ff" : G.gold, fontFamily: "'Cinzel',serif", fontSize: compact ? 12 : 13 }}>{title}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <HoverButton onClick={centerView} style={btnStyle({ padding: "4px 8px" })}>Centralizar</HoverButton>
          {canCreate && <HoverButton onClick={createPart} style={btnStyle({ padding: "4px 8px" })}>+ Peça</HoverButton>}
        </div>
      </div>

      <div
        ref={wrapRef}
        onWheelCapture={handleWheelZoom}
        onMouseDown={onDownCanvas}
        style={{
          height: compact ? 280 : 620,
          border: "1px solid #213148",
          borderRadius: 10,
          background: "radial-gradient(circle at 20% 20%, #1a2740 0, #101a2d 48%, #0a1020 100%)",
          overflow: "hidden",
          position: "relative",
          cursor: "grab",
          overscrollBehavior: "contain",
        }}
      >
        <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "top left", width: 2400, height: 1400, position: "relative" }}>
          <svg style={{ position: "absolute", inset: 0, width: 2400, height: 1400, pointerEvents: "none" }}>
            {links.map((l) => {
              const from = parts.find((p) => p.id === l.from.id);
              const to = parts.find((p) => p.id === l.to.id);
              if (!from || !to) return null;
              const a = portWorld(from, l.from.side);
              const b = portWorld(to, l.to.side);
              const dist = Math.max(42, Math.min(160, Math.hypot(b.x - a.x, b.y - a.y) * 0.35));
              const d = `M ${a.x} ${a.y} C ${a.x + a.vx * dist} ${a.y + a.vy * dist}, ${b.x + b.vx * dist} ${b.y + b.vy * dist}, ${b.x} ${b.y}`;
              return <g key={l.id}><path d={d} stroke="#000" strokeWidth="7" fill="none" strokeLinecap="round" /><path d={d} stroke="#f6c46d" strokeWidth="3.2" fill="none" strokeLinecap="round" /></g>;
            })}
            {linkDrag && (() => {
              const from = parts.find((p) => p.id === linkDrag.from.id);
              if (!from) return null;
              const a = portWorld(from, linkDrag.from.side);
              const b = linkDrag.mouse;
              const d = `M ${a.x} ${a.y} C ${a.x + a.vx * 48} ${a.y + a.vy * 48}, ${b.x - 30} ${b.y}, ${b.x} ${b.y}`;
              return <g><path d={d} stroke="#000" strokeWidth="7" fill="none" strokeDasharray="7 4" /><path d={d} stroke="#8ad7ff" strokeWidth="3.2" fill="none" strokeDasharray="7 4" /></g>;
            })()}
          </svg>

          {parts.map((part) => {
            const hasItem = (part.anexos || []).some((a) => String(a.kind || "").startsWith("item"));
            const hasEffect = (part.anexos || []).some((a) => String(a.kind || "").startsWith("effect"));
            const saude = num(part.saude);
            const visibleSaude = Math.min(22, saude);
            return (
              <div key={part.id} data-node-card="1" onMouseDown={(e) => onDownNode(part, e)} style={{
                position: "absolute", left: part.x || 0, top: part.y || 0, width: CARD_W, height: CARD_H,
                border: `1px solid ${selectedId === part.id ? "#9fd7ff" : "#40546d"}`,
                borderRadius: 12,
                background: `linear-gradient(180deg, ${part.cor || "#4aa3ff"}33, #090e16)`,
                boxShadow: `${hasItem ? "0 0 18px #73e3ff44" : ""}${hasEffect ? ", 0 0 18px #d49cff44" : ""}${selectedId === part.id ? ", 0 0 18px #8fd8ff66" : ", 0 0 12px #000"}`,
                padding: 8,
                userSelect: "none",
              }}>
                {SIDES.map((side) => {
                  const p = SIDE_OFFSET[side];
                  const linked = links.some((l) => (l.from.id === part.id && l.from.side === side) || (l.to.id === part.id && l.to.side === side));
                  return (
                    <button key={`${part.id}-${side}`} onMouseDown={(e) => beginLink({ id: part.id, side }, e)} onMouseUp={(e) => { e.stopPropagation(); finishLink({ id: part.id, side }); }} style={{ position: "absolute", left: p.x - 6, top: p.y - 6, width: 12, height: 12, borderRadius: "50%", border: "1px solid #2b3f54", background: linked ? "radial-gradient(circle at 35% 35%, #fff, #f6c46d)" : "radial-gradient(circle at 35% 35%, #9ed0ff, #1f2d40)", cursor: "crosshair" }} />
                  );
                })}

                <div data-drag-handle="1" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#83a9cc", fontSize: 10, fontFamily: "monospace", cursor: "grab", marginBottom: 4 }}>
                  <span>⠿ mover</span>
                  <span>{hasItem ? "🛡" : ""}{hasEffect ? " ✦" : ""}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #2f4e6c", background: part.cor || "#4aa3ff", display: "grid", placeItems: "center", fontSize: 12 }}>{part.icone || ""}</div>
                  <input value={part.nome || ""} onChange={(e) => patchPart(part.id, { nome: e.target.value })} style={inpStyle({ padding: "6px 8px" })} />
                  <button onClick={() => deletePart(part.id)} style={btnStyle({ borderColor: "#e74c3c55", color: "#ff7f7f", padding: "2px 6px" })}>✕</button>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: "#b6d2ef", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  <span>Pele grossa: {num(part.pele)}</span>
                  <span>Músculos duros: {num(part.musculos)}</span>
                  <span>Ossos fortes: {num(part.ossos)}</span>
                  <span>Bônus: {Number(part.bonus) || 0}</span>
                  <span style={{ gridColumn: "1 / span 2", color: "#7cf2ae" }}>Saúde: {saude}</span>
                </div>
                <div style={{ marginTop: 4, display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {Array.from({ length: visibleSaude }).map((_, i) => <span key={`${part.id}-hp-${i}`} style={{ width: 8, height: 8, borderRadius: 2, background: "#63dd9e", border: "1px solid #1d5" }} />)}
                  {saude > visibleSaude && <span style={{ color: "#86dcb0", fontSize: 10 }}>+{saude - visibleSaude}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PartInspector({ part, title, onPatch, onAddAnexo, onOpenAnexo, onRemoveAnexo, inventoryItems, characterEffects }) {
  if (!part) return null;
  return (
    <div style={{ border: "1px solid #2a3444", borderRadius: 12, background: "#0a121d", padding: 10, display: "grid", gap: 8 }}>
      <div style={{ color: "#9fd1ff", fontFamily: "'Cinzel',serif" }}>{title}: {part.nome}</div>
      <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 6 }}>
        <input value={part.icone || ""} onChange={(e) => onPatch({ icone: e.target.value })} placeholder="Ícone" style={inpStyle()} />
        <input type="color" value={part.cor || "#4aa3ff"} onChange={(e) => onPatch({ cor: e.target.value })} style={{ ...inpStyle(), padding: 2, height: 34 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <input type="number" value={num(part.saude)} onChange={(e) => onPatch({ saude: num(e.target.value) })} style={inpStyle()} title="Saúde" />
        <input type="number" value={num(part.ossos)} onChange={(e) => onPatch({ ossos: num(e.target.value) })} style={inpStyle()} title="Ossos fortes" />
        <input type="number" value={num(part.pele)} onChange={(e) => onPatch({ pele: num(e.target.value) })} style={inpStyle()} title="Pele grossa" />
        <input type="number" value={num(part.musculos)} onChange={(e) => onPatch({ musculos: num(e.target.value) })} style={inpStyle()} title="Músculos duros" />
        <input type="number" value={Number(part.bonus) || 0} onChange={(e) => onPatch({ bonus: Number(e.target.value) || 0 })} style={inpStyle()} title="Bônus" />
      </div>

      <div style={{ borderTop: "1px solid #263446", paddingTop: 8, display: "grid", gap: 6 }}>
        <div style={{ color: G.muted, fontSize: 11 }}>Anexar itens / efeitos cooperativos</div>
        <select onChange={(e) => {
          const item = inventoryItems.find((x) => x.id === e.target.value);
          if (!item) return;
          onAddAnexo({ kind: inferItemKind(item), label: item.nome || "Item", refId: item.id });
          e.target.value = "";
        }} style={inpStyle()} defaultValue="">
          <option value="">Anexar item de inventário...</option>
          {inventoryItems.map((it) => <option key={it.id} value={it.id}>{it.nome}</option>)}
        </select>
        <select onChange={(e) => {
          const ef = characterEffects.find((x) => x.id === e.target.value);
          if (!ef) return;
          onAddAnexo({ kind: inferEffectKind(ef), label: ef.nome || "Efeito", refId: ef.id });
          e.target.value = "";
        }} style={inpStyle()} defaultValue="">
          <option value="">Anexar efeito da ficha...</option>
          {characterEffects.map((ef) => <option key={ef.id} value={ef.id}>{ef.nome || ef.id}</option>)}
        </select>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(part.anexos || []).map((a) => {
            const m = metaOf(a.kind);
            return (
              <span key={a.id} style={{ position: "relative", display: "inline-flex" }}>
                <button onClick={() => onOpenAnexo(a)} style={{ border: `1px solid ${m.tint}66`, background: `${m.tint}1f`, borderRadius: 999, padding: "3px 18px 3px 8px", color: m.tint, fontSize: 11, cursor: "pointer" }}>
                  {m.icon} {a.label}
                </button>
                <button onClick={() => onRemoveAnexo(a.id)} title="Desanexar" style={{ position: "absolute", right: 4, top: 2, border: "none", background: "transparent", color: "#ff9b9b", cursor: "pointer", fontSize: 11 }}>✕</button>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TabCorpo({ ficha, onUpdate, onNotify }) {
  const state = useMemo(() => normalizeCorpo({ ...defaultCorpo(), ...(ficha.corpo || {}) }), [ficha.corpo]);
  const fileRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedInnerId, setSelectedInnerId] = useState(null);
  const [inspectAnexo, setInspectAnexo] = useState(null);

  const save = (next) => onUpdate({ corpo: normalizeCorpo(next) });
  const parts = state.partes || [];
  const selected = parts.find((p) => p.id === selectedId) || null;
  const innerState = selected ? normalizeCorpo(selected.interno) : normalizeCorpo({});
  const innerParts = innerState.partes || [];
  const selectedInner = innerParts.find((p) => p.id === selectedInnerId) || null;
  const spent = parts.reduce((acc, p) => acc + num(p.saude) + num(p.ossos) + num(p.pele) + num(p.musculos) + num(p.bonus), 0);
  const livre = Math.max(0, num(state.pontosTotal, 1) - spent);

  const inventoryItems = (ficha.inventario || []).map((x) => x.item).filter(Boolean);
  const characterEffects = ficha.modificadores?.efeitos || [];

  useEffect(() => {
    setSelectedInnerId(null);
  }, [selectedId]);

  const patchPart = (id, patch) => save({ ...state, partes: parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const patchInnerPart = (id, patch) => {
    if (!selected) return;
    const next = { ...innerState, partes: innerParts.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
    patchPart(selected.id, { interno: next });
  };

  const addAnexo = (part, payload, isInner = false) => {
    if (!part) return;
    const atual = part.anexos || [];
    if (atual.some((x) => x.kind === payload.kind && x.refId === payload.refId)) return;
    const nextAnexos = [...atual, { id: uid(), ...payload }];
    if (isInner) patchInnerPart(part.id, { anexos: nextAnexos });
    else patchPart(part.id, { anexos: nextAnexos });
  };

  const openAnexo = (anexo, partNome) => {
    const item = inventoryItems.find((x) => x.id === anexo.refId) || null;
    const effect = characterEffects.find((x) => x.id === anexo.refId) || null;
    setInspectAnexo({ anexo, item, effect, partNome });
  };

  const exportJson = () => {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(ficha.nome || "ficha").replace(/\s+/g, "_")}_corpo_logicbricks.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const normalized = normalizeCorpo(data);
      save(normalized);
      setSelectedId(normalized.partes[0]?.id || null);
      onNotify?.("Template de corpo carregado.", "success");
    } catch {
      onNotify?.("JSON de corpo inválido.", "error");
    }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ border: "1px solid " + G.border, borderRadius: 12, background: G.bg2, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 1 }}>◈ CORPO · Logic Bricks Anatômico</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: G.muted }}>Zoom no canvas agora bloqueia o scroll da página enquanto o mouse está sobre ele.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: G.muted, fontSize: 11 }}>Pontos</span>
          <input type="number" value={num(state.pontosTotal, 1)} onChange={(e) => save({ ...state, pontosTotal: num(e.target.value, 1) })} style={{ ...inpStyle(), width: 90 }} />
          <span style={{ color: livre > 0 ? "#7cf0b3" : "#ff8a8a", fontSize: 11, fontFamily: "monospace" }}>Livre: {livre}</span>
          <HoverButton onClick={exportJson}>Exportar</HoverButton>
          <HoverButton onClick={() => fileRef.current?.click()}>Importar</HoverButton>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 430px", gap: 10 }}>
        <MiniBodyCanvas title="Canvas corporal principal" state={state} onChange={save} selectedId={selectedId} onSelect={setSelectedId} canCreate />

        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          {!selected && <div style={{ border: "1px solid #2a3444", borderRadius: 12, background: "#0a121d", padding: 10, color: G.muted, fontFamily: "monospace" }}>Selecione uma parte no canvas para editar HUD, anexos, ações e subpartes internas.</div>}

          {selected && (
            <>
              <PartInspector
                part={selected}
                title="HUD da parte selecionada"
                onPatch={(patch) => patchPart(selected.id, patch)}
                  onAddAnexo={(payload) => addAnexo(selected, payload, false)}
                  onOpenAnexo={(a) => openAnexo(a, selected.nome)}
                  onRemoveAnexo={(anexoId) => patchPart(selected.id, { anexos: (selected.anexos || []).filter((a) => a.id !== anexoId) })}
                  inventoryItems={inventoryItems}
                  characterEffects={characterEffects}
                />

              <MiniBodyCanvas
                title={`Subcanvas interno · ${selected.nome}`}
                state={innerState}
                onChange={(next) => patchPart(selected.id, { interno: next })}
                selectedId={selectedInnerId}
                onSelect={setSelectedInnerId}
                compact
                canCreate
              />

              {selectedInner && (
                <PartInspector
                  part={selectedInner}
                  title="HUD da subparte"
                  onPatch={(patch) => patchInnerPart(selectedInner.id, patch)}
                  onAddAnexo={(payload) => addAnexo(selectedInner, payload, true)}
                  onOpenAnexo={(a) => openAnexo(a, `${selected.nome} / ${selectedInner.nome}`)}
                  onRemoveAnexo={(anexoId) => patchInnerPart(selectedInner.id, { anexos: (selectedInner.anexos || []).filter((a) => a.id !== anexoId) })}
                  inventoryItems={inventoryItems}
                  characterEffects={characterEffects}
                />
              )}
            </>
          )}
        </div>
      </div>

      {inspectAnexo && (
        <Modal title={`Anexo em ${inspectAnexo.partNome}`} onClose={() => setInspectAnexo(null)}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: metaOf(inspectAnexo.anexo.kind).tint, fontFamily: "'Cinzel',serif" }}>
              {metaOf(inspectAnexo.anexo.kind).icon} {inspectAnexo.anexo.label} · {metaOf(inspectAnexo.anexo.kind).label}
            </div>

            {inspectAnexo.item && (
              <div style={{ border: "1px solid #2b3d56", borderRadius: 10, padding: 8, display: "grid", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ItemIcon item={inspectAnexo.item} size={18} />
                  <strong>{inspectAnexo.item.nome}</strong>
                </div>
                <div style={{ fontSize: 12, color: G.muted }}>Tipo: {inspectAnexo.item.tipo || "—"} · Rank: {inspectAnexo.item.rank || "—"}</div>
                <div style={{ fontSize: 12 }}>{inspectAnexo.item.descricao || "Sem descrição."}</div>
                <div style={{ fontSize: 11, color: "#9dc8f5" }}>Efeitos no item: {(inspectAnexo.item.efeitos || []).length}</div>
              </div>
            )}

            {inspectAnexo.effect && (
              <div style={{ border: "1px solid #3f2b56", borderRadius: 10, padding: 8, display: "grid", gap: 6 }}>
                <strong>{inspectAnexo.effect.nome || "Efeito"}</strong>
                <div style={{ fontSize: 12, color: G.muted }}>{inspectAnexo.effect.tipo || "—"} · {inspectAnexo.effect.rank || "Sem rank"}</div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#9edcff" }}>{inspectAnexo.effect.efeitoMecanico || inspectAnexo.effect.efeito || "Sem efeito mecânico"}</div>
                <div style={{ fontSize: 12 }}>{inspectAnexo.effect.descricao || "Sem descrição."}</div>
              </div>
            )}

            {!inspectAnexo.item && !inspectAnexo.effect && <div style={{ color: G.muted }}>Esse anexo não foi encontrado na ficha atual (pode ter sido removido).</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
