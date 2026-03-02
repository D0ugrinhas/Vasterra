import React, { useMemo } from "react";
import { uid } from "../../../core/factories";
import { instantiateEffectFromTemplate } from "../../../core/effects";
import { makeDefaultEffect } from "../../caldeirao/EffectForgeEditor";
import { G, inpStyle, btnStyle } from "../../../ui/theme";
import { HoverButton } from "../../../components/primitives/Interactive";

const defaultCombate = () => ({
  rodadaAtual: 0,
  abaAtiva: "recursos",
  lembretes: [],
  recursos: [
    { id: uid(), nome: "MOV", cor: "#28a745", max: 0, atual: 0 },
    { id: uid(), nome: "ACO", cor: "#007bff", max: 0, atual: 0 },
    { id: uid(), nome: "REA", cor: "#dc3545", max: 0, atual: 0 },
    { id: uid(), nome: "ESF", cor: "#8b0000", max: 0, atual: 0 },
  ],
});

const EFFECT_TARGETS = ["Portador", "Alvo", "Área", "Condição", "Todos"];

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

export function TabCombate({ ficha, onUpdate, efeitosCaldeirao = [], onOpenCaldeirao }) {
  const state = useMemo(() => ({ ...defaultCombate(), ...(ficha.combate || {}) }), [ficha.combate]);
  const charEffects = ficha.modificadores?.efeitos || [];

  const saveCombate = (next) => onUpdate({ combate: { ...state, ...next } });
  const saveEffects = (next) => onUpdate({ modificadores: { ...(ficha.modificadores || {}), efeitos: next } });

  const upResource = (id, patch) => saveCombate({ recursos: state.recursos.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const setTab = (abaAtiva) => saveCombate({ abaAtiva });
  const setRodada = (rodadaAtual) => saveCombate({ rodadaAtual: Math.max(0, rodadaAtual) });

  const proxRodada = () => {
    const recursos = (state.recursos || []).map((r) => ({ ...r, atual: r.max }));
    saveCombate({ rodadaAtual: state.rodadaAtual + 1, recursos });
  };

  const activeLembretes = (state.lembretes || []).filter((l) => {
    const rodadaLembrete = l.tipo === "naRodada" ? l.lembrarNaRodada : (l.criadoNaRodada + l.lembrarNaRodada);
    return rodadaLembrete === state.rodadaAtual;
  });

  const activeEfeitos = (charEffects || []).filter((e) => e.ativo !== false);

  const ensureItemEffects = () => {
    const invEffects = (ficha.inventario || []).flatMap((entry) => {
      const item = entry.item || {};
      return (item.efeitos || [])
        .filter((ef) => ef?.origemEffectId)
        .map((ef) => ({ ef, item }));
    });

    if (!invEffects.length) return;

    const existingKeys = new Set((charEffects || []).map((e) => `${e.origemEffectId || ""}::${e.origemItem || ""}`));
    const additions = [];

    invEffects.forEach(({ ef, item }) => {
      const tpl = (efeitosCaldeirao || []).find((x) => x.id === ef.origemEffectId);
      if (!tpl) return;
      const isPortador = (tpl.alvo || "Portador") === "Portador";
      if (!isPortador) return;
      const key = `${tpl.id}::${item.nome || ""}`;
      if (existingKeys.has(key)) return;
      additions.push(instantiateEffectFromTemplate(tpl, { rodadaInicio: state.rodadaAtual, origemItem: item.nome || "Item", ativo: false }));
    });

    if (additions.length) saveEffects([...(charEffects || []), ...additions]);
  };

  return (
    <div style={{ background: G.bg2, border: "1px solid " + G.border, borderRadius: 12, padding: 14 }}>
      <style>{`
        .combat-tab { transition: all .2s ease; }
        .combat-tab:hover { transform: translateY(-1px); }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "'Cinzel',serif", color: G.gold, letterSpacing: 2 }}>◈ COMBATE</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <HoverButton onClick={() => setRodada(state.rodadaAtual - 1)}>&lt;</HoverButton>
          <span style={{ fontFamily: "monospace", color: "#8ec8ff" }}>Rodada {state.rodadaAtual}</span>
          <HoverButton onClick={() => setRodada(state.rodadaAtual + 1)}>&gt;</HoverButton>
          <HoverButton onClick={proxRodada}>Próx</HoverButton>
          <HoverButton onClick={() => saveCombate({ rodadaAtual: 0 })} style={btnStyle({ borderColor: "#e67e2244", color: "#f5b26b" })}>Reset</HoverButton>
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
          {(state.recursos || []).map((r) => {
            const max = Math.max(0, Number(r.max || 0));
            const atual = Math.max(0, Math.min(max, Number(r.atual || 0)));
            const disp = atual;
            return (
              <div key={r.id} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, marginBottom: 8, background: "#0a0a0a" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px auto", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <input value={r.nome} onChange={(e) => upResource(r.id, { nome: e.target.value })} style={inpStyle()} />
                  <input type="number" value={max} onChange={(e) => upResource(r.id, { max: Math.max(0, Number(e.target.value) || 0), atual: Math.min(atual, Math.max(0, Number(e.target.value) || 0)) })} style={inpStyle()} />
                  <input type="number" value={atual} onChange={(e) => upResource(r.id, { atual: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })} style={inpStyle()} />
                  <HoverButton onClick={() => saveCombate({ recursos: state.recursos.filter((x) => x.id !== r.id) })} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton>
                </div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
                  {Array.from({ length: max }).map((_, i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: i < disp ? (r.cor || "#888") : "#1a1a1a", border: "1px solid " + (i < disp ? (r.cor || "#888") : "#333") }} />)}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <HoverButton onClick={() => upResource(r.id, { atual: Math.max(0, atual - 1) })}>−</HoverButton>
                  <HoverButton onClick={() => upResource(r.id, { atual: Math.min(max, atual + 1) })}>+</HoverButton>
                  <input type="color" value={r.cor || "#888888"} onChange={(e) => upResource(r.id, { cor: e.target.value })} style={{ width: 32, height: 28, background: "transparent", border: "1px solid #333", borderRadius: 6 }} />
                </div>
              </div>
            );
          })}
          <HoverButton onClick={() => saveCombate({ recursos: [...(state.recursos || []), { id: uid(), nome: "Novo", cor: "#ffffff", max: 0, atual: 0 }] })}>+ Novo Recurso</HoverButton>
        </div>
      )}

      {state.abaAtiva === "efeitos" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 6, marginBottom: 8 }}>
            <select defaultValue="" onChange={(ev) => {
              const ref = (efeitosCaldeirao || []).find((x) => x.id === ev.target.value);
              if (!ref) return;
              saveEffects([...(charEffects || []), instantiateEffectFromTemplate(ref, { rodadaInicio: state.rodadaAtual, ativo: false })]);
              ev.target.value = "";
            }} style={inpStyle()}>
              <option value="">Adicionar efeito do Caldeirão...</option>
              {(efeitosCaldeirao || []).map((ef) => <option key={ef.id} value={ef.id}>{ef.nome} · {ef.efeitoMecanico || "—"}</option>)}
            </select>
            <HoverButton onClick={() => onOpenCaldeirao?.()}>Criar no Caldeirão</HoverButton>
            <HoverButton onClick={() => saveEffects([...(charEffects || []), instantiateEffectFromTemplate(makeDefaultEffect(), { nome: "Novo efeito local", origem: "Local", origemDetalhe: "Combate", ativo: false, rodadaInicio: state.rodadaAtual })])} style={btnStyle({ borderColor: "#8e44ad55", color: "#dcb3ff" })}>Criar local</HoverButton>
            <HoverButton onClick={ensureItemEffects} style={btnStyle({ borderColor: "#2ecc7144", color: "#7cf0b3" })}>Sincronizar itens</HoverButton>
            <HoverButton onClick={() => saveEffects([...(charEffects || [])])}>Atualizar</HoverButton>
          </div>

          {(charEffects || []).map((e) => (
            <div key={e.id} style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: 8, marginBottom: 8, background: "#0a0a0a", display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 80px 1fr auto auto", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={e.ativo !== false} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, ativo: ev.target.checked } : x))} />
                <select value={e.tipo || "Buff"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, tipo: ev.target.value } : x))} style={inpStyle()}><option>Buff</option><option>Debuff</option></select>
                <input value={e.nome || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, nome: ev.target.value } : x))} style={inpStyle()} />
                <HoverButton onClick={() => saveEffects([...(charEffects || []), { ...e, id: uid(), nome: `${e.nome || "Efeito"} (cópia)` }])}>⎘</HoverButton>
                <HoverButton onClick={() => saveEffects(charEffects.filter((x) => x.id !== e.id))} style={btnStyle({ borderColor: "#e74c3c44", color: "#e74c3c" })}>✕</HoverButton>
              </div>

              <textarea value={e.descricao || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, descricao: ev.target.value } : x))} rows={2} style={inpStyle({ resize: "vertical" })} />

              <input value={e.frase || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, frase: ev.target.value } : x))} placeholder="Frase de efeito" style={inpStyle()} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <input value={e.duracao || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, duracao: ev.target.value } : x))} placeholder="Duração (ex: 2d4)" style={inpStyle()} disabled={!!e.eterno} />
                <select value={String(!!e.eterno)} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, eterno: ev.target.value === "true", duracao: ev.target.value === "true" ? "" : (x.duracao || "") } : x))} style={inpStyle()}><option value="false">Não eterno</option><option value="true">Eterno</option></select>
                <HoverButton onClick={() => {
                  const roll = rollDice(e.duracao || "");
                  if (roll == null) return;
                  saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, duracaoRolada: roll, rodadaInicio: state.rodadaAtual } : x));
                }}>🎲 Duração</HoverButton>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <select value={String(!!e.removivel)} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, removivel: ev.target.value === "true" } : x))} style={inpStyle()}><option value="false">Não removível</option><option value="true">Removível</option></select>
                <input value={e.condicaoRemocao || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, condicaoRemocao: ev.target.value } : x))} placeholder="Condição de remoção" style={inpStyle()} disabled={!e.removivel} />
                <input value={e.essenciaAtribuida || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, essenciaAtribuida: ev.target.value } : x))} placeholder="Essência atrelada" style={inpStyle()} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 6 }}>
                <input value={e.rank || "Comum"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, rank: ev.target.value } : x))} style={inpStyle()} />
                <input value={e.efeitoMecanico || e.efeito || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, efeitoMecanico: ev.target.value, efeito: ev.target.value } : x))} placeholder="-2FOR, -10Agilidade" style={inpStyle()} />
                <select value={e.alvo || "Portador"} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, alvo: ev.target.value } : x))} style={inpStyle()}>{EFFECT_TARGETS.map((t) => <option key={t}>{t}</option>)}</select>
              </div>

              {(e.alvo === "Condição") && <input value={e.alvoCondicao || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, alvoCondicao: ev.target.value } : x))} placeholder="Condição do alvo" style={inpStyle()} />}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <input value={e.testeResistenciaPericia || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, testeResistenciaPericia: ev.target.value } : x))} placeholder="Teste de resistência" style={inpStyle()} />
                <input value={e.testeResistenciaSucessoOutro || e.testeResistenciaSucesso || ""} onChange={(ev) => saveEffects(charEffects.map((x) => x.id === e.id ? { ...x, testeResistenciaSucessoOutro: ev.target.value } : x))} placeholder="O que o teste faz" style={inpStyle()} />
              </div>

              <div style={{ fontFamily: "monospace", fontSize: 11, color: e.ativo !== false ? "#62e39e" : "#777" }}>
                {e.ativo !== false ? `Ativo${e.eterno ? " · Eterno" : (e.duracaoRolada ? ` · ${Math.max(0, e.duracaoRolada - (state.rodadaAtual - (e.rodadaInicio || state.rodadaAtual)))} rodadas restantes` : "")}` : "Pausado"}
                {e.origemItem ? ` · Origem item: ${e.origemItem}` : ""}
              </div>
            </div>
          ))}
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
    </div>
  );
}
