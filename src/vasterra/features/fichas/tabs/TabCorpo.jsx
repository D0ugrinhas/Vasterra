import React, { useMemo, useRef, useState } from "react";
import { uid } from "../../../core/factories";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";

const SIDES = ["top", "right", "bottom", "left"];
const SIDE_POS = {
  top: { x: 90, y: -6 },
  right: { x: 186, y: 36 },
  bottom: { x: 90, y: 78 },
  left: { x: -6, y: 36 },
};

const defaultCorpo = () => ({ pontosTotal: 1000, partes: [], links: [] });
const clamp = (v, min = 0) => Math.max(min, Number(v) || 0);

function shapeOfState(state) {
  return {
    pontosTotal: clamp(state?.pontosTotal, 1) || 1000,
    partes: Array.isArray(state?.partes) ? state.partes : [],
    links: Array.isArray(state?.links) ? state.links : [],
  };
}

function sideWorld(part, side) {
  const p = SIDE_POS[side] || SIDE_POS.right;
  return { x: (part.x || 0) + p.x, y: (part.y || 0) + p.y };
}

function MiniBodyCanvas({
  title,
  state,
  onChange,
  selectedId,
  onSelect,
  compact = false,
  canCreate = true,
  onNotify,
}) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const [viewport, setViewport] = useState({ x: compact ? 20 : 60, y: compact ? 20 : 80, zoom: 1 });
  const [linkDrag, setLinkDrag] = useState(null);

  const parts = state.partes || [];
  const links = state.links || [];

  const toWorld = (clientX, clientY) => {
    if (!wrapRef.current) return { x: 0, y: 0 };
    const r = wrapRef.current.getBoundingClientRect();
    return { x: (clientX - r.left - viewport.x) / viewport.zoom, y: (clientY - r.top - viewport.y) / viewport.zoom };
  };

  const patchPart = (id, patch) => onChange({ ...state, partes: parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const createPart = () => {
    if (!canCreate) return;
    const next = {
      id: uid(),
      nome: compact ? "Subparte" : "Parte",
      x: Math.round((200 - viewport.x) / viewport.zoom),
      y: Math.round((120 - viewport.y) / viewport.zoom),
      vidaMax: 20,
      vida: 20,
      saude: 0,
      ossos: 0,
      pele: 0,
      musculos: 0,
      bonus: 0,
      equipamentos: [],
      marcas: [],
      maldicoes: [],
      efeitos: [],
      interno: shapeOfState({}),
    };
    onChange({ ...state, partes: [...parts, next] });
    onSelect?.(next.id);
  };

  const deletePart = (id) => {
    onChange({ ...state, partes: parts.filter((p) => p.id !== id), links: links.filter((l) => l.from.id !== id && l.to.id !== id) });
    if (selectedId === id) onSelect?.(null);
  };

  const beginLink = (from, e) => {
    e.preventDefault();
    e.stopPropagation();
    const existing = links.find((l) => l.from.id === from.id && l.from.side === from.side);
    if (existing) {
      onChange({ ...state, links: links.filter((l) => l.id !== existing.id) });
    }
    setLinkDrag({ from, mouse: toWorld(e.clientX, e.clientY) });
  };

  const completeLink = (to) => {
    if (!linkDrag) return;
    if (linkDrag.from.id === to.id) {
      setLinkDrag(null);
      return;
    }
    const already = links.find((l) => l.to.id === to.id && l.to.side === to.side);
    const nextLinks = already ? links.filter((l) => l.id !== already.id) : [...links];
    nextLinks.push({ id: uid(), from: linkDrag.from, to });
    onChange({ ...state, links: nextLinks });
    setLinkDrag(null);
  };

  const onMouseDownCanvas = (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    dragRef.current = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: viewport.x, vy: viewport.y };
  };

  const onNodeDown = (part, e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button,input,select,textarea")) return;
    e.preventDefault();
    onSelect?.(part.id);
    dragRef.current = { kind: "node", id: part.id, sx: e.clientX, sy: e.clientY, x: part.x || 0, y: part.y || 0 };
  };

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setViewport((p) => ({ ...p, zoom: Math.max(0.5, Math.min(2.2, Number((p.zoom + delta).toFixed(2)))) }));
  };

  const points = parts.reduce((acc, p) => acc + clamp(p.saude) + clamp(p.ossos) + clamp(p.pele) + clamp(p.musculos) + clamp(p.bonus), 0);

  React.useEffect(() => {
    const onMove = (e) => {
      if (linkDrag) setLinkDrag((p) => (p ? { ...p, mouse: toWorld(e.clientX, e.clientY) } : p));
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "pan") {
        setViewport((p) => ({ ...p, x: d.vx + (e.clientX - d.sx), y: d.vy + (e.clientY - d.sy) }));
        return;
      }
      const dx = (e.clientX - d.sx) / viewport.zoom;
      const dy = (e.clientY - d.sy) / viewport.zoom;
      patchPart(d.id, { x: Math.round(d.x + dx), y: Math.round(d.y + dy) });
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
    <div style={{ border: "1px solid #2a2a2a", borderRadius: 12, background: compact ? "#0b111b" : "#080d15", padding: 8, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ color: compact ? "#8fb7ff" : G.gold, fontFamily: "'Cinzel',serif", fontSize: compact ? 12 : 13 }}>{title}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ color: G.muted, fontSize: 10, fontFamily: "monospace" }}>Pontos usados: {points}</span>
          {canCreate && <HoverButton onClick={createPart} style={btnStyle({ padding: "4px 8px" })}>+ Peça</HoverButton>}
        </div>
      </div>

      <div
        ref={wrapRef}
        onWheel={onWheel}
        onMouseDown={onMouseDownCanvas}
        style={{ height: compact ? 220 : 360, border: "1px solid #1d2a3a", borderRadius: 10, background: "radial-gradient(circle at 20% 20%, #1a2538 0, #0e1522 50%, #090f1a 100%)", overflow: "hidden", position: "relative", cursor: "grab" }}
      >
        <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "top left", width: 1800, height: 1000, position: "relative" }}>
          <svg style={{ position: "absolute", inset: 0, width: 1800, height: 1000, pointerEvents: "none" }}>
            {links.map((l) => {
              const from = parts.find((p) => p.id === l.from.id);
              const to = parts.find((p) => p.id === l.to.id);
              if (!from || !to) return null;
              const a = sideWorld(from, l.from.side);
              const b = sideWorld(to, l.to.side);
              const c1x = a.x + (l.from.side === "right" ? 40 : l.from.side === "left" ? -40 : 0);
              const c1y = a.y + (l.from.side === "bottom" ? 30 : l.from.side === "top" ? -30 : 0);
              const c2x = b.x + (l.to.side === "right" ? 40 : l.to.side === "left" ? -40 : 0);
              const c2y = b.y + (l.to.side === "bottom" ? 30 : l.to.side === "top" ? -30 : 0);
              const d = `M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}`;
              return <g key={l.id}><path d={d} stroke="#000" strokeWidth="6" fill="none" /><path d={d} stroke="#f6c46d" strokeWidth="3" fill="none" /></g>;
            })}
            {linkDrag && (() => {
              const part = parts.find((p) => p.id === linkDrag.from.id);
              if (!part) return null;
              const a = sideWorld(part, linkDrag.from.side);
              const b = linkDrag.mouse;
              const d = `M ${a.x} ${a.y} C ${a.x + 32} ${a.y}, ${b.x - 32} ${b.y}, ${b.x} ${b.y}`;
              return <g><path d={d} stroke="#000" strokeWidth="6" fill="none" strokeDasharray="6 3" /><path d={d} stroke="#8fd8ff" strokeWidth="3" fill="none" strokeDasharray="6 3" /></g>;
            })()}
          </svg>

          {parts.map((part) => {
            const hp = clamp(part.vida, 0) / Math.max(1, clamp(part.vidaMax, 1));
            return (
              <div key={part.id} onMouseDown={(e) => onNodeDown(part, e)} style={{ position: "absolute", left: part.x || 0, top: part.y || 0, width: 180, border: `1px solid ${selectedId === part.id ? "#9ed4ff" : "#3c4f66"}`, borderRadius: 10, background: "#04070dbd", boxShadow: selectedId === part.id ? "0 0 16px #8fd8ff66" : "0 0 12px #000", padding: 8, userSelect: "none", transition: "all .15s ease" }}>
                {SIDES.map((s) => {
                  const linked = links.some((l) => (l.from.id === part.id && l.from.side === s) || (l.to.id === part.id && l.to.side === s));
                  const pos = SIDE_POS[s];
                  return (
                    <button
                      key={`${part.id}-${s}`}
                      onMouseDown={(e) => beginLink({ id: part.id, side: s }, e)}
                      onMouseUp={(e) => { e.stopPropagation(); completeLink({ id: part.id, side: s }); }}
                      title={`Conector ${s}`}
                      style={{ position: "absolute", left: pos.x, top: pos.y, width: 12, height: 12, borderRadius: "50%", border: "1px solid #243445", background: linked ? "radial-gradient(circle at 35% 35%, #fff, #f6c46d)" : "radial-gradient(circle at 35% 35%, #7ca9d6, #1a2537)", boxShadow: linked ? "0 0 8px #f6c46d" : "none", cursor: "crosshair" }}
                    />
                  );
                })}

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center" }}>
                  <input value={part.nome || ""} onChange={(e) => patchPart(part.id, { nome: e.target.value })} style={inpStyle({ padding: "6px 8px" })} />
                  <button onClick={() => deletePart(part.id)} style={btnStyle({ padding: "2px 6px", borderColor: "#e74c3c55", color: "#ff7f7f" })}>✕</button>
                </div>
                <div style={{ marginTop: 6, height: 8, borderRadius: 99, background: "#111" }}><div style={{ width: `${hp * 100}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #2ecc71, #f1c40f, #e74c3c)" }} /></div>
                <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  <input type="number" value={clamp(part.vida)} onChange={(e) => patchPart(part.id, { vida: clamp(e.target.value) })} style={inpStyle()} />
                  <input type="number" value={Math.max(1, clamp(part.vidaMax, 1))} onChange={(e) => patchPart(part.id, { vidaMax: Math.max(1, clamp(e.target.value, 1)) })} style={inpStyle()} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TabCorpo({ ficha, onUpdate, onNotify }) {
  const state = useMemo(() => shapeOfState({ ...defaultCorpo(), ...(ficha.corpo || {}) }), [ficha.corpo]);
  const [selected, setSelected] = useState(null);
  const fileRef = useRef(null);

  const save = (next) => onUpdate({ corpo: shapeOfState(next) });
  const part = (state.partes || []).find((p) => p.id === selected) || null;

  const spent = (state.partes || []).reduce((acc, p) => acc + clamp(p.saude) + clamp(p.ossos) + clamp(p.pele) + clamp(p.musculos) + clamp(p.bonus), 0);
  const livre = Math.max(0, clamp(state.pontosTotal, 1) - spent);

  const inventarioOptions = (ficha.inventario || []).map((x) => x.item).filter(Boolean).map((it) => ({ id: it.id, nome: it.nome || "Item" }));

  const patchPart = (id, patch) => save({ ...state, partes: (state.partes || []).map((p) => (p.id === id ? { ...p, ...patch } : p)) });

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
      const txt = await file.text();
      const data = JSON.parse(txt);
      const normalized = shapeOfState(data || {});
      save(normalized);
      setSelected(normalized.partes[0]?.id || null);
      onNotify?.("Template de corpo carregado.", "success");
    } catch {
      onNotify?.("Falha ao carregar JSON do corpo.", "error");
    }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ border: "1px solid " + G.border, borderRadius: 12, background: G.bg2, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", color: G.gold }}>◈ CORPO · Logic Bricks</div>
          <div style={{ fontSize: 11, color: G.muted, fontFamily: "monospace" }}>Monte o corpo por peças e conecte como blocos anatômicos.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: G.muted, fontSize: 11 }}>Pontos totais</span>
          <input type="number" value={clamp(state.pontosTotal, 1)} onChange={(e) => save({ ...state, pontosTotal: clamp(e.target.value, 1) })} style={{ ...inpStyle(), width: 92 }} />
          <span style={{ color: livre > 0 ? "#7cf0b3" : "#ff8a8a", fontFamily: "monospace", fontSize: 11 }}>Livre: {livre}</span>
          <HoverButton onClick={exportJson}>Exportar</HoverButton>
          <HoverButton onClick={() => fileRef.current?.click()}>Importar</HoverButton>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
      </div>

      <MiniBodyCanvas title="Canvas corporal" state={state} onChange={save} selectedId={selected} onSelect={setSelected} onNotify={onNotify} />

      {part && (
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 12, background: "#0a0f18", padding: 10, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#9fc3ff", fontFamily: "'Cinzel',serif" }}>HUD da parte: {part.nome}</div>
            <div style={{ color: G.muted, fontFamily: "monospace", fontSize: 11 }}>Vida {clamp(part.vida)}/{Math.max(1, clamp(part.vidaMax, 1))}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(80px, 1fr))", gap: 6 }}>
            <input type="number" value={clamp(part.saude)} onChange={(e) => patchPart(part.id, { saude: clamp(e.target.value) })} style={inpStyle()} title="Saúde" />
            <input type="number" value={clamp(part.ossos)} onChange={(e) => patchPart(part.id, { ossos: clamp(e.target.value) })} style={inpStyle()} title="Ossos fortes" />
            <input type="number" value={clamp(part.pele)} onChange={(e) => patchPart(part.id, { pele: clamp(e.target.value) })} style={inpStyle()} title="Pele grossa" />
            <input type="number" value={clamp(part.musculos)} onChange={(e) => patchPart(part.id, { musculos: clamp(e.target.value) })} style={inpStyle()} title="Músculos duros" />
            <input type="number" value={Number(part.bonus) || 0} onChange={(e) => patchPart(part.id, { bonus: Number(e.target.value) || 0 })} style={inpStyle()} title="Bônus" />
            <input type="number" value={Math.max(1, clamp(part.vidaMax, 1))} onChange={(e) => patchPart(part.id, { vidaMax: Math.max(1, clamp(e.target.value, 1)) })} style={inpStyle()} title="Vida máxima" />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ color: G.muted, fontSize: 11 }}>Anexos modulares (equipamentos / marcas / maldições / efeitos)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select onChange={(e) => {
                const item = inventarioOptions.find((x) => x.id === e.target.value);
                if (!item) return;
                const has = (part.equipamentos || []).some((x) => x.itemId === item.id);
                if (has) return;
                patchPart(part.id, { equipamentos: [...(part.equipamentos || []), { itemId: item.id, nome: item.nome }] });
                e.target.value = "";
              }} style={inpStyle()} defaultValue="">
                <option value="">Anexar item/armadura...</option>
                {inventarioOptions.map((it) => <option key={it.id} value={it.id}>{it.nome}</option>)}
              </select>
              <input placeholder="Nova marca" style={inpStyle()} onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const txt = String(e.currentTarget.value || "").trim();
                if (!txt) return;
                patchPart(part.id, { marcas: [...(part.marcas || []), txt] });
                e.currentTarget.value = "";
              }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input placeholder="Nova maldição" style={inpStyle()} onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const txt = String(e.currentTarget.value || "").trim();
                if (!txt) return;
                patchPart(part.id, { maldicoes: [...(part.maldicoes || []), txt] });
                e.currentTarget.value = "";
              }} />
              <input placeholder="Novo efeito (caldeirão/outro)" style={inpStyle()} onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const txt = String(e.currentTarget.value || "").trim();
                if (!txt) return;
                patchPart(part.id, { efeitos: [...(part.efeitos || []), txt] });
                e.currentTarget.value = "";
              }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(part.equipamentos || []).map((x) => <span key={x.itemId} style={{ border: "1px solid #385", borderRadius: 999, padding: "2px 8px", color: "#b7ffd9", fontSize: 11 }}>{x.nome}</span>)}
              {(part.marcas || []).map((x, i) => <span key={`${x}-${i}`} style={{ border: "1px solid #555", borderRadius: 999, padding: "2px 8px", color: "#d6d6d6", fontSize: 11 }}>Marca: {x}</span>)}
              {(part.maldicoes || []).map((x, i) => <span key={`${x}-${i}`} style={{ border: "1px solid #744", borderRadius: 999, padding: "2px 8px", color: "#ffbcbc", fontSize: 11 }}>Maldição: {x}</span>)}
              {(part.efeitos || []).map((x, i) => <span key={`${x}-${i}`} style={{ border: "1px solid #347", borderRadius: 999, padding: "2px 8px", color: "#b8d7ff", fontSize: 11 }}>Efeito: {x}</span>)}
            </div>
          </div>

          <MiniBodyCanvas
            title={`Subcanvas interno de ${part.nome}`}
            state={shapeOfState(part.interno || {})}
            onChange={(childState) => patchPart(part.id, { interno: childState })}
            selectedId={null}
            onSelect={() => {}}
            compact
            canCreate
            onNotify={onNotify}
          />
        </div>
      )}
    </div>
  );
}
