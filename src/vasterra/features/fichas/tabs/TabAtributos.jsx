import React, { useState } from "react";
import { ATRIBUTOS, PERICIAS_GRUPOS } from "../../../data/gameData";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";
import { ModificadoresEditor } from "../../shared/components";

export function TabAtributos({ ficha, onUpdate, inventarioNomes = [] }) {
  const [grupoAtivo, setGrupoAtivo] = useState(PERICIAS_GRUPOS[0].g);
  const [modsOpen, setModsOpen] = useState(null);
  const grp = PERICIAS_GRUPOS.find(g => g.g === grupoAtivo);

  const upA = (sigla, k, v) => onUpdate({ atributos: Object.assign({}, ficha.atributos, { [sigla]: Object.assign({}, ficha.atributos[sigla], { [k]: v }) }) });
  const upP = (nome, v) => onUpdate({ pericias: Object.assign({}, ficha.pericias, { [nome]: Math.max(0, Math.min(20, v)) }) });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid " + G.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>◈ ATRIBUTOS</span><HoverButton onClick={() => setModsOpen("atributos")} style={btnStyle({ padding: "2px 8px" })}>⚙</HoverButton></div>
        <div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace", marginBottom: 10, background: "#050505", padding: "6px 10px", borderRadius: 6, border: "1px solid " + G.border }}><span style={{ color: "#4eff4e" }}>AE</span> = Especializado (+ATRIB) &nbsp;|&nbsp; <span style={{ color: "#ff4e4e" }}>NE</span> = Não Especializado (−ATRIB)</div>
        {ATRIBUTOS.map(a => {
          const av = ficha.atributos[a.sigla];
          return <div key={a.sigla} style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: "8px 10px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1 }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 1 }}>{a.sigla}</div>{a.bonus && <div style={{ fontSize: 9, color: "#2ecc71", fontFamily: "monospace" }}>{a.bonus}</div>}</div><input type="number" min={0} max={30} value={av.val} onChange={e => upA(a.sigla, "val", Number(e.target.value) || 0)} style={inpStyle({ width: 52, textAlign: "center", fontSize: 15, fontWeight: "bold", color: G.gold, padding: "4px" })} /><div style={{ display: "flex", flexDirection: "column", gap: 2 }}><button onClick={() => upA(a.sigla, "ae", !av.ae)} style={{ width: 24, height: 20, background: av.ae ? "#1a4a1a" : "#111", border: "1px solid " + (av.ae ? "#2d8a2d" : "#333"), borderRadius: 3, color: av.ae ? "#4eff4e" : "#555", fontSize: 9, cursor: "pointer", fontWeight: "bold" }}>AE</button><button onClick={() => upA(a.sigla, "ne", !av.ne)} style={{ width: 24, height: 20, background: av.ne ? "#4a1a1a" : "#111", border: "1px solid " + (av.ne ? "#8a2d2d" : "#333"), borderRadius: 3, color: av.ne ? "#ff4e4e" : "#555", fontSize: 9, cursor: "pointer", fontWeight: "bold" }}>NE</button></div></div>;
        })}
      </div>

      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid " + G.border }}><span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3 }}>◈ PERÍCIAS</span><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 10, color: G.muted, fontFamily: "monospace" }}>DT = 20 − Nível</span><HoverButton onClick={() => setModsOpen("pericias")} style={btnStyle({ padding: "2px 8px" })}>⚙</HoverButton></div></div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>{PERICIAS_GRUPOS.map(g => <button key={g.g} onClick={() => setGrupoAtivo(g.g)} style={{ padding: "4px 10px", background: grupoAtivo === g.g ? g.cor + "22" : "transparent", border: "1px solid " + (grupoAtivo === g.g ? g.cor + "55" : G.border), borderRadius: 14, color: grupoAtivo === g.g ? g.cor : G.muted, fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>{g.g}</button>)}</div>
        {grp && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{grp.list.map(p => {
          const nivel = ficha.pericias[p] || 0;
          const dt = Math.max(1, 20 - nivel);
          return <div key={p} style={{ background: G.bg3, border: "1px solid " + G.border, borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}><div style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: nivel > 0 ? G.gold2 : "#888" }}>{p}</div><button onClick={() => upP(p, nivel - 1)} style={{ width: 20, height: 20, background: "transparent", border: "1px solid " + G.border, borderRadius: 3, color: G.muted, cursor: "pointer", fontSize: 12 }}>−</button><input type="number" min={0} max={20} value={nivel} onChange={e => upP(p, Number(e.target.value) || 0)} style={inpStyle({ width: 36, textAlign: "center", fontSize: 13, fontWeight: "bold", color: grp.cor, padding: "2px", borderColor: grp.cor + "33" })} /><button onClick={() => upP(p, nivel + 1)} style={{ width: 20, height: 20, background: "transparent", border: "1px solid " + G.border, borderRadius: 3, color: G.muted, cursor: "pointer", fontSize: 12 }}>+</button><div style={{ width: 38, textAlign: "right", fontFamily: "monospace", fontSize: 11, color: nivel === 20 ? "#ffd700" : nivel > 0 ? grp.cor : G.muted }}>DT:{dt}</div></div>;
        })}</div>}
      </div>

      {modsOpen === "atributos" && <ModificadoresEditor title="Modificadores de Atributos" list={ficha.modificadores?.atributos || []} inventarioItens={inventarioNomes} onChange={(next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), atributos: next } })} />}
      {modsOpen === "pericias" && <ModificadoresEditor title="Modificadores de Perícias" list={ficha.modificadores?.pericias || []} inventarioItens={inventarioNomes} onChange={(next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), pericias: next } })} />}
    </div>
  );
}
