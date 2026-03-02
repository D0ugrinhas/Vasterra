import React, { useMemo, useState } from "react";
import { STATUS_CFG, ATRIBUTOS } from "../../../data/gameData";
import { aggregateModifiers, aggregateStatusModifiers } from "../../../core/effects";
import { inventoryItemModifiers } from "../../../core/inventory";
import { G, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";
import { StatusBar, ModificadoresEditor } from "../../shared/components";

export function TabStatus({ ficha, onUpdate, inventarioNomes = [], arsenal = [], efeitosCaldeirao = [], onOpenCaldeirao }) {
  const [c1, setC1] = useState("FOR");
  const [c2, setC2] = useState("FOR");
  const [cRes, setCRes] = useState(null);
  const [burstRes, setBurstRes] = useState(null);
  const [effectsOpen, setEffectsOpen] = useState(false);

  const itemMods = useMemo(() => inventoryItemModifiers(ficha.inventario || [], arsenal), [ficha.inventario, arsenal]);
  const globalEffects = ficha.modificadores?.efeitos || [];
  const mergedMods = [...globalEffects, ...itemMods];

  const statusBonus = aggregateStatusModifiers(mergedMods);
  const attrBonus = aggregateModifiers(mergedMods, "atributos");

  const upStatus = (sigla, field, val) => onUpdate({ status: { ...ficha.status, [sigla]: { ...ficha.status[sigla], [field]: val } } });

  const rolarConfronto = () => {
    const v1 = (ficha.atributos[c1]?.val || 5) + (attrBonus[c1] || 0);
    const v2 = (ficha.atributos[c2]?.val || 5) + (attrBonus[c2] || 0);
    const diff = v1 - v2;
    setCRes({ r1: Math.max(1, Math.ceil(Math.random() * 20) + diff), r2: Math.ceil(Math.random() * 20) });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 16 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid " + G.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>◈ STATUS</span>
          <HoverButton onClick={() => setEffectsOpen(true)} style={btnStyle({ padding: "2px 8px" })}>Efeitos</HoverButton>
        </div>
        {STATUS_CFG.map((s) => {
          const delta = statusBonus[s.sigla] || { base: 0, current: 0, max: 0 };
          const val = (ficha.status[s.sigla].val || 0) + delta.base + delta.current;
          const max = (ficha.status[s.sigla].max || 1) + delta.base + delta.max;
          return (
            <StatusBar
              key={s.sigla}
              {...s}
              val={Math.max(0, Math.min(Math.max(1, max), val))}
              max={Math.max(1, max)}
              onVal={(v) => upStatus(s.sigla, "val", v - delta.base - delta.current)}
              onMax={(v) => upStatus(s.sigla, "max", v - delta.base - delta.max)}
            />
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 10 }}>⚔ CONFRONTO (Atributo vs Atributo)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <select value={c1} onChange={(e) => { setC1(e.target.value); setCRes(null); }}>{ATRIBUTOS.map((a) => <option key={a.sigla}>{a.sigla}</option>)}</select>
            <span style={{ color: G.gold, fontFamily: "'Cinzel',serif" }}>vs</span>
            <select value={c2} onChange={(e) => { setC2(e.target.value); setCRes(null); }}>{ATRIBUTOS.map((a) => <option key={a.sigla}>{a.sigla}</option>)}</select>
            <HoverButton style={btnStyle({ padding: "7px 12px" })} onClick={rolarConfronto}>🎲</HoverButton>
          </div>
          {cRes && <div style={{ display: "flex", gap: 8 }}>{[{ v: cRes.r1, lbl: c1, win: cRes.r1 > cRes.r2 }, { v: cRes.r2, lbl: c2, win: cRes.r2 > cRes.r1 }].map((x, i) => <div key={i} style={{ flex: 1, textAlign: "center", padding: "10px 6px", background: x.win ? "#0a2a0a" : "#1a0a0a", border: "1px solid " + (x.win ? "#2ecc7144" : "#e74c3c44"), borderRadius: 8 }}><div style={{ fontSize: 10, color: G.muted, fontFamily: "monospace", marginBottom: 2 }}>{x.lbl}</div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 28, color: x.win ? "#2ecc71" : "#e74c3c" }}>{x.v}</div></div>)}</div>}
        </div>

        <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: G.gold, letterSpacing: 3, marginBottom: 8 }}>⚡ BURST</div>
          <HoverButton style={{ ...btnStyle({ borderColor: "#9b59b644", color: "#bf8fe8" }), width: "100%", padding: "10px", display: "block" }} onClick={() => setBurstRes(Math.ceil(Math.random() * 20))}>Tentar Burst (1D20)</HoverButton>
          {burstRes !== null && <div style={{ marginTop: 10, textAlign: "center", padding: 12, background: "#0a1a0a", border: "1px solid #2ecc7144", borderRadius: 8 }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 36, color: "#2ecc71" }}>{burstRes}</div></div>}
        </div>
      </div>

      {effectsOpen && <ModificadoresEditor title="Efeitos do Personagem" list={ficha.modificadores?.efeitos || []} inventarioItens={inventarioNomes} effectsLibrary={efeitosCaldeirao} onCreateEffect={onOpenCaldeirao} onClose={() => setEffectsOpen(false)} onChange={(next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), efeitos: next } })} />}
    </div>
  );
}
