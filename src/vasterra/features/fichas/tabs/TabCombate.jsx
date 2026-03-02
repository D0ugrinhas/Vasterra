import React, { useMemo } from "react";
import { uid } from "../../../core/factories";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";

const defaultCombate = () => ({
  rodadaAtual: 0,
  abaAtiva: "recursos",
  lembretes: [],
  efeitos: [],
  recursos: [
    { id: uid(), nome: "MOV", cor: "#28a745", max: 0, atual: 0 },
    { id: uid(), nome: "ACO", cor: "#007bff", max: 0, atual: 0 },
    { id: uid(), nome: "REA", cor: "#dc3545", max: 0, atual: 0 },
    { id: uid(), nome: "ESF", cor: "#8b0000", max: 0, atual: 0 },
  ],
});

const remaining = (e, rodada) => (e.rodadaInicio + e.duracao) - rodada;

export function TabCombate({ ficha, onUpdate }) {
  const state = useMemo(() => ({ ...defaultCombate(), ...(ficha.combate || {}) }), [ficha.combate]);

  const save = (next) => onUpdate({ combate: { ...state, ...next } });

  const setTab = (abaAtiva) => save({ abaAtiva });
  const setRodada = (rodadaAtual) => save({ rodadaAtual: Math.max(0, rodadaAtual) });

  const proxRodada = () => {
    const recursos = (state.recursos || []).map((r) => ({ ...r, atual: r.max }));
    save({ rodadaAtual: state.rodadaAtual + 1, recursos });
  };

  const activeLembretes = (state.lembretes || []).filter((l) => {
    const rodadaLembrete = l.tipo === "naRodada" ? l.lembrarNaRodada : (l.criadoNaRodada + l.lembrarNaRodada);
    return rodadaLembrete === state.rodadaAtual;
  });

  const activeEfeitos = (state.efeitos || []).filter((e) => remaining(e, state.rodadaAtual) >= 0);

  return (
    <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 14 }}>
      <style>{`
        .combat-tab { transition: all .2s ease; }
        .combat-tab:hover { transform: translateY(-1px); }
        .combat-card { transition: transform .16s ease, box-shadow .2s ease, border-color .2s ease; }
        .combat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,.35); border-color: #c8a96e66; }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2 }}>◈ COMBATE</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <HoverButton onClick={() => setRodada(state.rodadaAtual - 1)}>&lt;</HoverButton>
          <span style={{ fontFamily: "monospace", color: "#8ec8ff" }}>Rodada {state.rodadaAtual}</span>
          <HoverButton onClick={() => setRodada(state.rodadaAtual + 1)}>&gt;</HoverButton>
          <HoverButton onClick={proxRodada}>Próx</HoverButton>
          <HoverButton onClick={() => save({ rodadaAtual: 0 })} style={btnStyle({ borderColor: "#e67e2244", color: "#f5b26b" })}>Reset</HoverButton>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {["recursos", "efeitos", "lembretes"].map((aba) => {
          const hasAlert = aba === "lembretes" ? activeLembretes.length > 0 : aba === "efeitos" ? activeEfeitos.length > 0 : false;
          return (
            <button key={aba} className="combat-tab" onClick={() => setTab(aba)} style={{ ...btnStyle({ padding: "6px 12px" }), borderColor: state.abaAtiva === aba ? "#5dade266" : undefined, color: state.abaAtiva === aba ? "#b6ddff" : undefined, position: "relative" }}>
              {aba[0].toUpperCase() + aba.slice(1)}
              {hasAlert && <span style={{ position: "absolute", top: -6, right: -6, color: "#ff4d6d" }}>❗</span>}
            </button>
          );
        })}
      </div>

      {state.abaAtiva === "recursos" && (
        <div>
          {(state.recursos || []).map((r) => (
            <div key={r.id} className="combat-card" style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px auto auto auto", gap: 6, alignItems: "center", border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, marginBottom: 8, background: "#0a0a0a" }}>
              <input value={r.nome} onChange={(e) => save({ recursos: state.recursos.map((x) => x.id === r.id ? { ...x, nome: e.target.value } : x) })} style={inpStyle()} />
              <input type="number" value={r.max} onChange={(e) => save({ recursos: state.recursos.map((x) => x.id === r.id ? { ...x, max: Math.max(0, Number(e.target.value) || 0), atual: Math.min(x.atual, Math.max(0, Number(e.target.value) || 0)) } : x) })} style={inpStyle()} />
              <input type="number" value={r.atual} onChange={(e) => save({ recursos: state.recursos.map((x) => x.id === r.id ? { ...x, atual: Math.max(0, Math.min(x.max, Number(e.target.value) || 0)) } : x) })} style={inpStyle()} />
              <HoverButton onClick={() => save({ recursos: state.recursos.map((x) => x.id === r.id ? { ...x, atual: Math.max(0, x.atual - 1) } : x) })}>−</HoverButton>
              <HoverButton onClick={() => save({ recursos: state.recursos.map((x) => x.id === r.id ? { ...x, atual: Math.min(x.max, x.atual + 1) } : x) })}>+</HoverButton>
              <HoverButton onClick={() => save({ recursos: state.recursos.filter((x) => x.id !== r.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton>
            </div>
          ))}
          <HoverButton onClick={() => save({ recursos: [...(state.recursos || []), { id: uid(), nome: "Novo", cor: "#ffffff", max: 0, atual: 0 }] })}>+ Novo Recurso</HoverButton>
        </div>
      )}

      {state.abaAtiva === "efeitos" && (
        <div>
          {(state.efeitos || []).map((e) => (
            <div key={e.id} className="combat-card" style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, marginBottom: 8, background: "#0a0a0a", display: "grid", gridTemplateColumns: "1fr 100px 100px auto auto", gap: 6, alignItems: "center" }}>
              <input value={e.nome} onChange={(ev) => save({ efeitos: state.efeitos.map((x) => x.id === e.id ? { ...x, nome: ev.target.value } : x) })} style={inpStyle()} />
              <input type="number" value={e.rodadaInicio} onChange={(ev) => save({ efeitos: state.efeitos.map((x) => x.id === e.id ? { ...x, rodadaInicio: Number(ev.target.value) || 0 } : x) })} style={inpStyle()} />
              <input type="number" value={e.duracao} onChange={(ev) => save({ efeitos: state.efeitos.map((x) => x.id === e.id ? { ...x, duracao: Math.max(1, Number(ev.target.value) || 1), duracaoOriginal: Math.max(1, Number(ev.target.value) || 1) } : x) })} style={inpStyle()} />
              <HoverButton onClick={() => save({ efeitos: state.efeitos.map((x) => x.id === e.id ? { ...x, rodadaInicio: state.rodadaAtual, duracao: x.duracaoOriginal || x.duracao || 1 } : x) })}>🔄</HoverButton>
              <HoverButton onClick={() => save({ efeitos: state.efeitos.filter((x) => x.id !== e.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton>
            </div>
          ))}
          <HoverButton onClick={() => save({ efeitos: [...(state.efeitos || []), { id: uid(), nome: "Novo efeito", rodadaInicio: state.rodadaAtual, duracao: 1, duracaoOriginal: 1 }] })}>+ Novo Efeito</HoverButton>
        </div>
      )}

      {state.abaAtiva === "lembretes" && (
        <div>
          {(state.lembretes || []).map((l) => (
            <div key={l.id} className="combat-card" style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, marginBottom: 8, background: "#0a0a0a", display: "grid", gridTemplateColumns: "1fr 140px 140px auto auto", gap: 6, alignItems: "center" }}>
              <input value={l.texto} onChange={(ev) => save({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, texto: ev.target.value } : x) })} style={inpStyle()} />
              <select value={l.tipo || "emX"} onChange={(ev) => save({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, tipo: ev.target.value } : x) })} style={inpStyle()}><option value="emX">Em X rodadas</option><option value="naRodada">Na rodada</option></select>
              <input type="number" value={l.lembrarNaRodada} onChange={(ev) => save({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, lembrarNaRodada: Math.max(0, Number(ev.target.value) || 0) } : x) })} style={inpStyle()} />
              <HoverButton onClick={() => save({ lembretes: state.lembretes.map((x) => x.id === l.id ? { ...x, criadoNaRodada: state.rodadaAtual } : x) })}>🔄</HoverButton>
              <HoverButton onClick={() => save({ lembretes: state.lembretes.filter((x) => x.id !== l.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton>
            </div>
          ))}
          <HoverButton onClick={() => save({ lembretes: [...(state.lembretes || []), { id: uid(), texto: "Novo lembrete", criadoNaRodada: state.rodadaAtual, lembrarNaRodada: state.rodadaAtual + 1, tipo: "emX" }] })}>+ Novo Lembrete</HoverButton>
        </div>
      )}
    </div>
  );
}
