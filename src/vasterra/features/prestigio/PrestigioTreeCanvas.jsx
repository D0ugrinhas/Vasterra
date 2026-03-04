import React, { useMemo, useRef, useState } from "react";
import { canActivatePrestigioNode } from "../../core/prestigio";
import { G, btnStyle } from "../../ui/theme";

const STAR_LAYERS = [
  { size: 2, count: 80, opacity: 0.35, speed: 0.03 },
  { size: 3, count: 50, opacity: 0.25, speed: 0.06 },
  { size: 4, count: 20, opacity: 0.18, speed: 0.1 },
];

const makeField = () => STAR_LAYERS.map((layer, idx) => ({
  ...layer,
  dots: Array.from({ length: layer.count }).map((_, i) => ({ x: (i * (17 + idx * 7)) % 100, y: (i * (29 + idx * 11)) % 100 })),
}));

export function PrestigioTreeCanvas({
  tree,
  ficha,
  skillName,
  unlockedIds,
  onToggleNode,
  selectedNodeId,
  onSelectNode,
  editable = false,
  onMoveNode,
  linkMode = false,
  linkFrom,
  onLinkFrom,
  onCreateLink,
  onDeleteLink,
}) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [dragNode, setDragNode] = useState(null);
  const wrapRef = useRef(null);
  const field = useMemo(() => makeField(), []);
  const unlockedSet = new Set(unlockedIds || []);

  const toLocal = (e) => {
    if (!wrapRef.current) return { x: 0, y: 0 };
    const r = wrapRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  };

  const onBgDown = (e) => {
    if (linkMode) onLinkFrom(null);
    onSelectNode?.(null);
  };

  return (
    <div
      ref={wrapRef}
      onMouseMove={(e) => {
        const p = toLocal(e);
        setPointer(p);
        if (dragNode && editable) onMoveNode?.(dragNode.id, { x: Math.max(20, Math.round(p.x)), y: Math.max(20, Math.round(p.y)) });
      }}
      onMouseUp={() => setDragNode(null)}
      onMouseLeave={() => setDragNode(null)}
      onMouseDown={onBgDown}
      style={{
        border: "1px solid #2b3955",
        borderRadius: 14,
        minHeight: 420,
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(circle at 20% 10%, #2a2266 0%, #0d1026 30%, #05070f 72%, #030308 100%)",
        boxShadow: "inset 0 0 100px #7d4dff26, 0 0 30px #000",
      }}
    >
      <style>{`@keyframes astralPulse{0%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.16);filter:brightness(1.45)}100%{transform:scale(1);filter:brightness(1)}} @keyframes nodeGlow{0%{box-shadow:0 0 8px #8ec8ff44}50%{box-shadow:0 0 18px #f6d57e88}100%{box-shadow:0 0 8px #8ec8ff44}}`}</style>

      {field.map((layer, i) => (
        <div key={i} style={{ position: "absolute", inset: -20, transform: `translate(${pointer.x * layer.speed * -1}px, ${pointer.y * layer.speed * -1}px)` }}>
          {layer.dots.map((d, idx) => (
            <span key={idx} style={{ position: "absolute", left: `${d.x}%`, top: `${d.y}%`, width: layer.size, height: layer.size, borderRadius: "50%", background: i === 2 ? "#ffe8a6" : "#d9eeff", opacity: layer.opacity, filter: "drop-shadow(0 0 4px #ffffff99)" }} />
          ))}
        </div>
      ))}

      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {(tree?.links || []).map((l) => {
          const from = (tree?.nodes || []).find((n) => n.id === l.from);
          const to = (tree?.nodes || []).find((n) => n.id === l.to);
          if (!from || !to) return null;
          const lit = unlockedSet.has(from.id) && unlockedSet.has(to.id);
          return (
            <g key={l.id} onClick={(e) => { e.stopPropagation(); editable && onDeleteLink?.(l.id); }} style={{ cursor: editable ? "pointer" : "default" }}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={lit ? "#f8e4a8" : "#7a91c2"} strokeWidth="2.2" />
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={lit ? "#ffd76a" : "#8ba9e6"} strokeWidth="7" opacity="0.2" />
            </g>
          );
        })}
        {linkMode && linkFrom && (() => {
          const from = (tree?.nodes || []).find((n) => n.id === linkFrom);
          if (!from) return null;
          return <line x1={from.x} y1={from.y} x2={pointer.x} y2={pointer.y} stroke="#9ed3ff" strokeWidth="2" strokeDasharray="6 4" />;
        })()}
      </svg>

      {(tree?.nodes || []).map((node) => {
        const selected = unlockedSet.has(node.id);
        const canActivate = canActivatePrestigioNode({ node, unlockedIds, tree, ficha, skillName });
        const activeForEdit = selectedNodeId === node.id;
        return (
          <button
            key={node.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelectNode?.(node.id);
              if (editable && !linkMode) setDragNode(node);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (linkMode) {
                if (!linkFrom) onLinkFrom?.(node.id);
                else if (linkFrom === node.id) onLinkFrom?.(null);
                else onCreateLink?.(linkFrom, node.id);
                return;
              }
              if (!editable) onToggleNode?.(node.id, canActivate);
            }}
            title={`${node.nome}\n${node.efeitoNarrativo || "Sem efeito narrativo"}`}
            style={{
              position: "absolute",
              left: node.x - 16,
              top: node.y - 16,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `1px solid ${activeForEdit ? "#9ed6ff" : selected ? "#ffe19b" : canActivate ? "#8baee0" : "#56617a"}`,
              background: selected ? "radial-gradient(circle at 32% 32%, #fffef1 0%, #ffd25f 35%, #aa7a14 100%)" : "radial-gradient(circle at 35% 35%, #e9f4ff 0%, #8ec8ff 24%, #2b3f63 72%)",
              color: "#fff",
              filter: "drop-shadow(0 0 10px #ffd76a88)",
              animation: selected ? "astralPulse 1.6s ease-in-out infinite" : "nodeGlow 2.8s ease-in-out infinite",
              cursor: editable ? (linkMode ? "crosshair" : "grab") : (canActivate ? "pointer" : "not-allowed"),
              opacity: canActivate || selected || editable ? 1 : 0.55,
              transform: activeForEdit ? "scale(1.18)" : "scale(1)",
            }}
          >★</button>
        );
      })}

      <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "linear-gradient(90deg,#050914ee,#0e1831d9)", border: "1px solid #2f4670", borderRadius: 10, padding: "6px 10px", color: "#bdd7ff", fontFamily: "monospace", fontSize: 11 }}>
        <span>{linkMode ? "Modo Link: clique na origem e no destino. Clique no vazio para cancelar." : "Clique nas estrelas para ativar. Requisitos bloqueiam ascensão."}</span>
        <span style={{ color: G.gold2 }}>Prestígios ativos: {(unlockedIds || []).length}</span>
      </div>
    </div>
  );
}

export function PrestigeBadgeStars({ nodes = [] }) {
  return <div style={{ display: "flex", gap: 3 }}>{nodes.map((n) => <span key={n.id} title={`${n.nome}\n${n.efeitoNarrativo || "Sem efeito narrativo"}`} style={{ color: "#f9df8d", filter: "drop-shadow(0 0 6px #ffde7a88)" }}>★</span>)}</div>;
}

export function AstralHudCard({ children }) {
  return <div style={{ background: "linear-gradient(180deg,#0c1324,#090d1b)", border: "1px solid #294164", borderRadius: 10, padding: 9, color: "#bfd6fb" }}>{children}</div>;
}

export function LinkModeButton({ active, onClick }) {
  return <button onClick={onClick} style={btnStyle({ borderColor: active ? "#74c1ff99" : "#355377", color: active ? "#b8e6ff" : "#9ec2e5", padding: "4px 10px" })}>{active ? "Encerrar Link" : "Modo Link"}</button>;
}
