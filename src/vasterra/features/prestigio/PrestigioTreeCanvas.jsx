import React, { useEffect, useMemo, useRef, useState } from "react";
import { canActivatePrestigioNode } from "../../core/prestigio";
import { G, btnStyle } from "../../ui/theme";

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
  showFooterHint = true,
  worldWidth = 5200,
  worldHeight = 3200,
  pulseNodeId = null,
  flashCanvas = false,
}) {
  const [dragNode, setDragNode] = useState(null);
  const [dragPan, setDragPan] = useState(null);
  const [hoverLinkId, setHoverLinkId] = useState(null);
  const [hoverNodeId, setHoverNodeId] = useState(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0 });
  const [pointerWorld, setPointerWorld] = useState({ x: 0, y: 0 });
  const wrapRef = useRef(null);
  const centeredRef = useRef(false);
  const unlockedSet = new Set(unlockedIds || []);

  const centerOnNode = (node) => {
    if (!node || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setViewport({ x: Math.round(r.width / 2 - node.x), y: Math.round(r.height / 2 - node.y) });
  };

  useEffect(() => {
    if (!tree?.nodes?.length || centeredRef.current) return;
    const central = tree.nodes.find((n) => n.id === tree.centralNodeId) || tree.nodes[0];
    centerOnNode(central);
    centeredRef.current = true;
  }, [tree]);

  useEffect(() => {
    if (!tree?.centralNodeId) return;
    const central = (tree.nodes || []).find((n) => n.id === tree.centralNodeId);
    if (central) centerOnNode(central);
  }, [tree?.centralNodeId]);

  const toLocal = (e) => {
    if (!wrapRef.current) return { x: 0, y: 0 };
    const r = wrapRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const toWorld = (local) => ({ x: local.x - viewport.x, y: local.y - viewport.y });

  const bgLayers = useMemo(() => {
    const mk = (count, gap, pulseBase) => {
      const stars = [];
      for (let i = 0; i < count; i += 1) {
        const row = Math.floor(i / 20);
        const col = i % 20;
        const jitterX = ((i * 37) % gap) - gap / 2;
        const jitterY = ((i * 53) % gap) - gap / 2;
        stars.push({
          x: col * gap + 30 + jitterX,
          y: row * gap + 30 + jitterY,
          size: 1 + (i % 3),
          alpha: 0.15 + (i % 7) * 0.08,
          pulse: `${pulseBase + (i % 9)}s`,
        });
      }
      return { stars };
    };
    return [mk(900, 46, 6), mk(520, 62, 8), mk(320, 78, 10)];
  }, []);

  return (
    <div
      ref={wrapRef}
      onMouseMove={(e) => {
        const local = toLocal(e);
        const world = toWorld(local);
        setPointerWorld(world);
        if (dragNode && editable) onMoveNode?.(dragNode.id, { x: Math.max(20, Math.round(world.x)), y: Math.max(20, Math.round(world.y)) });
        if (dragPan) setViewport({ x: Math.round(dragPan.viewX + (e.clientX - dragPan.startX)), y: Math.round(dragPan.viewY + (e.clientY - dragPan.startY)) });
      }}
      onMouseUp={() => { setDragNode(null); setDragPan(null); }}
      onMouseLeave={() => { setDragNode(null); setDragPan(null); }}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          setDragPan({ startX: e.clientX, startY: e.clientY, viewX: viewport.x, viewY: viewport.y });
          return;
        }
        if (linkMode) onLinkFrom?.(null);
        onSelectNode?.(null);
      }}
      style={{
        border: "1px solid #2b3955",
        borderRadius: 14,
        minHeight: 620,
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(circle at 20% 10%, #231a58 0%, #0f1430 30%, #060913 70%, #020307 100%)",
        boxShadow: "inset 0 0 120px #7d4dff22, inset 0 0 60px #ffffff10, 0 0 30px #000",
        cursor: dragPan ? "grabbing" : "default",
        transform: flashCanvas ? "scale(1.01)" : "scale(1)",
        transition: "transform .34s ease, box-shadow .34s ease",
      }}
    >
      <style>{`
        @keyframes v-astralUp { from { transform: translateY(0); } to { transform: translateY(-220px); } }
        @keyframes v-astralPulse { 0%,100% { opacity:.22; filter:brightness(1);} 50% { opacity:.35; filter:brightness(1.35);} }
        @keyframes v-starCorePulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.12)} }
        @keyframes v-linkPulse { 0%,100% { opacity:.18; } 50% { opacity:.42; } }
        @keyframes v-upFloat { from { transform: translateY(0); } to { transform: translateY(-220px); } }
      `}</style>

      <div style={{ position: "absolute", left: viewport.x, top: viewport.y, width: worldWidth, height: worldHeight, overflow: "hidden", pointerEvents: "none" }}>
        {bgLayers.map((layer, idx) => (
          <div key={idx} style={{ position: "absolute", inset: 0 }}>
            {layer.stars.map((s, i) => {
              const x = (s.x * 7 + i * 11) % worldWidth;
              const y = Math.max(0, worldHeight - ((s.y * 9 + i * 13) % worldHeight));
              return <span key={i} style={{ position: "absolute", left: x, top: y, width: s.size, height: s.size, borderRadius: "50%", background: "#ffffff", opacity: Math.min(0.9, s.alpha), boxShadow: `0 0 ${6 + s.size * 2}px #ffffff, 0 0 ${12 + s.size * 2}px #ffffff88`, animation: `v-upFloat ${40 + idx * 24 + (i % 10)}s linear infinite, v-astralPulse ${s.pulse} ease-in-out infinite`, animationDelay: `-${(i % 12) * 1.1}s` }} />;
            })}
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", left: viewport.x, top: viewport.y, width: worldWidth, height: worldHeight }}>
        <svg style={{ position: "absolute", inset: 0, width: worldWidth, height: worldHeight }}>
          {(tree?.links || []).map((l) => {
            const from = (tree?.nodes || []).find((n) => n.id === l.from);
            const to = (tree?.nodes || []).find((n) => n.id === l.to);
            if (!from || !to) return null;
            const lit = unlockedSet.has(from.id) && unlockedSet.has(to.id);
            return (
              <g
                key={l.id}
                onClick={(e) => { e.stopPropagation(); editable && onDeleteLink?.(l.id); }}
                onMouseEnter={() => setHoverLinkId(l.id)}
                onMouseLeave={() => setHoverLinkId(null)}
                style={{ cursor: editable ? "pointer" : "default" }}
              >
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={lit ? "#ffd86e" : "#d8e1ef"} strokeWidth={hoverLinkId === l.id ? "2.8" : "1.7"} opacity={lit ? 0.95 : 0.55} />
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={lit ? "#ffd86e" : "#d8e1ef"} strokeWidth={hoverLinkId === l.id ? "10" : "6"} opacity={lit ? 0.2 : 0.08} style={{ animation: "v-linkPulse 1.6s ease-in-out infinite" }} />
              </g>
            );
          })}
          {linkMode && linkFrom && (() => {
            const from = (tree?.nodes || []).find((n) => n.id === linkFrom);
            if (!from) return null;
            return <line x1={from.x} y1={from.y} x2={pointerWorld.x} y2={pointerWorld.y} stroke="#f4fbff" strokeWidth="2" strokeDasharray="8 5" />;
          })()}
        </svg>

        {(tree?.nodes || []).map((node) => {
          const selected = unlockedSet.has(node.id);
          const canActivate = canActivatePrestigioNode({ node, unlockedIds, tree, ficha, skillName });
          const activeForEdit = selectedNodeId === node.id;
          return (
            <div key={node.id} style={{ position: "absolute", left: node.x - 60, top: node.y - 33, width: 120, textAlign: "center" }}>
              <div style={{ color: selected ? "#ffe3a1" : "#cfe0f8", fontSize: 10, textShadow: "0 0 10px #000", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.nome}</div>
              <button
                onMouseEnter={() => setHoverNodeId(node.id)}
                onMouseLeave={() => setHoverNodeId(null)}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelectNode?.(node.id);
                  if (editable && !linkMode && e.button === 0) setDragNode(node);
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
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `1px solid ${activeForEdit ? "#98ddff" : selected ? "#ffd76a" : "#ffffff"}`,
                  background: selected ? "radial-gradient(circle, #fff6bd 0%, #ffd14d 45%, #94660a 100%)" : "radial-gradient(circle, #ffffff 0%, #f4fbff 40%, #8fb0d6 100%)",
                  boxShadow: selected ? "0 0 16px #ffd76a, 0 0 32px #ffd76a88" : "0 0 16px #ffffffcc, 0 0 28px #ffffff77",
                  animation: "v-starCorePulse 2.1s ease-in-out infinite",
                  cursor: editable ? (linkMode ? "crosshair" : "grab") : (canActivate ? "pointer" : "not-allowed"),
                  opacity: canActivate || selected || editable ? 1 : 0.6,
                  transform: (activeForEdit || hoverNodeId === node.id || pulseNodeId === node.id) ? "scale(1.25)" : "scale(1)",
                  transition: "transform .2s ease",
                }}
              />
            </div>
          );
        })}
      </div>

      {showFooterHint && (
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "linear-gradient(90deg,#040b19f0,#0a1630e0)", border: "1px solid #2f4670", borderRadius: 10, padding: "6px 10px", color: "#bdd7ff", fontFamily: "monospace", fontSize: 11 }}>
          <span>{linkMode ? "Modo Link ativo: escolha origem e destino. Clique no vazio para cancelar." : "Clique nas estrelas para ativar. Requisitos bloqueiam ascensão."}</span>
          <span style={{ color: G.gold2 }}>Prestígios ativos: {(unlockedIds || []).length}</span>
        </div>
      )}
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
